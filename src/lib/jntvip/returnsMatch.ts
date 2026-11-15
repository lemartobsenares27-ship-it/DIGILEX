// Three records of the same event, compared.
//
// A returned parcel leaves a trace in three places, and they are not copies of
// each other:
//
//   THE J&T EXPORT   a status feed. Says a parcel is on a return leg. Cannot
//                    say the box reached the house, and is only as current as
//                    the day it was pulled.
//   THE POS          what the shop thinks happened to the order. Updated by
//                    hand, so it drifts.
//   THE E-RPOD FORM  the courier's handover receipt, signed by both sides with
//                    a photograph. The only one of the three that proves the
//                    box arrived.
//
// Where all three agree there is nothing to do. Every disagreement is one of a
// small number of situations with different fixes, and the point of this module
// is to sort them into those situations rather than produce a count of
// mismatches nobody can act on.
//
// The form is never "wrong" here. If a form says a box arrived and the other
// two do not, they are behind, not it.

import type { JntVipParcelRow, JntVipPosOrderRow } from './types'
import { erpodArrivals, type ErpodArrival } from './erpod'

/** What the shop's own status text means, reduced to the part that matters. */
export function posSaysReturned(status: string | null | undefined): boolean {
  const s = (status ?? '').trim().toLowerCase()
  if (!s) return false
  return s.includes('return') || s.includes('rts') || s.includes('refused') || s.includes('rejected')
}

export type Verdict =
  /** All three agree it came back. Nothing to do. */
  | 'AGREED'
  /** A form proves it arrived; the export has not caught up. */
  | 'EXPORT_BEHIND'
  /** A form proves it arrived; the POS still shows it as something else. */
  | 'POS_BEHIND'
  /** A form proves it arrived; neither of the other two knows. */
  | 'BOTH_BEHIND'
  /** Both systems call it a return, but no form proves the box arrived. */
  | 'NO_PROOF'
  /** Only the POS calls it a return. J&T has no return leg for it. */
  | 'POS_ONLY'
  /** Only J&T calls it a return. The POS has not been updated. */
  | 'JNT_ONLY'

/**
 * What the POS says, in three states rather than two.
 *
 * UNKNOWN is not the same as OTHER and conflating them is how this panel ends
 * up blaming a system that was never consulted: a waybill the POS has no order
 * for is the POS saying nothing, not the POS saying "not returned". With no POS
 * loaded at all, every row is UNKNOWN and the verdicts fall back to J&T against
 * the forms.
 */
export type PosState = 'RETURN' | 'OTHER' | 'UNKNOWN'

export interface MatchRow {
  awb: string
  /** The export's status, or null where it does not carry the waybill. */
  jnt: string | null
  jntIsReturn: boolean
  /** The POS status text, or null where the POS has no such order. */
  pos: string | null
  posState: PosState
  /** The handover, where a form proves one. */
  arrival: ErpodArrival | null
  verdict: Verdict
  date: string
  cod: number
}

export interface VerdictGroup {
  verdict: Verdict
  label: string
  meaning: string
  todo: string
  rows: MatchRow[]
}

const DESCRIBE: Record<Verdict, { label: string; meaning: string; todo: string }> = {
  AGREED: {
    label: 'Everything that has an opinion agrees',
    meaning:
      'A signed form proves the box arrived and J&T calls it a return. Where the POS has an order for it, that agrees too.',
    todo: 'Nothing.',
  },
  EXPORT_BEHIND: {
    label: 'J&T has not caught up',
    meaning: "A form proves the box was handed back, but J&T's export still shows it on its way out or queued.",
    todo: 'Raise with J&T. A parcel they never move to returned is one whose RTS fee and lost sale never reach a statement.',
  },
  POS_BEHIND: {
    label: 'Your POS has not caught up',
    meaning: 'A form proves the box was handed back; the POS has the order and still shows it as something else.',
    todo: 'Mark these returned in the POS, so stock and sales stop counting an order that came back.',
  },
  BOTH_BEHIND: {
    label: 'Only the form knows',
    meaning: 'A signed form proves the box arrived; J&T shows no return and the POS has it as something else.',
    todo: 'Update the POS, and raise the J&T side with them.',
  },
  NO_PROOF: {
    label: 'No proof it arrived',
    meaning: 'J&T calls it a return and no handover form covers it. Nothing shows the box reached the house.',
    todo: 'Find the form in the group chat, or ask the courier for it. Without one there is nothing showing the stock came back.',
  },
  POS_ONLY: {
    label: 'Only your POS calls it a return',
    meaning: 'The POS says returned; J&T has no return leg for this waybill at all.',
    todo: 'Check the waybill on J&T. Either the POS is wrong, or J&T never recorded the return.',
  },
  JNT_ONLY: {
    label: 'Only J&T calls it a return',
    meaning: 'J&T puts it on a return leg; the POS has the order and still shows it as live.',
    todo: 'Update the POS. Until then the order is counted as a sale that was never collected.',
  },
}

/** The order to show groups in: what costs money first, what is settled last. */
const ORDER: Verdict[] = [
  'NO_PROOF',
  'EXPORT_BEHIND',
  'BOTH_BEHIND',
  'POS_ONLY',
  'POS_BEHIND',
  'JNT_ONLY',
  'AGREED',
]

export interface ReturnsMatch {
  rows: MatchRow[]
  groups: VerdictGroup[]
  /** False when no POS orders are loaded, which changes what can be concluded. */
  hasPos: boolean
  /** How far the export reaches, so staleness can be told from error. */
  exportThrough: string | null
  from: string
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '')

/**
 * Compare the three records over one window.
 *
 * A waybill is in scope when ANY of the three calls it a return in the window.
 * Taking the union rather than one source's list is the whole point: a return
 * only one of them knows about is exactly what this is meant to surface.
 */
export function matchReturns(
  parcels: JntVipParcelRow[],
  posOrders: JntVipPosOrderRow[],
  from: string,
): ReturnsMatch {
  const arrivals = erpodArrivals()
  const byAwb = new Map(parcels.map((p) => [p.awb, p]))
  const posByAwb = new Map<string, JntVipPosOrderRow>()
  for (const o of posOrders) {
    const k = (o.trackingNumber ?? '').trim().toUpperCase()
    if (k) posByAwb.set(k, o)
  }

  const candidates = new Set<string>()
  for (const p of parcels) {
    if (p.status !== 'RETURNED' && p.status !== 'FOR_RETURN') continue
    const d = day(p.podDate) || day(p.shipDate)
    if (d >= from || arrivals.has(p.awb)) candidates.add(p.awb)
  }
  for (const o of posOrders) {
    const k = (o.trackingNumber ?? '').trim().toUpperCase()
    if (!k || !posSaysReturned(o.status)) continue
    const d = day(o.shipDate) || day(o.orderDate)
    if (d >= from) candidates.add(k)
  }
  for (const [awb, a] of arrivals) if (a.date >= from) candidates.add(awb)

  const rows: MatchRow[] = [...candidates].map((awb) => {
    const p = byAwb.get(awb) ?? null
    const o = posByAwb.get(awb) ?? null
    const arrival = arrivals.get(awb) ?? null
    const jntIsReturn = p ? p.status === 'RETURNED' || p.status === 'FOR_RETURN' : false
    const posState: PosState = !o ? 'UNKNOWN' : posSaysReturned(o.status) ? 'RETURN' : 'OTHER'

    // A system is only ever "behind" where it HAS the order and disagrees.
    // Silence is not disagreement.
    let verdict: Verdict
    if (arrival) {
      if (jntIsReturn) verdict = posState === 'OTHER' ? 'POS_BEHIND' : 'AGREED'
      else verdict = posState === 'OTHER' ? 'BOTH_BEHIND' : 'EXPORT_BEHIND'
    } else if (jntIsReturn) {
      verdict = posState === 'OTHER' ? 'JNT_ONLY' : 'NO_PROOF'
    } else {
      verdict = 'POS_ONLY'
    }

    return {
      awb,
      jnt: p?.status ?? null,
      jntIsReturn,
      pos: o?.status ?? null,
      posState,
      arrival,
      verdict,
      date: arrival?.date ?? day(p?.podDate) ?? day(p?.shipDate) ?? '',
      cod: p?.cod ?? o?.codAmountExpected ?? 0,
    }
  })

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.awb.localeCompare(b.awb))

  const dates = parcels.map((p) => day(p.podDate) || day(p.shipDate)).filter(Boolean).sort()

  return {
    rows,
    groups: ORDER.map((v) => ({ verdict: v, ...DESCRIBE[v], rows: rows.filter((r) => r.verdict === v) })).filter(
      (g) => g.rows.length > 0,
    ),
    hasPos: posOrders.length > 0,
    exportThrough: dates.length > 0 ? dates[dates.length - 1] : null,
    from,
  }
}
