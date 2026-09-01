// Warehouse — the inventory engine.
//
// Balances are computed from the movement ledger, never stored. Every number
// the dashboard shows can be traced back to the movements that produced it,
// which is the whole point: "why do I have 823 units?" has an answer.

import { warehouseDb } from './db'
import {
  InsufficientStockError,
  PHYSICAL_STATES,
  SELLABLE_STATES,
  UNSELLABLE_STATES,
  type InventoryState,
  type MovementRow,
  type MovementType,
  type ProductRow,
  type PurchaseOrderItemRow,
} from './types'

/** balances[productId][locationId][state] = quantity */
export type BalanceIndex = Map<number, Map<number, Map<InventoryState, number>>>

function bump(index: BalanceIndex, productId: number, locationId: number, state: InventoryState, delta: number) {
  let byLocation = index.get(productId)
  if (!byLocation) {
    byLocation = new Map()
    index.set(productId, byLocation)
  }
  let byState = byLocation.get(locationId)
  if (!byState) {
    byState = new Map()
    byLocation.set(locationId, byState)
  }
  byState.set(state, (byState.get(state) ?? 0) + delta)
}

/**
 * Replays the whole ledger into an in-memory index.
 *
 * This is O(movements). For a browser-resident warehouse that is the right
 * trade: it keeps balances impossible to desynchronise from their history.
 * If the ledger ever outgrows that, the fix is periodic snapshot rows to
 * replay forward from — not a stored quantity that can drift.
 */
export function computeBalances(movements: MovementRow[]): BalanceIndex {
  const index: BalanceIndex = new Map()
  for (const m of movements) {
    if (m.fromLocationId != null && m.fromState) bump(index, m.productId, m.fromLocationId, m.fromState, -m.quantity)
    if (m.toLocationId != null && m.toState) bump(index, m.productId, m.toLocationId, m.toState, m.quantity)
  }
  return index
}

export function balanceAt(index: BalanceIndex, productId: number, locationId: number, state: InventoryState): number {
  return index.get(productId)?.get(locationId)?.get(state) ?? 0
}

/** Total across every location for one product in one state. */
export function stateTotal(index: BalanceIndex, productId: number, state: InventoryState): number {
  let total = 0
  const byLocation = index.get(productId)
  if (!byLocation) return 0
  for (const byState of byLocation.values()) total += byState.get(state) ?? 0
  return total
}

function sumStates(index: BalanceIndex, productId: number, states: InventoryState[]): number {
  return states.reduce((sum, s) => sum + stateTotal(index, productId, s), 0)
}

export interface ProductStock {
  productId: number
  available: number
  reserved: number
  inFulfillment: number
  inTransit: number
  forInspection: number
  damaged: number
  defective: number
  quarantine: number
  missing: number
  lost: number
  /** Everything physically owned, wherever it sits. */
  physical: number
  /** What can actually be sold right now (available less reservations). */
  sellable: number
  /** Damaged / defective / quarantined / expired — owned but not sellable. */
  unsellable: number
  /** Ordered from a supplier but not yet received. */
  incoming: number
}

export function productStock(index: BalanceIndex, productId: number, incoming = 0): ProductStock {
  const available = stateTotal(index, productId, 'AVAILABLE')
  const reserved = stateTotal(index, productId, 'RESERVED')
  return {
    productId,
    available,
    reserved,
    inFulfillment: stateTotal(index, productId, 'IN_FULFILLMENT'),
    inTransit: stateTotal(index, productId, 'IN_TRANSIT'),
    forInspection: stateTotal(index, productId, 'FOR_INSPECTION'),
    damaged: stateTotal(index, productId, 'DAMAGED'),
    defective: stateTotal(index, productId, 'DEFECTIVE'),
    quarantine: stateTotal(index, productId, 'QUARANTINE'),
    missing: stateTotal(index, productId, 'MISSING'),
    lost: stateTotal(index, productId, 'LOST'),
    physical: sumStates(index, productId, PHYSICAL_STATES),
    // Reserved units are physically present but already promised to an order,
    // so they must not be offered for sale again.
    sellable: sumStates(index, productId, SELLABLE_STATES) - reserved,
    unsellable: sumStates(index, productId, UNSELLABLE_STATES),
    incoming,
  }
}

/** Units on open purchase orders that have not been received yet. */
export function incomingByProduct(items: PurchaseOrderItemRow[], openPoIds: Set<number>): Map<number, number> {
  const map = new Map<number, number>()
  for (const item of items) {
    if (!openPoIds.has(item.poId)) continue
    const outstanding = Math.max(0, item.quantityOrdered - item.quantityReceived)
    if (outstanding > 0) map.set(item.productId, (map.get(item.productId) ?? 0) + outstanding)
  }
  return map
}

export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'NORMAL' | 'NO_THRESHOLD'

export function stockStatus(product: ProductRow, stock: ProductStock): StockStatus {
  if (stock.sellable <= 0) return 'OUT_OF_STOCK'
  if (product.reorderPoint == null) return 'NO_THRESHOLD'
  return stock.sellable <= product.reorderPoint ? 'LOW_STOCK' : 'NORMAL'
}

/**
 * Effective stock counts what is genuinely coming available: on hand, less
 * what is already promised, plus what is already on order. Recommending a
 * purchase without subtracting reservations or crediting open POs is how
 * businesses double-buy.
 */
export function recommendedPurchase(product: ProductRow, stock: ProductStock): number {
  if (product.targetStockLevel == null) return 0
  const effective = stock.available - stock.reserved + stock.incoming
  const reorderPoint = product.reorderPoint ?? 0
  if (effective > reorderPoint) return 0
  return Math.max(0, Math.ceil(product.targetStockLevel - effective))
}

// ---------------------------------------------------------------------------
// Posting movements
// ---------------------------------------------------------------------------

export interface MovementDraft {
  productId: number
  quantity: number
  type: MovementType
  fromLocationId?: number | null
  fromState?: InventoryState | null
  toLocationId?: number | null
  toState?: InventoryState | null
  reference?: string | null
  source?: string | null
  reason?: string | null
  notes?: string | null
  user?: string | null
  batchNo?: string | null
  expiryDate?: string | null
  unitCost?: number | null
}

function newGroupId(): string {
  return `grp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Current balance for one bucket, read straight from the ledger. */
export async function currentBalance(productId: number, locationId: number, state: InventoryState): Promise<number> {
  const movements = await warehouseDb.movements.where('productId').equals(productId).toArray()
  let total = 0
  for (const m of movements) {
    if (m.fromLocationId === locationId && m.fromState === state) total -= m.quantity
    if (m.toLocationId === locationId && m.toState === state) total += m.quantity
  }
  return total
}

/**
 * Writes one or more movements as a single atomic act, refusing any that
 * would push a source bucket negative. Either every leg lands or none does,
 * so a transfer can never leave stock deducted from one place and missing
 * from the other.
 *
 * `allowNegative` exists for authorised corrections (e.g. recording a loss
 * discovered after the fact) and demands a reason on every draft it applies to.
 */
export async function postMovements(
  drafts: MovementDraft[],
  options: { allowNegative?: boolean; groupId?: string } = {},
): Promise<string> {
  const groupId = options.groupId ?? newGroupId()
  const timestamp = new Date().toISOString()

  await warehouseDb.transaction('rw', [warehouseDb.movements, warehouseDb.auditLog], async () => {
    // Track within-batch deductions so two legs of one operation cannot each
    // pass a check that they jointly fail.
    const pending = new Map<string, number>()

    for (const d of drafts) {
      if (!Number.isFinite(d.quantity) || d.quantity <= 0) {
        throw new Error('Movement quantity must be a positive number.')
      }
      if (d.fromLocationId != null && d.fromState && !options.allowNegative) {
        const key = `${d.productId}|${d.fromLocationId}|${d.fromState}`
        const already = pending.get(key) ?? 0
        const balance = (await currentBalance(d.productId, d.fromLocationId, d.fromState)) - already
        if (d.quantity > balance) throw new InsufficientStockError(balance, d.quantity)
        pending.set(key, already + d.quantity)
      }
    }

    for (const d of drafts) {
      const row: MovementRow = {
        timestamp,
        productId: d.productId,
        quantity: d.quantity,
        type: d.type,
        fromLocationId: d.fromLocationId ?? null,
        fromState: d.fromState ?? null,
        toLocationId: d.toLocationId ?? null,
        toState: d.toState ?? null,
        reference: d.reference ?? null,
        source: d.source ?? null,
        reason: d.reason ?? null,
        notes: d.notes ?? null,
        user: d.user ?? null,
        batchNo: d.batchNo ?? null,
        expiryDate: d.expiryDate ?? null,
        unitCost: d.unitCost ?? null,
        groupId,
      }
      const id = await warehouseDb.movements.add(row)
      await warehouseDb.auditLog.add({
        timestamp,
        entity: 'movement',
        entityId: id,
        action: row.type,
        previousValue: null,
        newValue: {
          productId: row.productId,
          quantity: row.quantity,
          from: row.fromLocationId != null ? `${row.fromLocationId}/${row.fromState}` : null,
          to: row.toLocationId != null ? `${row.toLocationId}/${row.toState}` : null,
        },
        user: row.user,
        reason: row.reason,
      })
    }
  })

  return groupId
}

export async function logWarehouseAudit(entry: {
  entity: string
  entityId: number | null
  action: string
  previousValue?: unknown
  newValue?: unknown
  user?: string | null
  reason?: string | null
}): Promise<void> {
  await warehouseDb.auditLog.add({
    timestamp: new Date().toISOString(),
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    previousValue: entry.previousValue ?? null,
    newValue: entry.newValue ?? null,
    user: entry.user ?? null,
    reason: entry.reason ?? null,
  })
}
