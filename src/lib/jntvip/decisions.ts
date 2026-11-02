// "Should I continue, and what do I do next?"
//
// Every other page here reports. This one is the only place that answers that
// question, and it has to do it without either of the two failure modes: a
// cheerful dashboard that says "grow!" at a business quietly bleeding, or a
// wall of red that says "stop" about one that has already turned.
//
// So the verdict is mechanical and stated with its reasons. It reads the
// latest month's profit, the direction of the one before it, and the
// cumulative position, and says which of those three is carrying the answer.
// A reader who disagrees can see exactly which number to argue with.
//
// The levers underneath are ranked by money, and each carries how it was
// arrived at. A lever worth PHP29,000 a month that rests on an assumption is
// worth less than one worth PHP12,000 that is measured, and hiding that
// distinction is how a plan built on a dashboard falls apart in week two.
//
// Nothing here is a target. Every figure is what the business's OWN numbers
// would produce at a different return rate or basket size — no industry
// benchmarks, no "typical e-commerce" rates, because none of those know
// anything about this business.
//
// All amounts are integer centavos.

import type { JntVipParcelRow, JntVipSoaCheckRow } from './types'
import type { ProfitAndLoss, ProfitPeriod } from './profit'
import type { CashPosition } from './cashflow'

export type Confidence = 'measured' | 'modelled'

export interface Lever {
  id: string
  title: string
  /** The situation, in this business's own numbers. */
  now: string
  /** What to actually do. */
  action: string
  /** Pesos a month, centavos. Null where it cannot be priced. */
  worth: number | null
  confidence: Confidence
  /** How the figure was arrived at, so it can be argued with. */
  basis: string
}

export type Verdict = 'continue' | 'fix-first' | 'stop'

export interface Decision {
  verdict: Verdict
  headline: string
  reasons: string[]
  /** The single thing to do first. */
  focus: Lever | null
  levers: Lever[]
}

const peso = (c: number) =>
  '₱' + (Math.abs(c) / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })
const pct = (r: number) => `${(r * 100).toFixed(1)}%`

/**
 * What one more delivered parcel is worth, where that parcel would otherwise
 * have been returned.
 *
 * Not the same as the profit on a new order, and the difference matters. The
 * advertising, the outbound freight and the packing are already spent on a
 * parcel that comes back — converting it to a delivery adds no new cost of
 * acquisition at all. What changes is that the COD gets collected, the product
 * actually leaves (so its cost is finally incurred), J&T takes its COD
 * commission on the money, and the return fee is not charged.
 *
 * That makes it worth far more than a new sale, which is the whole reason
 * returns rank above ad spend on this page.
 */
function valueOfConvertedReturn(
  avgCod: number,
  cogsPerDelivered: number,
  rtsFeePerReturn: number,
  codFeeRate: number,
): number {
  return avgCod - cogsPerDelivered - Math.round(avgCod * codFeeRate) + rtsFeePerReturn
}

export interface DecisionInput {
  pnl: ProfitAndLoss
  months: ProfitPeriod[]
  cash: CashPosition
  parcels: JntVipParcelRow[]
  rows: JntVipSoaCheckRow[]
}

export function decide({ pnl, months, cash, parcels }: DecisionInput): Decision | null {
  const latest = months[months.length - 1]
  if (!latest) return null
  const prior = months.length >= 2 ? months[months.length - 2] : null

  const settledParcels = parcels.filter((p) => p.status === 'DELIVERED' || p.status === 'RETURNED')
  const delivered = settledParcels.filter((p) => p.status === 'DELIVERED')
  const returned = settledParcels.filter((p) => p.status === 'RETURNED')
  const settled = settledParcels.length
  const rtsRate = settled > 0 ? returned.length / settled : 0

  const avgCod = delivered.length > 0 ? Math.round(delivered.reduce((t, p) => t + p.cod, 0) / delivered.length) : 0
  const rtsFeePerReturn =
    returned.length > 0 ? Math.round(returned.reduce((t, p) => t + Math.round(p.freight * 0.5), 0) / returned.length) : 0
  const cogsPerDelivered = pnl.delivered > 0 ? Math.round(pnl.cogs / pnl.delivered) : 0
  // COD commission plus VAT on it, as the statements actually charge it.
  const codFeeRate = 0.0275 * 1.12

  const perConverted = valueOfConvertedReturn(avgCod, cogsPerDelivered, rtsFeePerReturn, codFeeRate)

  const levers: Lever[] = []

  // ---- 1. The return rate.
  //
  // Priced PER POINT rather than against a target, because every target on
  // offer was wrong. "Your best month" looked like 6.7% in September — but
  // only measured by DELIVERY date, which flatters any recent month: a parcel
  // delivers in days and takes a median five more to come back, so the
  // returns belonging to late deliveries have not happened yet. Measured by
  // dispatch cohort, where every parcel in the group has had its full chance
  // to return, September is 12.1%. A lever promising PHP21,000 a month for
  // getting back to a rate the business never actually achieved is worse than
  // no lever at all.
  //
  // An industry benchmark would be no better — it knows nothing about this
  // product, price point or audience. So the page states what a single point
  // is worth and leaves the target to the person who has to hit it.
  // The latest month's OWN settled volume, counted rather than scaled.
  //
  // Scaling the whole dataset by days was wrong by nearly half: the statements
  // span 65 days while parcels only start arriving partway through, so
  // dividing 1,731 settled parcels by 65 days described a month roughly half
  // the size of the one October actually had. Counting the month directly
  // needs no assumption about how evenly volume was spread.
  const monthlySettled = settledInMonth(parcels, latest.key)
  const perPoint = Math.round(monthlySettled * 0.01 * perConverted)
  const mature = matureCohorts(parcels)
  const bestMature = mature.length > 0 ? mature.reduce((a, b) => (b.rate < a.rate ? b : a)) : null
  if (returned.length > 0 && perPoint > 0) {
    levers.push({
      id: 'rts',
      title: 'Cut the return rate',
      now:
        `${pct(rtsRate)} of settled parcels come back.` +
        (bestMature ? ` The best month that has fully settled is ${bestMature.label} at ${pct(bestMature.rate)}.` : ''),
      action:
        'Confirm the order before dispatch — a call or message that gets a real yes to the price. Almost every return is a customer refusing at the door, so this is the only step that touches it.',
      worth: perPoint * 4,
      confidence: 'modelled',
      basis: `Each percentage point off the rate is worth about ${peso(perPoint)} a month: ${Math.round(monthlySettled * 0.01)} fewer returns at ${peso(perConverted)} each — the COD collected, less the product and J&T's commission, plus the return fee you stop paying. The advertising and freight on those parcels are already spent either way. The figure shown is four points; it is arithmetic, not a forecast, and how many points are actually available is not something this data can say.`,
    })
  }

  // ---- 2. The provinces carrying the returns.
  const prov = worstProvinces(settledParcels, rtsRate)
  if (prov.length > 0) {
    const monthShare = settled > 0 ? settledInMonth(parcels, latest.key) / settled : 1
    const extraReturns = prov.reduce((t, p) => t + (p.returned - p.settled * rtsRate), 0) * monthShare
    const share = settled > 0 ? prov.reduce((t, p) => t + p.settled, 0) / settled : 0
    levers.push({
      id: 'geography',
      title: 'Treat the worst provinces differently',
      now: `${prov.map((p) => `${p.name} ${pct(p.rate)}`).join(', ')} — against ${pct(rtsRate)} everywhere else.`,
      action:
        'Require a confirmed order before shipping to these, or stop shipping to them. They are a small share of volume and a large share of the losses.',
      worth: Math.round(Math.max(0, extraReturns) * perConverted),
      confidence: 'measured',
      basis: `These provinces are ${pct(share)} of settled parcels and produce ${Math.round(Math.max(0, extraReturns))} returns a month more than the average rate would.`,
    })
  }

  // ---- 3. Basket size.
  const singles = delivered.filter((p) => bottlesOf(p) === 1).length
  if (singles > 0 && delivered.length > 0) {
    const share = singles / delivered.length
    // A tenth of single-bottle buyers taking a second bottle. Deliberately
    // modest: an upsell rate is the one number here with no evidence behind
    // it, so it is set low enough that being wrong by half still leaves the
    // lever worth having.
    const moved = singles * 0.1
    const extraPerOrder = 20000 - cogsPerDelivered - Math.round(20000 * codFeeRate)
    // Same correction as the return-rate lever: scale by the share of settled
    // parcels that actually fell in the latest month, not by its share of
    // statement days.
    const monthScale = settled > 0 ? settledInMonth(parcels, latest.key) / settled : 1
    levers.push({
      id: 'basket',
      title: 'Get more two-bottle orders',
      now: `${pct(share)} of delivered orders are a single bottle. The freight and the advertising are the same whether the box holds one or three.`,
      action: 'Make the two-bottle price the default option at checkout and on the confirmation call, rather than an upsell offered after.',
      worth: Math.round(moved * extraPerOrder * monthScale),
      confidence: 'modelled',
      basis: `A tenth of single-bottle buyers taking a second, at about ${peso(extraPerOrder)} extra contribution each. The upsell rate is an assumption — it is the one figure here with nothing measured behind it.`,
    })
  }

  // ---- 4. Advertising headroom.
  if (pnl.adHeadroom > 0 && latest.profit > 0) {
    levers.push({
      id: 'scale',
      title: 'There is room to spend more on ads — but not yet',
      now: `Ads could reach ${peso(pnl.adCeiling)} a month before profit hits zero. You spent ${peso(latest.adSpend)}.`,
      action:
        'Hold spend flat until the return rate moves. Scaling at the current rate buys more refusals in the same proportion, and the headroom is spent on parcels that come back.',
      worth: null,
      confidence: 'measured',
      basis: 'Headroom is real and is not a reason to spend it. Fix what happens to a parcel before buying more of them.',
    })
  }

  levers.sort((a, b) => (b.worth ?? -1) - (a.worth ?? -1))

  // ---- The verdict.
  const reasons: string[] = []
  let verdict: Verdict
  let headline: string

  const improving = prior != null && latest.profit > prior.profit

  if (latest.profit > 0) {
    verdict = rtsRate > 0.12 ? 'fix-first' : 'continue'
    headline =
      verdict === 'fix-first'
        ? 'Keep trading, but fix the returns before you grow'
        : 'Keep trading. The business works.'
    reasons.push(`${latest.label} made ${peso(latest.profit)} after every cost, at ${pct(latest.margin)} margin and ${latest.roas.toFixed(2)}x on ads.`)
    if (improving && prior) {
      reasons.push(`That is a turn, not a run of luck: ${prior.label} lost ${peso(-prior.profit)} at ${prior.roas.toFixed(2)}x.`)
    }
    if (cash.cumulative < 0) {
      reasons.push(
        `The business is still ${peso(-cash.cumulative)} behind since it started, so the bank balance will keep looking flat until that is repaid. That is a debt being cleared, not a loss continuing.`,
      )
    }
    if (rtsRate > 0.12) {
      reasons.push(`${pct(rtsRate)} of parcels come back, and almost every one is a customer refusing at the door. That is the difference between a good business and a very good one.`)
    }
  } else if (improving) {
    verdict = 'fix-first'
    headline = 'Not yet profitable, but moving the right way'
    reasons.push(`${latest.label} lost ${peso(-latest.profit)}, better than ${prior?.label ?? 'the month before'}.`)
  } else {
    verdict = 'stop'
    headline = 'The numbers do not support continuing as they are'
    reasons.push(`${latest.label} lost ${peso(-latest.profit)} at ${latest.roas.toFixed(2)}x on ads, and it is not improving.`)
  }

  return { verdict, headline, reasons, focus: levers.find((l) => l.worth != null) ?? null, levers }
}

const QTY = /^\s*(\d+)\s*Pc/i
function bottlesOf(p: JntVipParcelRow): number {
  const m = QTY.exec(p.remarks ?? '')
  if (m) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > 0 && n < 100) return n
  }
  return 1
}

/** Parcels that settled inside one calendar month, counted not estimated. */
function settledInMonth(parcels: JntVipParcelRow[], key: string): number {
  return parcels.filter(
    (p) => p.podDate?.startsWith(key) && (p.status === 'DELIVERED' || p.status === 'RETURNED'),
  ).length
}

interface MonthRts {
  key: string
  label: string
  settled: number
  rate: number
}

/**
 * Return rate by DISPATCH month, counting only months that have finished.
 *
 * Grouping by delivery date understates every recent month, because a parcel
 * delivers in days and takes a median five more to come back: the deliveries
 * are all in and the returns belonging to them are not. Grouping by dispatch
 * keeps a parcel with the batch it left in, so delivered and returned are
 * counted on the same footing.
 *
 * A month still holding more than 5% of its parcels undecided is dropped
 * entirely rather than reported with a caveat. Those are exactly the months a
 * reader would seize on, since an immature month always looks like the best
 * one the business has ever had.
 */
function matureCohorts(parcels: JntVipParcelRow[]): MonthRts[] {
  const by = new Map<string, { d: number; r: number; open: number }>()
  for (const p of parcels) {
    if (!p.shipDate) continue
    const k = p.shipDate.slice(0, 7)
    const row = by.get(k) ?? { d: 0, r: 0, open: 0 }
    if (p.status === 'DELIVERED') row.d++
    else if (p.status === 'RETURNED') row.r++
    else row.open++
    by.set(k, row)
  }
  return [...by.entries()]
    .filter(([, v]) => {
      const total = v.d + v.r + v.open
      return total >= 100 && v.open / total < 0.05
    })
    .map(([key, v]) => ({
      key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
      settled: v.d + v.r,
      rate: v.d + v.r > 0 ? v.r / (v.d + v.r) : 0,
    }))
}

interface ProvinceRts {
  name: string
  settled: number
  returned: number
  rate: number
}

/** Provinces returning meaningfully worse than the business as a whole. */
function worstProvinces(settled: JntVipParcelRow[], overall: number): ProvinceRts[] {
  const by = new Map<string, { s: number; r: number }>()
  for (const p of settled) {
    const k = p.province ?? 'Unknown'
    const row = by.get(k) ?? { s: 0, r: 0 }
    row.s++
    if (p.status === 'RETURNED') row.r++
    by.set(k, row)
  }
  return [...by.entries()]
    // 20 settled parcels is the floor for saying anything about a province at
    // all. Below it a single extra return swings the rate by five points and
    // the worst-performing province is just the smallest one.
    .filter(([, v]) => v.s >= 20 && v.r / v.s > overall * 1.4)
    .map(([name, v]) => ({ name, settled: v.s, returned: v.r, rate: v.r / v.s }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)
}
