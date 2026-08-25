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
  /** Lowest the month can end at: every still-in-transit parcel delivers. */
  rateFloor: number
  /** Highest the month can end at: every still-in-transit parcel comes back. */
  rateCeiling: number
  /** Share of the month's parcels that have reached a final outcome. */
  maturity: number
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
    .map(([month, b]) => {
      const resolved = b.delivered + b.rts
      const all = resolved + b.transit
      return {
        month,
        delivered: b.delivered,
        rts: b.rts,
        transit: b.transit,
        rate: resolved > 0 ? b.rts / resolved : 0,
        rateFloor: all > 0 ? b.rts / all : 0,
        rateCeiling: all > 0 ? (b.rts + b.transit) / all : 0,
        maturity: all > 0 ? resolved / all : 1,
      }
    })
}

export interface RtsBucketRow {
  /** Bucket key, e.g. "2026-08-19" for a day or "2026-08-17" (Monday) for a week. */
  key: string
  /** Human label for the axis / table. */
  label: string
  delivered: number
  rts: number
  transit: number
  /** Parcels shipped in this bucket, resolved or not. */
  total: number
  rate: number
  rateFloor: number
  rateCeiling: number
  maturity: number
  /**
   * True when the bucket has real volume but zero returns. At the ~16% baseline
   * that is near-impossible (p < 0.05 by 18 parcels), so it means the POS export
   * covering those dates captured only delivered orders and the returns are
   * simply absent - not that the week went perfectly. Flagged so it is never
   * read as a genuine low.
   */
  suspect: boolean
}

/**
 * Buckets POS outcomes by the day or week the parcel SHIPPED, so a spike can be
 * traced to the dispatch date that caused it (weather, a courier backlog) rather
 * than the date it happened to resolve.
 *
 * Ship dates come from Orders Database, which only knows a date for parcels that
 * appeared in an NPMCM SOA. Parcels that never reached a statement carry no date
 * and are skipped here - they are still counted in the all-time rate.
 */
export function rtsByBucket(
  posRows: POSReconciliationRow[],
  orders: OrderRow[],
  granularity: 'day' | 'week',
): RtsBucketRow[] {
  const shipDateByTracking = new Map<string, string | null>()
  for (const o of orders) {
    const t = o['Order / Tracking #']
    if (t) shipDateByTracking.set(t, o['Date Ordered (Shipped)'])
  }

  // Always tally by day first. Contamination (an export that captured only
  // delivered orders) shows up at day level; rolling that flag up is the only way
  // a week containing bad days gets marked, since its own total is rarely zero.
  const days = new Map<string, { delivered: number; rts: number; transit: number }>()
  for (const r of posRows) {
    const tracking = r['J&T Tracking Number']
    const shipDate = tracking ? shipDateByTracking.get(tracking) : null
    if (!shipDate) continue
    const key = shipDate.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue

    const b = days.get(key) ?? { delivered: 0, rts: 0, transit: 0 }
    const status = (r['POS Status'] ?? '').toLowerCase()
    if (status === 'delivered') b.delivered++
    else if (status.startsWith('return')) b.rts++
    else if (status === 'shipped' || status.includes('pick up')) b.transit++
    days.set(key, b)
  }

  const dayIsSuspect = (b: { delivered: number; rts: number }) => b.rts === 0 && b.delivered >= 18

  const weekKey = (isoDay: string) => {
    const [y, m, d] = isoDay.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7))
    return dt.toISOString().slice(0, 10)
  }

  const buckets = new Map<string, { delivered: number; rts: number; transit: number; suspect: boolean }>()
  for (const [day, b] of days) {
    const key = granularity === 'week' ? weekKey(day) : day
    const acc = buckets.get(key) ?? { delivered: 0, rts: 0, transit: 0, suspect: false }
    acc.delivered += b.delivered
    acc.rts += b.rts
    acc.transit += b.transit
    acc.suspect = acc.suspect || dayIsSuspect(b)
    buckets.set(key, acc)
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, b]) => {
      const resolved = b.delivered + b.rts
      const total = resolved + b.transit
      const [y, m, d] = key.split('-')
      const label =
        granularity === 'week'
          ? `Wk of ${MONTH_NAMES[Number(m) - 1]} ${Number(d)}`
          : `${MONTH_NAMES[Number(m) - 1]} ${Number(d)}`
      return {
        key,
        label: granularity === 'week' ? label : `${label}, ${y}`,
        delivered: b.delivered,
        rts: b.rts,
        transit: b.transit,
        total,
        rate: resolved > 0 ? b.rts / resolved : 0,
        rateFloor: total > 0 ? b.rts / total : 0,
        rateCeiling: total > 0 ? (b.rts + b.transit) / total : 0,
        maturity: total > 0 ? resolved / total : 1,
        suspect: b.suspect,
      }
    })
}

/**
 * Blended RTS across settled months, used as the "normal" reference line.
 *
 * A month counts as settled once essentially everything has resolved rather than
 * only at exactly zero in transit - otherwise a single parcel left hanging from
 * months ago would drop that whole month out of the baseline and skew it.
 */
export function rtsBaseline(rows: MonthlyRtsRow[]): number {
  const settled = rows.filter((r) => r.maturity >= 0.99 && r.delivered + r.rts > 0)
  const d = settled.reduce((s, r) => s + r.delivered, 0)
  const t = settled.reduce((s, r) => s + r.rts, 0)
  return d + t > 0 ? t / (d + t) : 0
}
