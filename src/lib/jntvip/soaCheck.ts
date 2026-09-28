// J&T VIP — SOA verification.
//
// A J&T SOA is a one-page summary: COD collected, commission, VAT, shipping,
// RTS fee, net remittance. It carries no parcel list, so "is this correct?"
// cannot be answered from the SOA alone. It can be answered by rebuilding
// every line from the My Waybill parcel export and comparing.
//
// Two rules learned from auditing real SOAs, both confirmed to the centavo
// against SOA202608280830MNL-V11913 and SOA202608310831MNL-V11913:
//
//  1. Commission is 2.75% PER PARCEL, floored to the centavo, then summed —
//     not 2.75% of the grand total. Flooring on the total is off by a few
//     centavos and looks like an error when it is not.
//  2. Shipping is billed on DISPATCH date, COD is credited on DELIVERY date.
//     They cover different parcel populations in the same window. Comparing
//     shipping against the delivered parcels is the single easiest way to
//     convince yourself of a discrepancy that is not there.
//
// All arithmetic is in integer centavos. Money in floating point is how
// reconciliations acquire phantom one-centavo differences.

import type { JntVipParcelRow } from './types'
import { isSettled } from './waybill'

export const DEFAULT_TERMS = {
  /** COD commission, applied per parcel. */
  commissionRate: 0.0275,
  /** VAT on the commission. */
  vatRate: 0.12,
  /**
   * RTS is charged as a share of the returned parcel's OWN base freight —
   * not a flat fee. It looked flat at ₱30 across the first two statements
   * because those parcels happened to share a ₱60 freight; a month of data
   * disproved it. Verified to the centavo on twelve independent windows,
   * including two single-return windows where there is no ambiguity:
   * ₱60 freight → ₱30 RTS, ₱90 freight → ₱45 RTS.
   *
   * Note it is half of Receivable Freight, NOT of Total Shipping Cost —
   * the ₱5–8 per-parcel surcharge is excluded from the RTS basis.
   */
  rtsShareOfFreight: 0.5,
}

export type Terms = typeof DEFAULT_TERMS

/** What the SOA itself claims. Blank fields are simply not checked. */
export interface SoaStated {
  soaNumber: string
  periodFrom: string
  periodTo: string
  codCollected: number | null
  commission: number | null
  vat: number | null
  codPayable: number | null
  shippingFee: number | null
  rtsFee: number | null
  totalDeduction: number | null
  adjustments: number | null
  netRemittance: number | null
}

export type LineVerdict = 'MATCH' | 'DIFF' | 'NOT_STATED'

export interface CheckedLine {
  key: string
  label: string
  /** Rebuilt from the parcel export, in centavos. */
  computed: number
  /** What the SOA says, in centavos; null when the field was left blank. */
  stated: number | null
  difference: number
  verdict: LineVerdict
  /** How this number was derived, in one sentence. */
  basis: string
  parcelCount: number
}

export interface SoaCheckResult {
  lines: CheckedLine[]
  verdict: 'CLEAN' | 'DISCREPANCY' | 'INCOMPLETE'
  differenceTotal: number
  delivered: JntVipParcelRow[]
  dispatched: JntVipParcelRow[]
  returned: JntVipParcelRow[]
  warnings: string[]
  /** Parcels in the file that have no usable date at all. */
  undated: JntVipParcelRow[]
}

const c = (peso: number) => Math.round(peso * 100)

/** Money the way J&T computes it: per parcel, floored, then summed. */
export function commissionCentavos(parcels: JntVipParcelRow[], rate: number): number {
  return parcels.reduce((sum, p) => sum + Math.floor(p.cod * rate * 100), 0)
}

function inWindow(day: string | null, from: string, to: string): boolean {
  return day != null && day >= from && day <= to
}

export function checkSoa(parcels: JntVipParcelRow[], stated: SoaStated, terms: Terms = DEFAULT_TERMS): SoaCheckResult {
  const { periodFrom: from, periodTo: to } = stated
  const warnings: string[] = []

  const delivered = parcels.filter((p) => p.status === 'DELIVERED' && inWindow(p.podDate, from, to))
  const dispatched = parcels.filter((p) => inWindow(p.shipDate, from, to))
  const returned = parcels.filter((p) => p.status === 'RETURNED' && inWindow(p.podDate, from, to))
  const undated = parcels.filter((p) => p.podDate == null && p.shipDate == null)

  const codCollected = delivered.reduce((s, p) => s + c(p.cod), 0)
  const commission = commissionCentavos(delivered, terms.commissionRate)
  const vat = Math.round(commission * terms.vatRate)
  const codPayable = codCollected - commission - vat
  const shippingFee = dispatched.reduce((s, p) => s + c(p.shippingCost), 0)
  // Per returned parcel, from its own freight — so a Mindanao return costs
  // more to send back than a Metro Manila one, exactly as it cost more to send.
  const rtsFee = returned.reduce((sum, p) => sum + Math.round(c(p.freight) * terms.rtsShareOfFreight), 0)
  const totalDeduction = shippingFee + rtsFee
  const adjustments = stated.adjustments != null ? c(stated.adjustments) : 0
  const netRemittance = codPayable - totalDeduction + adjustments

  const line = (
    key: string,
    label: string,
    computed: number,
    statedPeso: number | null,
    basis: string,
    parcelCount: number,
  ): CheckedLine => {
    const st = statedPeso != null ? c(statedPeso) : null
    const difference = st == null ? 0 : computed - st
    return {
      key,
      label,
      computed,
      stated: st,
      difference,
      verdict: st == null ? 'NOT_STATED' : difference === 0 ? 'MATCH' : 'DIFF',
      basis,
      parcelCount,
    }
  }

  const lines: CheckedLine[] = [
    line('cod', 'COD collected', codCollected, stated.codCollected,
      `Sum of COD on parcels delivered (POD) between ${from} and ${to}.`, delivered.length),
    line('commission', `Commission @ ${(terms.commissionRate * 100).toFixed(2)}%`, commission, stated.commission,
      'Per parcel, floored to the centavo, then summed — not a flat rate on the total.', delivered.length),
    line('vat', `VAT @ ${(terms.vatRate * 100).toFixed(0)}% of commission`, vat, stated.vat,
      'Twelve percent of the commission above.', delivered.length),
    line('codPayable', 'Total COD payable', codPayable, stated.codPayable,
      'COD collected less commission and VAT.', delivered.length),
    line('shipping', 'Shipping fee', shippingFee, stated.shippingFee,
      `Sum of Total Shipping Cost on parcels DISPATCHED in the window — a different set of parcels from the delivered ones.`, dispatched.length),
    line('rts', `RTS fee @ ${(terms.rtsShareOfFreight * 100).toFixed(0)}% of freight`, rtsFee, stated.rtsFee,
      'Half of each returned parcel\u2019s own base freight, summed — not a flat fee per parcel.', returned.length),
    line('deduction', 'Total deduction', totalDeduction, stated.totalDeduction,
      'Shipping plus RTS fees.', dispatched.length + returned.length),
    line('net', 'Net remittance', netRemittance, stated.netRemittance,
      'COD payable less deductions, plus any adjustments you entered.', delivered.length),
  ]

  // Boundary risk: a POD near midnight can legitimately land on either side.
  const nearMidnight = delivered.filter((p) => {
    const h = p.podAt?.match(/[T ](\d{2}):/)?.[1]
    return h === '23' || h === '00'
  })
  if (nearMidnight.length > 0) {
    warnings.push(
      `${nearMidnight.length} parcel(s) were signed within an hour of midnight (${nearMidnight
        .slice(0, 3)
        .map((p) => p.awb)
        .join(', ')}${nearMidnight.length > 3 ? '…' : ''}). A different SOA could legitimately claim them.`,
    )
  }
  if (undated.length > 0) {
    warnings.push(`${undated.length} parcel(s) in the file carry neither a POD nor a dispatch date and cannot be placed in any window.`)
  }
  if (delivered.length === 0 && dispatched.length === 0) {
    warnings.push('No parcel in the imported file falls inside this period. Check the dates, or import the export covering them.')
  }
  // The commonest false discrepancy: a parcel dispatched before the export's
  // start date but delivered inside the period is in no export, so COD and RTS
  // both read short. That is a truncated export, not a J&T overcharge.
  const earliestDispatch = parcels.map((p) => p.shipDate).filter((d): d is string => !!d).sort()[0]
  if (earliestDispatch && from < earliestDispatch) {
    warnings.push(
      `This period starts ${from}, but the earliest parcel in your export was dispatched ${earliestDispatch}. ` +
        `Anything sent before that and delivered in this period is missing, so COD and RTS will read short. ` +
        `Re-export with an earlier start date before treating a shortfall as a J&T error.`,
    )
  }
  const settledInWindow = delivered.length + returned.length
  if (settledInWindow > 0 && returned.length / settledInWindow > 0.2) {
    warnings.push(
      `RTS ran at ${((returned.length / settledInWindow) * 100).toFixed(1)}% of settled parcels in this window — above a 20% threshold worth investigating.`,
    )
  }

  const checked = lines.filter((l) => l.verdict !== 'NOT_STATED')
  const differing = checked.filter((l) => l.verdict === 'DIFF')
  const verdict: SoaCheckResult['verdict'] =
    checked.length === 0 ? 'INCOMPLETE' : differing.length === 0 ? 'CLEAN' : 'DISCREPANCY'

  return {
    lines,
    verdict,
    differenceTotal: differing.reduce((s, l) => s + Math.abs(l.difference), 0),
    delivered,
    dispatched,
    returned,
    warnings,
    undated,
  }
}

export interface RtsWeek {
  weekStart: string
  weekLabel: string
  settled: number
  delivered: number
  returned: number
  rate: number
  /** Parcels from this week still moving — the reason a fresh week reads too well. */
  inFlight: number
  mature: boolean
}

/** Monday of the ISO week containing `day`. */
function weekStart(day: string): string {
  const d = new Date(day + 'T00:00:00Z')
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

/**
 * RTS by dispatch week.
 *
 * Cohorted on dispatch, not on return date: a parcel shipped this week and
 * rejected next week belongs to this week's batch. And a week is only called
 * mature once its parcels have had time to finish — a fresh week always looks
 * good because rejections surface late, and reading it as a real improvement
 * is the mistake this flag exists to prevent.
 */
export function rtsByWeek(parcels: JntVipParcelRow[], maturityDays = 10, today = new Date()): RtsWeek[] {
  const buckets = new Map<string, JntVipParcelRow[]>()
  for (const p of parcels) {
    if (!p.shipDate) continue
    const w = weekStart(p.shipDate)
    const list = buckets.get(w)
    if (list) list.push(p)
    else buckets.set(w, [p])
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([w, list]) => {
      const delivered = list.filter((p) => p.status === 'DELIVERED').length
      const returned = list.filter((p) => p.status === 'RETURNED').length
      const settled = delivered + returned
      const inFlight = list.length - settled
      const weekEnd = new Date(w + 'T00:00:00Z')
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
      const ageDays = (today.getTime() - weekEnd.getTime()) / 86_400_000
      return {
        weekStart: w,
        weekLabel: `${w.slice(5)} – ${weekEnd.toISOString().slice(5, 10)}`,
        settled,
        delivered,
        returned,
        rate: settled > 0 ? returned / settled : 0,
        inFlight,
        mature: ageDays >= maturityDays && inFlight === 0,
      }
    })
}

export interface RtsSummary {
  total: number
  delivered: number
  returned: number
  forReturn: number
  inFlight: number
  settled: number
  /** Returns over settled parcels — the honest current rate. */
  rateOnSettled: number
  /** Returns over the whole batch — flatters you while parcels are moving. */
  rateOnAll: number
  /** Counting the ones already heading back. */
  rateIncludingForReturn: number
  /** Undecided parcels settling at today's rate. */
  projectedFinalRate: number
  codLost: number
  shippingSunk: number
  rtsFees: number
  cashBurned: number
}

export function rtsSummary(parcels: JntVipParcelRow[], terms: Terms = DEFAULT_TERMS): RtsSummary {
  const total = parcels.length
  const delivered = parcels.filter((p) => p.status === 'DELIVERED').length
  const returned = parcels.filter((p) => p.status === 'RETURNED').length
  const forReturn = parcels.filter((p) => p.status === 'FOR_RETURN').length
  const settled = delivered + returned
  const inFlight = parcels.filter((p) => !isSettled(p.status) && p.status !== 'FOR_RETURN').length
  const rateOnSettled = settled > 0 ? returned / settled : 0

  const rejects = parcels.filter((p) => p.status === 'RETURNED' || p.status === 'FOR_RETURN')
  const codLost = rejects.reduce((s, p) => s + c(p.cod), 0)
  const shippingSunk = rejects.reduce((s, p) => s + c(p.shippingCost), 0)
  const rtsFees = rejects.reduce((s, p) => s + Math.round(c(p.freight) * terms.rtsShareOfFreight), 0)

  return {
    total,
    delivered,
    returned,
    forReturn,
    inFlight,
    settled,
    rateOnSettled,
    rateOnAll: total > 0 ? returned / total : 0,
    rateIncludingForReturn: total > 0 ? (returned + forReturn) / total : 0,
    projectedFinalRate: total > 0 ? (returned + forReturn + inFlight * rateOnSettled) / total : 0,
    codLost,
    shippingSunk,
    rtsFees,
    cashBurned: shippingSunk + rtsFees,
  }
}
