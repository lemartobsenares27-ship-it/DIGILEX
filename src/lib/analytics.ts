import type { OrderRow, FBTxnRow, POSReconciliationRow } from './types'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Builds "MMM YYYY" manually (with a plain ASCII space) instead of via
// toLocaleDateString, whose output can use a narrow no-break space depending
// on ICU version — that would silently break exact-string lookups against
// the workbook's own "MMM YYYY" column headers (e.g. in Monthly P&L).
function monthLabel(value: string | null): string | null {
  if (!value) return null
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return null
  return `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`
}

export function listMonths(orders: OrderRow[]): string[] {
  const set = new Set<string>()
  for (const o of orders) {
    const shipped = monthLabel(o['Date Ordered (Shipped)'])
    const delivered = monthLabel(o['Delivered Date'])
    if (shipped) set.add(shipped)
    if (delivered) set.add(delivered)
  }
  return [...set].sort((a, b) => new Date(`1 ${a}`).getTime() - new Date(`1 ${b}`).getTime())
}

export interface MonthSummary {
  month: string
  revenue: number
  adSpend: number
  roas: number
  ordersShipped: number
  ordersDelivered: number
  ordersPending: number
  deliveryRate: number
}

/**
 * Mirrors the source workbook's own methodology: revenue is recognized by
 * delivery date, while order/delivery counts snapshot current Status among
 * orders shipped in the month (so delivered + pending always sums to shipped,
 * matching the original Dashboard sheet's own arithmetic).
 */
export function summarizeMonth(orders: OrderRow[], fbTxns: FBTxnRow[], month: string): MonthSummary {
  const deliveredThisMonth = orders.filter((o) => monthLabel(o['Delivered Date']) === month)
  const shippedThisMonth = orders.filter((o) => monthLabel(o['Date Ordered (Shipped)']) === month)

  const revenue = deliveredThisMonth.reduce((s, o) => s + (o['Selling Price (COD)'] ?? 0), 0)
  const adSpend = fbTxns
    .filter((t) => monthLabel(t.Date) === month)
    .reduce((s, t) => s + (t.Amount ?? 0), 0)

  const ordersDelivered = shippedThisMonth.filter((o) => (o.Status ?? '').toLowerCase() === 'delivered').length
  const ordersPending = shippedThisMonth.filter((o) => (o.Status ?? '').toLowerCase().includes('pending')).length
  const deliveryRate = ordersDelivered + ordersPending > 0 ? ordersDelivered / (ordersDelivered + ordersPending) : 0

  return {
    month,
    revenue,
    adSpend,
    roas: adSpend > 0 ? revenue / adSpend : 0,
    ordersShipped: shippedThisMonth.length,
    ordersDelivered,
    ordersPending,
    deliveryRate,
  }
}

export function allMonthSummaries(orders: OrderRow[], fbTxns: FBTxnRow[]): MonthSummary[] {
  return listMonths(orders).map((m) => summarizeMonth(orders, fbTxns, m))
}

export function allTimeDeliveryStats(posRows: POSReconciliationRow[]) {
  const delivered = posRows.filter((o) => (o['POS Status'] ?? '').toLowerCase() === 'delivered').length
  const rts = posRows.filter((o) => {
    const s = (o['POS Status'] ?? '').toLowerCase()
    return s.startsWith('return')
  }).length
  const rate = delivered + rts > 0 ? rts / (delivered + rts) : 0
  return { delivered, rts, rate }
}

export interface MonthlyRtsRow {
  month: string
  delivered: number
  rts: number
  transit: number
  rate: number
}

/**
 * RTS rate broken down by the month the order was SHIPPED (not resolved), so
 * "this month's RTS rate" means "of what shipped this month, how much came
 * back" - joined against Orders Database by tracking number since POS
 * Reconciliation itself has no ship-date column. Only counts rows flagged as
 * coming from a full-status export (Column H) - the same "RTS-eligible
 * source" caveat used everywhere else RTS rate is computed.
 */
export function monthlyRtsBreakdown(posRows: POSReconciliationRow[], orders: OrderRow[]): MonthlyRtsRow[] {
  const shipMonthByTracking = new Map<string, string | null>()
  for (const o of orders) {
    const t = o['Order / Tracking #']
    if (t) shipMonthByTracking.set(t, monthLabel(o['Date Ordered (Shipped)']))
  }

  const buckets = new Map<string, { delivered: number; rts: number; transit: number }>()
  for (const r of posRows) {
    if (r['RTS-Eligible Source (Y=full-status export)'] !== 'Y') continue
    const tracking = r['J&T Tracking Number']
    const month = tracking ? shipMonthByTracking.get(tracking) : null
    if (!month) continue
    const bucket = buckets.get(month) ?? { delivered: 0, rts: 0, transit: 0 }
    const status = (r['POS Status'] ?? '').toLowerCase()
    if (status === 'delivered') bucket.delivered++
    else if (status.startsWith('return')) bucket.rts++
    else if (status === 'shipped' || status.includes('pick up')) bucket.transit++
    buckets.set(month, bucket)
  }

  return [...buckets.entries()]
    .sort((a, b) => new Date(`1 ${a[0]}`).getTime() - new Date(`1 ${b[0]}`).getTime())
    .map(([month, b]) => ({
      month,
      delivered: b.delivered,
      rts: b.rts,
      transit: b.transit,
      rate: b.delivered + b.rts > 0 ? b.rts / (b.delivered + b.rts) : 0,
    }))
}
