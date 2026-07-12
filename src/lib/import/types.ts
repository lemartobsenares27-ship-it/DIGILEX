export type ImportKind = 'bank-soa' | 'facebook-ads' | 'courier' | 'pancake-pos' | 'purchase-order'

export interface BankTxnDraft {
  key: string
  date: string | null
  valueDate: string | null
  referenceNumber: string | null
  description: string | null
  debit: number
  credit: number
  runningBalance: number | null
  category: string
  department: string
  include: boolean
  isDuplicate: boolean
}

export interface FBAdsRowDraft {
  key: string
  date: string | null
  campaign: string | null
  adSet: string | null
  adName: string | null
  amountSpent: number
  impressions: number | null
  reach: number | null
  linkClicks: number | null
  ctr: number | null
  cpc: number | null
  cpm: number | null
  results: number | null
  costPerResult: number | null
  roas: number | null
  frequency: number | null
  include: boolean
  isDuplicate: boolean
}

export type CourierName = 'Ninja Van' | 'J&T Express' | 'Entrego' | 'GogoXpress' | 'LBC' | 'Other'

export interface CourierTxnDraft {
  key: string
  courier: CourierName
  trackingNumber: string | null
  orderNumber: string | null
  recipient: string | null
  codAmount: number
  status: string | null
  deliveryDate: string | null
  remittanceDate: string | null
  remittanceReference: string | null
  remittanceAmount: number | null
  include: boolean
  matchedOrderId: number | null
}

export interface POSSaleDraft {
  key: string
  date: string | null
  orderId: string | null
  customerName: string | null
  customerPhone: string | null
  productNameRaw: string | null
  matchedProductSku: string | null
  quantity: number
  unitPrice: number
  totalAmount: number
  discount: number
  netAmount: number
  paymentMethod: string | null
  status: string | null
  courier: string | null
  trackingNumber: string | null
  codFee: number
  shippingFee: number
  notes: string | null
  /** Date the order's status last changed (e.g. Pancake's "Day updated") — used to
   *  set Delivered Date / RTS Date when the source file has no separate columns for those. */
  statusDate: string | null
  include: boolean
  isDuplicate: boolean
}

export interface PODraft {
  key: string
  productNameRaw: string | null
  matchedProductSku: string | null
  quantityReceived: number
  unitCost: number
  totalCost: number
  supplierName: string | null
  poNumber: string | null
  receivedDate: string | null
  include: boolean
}

export interface PostSummary {
  recordsPosted: number
  recordsSkipped: number
  needsReview: number
  messages: string[]
}
