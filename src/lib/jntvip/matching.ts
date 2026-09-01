// J&T VIP — matching engine.
//
// Matches POS orders against J&T VIP SOA shipment lines using a hierarchy of
// matching confidence (spec section 4):
//   Level 1 — exact tracking/waybill number match           -> HIGH
//   Level 2 — exact order ID / order reference match         -> HIGH
//   Level 3 — partial identifier + COD amount combination    -> MEDIUM
//   Level 4 — fuzzy match on name/phone/amount/date          -> LOW
// A LOW confidence match is NEVER auto-confirmed — reconcile.ts always routes
// it to NEEDS_REVIEW regardless of whether the amounts happen to agree.

import { similarity } from '../import/fuzzy'
import type { JntVipMatchConfidence, JntVipMatchMethod, JntVipPosOrderRow, JntVipShipmentRow } from './types'

export interface JntVipPairing {
  posOrderId: number
  shipmentId: number
  method: JntVipMatchMethod
  confidence: JntVipMatchConfidence
}

export interface JntVipMatchResult {
  pairings: JntVipPairing[]
  unmatchedPos: JntVipPosOrderRow[]
  unmatchedShipments: JntVipShipmentRow[]
  duplicatePosIds: number[]
  duplicateShipmentIds: number[]
}

function normKey(s: string | null | undefined): string | null {
  if (!s) return null
  const n = s.trim().toUpperCase().replace(/[\s\-_.]/g, '')
  return n || null
}

function last4(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : null
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  const da = new Date(a).getTime()
  const db_ = new Date(b).getTime()
  if (Number.isNaN(da) || Number.isNaN(db_)) return null
  return Math.abs(da - db_) / 86_400_000
}

function amountClose(a: number | null, b: number | null, tolerance = 5): boolean {
  if (a === null || b === null) return false
  return Math.abs(a - b) <= tolerance
}

/** Groups rows by a key derived from tracking number (falling back to order id/ref),
 *  returning ids of every row after the first in each group with more than one member. */
function findDuplicateIds<T extends { id?: number }>(rows: T[], keyOf: (r: T) => string | null): number[] {
  const seen = new Map<string, number>()
  const dupIds: number[] = []
  for (const r of rows) {
    if (r.id == null) continue
    const key = keyOf(r)
    if (!key) continue
    if (seen.has(key)) {
      dupIds.push(r.id)
    } else {
      seen.set(key, r.id)
    }
  }
  return dupIds
}

export function detectPosDuplicates(posOrders: JntVipPosOrderRow[]): number[] {
  return findDuplicateIds(posOrders, (p) => normKey(p.trackingNumber) ?? normKey(p.orderId))
}

export function detectShipmentDuplicates(shipments: JntVipShipmentRow[]): number[] {
  return findDuplicateIds(shipments, (s) => normKey(s.trackingNumber) ?? normKey(s.orderReference))
}

export function computeMatches(posOrders: JntVipPosOrderRow[], shipments: JntVipShipmentRow[]): JntVipMatchResult {
  const duplicatePosIds = detectPosDuplicates(posOrders)
  const duplicateShipmentIds = detectShipmentDuplicates(shipments)
  const dupPosSet = new Set(duplicatePosIds)
  const dupShipmentSet = new Set(duplicateShipmentIds)

  // Duplicates are pulled out of the matching pool entirely — they get their own
  // DUPLICATE match row in reconcile.ts rather than competing for a pairing.
  const posPool = posOrders.filter((p) => p.id != null && !dupPosSet.has(p.id))
  const shipmentPool = shipments.filter((s) => s.id != null && !dupShipmentSet.has(s.id))

  const pairings: JntVipPairing[] = []
  const usedPos = new Set<number>()
  const usedShipments = new Set<number>()

  function pair(posId: number, shipmentId: number, method: JntVipMatchMethod, confidence: JntVipMatchConfidence) {
    pairings.push({ posOrderId: posId, shipmentId, method, confidence })
    usedPos.add(posId)
    usedShipments.add(shipmentId)
  }

  // ---- Level 1: exact tracking number -------------------------------------
  const shipmentsByTracking = new Map<string, JntVipShipmentRow[]>()
  for (const s of shipmentPool) {
    const key = normKey(s.trackingNumber)
    if (!key) continue
    const arr = shipmentsByTracking.get(key) ?? []
    arr.push(s)
    shipmentsByTracking.set(key, arr)
  }
  for (const p of posPool) {
    if (p.id == null || usedPos.has(p.id)) continue
    const key = normKey(p.trackingNumber)
    if (!key) continue
    const candidates = (shipmentsByTracking.get(key) ?? []).filter((s) => s.id != null && !usedShipments.has(s.id!))
    if (candidates.length > 0) pair(p.id, candidates[0].id!, 'tracking', 'HIGH')
  }

  // ---- Level 2: exact order ID / order reference ---------------------------
  const shipmentsByOrderRef = new Map<string, JntVipShipmentRow[]>()
  for (const s of shipmentPool) {
    const key = normKey(s.orderReference)
    if (!key) continue
    const arr = shipmentsByOrderRef.get(key) ?? []
    arr.push(s)
    shipmentsByOrderRef.set(key, arr)
  }
  for (const p of posPool) {
    if (p.id == null || usedPos.has(p.id)) continue
    const key = normKey(p.orderId)
    if (!key) continue
    const candidates = (shipmentsByOrderRef.get(key) ?? []).filter((s) => s.id != null && !usedShipments.has(s.id!))
    if (candidates.length > 0) pair(p.id, candidates[0].id!, 'order-id', 'HIGH')
  }

  // ---- Level 3: partial identifier + COD amount combo ----------------------
  const remainingPosL3 = posPool.filter((p) => p.id != null && !usedPos.has(p.id))
  const remainingShipmentsL3 = shipmentPool.filter((s) => s.id != null && !usedShipments.has(s.id!))
  function sharesSuffix(a: string | null, b: string | null, len = 6): boolean {
    const na = normKey(a)
    const nb = normKey(b)
    if (!na || !nb || na.length < len || nb.length < len) return false
    return na.slice(-len) === nb.slice(-len)
  }
  for (const p of remainingPosL3) {
    if (p.id == null || usedPos.has(p.id)) continue
    const candidate = remainingShipmentsL3.find((s) => {
      if (s.id == null || usedShipments.has(s.id)) return false
      const idMatch = sharesSuffix(p.trackingNumber, s.trackingNumber) || sharesSuffix(p.orderId, s.orderReference)
      if (!idMatch) return false
      return amountClose(p.codAmountExpected, s.codCollected)
    })
    if (candidate) pair(p.id, candidate.id!, 'combo', 'MEDIUM')
  }

  // ---- Level 4: fuzzy (name + phone + amount + date) — always NEEDS_REVIEW --
  const remainingPosL4 = posPool.filter((p) => p.id != null && !usedPos.has(p.id))
  const remainingShipmentsL4 = shipmentPool.filter((s) => s.id != null && !usedShipments.has(s.id!))
  const FUZZY_THRESHOLD = 0.55
  const scored: { posId: number; shipmentId: number; score: number }[] = []
  for (const p of remainingPosL4) {
    if (p.id == null) continue
    for (const s of remainingShipmentsL4) {
      if (s.id == null) continue
      let score = 0
      if (p.customerName && s.consignee) score += similarity(p.customerName, s.consignee) * 0.5
      if (last4(p.customerPhone) && last4(p.customerPhone) === last4(s.phone)) score += 0.25
      if (amountClose(p.codAmountExpected, s.codCollected, 1)) score += 0.15
      const days = daysBetween(p.shipDate ?? p.orderDate, s.shipDate)
      if (days !== null && days <= 5) score += 0.1 * (1 - days / 5)
      if (score >= FUZZY_THRESHOLD) scored.push({ posId: p.id, shipmentId: s.id, score })
    }
  }
  scored.sort((a, b) => b.score - a.score)
  for (const { posId, shipmentId } of scored) {
    if (usedPos.has(posId) || usedShipments.has(shipmentId)) continue
    pair(posId, shipmentId, 'fuzzy', 'LOW')
  }

  const unmatchedPos = posOrders.filter((p) => p.id != null && !usedPos.has(p.id) && !dupPosSet.has(p.id))
  const unmatchedShipments = shipments.filter((s) => s.id != null && !usedShipments.has(s.id) && !dupShipmentSet.has(s.id))

  return { pairings, unmatchedPos, unmatchedShipments, duplicatePosIds, duplicateShipmentIds }
}
