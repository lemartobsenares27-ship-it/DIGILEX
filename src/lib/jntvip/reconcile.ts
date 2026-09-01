// J&T VIP — reconciliation orchestration.
//
// Recomputes every match row from scratch off the current POS orders +
// shipments, but *upserts by natural (posOrderId, shipmentId) key* rather
// than clear-and-rebuild, so:
//   - a manual review decision (confirm/reject/duplicate/expected-difference/
//     ignore/note) survives a later re-run (e.g. importing another SOA batch)
//   - the match row's `id` stays stable, so audit log entries referencing it
//     don't go stale across the common case (new data arrives, same pairing)
//
// Call runJntVipReconciliation() after every POS or SOA import commit, and
// expose it as a manual "Re-run reconciliation" action too.

import { db } from '../db'
import { computeMatches } from './matching'
import type { JntVipMatchRow, JntVipPosOrderRow, JntVipShipmentRow, JntVipDiscrepancyType } from './types'
import type { JntVipPairing } from './matching'

const COD_TOLERANCE = 1
const SHIPPING_TOLERANCE = 1

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function matchKey(posOrderId: number | null, shipmentId: number | null): string {
  return `${posOrderId ?? '_'}|${shipmentId ?? '_'}`
}

function normalizeStatusCategory(raw: string | null): string | null {
  const u = (raw ?? '').toUpperCase()
  if (!u) return null
  if (u.includes('DELIVER')) return 'Delivered'
  if (u.includes('RTS') || u.includes('RETURN')) return 'RTS'
  if (u.includes('FAIL')) return 'Failed'
  if (u.includes('CANCEL')) return 'Cancelled'
  if (u.includes('LOST')) return 'Lost'
  if (u.includes('DAMAGE')) return 'Damaged'
  if (u.includes('TRANSIT') || u.includes('PICK') || u.includes('PROCESS') || u.includes('PENDING')) return 'Pending'
  return null
}

function baseRow(overrides: Partial<JntVipMatchRow>): JntVipMatchRow {
  return {
    posOrderId: null,
    shipmentId: null,
    soaBatchId: null,
    matchMethod: 'none',
    matchConfidence: null,
    status: 'NEEDS_REVIEW',
    codDifference: null,
    shippingDifference: null,
    totalPosExpected: null,
    totalJntAmount: null,
    totalDifference: null,
    statusMismatch: false,
    discrepancyTypes: [],
    manualStatus: null,
    reviewedBy: null,
    reviewDate: null,
    notes: null,
    ...overrides,
  }
}

function buildPairedRow(pos: JntVipPosOrderRow, shipment: JntVipShipmentRow, pairing: JntVipPairing): JntVipMatchRow {
  const totalPosExpected = pos.codAmountExpected
  const totalJntAmount = shipment.netSettlement ?? shipment.codCollected
  const codDifference =
    pos.codAmountExpected !== null && shipment.codCollected !== null ? round2(shipment.codCollected - pos.codAmountExpected) : null
  const shippingDifference =
    pos.shippingFeeExpected !== null && shipment.shippingCharge !== null
      ? round2(shipment.shippingCharge - pos.shippingFeeExpected)
      : null
  const totalDifference = totalPosExpected !== null && totalJntAmount !== null ? round2(totalJntAmount - totalPosExpected) : null

  const posStatus = normalizeStatusCategory(pos.status)
  const jntStatus = normalizeStatusCategory(shipment.status)
  const statusMismatch = !!posStatus && !!jntStatus && posStatus !== 'Pending' && jntStatus !== 'Pending' && posStatus !== jntStatus

  const discrepancyTypes: JntVipDiscrepancyType[] = []
  if (codDifference !== null && Math.abs(codDifference) > COD_TOLERANCE) discrepancyTypes.push('COD_MISMATCH')
  if (shippingDifference !== null && Math.abs(shippingDifference) > SHIPPING_TOLERANCE) discrepancyTypes.push('SHIPPING_MISMATCH')
  if (statusMismatch) discrepancyTypes.push('STATUS_MISMATCH')

  const status = pairing.confidence === 'LOW' ? 'NEEDS_REVIEW' : discrepancyTypes.length > 0 ? 'MISMATCH' : 'MATCHED'

  return baseRow({
    posOrderId: pos.id!,
    shipmentId: shipment.id!,
    soaBatchId: shipment.batchId,
    matchMethod: pairing.method,
    matchConfidence: pairing.confidence,
    status,
    codDifference,
    shippingDifference,
    totalPosExpected,
    totalJntAmount,
    totalDifference,
    statusMismatch,
    discrepancyTypes,
  })
}

function buildPosOnlyRow(pos: JntVipPosOrderRow): JntVipMatchRow {
  return baseRow({
    posOrderId: pos.id!,
    status: 'POS_ONLY',
    discrepancyTypes: ['MISSING_FROM_JNT'],
    totalPosExpected: pos.codAmountExpected,
  })
}

function buildJntOnlyRow(shipment: JntVipShipmentRow): JntVipMatchRow {
  return baseRow({
    shipmentId: shipment.id!,
    soaBatchId: shipment.batchId,
    status: 'JNT_ONLY',
    discrepancyTypes: ['MISSING_FROM_POS'],
    totalJntAmount: shipment.netSettlement ?? shipment.codCollected,
  })
}

function buildDuplicatePosRow(pos: JntVipPosOrderRow): JntVipMatchRow {
  return baseRow({
    posOrderId: pos.id!,
    status: 'DUPLICATE',
    discrepancyTypes: ['DUPLICATE'],
    totalPosExpected: pos.codAmountExpected,
  })
}

function buildDuplicateShipmentRow(shipment: JntVipShipmentRow): JntVipMatchRow {
  return baseRow({
    shipmentId: shipment.id!,
    soaBatchId: shipment.batchId,
    status: 'DUPLICATE',
    discrepancyTypes: ['DUPLICATE'],
    totalJntAmount: shipment.netSettlement ?? shipment.codCollected,
  })
}

function applyManualOverride(row: JntVipMatchRow): void {
  if (row.manualStatus === 'confirmed') {
    // "Confirmed" means the *pairing* is correct, not that the numbers agree —
    // a confirmed pairing with a real financial gap still shows as MISMATCH so
    // the discrepancy stays visible rather than being hidden by the review action.
    row.status = row.discrepancyTypes.length > 0 ? 'MISMATCH' : 'MATCHED'
  } else if (row.manualStatus === 'rejected') {
    row.status = 'NEEDS_REVIEW'
  } else if (row.manualStatus === 'duplicate') {
    row.status = 'DUPLICATE'
  }
  // 'expected-difference' and 'ignored' annotate the row without overriding
  // the computed status, so the underlying discrepancy stays visible and honest.
}

export async function runJntVipReconciliation(): Promise<void> {
  const [posOrders, shipments, existingMatches] = await Promise.all([
    db.jntVipPosOrders.toArray(),
    db.jntVipShipments.toArray(),
    db.jntVipMatches.toArray(),
  ])

  const posById = new Map(posOrders.filter((p) => p.id != null).map((p) => [p.id!, p]))
  const shipmentById = new Map(shipments.filter((s) => s.id != null).map((s) => [s.id!, s]))
  const existingByKey = new Map(existingMatches.map((m) => [matchKey(m.posOrderId, m.shipmentId), m]))

  // Manual pairings (from "Link to POS order" / "Link to J&T transaction") are
  // pinned: pulled out of the automated pool so the algorithm can never
  // silently re-route either side into a different pairing on the next run.
  const pinnedPairs = existingMatches.filter(
    (m) => m.matchMethod === 'manual' && m.posOrderId != null && m.shipmentId != null && posById.has(m.posOrderId) && shipmentById.has(m.shipmentId),
  )
  const pinnedPosIds = new Set(pinnedPairs.map((m) => m.posOrderId!))
  const pinnedShipmentIds = new Set(pinnedPairs.map((m) => m.shipmentId!))
  const poolPos = posOrders.filter((p) => p.id == null || !pinnedPosIds.has(p.id))
  const poolShipments = shipments.filter((s) => s.id == null || !pinnedShipmentIds.has(s.id))

  const result = computeMatches(poolPos, poolShipments)

  const nextRows: JntVipMatchRow[] = [
    ...pinnedPairs.map((m) =>
      buildPairedRow(posById.get(m.posOrderId!)!, shipmentById.get(m.shipmentId!)!, {
        posOrderId: m.posOrderId!,
        shipmentId: m.shipmentId!,
        method: 'manual',
        confidence: 'HIGH',
      }),
    ),
    ...result.duplicatePosIds.map((id) => buildDuplicatePosRow(posById.get(id)!)),
    ...result.duplicateShipmentIds.map((id) => buildDuplicateShipmentRow(shipmentById.get(id)!)),
    ...result.pairings.map((p) => buildPairedRow(posById.get(p.posOrderId)!, shipmentById.get(p.shipmentId)!, p)),
    ...result.unmatchedPos.map((p) => buildPosOnlyRow(p)),
    ...result.unmatchedShipments.map((s) => buildJntOnlyRow(s)),
  ]

  const nextKeys = new Set<string>()
  const toPut: JntVipMatchRow[] = []
  for (const row of nextRows) {
    const key = matchKey(row.posOrderId, row.shipmentId)
    nextKeys.add(key)
    const prior = existingByKey.get(key)
    const merged: JntVipMatchRow = prior
      ? { ...row, id: prior.id, manualStatus: prior.manualStatus, reviewedBy: prior.reviewedBy, reviewDate: prior.reviewDate, notes: prior.notes }
      : row
    applyManualOverride(merged)
    toPut.push(merged)
  }

  const staleIds = existingMatches
    .filter((m) => m.id != null && !nextKeys.has(matchKey(m.posOrderId, m.shipmentId)))
    .map((m) => m.id!)

  await db.transaction('rw', db.jntVipMatches, async () => {
    if (staleIds.length > 0) await db.jntVipMatches.bulkDelete(staleIds)
    for (const row of toPut) {
      await db.jntVipMatches.put(row)
    }
  })
}
