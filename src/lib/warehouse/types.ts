// Warehouse & Inventory Control — types.
//
// Independent of both the Digilex financial database and the J&T VIP
// reconciliation database. Nothing here reads or writes either.
//
// The central rule: a stock quantity is NEVER stored. Every balance is
// derived by summing the movement ledger, so the system can always explain
// how it arrived at a number rather than just asserting one.

/** Where stock physically (or notionally) sits. */
export type LocationKind = 'warehouse' | 'shelf' | 'fulfillment' | 'transit' | 'supplier' | 'virtual'

/**
 * The condition/availability of stock at a location. A unit is always in
 * exactly one state at one location; moving between states is a movement,
 * so "RTS inspected as damaged" is an auditable event, not a silent edit.
 */
export type InventoryState =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'IN_FULFILLMENT'
  | 'IN_TRANSIT'
  | 'RTS'
  | 'FOR_INSPECTION'
  | 'DAMAGED'
  | 'DEFECTIVE'
  | 'MISSING'
  | 'LOST'
  | 'QUARANTINE'
  | 'EXPIRED'
  | 'DISPOSED'

export const INVENTORY_STATES: InventoryState[] = [
  'AVAILABLE',
  'RESERVED',
  'IN_FULFILLMENT',
  'IN_TRANSIT',
  'RTS',
  'FOR_INSPECTION',
  'DAMAGED',
  'DEFECTIVE',
  'MISSING',
  'LOST',
  'QUARANTINE',
  'EXPIRED',
  'DISPOSED',
]

/** States whose units can actually be sold. */
export const SELLABLE_STATES: InventoryState[] = ['AVAILABLE']

/** States that count as physically owned stock (excludes write-offs). */
export const PHYSICAL_STATES: InventoryState[] = [
  'AVAILABLE',
  'RESERVED',
  'IN_FULFILLMENT',
  'IN_TRANSIT',
  'RTS',
  'FOR_INSPECTION',
  'DAMAGED',
  'DEFECTIVE',
  'QUARANTINE',
  'EXPIRED',
]

/** States representing stock that exists but cannot be sold as-is. */
export const UNSELLABLE_STATES: InventoryState[] = ['DAMAGED', 'DEFECTIVE', 'QUARANTINE', 'EXPIRED']

export type MovementType =
  | 'RECEIPT'
  | 'FULFILLMENT_OUT'
  | 'RTS_IN'
  | 'INSPECTION'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT'
  | 'RESERVATION'
  | 'RELEASE'
  | 'SALE'
  | 'DAMAGE'
  | 'LOSS'
  | 'DISPOSAL'

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  RECEIPT: 'Received',
  FULFILLMENT_OUT: 'Sent to fulfillment',
  RTS_IN: 'RTS received',
  INSPECTION: 'Inspection result',
  TRANSFER_OUT: 'Transfer sent',
  TRANSFER_IN: 'Transfer received',
  ADJUSTMENT: 'Adjustment',
  RESERVATION: 'Reserved',
  RELEASE: 'Reservation released',
  SALE: 'Sold / shipped to customer',
  DAMAGE: 'Damage recorded',
  LOSS: 'Loss recorded',
  DISPOSAL: 'Disposed',
}

export interface ProductRow {
  id?: number
  sku: string
  name: string
  variant: string | null
  category: string | null
  brand: string | null
  supplier: string | null
  unitCost: number | null
  sellingPrice: number | null
  unit: string | null
  barcode: string | null
  minStockLevel: number | null
  reorderPoint: number | null
  targetStockLevel: number | null
  defaultLocationId: number | null
  tracksExpiry: boolean
  active: boolean
  notes: string | null
}

export interface LocationRow {
  id?: number
  name: string
  kind: LocationKind
  parentId: number | null
  active: boolean
  notes: string | null
}

/**
 * One ledger entry. Quantity is always positive; direction comes from the
 * from/to pair. A null `from` means the stock entered the business (supplier
 * receipt); a null `to` means it left it (sold, disposed).
 *
 * `groupId` ties the legs of one logical operation together so a transfer or
 * an inspection split can be read — and reversed — as a single act.
 */
export interface MovementRow {
  id?: number
  timestamp: string
  productId: number
  quantity: number
  type: MovementType
  fromLocationId: number | null
  fromState: InventoryState | null
  toLocationId: number | null
  toState: InventoryState | null
  reference: string | null
  source: string | null
  reason: string | null
  notes: string | null
  user: string | null
  batchNo: string | null
  expiryDate: string | null
  unitCost: number | null
  groupId: string | null
}

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrderRow {
  id?: number
  poNumber: string
  supplier: string | null
  status: PurchaseOrderStatus
  orderDate: string | null
  expectedDate: string | null
  notes: string | null
  createdAt: string
}

export interface PurchaseOrderItemRow {
  id?: number
  poId: number
  productId: number
  quantityOrdered: number
  quantityReceived: number
  unitCost: number | null
}

export type RtsInspectionResult = 'GOOD' | 'DAMAGED' | 'DEFECTIVE' | 'MISSING_PARTS' | 'UNSELLABLE' | null

export interface RtsReturnRow {
  id?: number
  trackingNumber: string | null
  orderId: string | null
  customer: string | null
  productId: number | null
  quantity: number
  originalShipDate: string | null
  returnDate: string | null
  returnReason: string | null
  fulfillmentPartner: string | null
  locationId: number | null
  status: 'FOR_INSPECTION' | 'INSPECTED'
  inspectionResult: RtsInspectionResult
  inspector: string | null
  inspectionDate: string | null
  inspectionNotes: string | null
}

export interface StockCountRow {
  id?: number
  countDate: string
  locationId: number | null
  status: 'OPEN' | 'COMPLETED'
  countedBy: string | null
  notes: string | null
  createdAt: string
}

export interface StockCountItemRow {
  id?: number
  countId: number
  productId: number
  systemQuantity: number
  countedQuantity: number | null
  reason: string | null
  notes: string | null
}

export interface WarehouseAuditLogRow {
  id?: number
  timestamp: string
  entity: string
  entityId: number | null
  action: string
  previousValue: unknown
  newValue: unknown
  user: string | null
  reason: string | null
}

/** Thrown when an outbound movement would drive a balance negative. */
export class InsufficientStockError extends Error {
  available: number
  requested: number

  constructor(available: number, requested: number) {
    super(`Insufficient stock — available ${available}, requested ${requested}, short ${requested - available}.`)
    this.name = 'InsufficientStockError'
    this.available = available
    this.requested = requested
  }
}
