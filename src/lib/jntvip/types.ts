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
