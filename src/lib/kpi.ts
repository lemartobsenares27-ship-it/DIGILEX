import type { OrderRow, FBTxnRow, POSReconciliationRow, FulfillmentVerificationRow, SOAReconciliationRow } from './types'

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7 // Monday = 0 ... Sunday = 6
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - day)
  return s
}

export function weekKeyOf(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return startOfWeek(d).toISOString().slice(0, 10)
}

export function weekLabel(key: string): string {
  const start = new Date(key)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function listWeeks(orders: OrderRow[]): string[] {
  const set = new Set<string>()
  for (const o of orders) {
    const shipped = weekKeyOf(o['Date Ordered (Shipped)'])
    const delivered = weekKeyOf(o['Delivered Date'])
    if (shipped) set.add(shipped)
    if (delivered) set.add(delivered)
  }
  return [...set].sort()
}

export interface WeeklyCompanyKPIs {
  week: string
  revenue: number
  posRevenue: number
  cogs: number
  logisticsFee: number
  adSpend: number
  contributionProfit: number
  ordersPlaced: number
  ordersDelivered: number
  ordersPending: number
  deliveryRate: number
  /** Delivered ROAS: revenue actually delivered ÷ spend. What "ROAS" has always meant on this page. */
  roas: number
  /** POS ROAS: gross order value placed this week (before delivery outcome is known) ÷ spend — the number you'd get checking POS same-day, before RTS/returns net it down. */
  posRoas: number
  /** Profit ROAS: contribution profit (already net of ad spend) ÷ spend — pesos of profit per peso spent. */
  profitRoas: number
  cpa: number
}

export function weeklyCompanyKPIs(orders: OrderRow[], fbTxns: FBTxnRow[], week: string): WeeklyCompanyKPIs {
  const deliveredThisWeek = orders.filter((o) => o.Status === 'Delivered' && weekKeyOf(o['Delivered Date']) === week)
  const shippedThisWeek = orders.filter((o) => weekKeyOf(o['Date Ordered (Shipped)']) === week)
  const adSpend = fbTxns
    .filter((t) => weekKeyOf(t.Date) === week && !t['Performance Data Only'])
    .reduce((s, t) => s + (t.Amount ?? 0), 0)

  const revenue = deliveredThisWeek.reduce((s, o) => s + (o['Selling Price (COD)'] ?? 0), 0)
  const posRevenue = shippedThisWeek.reduce((s, o) => s + (o['Selling Price (COD)'] ?? 0), 0)
  const cogs = deliveredThisWeek.reduce((s, o) => s + (o['Cost of Goods'] ?? 0), 0)
  const logisticsFee = shippedThisWeek.reduce((s, o) => s + (o['Logistics Fee'] ?? 0), 0)

  const ordersDelivered = shippedThisWeek.filter((o) => (o.Status ?? '').toLowerCase() === 'delivered').length
  const ordersPending = shippedThisWeek.filter((o) => (o.Status ?? '').toLowerCase().includes('pending')).length
  const contributionProfit = revenue - cogs - logisticsFee - adSpend

  return {
    week,
    revenue,
    posRevenue,
    cogs,
    logisticsFee,
    adSpend,
    contributionProfit,
    ordersPlaced: shippedThisWeek.length,
    ordersDelivered,
    ordersPending,
    deliveryRate: ordersDelivered + ordersPending > 0 ? ordersDelivered / (ordersDelivered + ordersPending) : 0,
    roas: adSpend > 0 ? revenue / adSpend : 0,
    posRoas: adSpend > 0 ? posRevenue / adSpend : 0,
    profitRoas: adSpend > 0 ? contributionProfit / adSpend : 0,
    cpa: shippedThisWeek.length > 0 ? adSpend / shippedThisWeek.length : NaN,
  }
}

// Order data trails off near "today" (new batches/imports haven't caught up
// yet), so the literal most-recent week often shows 0 orders placed - not a
// real collapse, just data lag. Default to the latest week that still has a
// real orders-placed signal, so the scorecard doesn't open on a false alarm.
export function defaultReportingWeek(orders: OrderRow[], weeks: string[]): string {
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i]
    const hasShipped = orders.some((o) => weekKeyOf(o['Date Ordered (Shipped)']) === w)
    if (hasShipped) return w
  }
  return weeks[weeks.length - 1] ?? ''
}

export type KPIStatus = 'good' | 'warning' | 'critical'

export function roasStatus(roas: number): KPIStatus {
  if (roas <= 0) return 'warning'
  if (roas >= 3) return 'good'
  if (roas >= 1.5) return 'warning'
  return 'critical'
}

export function spendToRevenueStatus(ratio: number): KPIStatus {
  if (ratio <= 0.15) return 'good'
  if (ratio <= 0.3) return 'warning'
  return 'critical'
}

export function rtsRateStatus(rate: number): KPIStatus {
  if (rate <= 0.12) return 'good'
  if (rate <= 0.2) return 'warning'
  return 'critical'
}

export function matchRateStatus(rate: number): KPIStatus {
  if (rate >= 0.98) return 'good'
  if (rate >= 0.9) return 'warning'
  return 'critical'
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

export function allTimeRTSRate(posRows: POSReconciliationRow[]): { delivered: number; rts: number; rate: number } {
  const delivered = posRows.filter((r) => (r['POS Status'] ?? '').toLowerCase() === 'delivered').length
  const rts = posRows.filter((r) => (r['POS Status'] ?? '').toLowerCase().startsWith('return')).length
  return { delivered, rts, rate: delivered + rts > 0 ? rts / (delivered + rts) : 0 }
}

export function fulfillmentFeeHealth(rows: FulfillmentVerificationRow[]) {
  const totalFulfilled = rows.reduce((s, r) => s + (r['Parcels Fulfilled (NPMCM)'] ?? 0), 0)
  const totalMatched = rows.reduce((s, r) => s + (r['Matched to POS'] ?? 0), 0)
  const totalFeeAtRisk = rows.reduce((s, r) => s + (r['Fee at Risk'] ?? 0), 0)
  const matchRate = totalFulfilled > 0 ? totalMatched / totalFulfilled : 1
  const recentRows = [...rows].filter((r) => r['Batch Period']).slice(-3)
  const recentClean = recentRows.every((r) => (r['Match Rate'] ?? 0) >= 0.98)
  return { totalFulfilled, totalMatched, totalFeeAtRisk, matchRate, recentClean }
}

export function remittanceHealth(rows: SOAReconciliationRow[]) {
  const batchRows = rows.filter((r) => r['SOA Batch File'] && r['SOA Batch File'] !== 'TOTAL')
  const expected = batchRows.reduce((s, r) => s + (r['Expected Payout (For Remittance)'] ?? 0), 0)
  const received = batchRows.reduce((s, r) => s + (r['Amount Actually Received'] ?? 0), 0)
  return { expected, received, gap: expected - received, batchCount: batchRows.length }
}

export interface MetaReconciliation {
  hasMetaPerformanceData: boolean
  metaPurchases: number | null
  metaRoas: number | null
  posOrders: number
  businessRevenue: number
  businessRoas: number
  adSpend: number
  purchaseGapPct: number | null
  roasGapPct: number | null
}

// Meta's own Ads Manager export reports "Results" (its self-attributed
// purchase count) and "Purchase ROAS" per campaign row. Compares those
// self-reported numbers against what actually shipped per the Orders
// Database (itself sourced from POS/SOA reconciliation) for the same week,
// so underreporting is a visible number instead of a gut feeling.
export function metaVsBusinessReconciliation(orders: OrderRow[], fbTxns: FBTxnRow[], week: string): MetaReconciliation {
  const weekTxns = fbTxns.filter((t) => weekKeyOf(t.Date) === week)

  // A row "has performance data" if it came from a campaign-level Ads
  // Manager export (as opposed to a billing-only receipt/invoice import).
  const perfTxns = weekTxns.filter((t) => t.Results != null || t.ROAS != null || t['Purchase Value'] != null)
  const hasMetaPerformanceData = perfTxns.length > 0
  const metaPurchases = hasMetaPerformanceData ? perfTxns.reduce((s, t) => s + (t.Results ?? 0), 0) : null

  // Blended ROAS = total reported purchase value over total spend across
  // EVERY performance row that week, including rows/campaigns that spent
  // money but generated zero purchases. Averaging only the rows that had a
  // recorded ROAS (i.e. only the ones that converted) silently drops the
  // wasted spend from the denominator and overstates how efficient Meta's
  // own numbers actually were.
  const perfSpend = perfTxns.reduce((s, t) => s + (t.Amount ?? 0), 0)
  const metaRevenue = perfTxns.reduce((s, t) => {
    if (t['Purchase Value'] != null) return s + t['Purchase Value']
    if (t.ROAS != null) return s + t.ROAS * (t.Amount ?? 0)
    return s
  }, 0)
  const metaRoas = perfSpend > 0 ? metaRevenue / perfSpend : null

  const company = weeklyCompanyKPIs(orders, fbTxns, week)
  const posOrders = company.ordersPlaced

  const purchaseGapPct = metaPurchases !== null && metaPurchases > 0 ? (posOrders - metaPurchases) / metaPurchases : null
  const roasGapPct = metaRoas !== null && metaRoas > 0 ? (company.roas - metaRoas) / metaRoas : null

  return {
    hasMetaPerformanceData,
    metaPurchases,
    metaRoas,
    posOrders,
    businessRevenue: company.revenue,
    businessRoas: company.roas,
    adSpend: company.adSpend,
    purchaseGapPct,
    roasGapPct,
  }
}
