export interface IncomeRow {
  id?: number
  Date: string | null
  Source: string | null
  'Order ID': string | null
  Product: string | null
  Customer: string | null
  'Selling Price': number | null
  Courier: string | null
  'Tracking Number': string | null
  'Fulfillment Company': string | null
  Status: string | null
  'Amount Received': number | null
  'Payout Date': string | null
  Notes: string | null
  Department?: string | null
}

export interface ExpenseRow {
  id?: number
  Date: string | null
  Category: string | null
  Description: string | null
  Amount: number | null
  'Payment Method': string | null
  Supplier: string | null
  'Reference Number': string | null
  Notes: string | null
  Department?: string | null
}

export interface FBAccountRow {
  id?: number
  'Ad Account': string | null
  'Account ID': string | null
  'Confirmed Paid Spend': number | null
  '# Transactions': number | null
  'Data Source': string | null
  Coverage: string | null
}

export interface FBTxnRow {
  id?: number
  Date: string | null
  'Ad Account': string | null
  'Account ID': string | null
  'Card (Network + Last 4)': string | null
  Amount: number | null
  Status: string | null
  'Data Source': string | null
  'On File Card Statement?': string | null
  Notes: string | null
  Campaign?: string | null
  'Ad Set'?: string | null
  Impressions?: number | null
  'Link Clicks'?: number | null
  CTR?: number | null
  CPC?: number | null
  CPM?: number | null
  Results?: number | null
  ROAS?: number | null
}

export interface CreditCardRow {
  id?: number
  Card: string | null
  'Sale Date': string | null
  'Post Date': string | null
  Description: string | null
  Amount: number | null
  'Matched Ad Account': string | null
  'Review Status': string | null
  Notes: string | null
}

export interface CashFlowRow {
  id?: number
  Date: string | null
  'Opening Balance': number | null
  Income: number | null
  Expenses: number | null
  'Net Cash Flow': number | null
  'Closing Balance': number | null
}

export interface BillRow {
  id?: number
  month: string
  name: string
  dueDate: string | null
  dueInLabel: string | null
  totalAmountDue: number | null
  category: string | null
  paymentAccount: string | null
  status: string | null
  autoDebit: string | null
  notes: string[]
}

export interface MonthlyPLRow {
  id?: number
  'Line Item': string | null
  [month: string]: unknown
}

export interface BookkeepingEntry {
  id?: number
  month: string
  section: 'INCOME' | 'EXPENSES'
  date: string | null
  type: string | null
  category: string | null
  description: string | null
  amount: number | null
  notes: string | null
}

export interface OrderRow {
  id?: number
  'Order / Tracking #': string | null
  'Date Ordered (Shipped)': string | null
  Product: string | null
  'Selling Price (COD)': number | null
  Customer: string | null
  Phone: string | null
  City: string | null
  Province: string | null
  Courier: string | null
  Status: string | null
  'Delivered Date': string | null
  'RTS Date': string | null
  'Cost of Goods': number | null
  'Logistics Fee': number | null
  'Net Order Profit': number | null
  'Payout Batch': string | null
  'Courier Fee (SF+Insurance)': number | null
  'Fulfillment Fee': number | null
  'Duplicate Check': string | null
  'RTS Reason'?: string | null
}

export interface SOAReconciliationRow {
  id?: number
  'SOA Batch File': string | null
  'Period Start': string | null
  'Period End': string | null
  'Parcels Delivered': number | null
  'Parcels Fulfilled (dispatched)': number | null
  'Total COD Collected': number | null
  'COD Fee': number | null
  VAT: number | null
  'Total Cost of Goods': number | null
  'Net COD Amount': number | null
  'Total Logistics Fee': number | null
  'Expected Payout (For Remittance)': number | null
  'Amount Actually Received': number | null
  'Date Received': string | null
  Difference: number | null
  Status: string | null
}

export interface FulfillmentVerificationRow {
  id?: number
  'Batch Period': string | null
  'Parcels Fulfilled (NPMCM)': number | null
  'Matched to POS': number | null
  Unmatched: number | null
  'Fee at Risk': number | null
  'Match Rate': number | null
  Status: string | null
}

export interface POSReconciliationRow {
  id?: number
  'J&T Tracking Number': string | null
  'Receiver (POS)': string | null
  'POS Status': string | null
  'POS Order Price': number | null
  'NPMCM Status': string | null
  'NPMCM COD Amount Paid': number | null
  'Action Needed': string | null
  'RTS-Eligible Source (Y=full-status export)': string | null
  'Pre-Apr-10 Order? (status may be unreliable)': string | null
  'Date Created (POS)': string | null
}

export interface EvidenceRow {
  id?: number
  'Tracking Number': string | null
  Receiver: string | null
  Product: string | null
  'POS Price': number | null
  'POS Order ID': number | null
  'NPMCM Status': string | null
  'NPMCM Batch (if any)': string | null
  'Likely Reason': string | null
  'Date Created (POS)': string | null
  'Date Updated (POS)': string | null
  'In Missing Apr 13-21 Window?': string | null
  'Pre-Apr-10? (verify before citing)': string | null
}

export interface FollowUpRow {
  id?: number
  'Tracking Number': string | null
  'Customer Name': string | null
  Product: string | null
  'Amount (PHP)': number | null
  'Date Created': string | null
  Reason: string | null
  'Internal Note (remove before sending)': string | null
  'NPMCM Response / Notes': string | null
}
