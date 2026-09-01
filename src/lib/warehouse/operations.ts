// Warehouse — the operations. Each function is one business act expressed as
// ledger movements, posted atomically. None of them edit a quantity directly.

import { warehouseDb } from './db'
import { postMovements, logWarehouseAudit, type MovementDraft } from './inventory'
import type { InventoryState, RtsInspectionResult, PurchaseOrderStatus } from './types'

// ---------------------------------------------------------------------------
// Receiving
// ---------------------------------------------------------------------------

export interface ReceiveInput {
  productId: number
  locationId: number
  expectedQuantity: number | null
  receivedQuantity: number
  damagedQuantity: number
  supplier: string | null
  reference: string | null
  batchNo: string | null
  expiryDate: string | null
  unitCost: number | null
  user: string
  notes: string | null
  poId?: number | null
}

export interface ReceiveResult {
  groupId: string
  goodQuantity: number
  damagedQuantity: number
  /** received + damaged vs expected; negative means short delivery. */
  discrepancy: number | null
}

/**
 * Records a delivery. Good units land as AVAILABLE, damaged ones as DAMAGED
 * (never silently folded into sellable stock), and a short count against an
 * expected quantity is surfaced rather than absorbed.
 */
export async function receiveInventory(input: ReceiveInput): Promise<ReceiveResult> {
  const good = Math.max(0, input.receivedQuantity - input.damagedQuantity)
  if (input.receivedQuantity <= 0) throw new Error('Received quantity must be greater than zero.')
  if (input.damagedQuantity > input.receivedQuantity) {
    throw new Error('Damaged quantity cannot exceed the received quantity.')
  }

  const drafts: MovementDraft[] = []
  if (good > 0) {
    drafts.push({
      productId: input.productId,
      quantity: good,
      type: 'RECEIPT',
      toLocationId: input.locationId,
      toState: 'AVAILABLE',
      reference: input.reference,
      source: input.supplier,
      user: input.user,
      batchNo: input.batchNo,
      expiryDate: input.expiryDate,
      unitCost: input.unitCost,
      notes: input.notes,
    })
  }
  if (input.damagedQuantity > 0) {
    drafts.push({
      productId: input.productId,
      quantity: input.damagedQuantity,
      type: 'RECEIPT',
      toLocationId: input.locationId,
      toState: 'DAMAGED',
      reference: input.reference,
      source: input.supplier,
      user: input.user,
      reason: 'Damaged on arrival',
      batchNo: input.batchNo,
      expiryDate: input.expiryDate,
      unitCost: input.unitCost,
      notes: input.notes,
    })
  }

  const groupId = await postMovements(drafts)

  if (input.poId != null) {
    const items = await warehouseDb.purchaseOrderItems.where('poId').equals(input.poId).toArray()
    const item = items.find((i) => i.productId === input.productId)
    if (item?.id != null) {
      await warehouseDb.purchaseOrderItems.update(item.id, {
        quantityReceived: item.quantityReceived + input.receivedQuantity,
      })
    }
    await refreshPurchaseOrderStatus(input.poId)
  }

  const expected = input.expectedQuantity
  return {
    groupId,
    goodQuantity: good,
    damagedQuantity: input.damagedQuantity,
    discrepancy: expected == null ? null : input.receivedQuantity - expected,
  }
}

// ---------------------------------------------------------------------------
// Fulfillment outbound
// ---------------------------------------------------------------------------

export async function sendToFulfillment(input: {
  productId: number
  quantity: number
  fromLocationId: number
  fulfillmentLocationId: number
  reference: string | null
  user: string
  notes: string | null
}): Promise<string> {
  return postMovements([
    {
      productId: input.productId,
      quantity: input.quantity,
      type: 'FULFILLMENT_OUT',
      fromLocationId: input.fromLocationId,
      fromState: 'AVAILABLE',
      toLocationId: input.fulfillmentLocationId,
      toState: 'IN_FULFILLMENT',
      reference: input.reference,
      user: input.user,
      notes: input.notes,
    },
  ])
}

// ---------------------------------------------------------------------------
// RTS / returns
// ---------------------------------------------------------------------------

/**
 * Books a returned parcel back in as FOR_INSPECTION — deliberately not as
 * AVAILABLE. Nothing returns to sellable stock until a human has looked at it.
 */
export async function receiveRts(input: {
  productId: number
  quantity: number
  warehouseLocationId: number
  fulfillmentLocationId: number | null
  trackingNumber: string | null
  orderId: string | null
  customer: string | null
  originalShipDate: string | null
  returnDate: string | null
  returnReason: string | null
  fulfillmentPartner: string | null
  user: string
}): Promise<number> {
  await postMovements([
    {
      productId: input.productId,
      quantity: input.quantity,
      type: 'RTS_IN',
      // Only deduct from the partner's balance when we know they held it;
      // otherwise treat the return as entering from outside the system.
      fromLocationId: input.fulfillmentLocationId,
      fromState: input.fulfillmentLocationId != null ? 'IN_FULFILLMENT' : null,
      toLocationId: input.warehouseLocationId,
      toState: 'FOR_INSPECTION',
      reference: input.trackingNumber,
      source: input.fulfillmentPartner,
      reason: input.returnReason,
      user: input.user,
    },
  ], { allowNegative: input.fulfillmentLocationId == null })

  return warehouseDb.rtsReturns.add({
    trackingNumber: input.trackingNumber,
    orderId: input.orderId,
    customer: input.customer,
    productId: input.productId,
    quantity: input.quantity,
    originalShipDate: input.originalShipDate,
    returnDate: input.returnDate,
    returnReason: input.returnReason,
    fulfillmentPartner: input.fulfillmentPartner,
    locationId: input.warehouseLocationId,
    status: 'FOR_INSPECTION',
    inspectionResult: null,
    inspector: null,
    inspectionDate: null,
    inspectionNotes: null,
  })
}

const INSPECTION_TARGET_STATE: Record<Exclude<RtsInspectionResult, null>, InventoryState> = {
  GOOD: 'AVAILABLE',
  DAMAGED: 'DAMAGED',
  DEFECTIVE: 'DEFECTIVE',
  MISSING_PARTS: 'QUARANTINE',
  UNSELLABLE: 'DISPOSED',
}

/** Moves an inspected return out of FOR_INSPECTION into whatever it really is. */
export async function inspectRts(input: {
  rtsId: number
  result: Exclude<RtsInspectionResult, null>
  inspector: string
  notes: string | null
}): Promise<void> {
  const rts = await warehouseDb.rtsReturns.get(input.rtsId)
  if (!rts) throw new Error('RTS record not found.')
  if (rts.status === 'INSPECTED') throw new Error('This return has already been inspected.')
  if (rts.productId == null || rts.locationId == null) {
    throw new Error('This return has no product or location set, so it cannot be inspected.')
  }

  await postMovements([
    {
      productId: rts.productId,
      quantity: rts.quantity,
      type: 'INSPECTION',
      fromLocationId: rts.locationId,
      fromState: 'FOR_INSPECTION',
      toLocationId: rts.locationId,
      toState: INSPECTION_TARGET_STATE[input.result],
      reference: rts.trackingNumber,
      reason: `RTS inspection: ${input.result}`,
      user: input.inspector,
      notes: input.notes,
    },
  ])

  await warehouseDb.rtsReturns.update(input.rtsId, {
    status: 'INSPECTED',
    inspectionResult: input.result,
    inspector: input.inspector,
    inspectionDate: new Date().toISOString(),
    inspectionNotes: input.notes,
  })

  await logWarehouseAudit({
    entity: 'rtsReturn',
    entityId: input.rtsId,
    action: 'Inspected',
    previousValue: { status: 'FOR_INSPECTION' },
    newValue: { status: 'INSPECTED', result: input.result },
    user: input.inspector,
    reason: input.notes,
  })
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

/**
 * Sends stock into IN_TRANSIT at the destination. The destination's available
 * balance deliberately does not move until someone receives it, so stock can
 * never appear in two places at once.
 */
export async function sendTransfer(input: {
  productId: number
  quantity: number
  fromLocationId: number
  toLocationId: number
  reference: string | null
  user: string
  notes: string | null
}): Promise<string> {
  return postMovements([
    {
      productId: input.productId,
      quantity: input.quantity,
      type: 'TRANSFER_OUT',
      fromLocationId: input.fromLocationId,
      fromState: 'AVAILABLE',
      toLocationId: input.toLocationId,
      toState: 'IN_TRANSIT',
      reference: input.reference,
      user: input.user,
      notes: input.notes,
    },
  ])
}

/** Receives a transfer, recording any shortfall as MISSING rather than losing it. */
export async function receiveTransfer(input: {
  productId: number
  sentQuantity: number
  receivedQuantity: number
  toLocationId: number
  reference: string | null
  user: string
  notes: string | null
}): Promise<{ groupId: string; missing: number }> {
  const missing = Math.max(0, input.sentQuantity - input.receivedQuantity)
  const drafts: MovementDraft[] = []

  if (input.receivedQuantity > 0) {
    drafts.push({
      productId: input.productId,
      quantity: input.receivedQuantity,
      type: 'TRANSFER_IN',
      fromLocationId: input.toLocationId,
      fromState: 'IN_TRANSIT',
      toLocationId: input.toLocationId,
      toState: 'AVAILABLE',
      reference: input.reference,
      user: input.user,
      notes: input.notes,
    })
  }
  if (missing > 0) {
    drafts.push({
      productId: input.productId,
      quantity: missing,
      type: 'TRANSFER_IN',
      fromLocationId: input.toLocationId,
      fromState: 'IN_TRANSIT',
      toLocationId: input.toLocationId,
      toState: 'MISSING',
      reference: input.reference,
      reason: 'Transfer shortfall — sent more than arrived',
      user: input.user,
      notes: input.notes,
    })
  }

  const groupId = await postMovements(drafts)
  return { groupId, missing }
}

// ---------------------------------------------------------------------------
// Stock count adjustments
// ---------------------------------------------------------------------------

/**
 * Reconciles a counted quantity against the ledger by posting the difference
 * as an adjustment. The system quantity is never overwritten — the gap becomes
 * a movement with a reason attached, so the history explains itself.
 */
export async function applyCountAdjustment(input: {
  productId: number
  locationId: number
  systemQuantity: number
  countedQuantity: number
  reason: string
  user: string
  reference: string | null
  notes: string | null
}): Promise<{ difference: number; groupId: string | null }> {
  const difference = input.countedQuantity - input.systemQuantity
  if (difference === 0) return { difference: 0, groupId: null }

  const draft: MovementDraft =
    difference > 0
      ? {
          productId: input.productId,
          quantity: difference,
          type: 'ADJUSTMENT',
          toLocationId: input.locationId,
          toState: 'AVAILABLE',
          reason: input.reason,
          user: input.user,
          reference: input.reference,
          notes: input.notes,
        }
      : {
          productId: input.productId,
          quantity: -difference,
          type: 'ADJUSTMENT',
          fromLocationId: input.locationId,
          fromState: 'AVAILABLE',
          toLocationId: input.locationId,
          toState: 'MISSING',
          reason: input.reason,
          user: input.user,
          reference: input.reference,
          notes: input.notes,
        }

  const groupId = await postMovements([draft])
  return { difference, groupId }
}

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

export async function refreshPurchaseOrderStatus(poId: number): Promise<PurchaseOrderStatus | null> {
  const po = await warehouseDb.purchaseOrders.get(poId)
  if (!po || po.status === 'CANCELLED' || po.status === 'DRAFT') return po?.status ?? null

  const items = await warehouseDb.purchaseOrderItems.where('poId').equals(poId).toArray()
  const ordered = items.reduce((s, i) => s + i.quantityOrdered, 0)
  const received = items.reduce((s, i) => s + i.quantityReceived, 0)

  const status: PurchaseOrderStatus = received <= 0 ? 'ORDERED' : received >= ordered ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
  if (status !== po.status) {
    await warehouseDb.purchaseOrders.update(poId, { status })
    await logWarehouseAudit({
      entity: 'purchaseOrder',
      entityId: poId,
      action: 'Status changed',
      previousValue: { status: po.status },
      newValue: { status },
    })
  }
  return status
}

/** Statuses whose outstanding quantity still counts as incoming stock. */
export const OPEN_PO_STATUSES: PurchaseOrderStatus[] = ['ORDERED', 'PARTIALLY_RECEIVED']

// ---------------------------------------------------------------------------
// Production / assembly
// ---------------------------------------------------------------------------

/**
 * Assembles finished units from their components in one atomic act: every
 * component is consumed and the finished goods appear together, or nothing
 * happens at all. Component shortfalls are refused by postMovements' negative
 * check, which sees the whole batch — so a build cannot half-consume a recipe.
 */
export async function produceFinishedGoods(input: {
  finishedProductId: number
  quantity: number
  locationId: number
  reference: string | null
  user: string
  notes: string | null
}): Promise<{ groupId: string; consumed: { componentProductId: number; quantity: number }[] }> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Build quantity must be greater than zero.')
  }

  const lines = await warehouseDb.bom.where('finishedProductId').equals(input.finishedProductId).toArray()
  if (lines.length === 0) {
    throw new Error('This product has no bill of materials yet — add its components before building it.')
  }

  const consumed = lines.map((l) => ({ componentProductId: l.componentProductId, quantity: l.quantityPerUnit * input.quantity }))

  const drafts: MovementDraft[] = [
    ...consumed.map((c) => ({
      productId: c.componentProductId,
      quantity: c.quantity,
      type: 'PRODUCTION_CONSUME' as const,
      fromLocationId: input.locationId,
      fromState: 'AVAILABLE' as const,
      // No `to`: the component ceases to exist as itself once assembled.
      toLocationId: null,
      toState: null,
      reference: input.reference,
      reason: 'Consumed building finished goods',
      user: input.user,
      notes: input.notes,
    })),
    {
      productId: input.finishedProductId,
      quantity: input.quantity,
      type: 'PRODUCTION_OUTPUT',
      fromLocationId: null,
      fromState: null,
      toLocationId: input.locationId,
      toState: 'AVAILABLE',
      reference: input.reference,
      reason: 'Assembled from components',
      user: input.user,
      notes: input.notes,
    },
  ]

  const groupId = await postMovements(drafts)
  return { groupId, consumed }
}
