// J&T VIP Fulfillment Reconciliation — types.
//
// This module is deliberately independent from src/lib/types.ts and db.ts's
// NPMCM-era tables (orders, soaReconciliation, posReconciliation, etc). J&T
// VIP is a separate fulfillment partner with its own POS/SOA data, its own
// matching engine, and its own audit trail. Nothing here reads or writes any
// NPMCM table.

export type JntVipMatchMethod = 'tracking' | 'order-id' | 'combo' | 'fuzzy' | 'manual' | 'none'

export type JntVipMatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export type JntVipReconStatus =
  | 'MATCHED'
  | 'NEEDS_REVIEW'
  | 'MISMATCH'
  | 'JNT_ONLY'
  | 'POS_ONLY'
  | 'DUPLICATE'

export type JntVipDiscrepancyType =
  | 'COD_MISMATCH'
  | 'SHIPPING_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'MISSING_FROM_JNT'
  | 'MISSING_FROM_POS'
  | 'DUPLICATE'

export type JntVipManualStatus = 'confirmed' | 'rejected' | 'duplicate' | 'expected-difference' | 'ignored' | null

// ---------------------------------------------------------------------------
// Raw + normalized import rows
// ---------------------------------------------------------------------------

/** One row from an uploaded J&T VIP POS export, normalized but with the raw
 *  parsed record preserved verbatim in `raw` for audit purposes. */
export interface JntVipPosOrderRow {
  id?: number
  batchId: number
  orderId: string | null
  trackingNumber: string | null
  customerName: string | null
  customerPhone: string | null
  productName: string | null
  orderDate: string | null
  shipDate: string | null
  status: string | null
  productAmount: number | null
  shippingFeeExpected: number | null
  discount: number | null
  codAmountExpected: number | null
  quantity: number | null
  notes: string | null
  raw: Record<string, unknown>
}

/** One row from an uploaded J&T VIP SOA (Statement of Account). */
export interface JntVipShipmentRow {
  id?: number
  batchId: number
  trackingNumber: string | null
  orderReference: string | null
  consignee: string | null
  phone: string | null
  shipDate: string | null
  deliveryDate: string | null
  status: string | null
  codCollected: number | null
  shippingCharge: number | null
  codFee: number | null
  returnFee: number | null
  otherFees: number | null
  adjustments: number | null
  netSettlement: number | null
  settlementDate: string | null
  settlementReference: string | null
  raw: Record<string, unknown>
}

export interface JntVipImportBatchRow {
  id?: number
  kind: 'pos' | 'soa'
  soaLabel: string | null
  fileName: string
  importedAt: string
  periodStart: string | null
  periodEnd: string | null
  recordsImported: number
  recordsSkipped: number
  status: 'success' | 'partial' | 'failed' | 'reversed'
  summary: string
  reversedAt?: string | null
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export interface JntVipMatchRow {
  id?: number
  posOrderId: number | null
  shipmentId: number | null
  soaBatchId: number | null
  matchMethod: JntVipMatchMethod
  matchConfidence: JntVipMatchConfidence | null
  status: JntVipReconStatus
  codDifference: number | null
  shippingDifference: number | null
  totalPosExpected: number | null
  totalJntAmount: number | null
  totalDifference: number | null
  statusMismatch: boolean
  discrepancyTypes: JntVipDiscrepancyType[]
  manualStatus: JntVipManualStatus
  reviewedBy: string | null
  reviewDate: string | null
  notes: string | null
}

export interface JntVipAuditLogRow {
  id?: number
  timestamp: string
  matchId: number | null
  action: string
  previousValue: unknown
  newValue: unknown
  reviewedBy: string | null
  note: string | null
}

// ---------------------------------------------------------------------------
// Import drafts (pre-commit, shown in Upload -> Preview -> Validate -> Import)
// ---------------------------------------------------------------------------

export interface JntVipPosDraft {
  key: string
  orderId: string | null
  trackingNumber: string | null
  customerName: string | null
  customerPhone: string | null
  productName: string | null
  orderDate: string | null
  shipDate: string | null
  status: string | null
  productAmount: number | null
  shippingFeeExpected: number | null
  discount: number | null
  codAmountExpected: number | null
  quantity: number | null
  notes: string | null
  raw: Record<string, unknown>
  include: boolean
  isDuplicateInFile: boolean
  missingRequiredFields: boolean
}

export interface JntVipSoaDraft {
  key: string
  trackingNumber: string | null
  orderReference: string | null
  consignee: string | null
  phone: string | null
  shipDate: string | null
  deliveryDate: string | null
  status: string | null
  codCollected: number | null
  shippingCharge: number | null
  codFee: number | null
  returnFee: number | null
  otherFees: number | null
  adjustments: number | null
  netSettlement: number | null
  settlementDate: string | null
  settlementReference: string | null
  raw: Record<string, unknown>
  include: boolean
  isDuplicateInFile: boolean
  missingRequiredFields: boolean
}

export interface JntVipPostSummary {
  recordsPosted: number
  recordsSkipped: number
  messages: string[]
}

/**
 * One parcel from the J&T "My Waybill" export. Keyed on the waybill number,
 * which is the only identifier the SOA and the POS both carry.
 *
 * `raw` keeps the original parsed row verbatim so nothing imported is ever
 * lost to a mapping decision made later.
 */
export interface JntVipParcelRow {
  id?: number
  awb: string
  status: 'DELIVERED' | 'RETURNED' | 'FOR_RETURN' | 'DELIVERING' | 'IN_TRANSIT' | 'OTHER'
  /** Exactly what J&T called it, kept because their vocabulary can change. */
  rawStatus: string
  podAt: string | null
  podDate: string | null
  shipAt: string | null
  shipDate: string | null
  cod: number
  shippingCost: number
  freight: number
  weight: number
  province: string | null
  city: string | null
  receiver: string | null
  rtsReason: string | null
  remarks: string | null
  creatorCode: string | null
  updatedAt: string
  raw: unknown
}

/** A saved SOA verification, so a check can be revisited and compared later. */
export interface JntVipSoaCheckRow {
  id?: number
  soaNumber: string
  periodFrom: string
  periodTo: string
  checkedAt: string
  verdict: 'CLEAN' | 'DISCREPANCY' | 'INCOMPLETE'
  differenceTotal: number
  stated: unknown
  computed: unknown
  notes: string | null
}
