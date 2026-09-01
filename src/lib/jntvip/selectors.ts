// J&T VIP — pure selector/derivation functions. Pages call these (typically
// inside useMemo, fed by useLiveTable) to turn the three raw tables into the
// flattened views the UI needs. Kept framework-agnostic like lib/analytics.ts.

import type {
  JntVipImportBatchRow,
  JntVipDiscrepancyType,
  JntVipMatchConfidence,
  JntVipMatchRow,
  JntVipPosOrderRow,
  JntVipReconStatus,
  JntVipShipmentRow,
} from './types'

export interface JntVipReconciliationRow {
  matchId: number
  status: JntVipReconStatus
  matchConfidence: JntVipMatchConfidence | null
  matchMethod: string
  posOrderId: number | null
  shipmentId: number | null
  orderId: string | null
  trackingNumber: string | null
  customer: string | null
  phone: string | null
  productName: string | null
  orderDate: string | null
  shipDate: string | null
  deliveryDate: string | null
  posStatus: string | null
  jntStatus: string | null
  posCod: number | null
  jntCod: number | null
  codDifference: number | null
  posShipping: number | null
  jntShipping: number | null
  shippingDifference: number | null
  otherJntFees: number | null
  totalPosExpected: number | null
  totalJntAmount: number | null
  totalDifference: number | null
  soaBatchId: number | null
  soaLabel: string | null
  discrepancyTypes: JntVipDiscrepancyType[]
  discrepancySummary: string
  manualStatus: string
  notes: string | null
  reviewedBy: string | null
  reviewDate: string | null
}

const DISCREPANCY_LABELS: Record<JntVipDiscrepancyType, string> = {
  COD_MISMATCH: 'COD mismatch',
  SHIPPING_MISMATCH: 'Shipping mismatch',
  STATUS_MISMATCH: 'Status mismatch',
  MISSING_FROM_JNT: 'Missing from J&T',
  MISSING_FROM_POS: 'Missing from POS',
  DUPLICATE: 'Duplicate',
}

export function buildReconciliationRows(
  matches: JntVipMatchRow[],
  posOrders: JntVipPosOrderRow[],
  shipments: JntVipShipmentRow[],
  batches: JntVipImportBatchRow[],
): JntVipReconciliationRow[] {
  const posById = new Map(posOrders.filter((p) => p.id != null).map((p) => [p.id!, p]))
  const shipmentById = new Map(shipments.filter((s) => s.id != null).map((s) => [s.id!, s]))
  const batchById = new Map(batches.filter((b) => b.id != null).map((b) => [b.id!, b]))

  return matches
    .filter((m) => m.id != null)
    .map((m) => {
      const pos = m.posOrderId != null ? posById.get(m.posOrderId) : undefined
      const shipment = m.shipmentId != null ? shipmentById.get(m.shipmentId) : undefined
      const batch = m.soaBatchId != null ? batchById.get(m.soaBatchId) : undefined
      const otherJntFees = shipment
        ? [shipment.codFee, shipment.returnFee, shipment.otherFees, shipment.adjustments].filter((n): n is number => n != null).reduce((a, b) => a + b, 0)
        : null

      return {
        matchId: m.id!,
        status: m.status,
        matchConfidence: m.matchConfidence,
        matchMethod: m.matchMethod,
        posOrderId: m.posOrderId,
        shipmentId: m.shipmentId,
        orderId: pos?.orderId ?? null,
        trackingNumber: shipment?.trackingNumber ?? pos?.trackingNumber ?? null,
        customer: pos?.customerName ?? shipment?.consignee ?? null,
        phone: pos?.customerPhone ?? shipment?.phone ?? null,
        productName: pos?.productName ?? null,
        orderDate: pos?.orderDate ?? null,
        shipDate: pos?.shipDate ?? shipment?.shipDate ?? null,
        deliveryDate: shipment?.deliveryDate ?? null,
        posStatus: pos?.status ?? null,
        jntStatus: shipment?.status ?? null,
        posCod: pos?.codAmountExpected ?? null,
        jntCod: shipment?.codCollected ?? null,
        codDifference: m.codDifference,
        posShipping: pos?.shippingFeeExpected ?? null,
        jntShipping: shipment?.shippingCharge ?? null,
        shippingDifference: m.shippingDifference,
        otherJntFees,
        totalPosExpected: m.totalPosExpected,
        totalJntAmount: m.totalJntAmount,
        totalDifference: m.totalDifference,
        soaBatchId: m.soaBatchId,
        soaLabel: batch?.soaLabel ?? (batch ? batch.fileName : null),
        discrepancyTypes: m.discrepancyTypes,
        discrepancySummary: m.discrepancyTypes.map((t) => DISCREPANCY_LABELS[t]).join(', ') || '—',
        manualStatus: m.manualStatus ?? '—',
        notes: m.notes,
        reviewedBy: m.reviewedBy,
        reviewDate: m.reviewDate,
      }
    })
}

export interface JntVipDashboardKpis {
  total: number
  matched: number
  needsReview: number
  mismatched: number
  jntOnly: number
  posOnly: number
  duplicates: number
  totalPosExpected: number
  totalJntAmount: number
  totalDifference: number
}

export function computeDashboardKpis(rows: JntVipReconciliationRow[]): JntVipDashboardKpis {
  const count = (s: JntVipReconStatus) => rows.filter((r) => r.status === s).length
  const sum = (f: (r: JntVipReconciliationRow) => number | null) => rows.reduce((acc, r) => acc + (f(r) ?? 0), 0)
  return {
    total: rows.length,
    matched: count('MATCHED'),
    needsReview: count('NEEDS_REVIEW'),
    mismatched: count('MISMATCH'),
    jntOnly: count('JNT_ONLY'),
    posOnly: count('POS_ONLY'),
    duplicates: count('DUPLICATE'),
    totalPosExpected: sum((r) => r.totalPosExpected),
    totalJntAmount: sum((r) => r.totalJntAmount),
    totalDifference: sum((r) => r.totalDifference),
  }
}

export interface JntVipDiscrepancyGroup {
  type: JntVipDiscrepancyType
  label: string
  count: number
  impact: number
  openCount: number
}

/** A row's discrepancy is "open" (still needs attention) unless a human has
 *  already annotated it as confirmed/expected-difference/ignored/duplicate. */
function isOpen(row: JntVipReconciliationRow): boolean {
  return row.manualStatus === '—' || row.manualStatus === null
}

export function computeDiscrepancyGroups(rows: JntVipReconciliationRow[]): JntVipDiscrepancyGroup[] {
  const groups = new Map<JntVipDiscrepancyType, JntVipDiscrepancyGroup>()
  for (const type of Object.keys(DISCREPANCY_LABELS) as JntVipDiscrepancyType[]) {
    groups.set(type, { type, label: DISCREPANCY_LABELS[type], count: 0, impact: 0, openCount: 0 })
  }
  for (const row of rows) {
    for (const type of row.discrepancyTypes) {
      const g = groups.get(type)!
      g.count += 1
      const impact =
        type === 'COD_MISMATCH'
          ? Math.abs(row.codDifference ?? 0)
          : type === 'SHIPPING_MISMATCH'
            ? Math.abs(row.shippingDifference ?? 0)
            : Math.abs(row.totalDifference ?? row.totalPosExpected ?? row.totalJntAmount ?? 0)
      g.impact += impact
      if (isOpen(row)) g.openCount += 1
    }
  }
  return [...groups.values()].filter((g) => g.count > 0).sort((a, b) => b.impact - a.impact)
}

export interface JntVipBatchSummary {
  batch: JntVipImportBatchRow
  transactions: number
  matched: number
  issues: number
  difference: number
  status: 'Reconciled' | 'Needs Review' | 'Reversed'
}

export function computeBatchSummaries(batches: JntVipImportBatchRow[], rows: JntVipReconciliationRow[]): JntVipBatchSummary[] {
  return batches
    .filter((b) => b.kind === 'soa' && b.id != null)
    .map((batch) => {
      const batchRows = rows.filter((r) => r.soaBatchId === batch.id)
      const matched = batchRows.filter((r) => r.status === 'MATCHED').length
      const issues = batchRows.filter((r) => r.status !== 'MATCHED').length
      const difference = batchRows.reduce((acc, r) => acc + (r.totalDifference ?? 0), 0)
      const status: JntVipBatchSummary['status'] = batch.status === 'reversed' ? 'Reversed' : issues === 0 ? 'Reconciled' : 'Needs Review'
      return {
        batch,
        transactions: batchRows.length,
        matched,
        issues,
        difference,
        status,
      }
    })
    .sort((a, b) => new Date(b.batch.importedAt).getTime() - new Date(a.batch.importedAt).getTime())
}
