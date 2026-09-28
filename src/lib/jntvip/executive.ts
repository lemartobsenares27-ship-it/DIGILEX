// J&T VIP — the executive view.
//
// One question: is this courier better or worse than the last one? That is
// answered per delivered parcel, not per statement and not as a percentage of
// revenue, because the thing you actually buy from a courier is a delivery.
//
// A parcel that ships and comes back still costs shipping, so cost per
// DISPATCHED parcel flatters the courier and cost per DELIVERED parcel tells
// the truth about what a landed order costs you.
//
// All amounts are integer centavos.

import type { JntVipSoaCheckRow, JntVipParcelRow } from './types'

/**
 * What the previous fulfilment partner cost, for comparison.
 *
 * Taken from the financial dashboard's own Monthly P&L for June 2026:
 * Courier Fees ₱41,185.71 + Fulfillment Cost ₱11,820.00 = ₱53,005.71 across
 * 650 delivered orders, against ₱307,994.00 of delivered revenue.
 *
 * It lives here as a constant rather than being read across apps: the two
 * databases share nothing at runtime by design, and a hard number with its
 * derivation written down is honest in a way a silent cross-app read is not.
 */
export const NPMCM_BENCHMARK = {
  label: 'NPMCM (Jun 2026)',
  costPerDelivered: 8155, // centavos
  shareOfRevenue: 0.1721,
  deliveredOrders: 650,
  source: 'Monthly P&L, June 2026: courier ₱41,185.71 + fulfillment ₱11,820.00 over 650 delivered orders',
}

export interface ExecutiveSummary {
  statements: number
  codCollected: number
  charges: number
  shipping: number
  commission: number
  vat: number
  rtsFee: number
  netDue: number
  received: number
  outstanding: number
  /** Charges as a share of COD collected. */
  costRatio: number

  /** Parcel-derived. Zero when no parcel export has been imported. */
  dispatched: number
  delivered: number
  returned: number
  inFlight: number
  deliveryRate: number
  rtsRate: number
  hasParcels: boolean

  /** The comparison that answers "is this better". Null without parcel data. */
  costPerDelivered: number | null
  costPerDispatched: number | null
  vsBenchmark: number | null
  vsBenchmarkPct: number | null
}

const val = (stated: number | null, computed: number) => stated ?? computed

export function executiveSummary(rows: JntVipSoaCheckRow[], parcels: JntVipParcelRow[]): ExecutiveSummary {
  const sum = (f: (s: JntVipSoaCheckRow) => number) => rows.reduce((t, s) => t + f(s), 0)
  const codCollected = sum((s) => val(s.statedCod, s.computedCod))
  const shipping = sum((s) => val(s.statedShipping, s.computedShipping))
  const commission = sum((s) => val(s.statedCommission, s.computedCommission))
  const vat = sum((s) => val(s.statedVat, s.computedVat))
  const rtsFee = sum((s) => val(s.statedRtsFee, s.computedRtsFee))
  const charges = shipping + commission + vat + rtsFee
  const netDue = sum((s) => val(s.statedNet, s.computedNet))
  const received = sum((s) => s.receivedAmount ?? 0)

  // Count parcels only inside the periods the statements actually cover, so
  // the cost ratio compares like with like. Counting every parcel ever
  // exported against fees from twenty statements would understate the cost.
  const periods = rows.map((r) => [r.periodFrom, r.periodTo] as const)
  const inAny = (day: string | null) => day != null && periods.some(([a, b]) => day >= a && day <= b)

  const delivered = parcels.filter((p) => p.status === 'DELIVERED' && inAny(p.podDate)).length
  const returned = parcels.filter((p) => p.status === 'RETURNED' && inAny(p.podDate)).length
  const dispatched = parcels.filter((p) => inAny(p.shipDate)).length
  const inFlight = parcels.filter((p) => p.status === 'IN_TRANSIT' || p.status === 'DELIVERING').length
  const settled = delivered + returned
  const hasParcels = dispatched > 0 || delivered > 0

  return {
    statements: rows.length,
    codCollected,
    charges,
    shipping,
    commission,
    vat,
    rtsFee,
    netDue,
    received,
    outstanding: netDue - received,
    costRatio: codCollected > 0 ? charges / codCollected : 0,
    dispatched,
    delivered,
    returned,
    inFlight,
    deliveryRate: settled > 0 ? delivered / settled : 0,
    rtsRate: settled > 0 ? returned / settled : 0,
    hasParcels,
    costPerDelivered: delivered > 0 ? Math.round(charges / delivered) : null,
    costPerDispatched: dispatched > 0 ? Math.round(charges / dispatched) : null,
    vsBenchmark: delivered > 0 ? Math.round(charges / delivered) - NPMCM_BENCHMARK.costPerDelivered : null,
    vsBenchmarkPct:
      delivered > 0 ? Math.round(charges / delivered) / NPMCM_BENCHMARK.costPerDelivered - 1 : null,
  }
}

export interface TrendPoint {
  label: string
  value: number
  net: number
  charges: number
}

/** COD collected per statement period, oldest first — the shape of the business. */
export function codTrend(rows: JntVipSoaCheckRow[]): TrendPoint[] {
  return [...rows]
    .sort((a, b) => a.periodTo.localeCompare(b.periodTo))
    .map((r) => ({
      label: r.periodTo.slice(5),
      value: val(r.statedCod, r.computedCod) / 100,
      net: val(r.statedNet, r.computedNet) / 100,
      charges:
        (val(r.statedShipping, r.computedShipping) +
          val(r.statedCommission, r.computedCommission) +
          val(r.statedVat, r.computedVat) +
          val(r.statedRtsFee, r.computedRtsFee)) /
        100,
    }))
}

/**
 * Where the COD went. The same three buckets and the same colours as the
 * Finance page, deliberately: two pages splitting the same money differently
 * would make the reader reconcile them by hand.
 *
 * Three rather than four because a four-hue set could not separate blue from
 * violet under protanopia against the dark surface — the palette rule is to
 * cut series rather than force a hue. Validated light and dark.
 */
export function moneySplit(s: ExecutiveSummary) {
  return [
    { key: 'net', label: 'Remitted to you', amount: s.netDue, color: 'var(--series-aqua)' },
    { key: 'shipping', label: 'Shipping', amount: s.shipping, color: 'var(--series-blue)' },
    { key: 'fees', label: 'COD service fees', amount: s.commission + s.vat + s.rtsFee, color: 'var(--series-orange)' },
  ].filter((x) => x.amount > 0)
}
