// J&T's E-RPOD forms — the only document that says a return reached the house.
//
// The waybill export cannot answer whether a return came back; its date on a
// returned parcel is the day it was marked returned at the delivery end. The
// E-RPOD Monitoring Form can. The courier fills one in at the handover: the
// driver's name, the task's start and end time, a stated parcel count, and
// every waybill with the second it was scanned, signed by both sides with a
// photograph of the handover attached.
//
// So a waybill on an E-RPOD is PROOF of arrival, and the strongest record in
// this whole system — better than the export, which is a status feed, and
// better than somebody ticking a box from memory.
//
// WHAT IS AND IS NOT COMMITTED. The forms arrive as photographs in a group
// chat. They are read once and typed in here, so this file cannot be
// re-derived from anything in the repository; the screenshots themselves are
// not committed. Each form records what it stated, including its own parcel
// count, so the count can be checked against the waybills rather than trusted.
//
// The stated count is the check worth having: a form that says 7 and lists 6
// means a parcel was handed over and not written down, and nobody would ever
// notice from the export.

import file from '../../data/jntErpod.json'

export interface ErpodParcel {
  awb: string
  /** Time of day the waybill was scanned, HH:MM:SS. */
  at: string
}

export interface ErpodForm {
  date: string
  driver: string
  startedAt: string
  endedAt: string
  /** The count the form itself prints, for checking against `parcels`. */
  statedCount: number
  parcels: ErpodParcel[]
}

export interface ErpodArrival {
  awb: string
  /** The day the box was handed over, YYYY-MM-DD. */
  date: string
  /** Full timestamp of the scan. */
  at: string
  driver: string
}

export const ERPOD_SOURCE: string = file.source
export const ERPOD_SELLER = file.seller as { name: string; id: string; rpodAddress: string }
export const ERPOD_FORMS: ErpodForm[] = file.forms as ErpodForm[]

/**
 * Forms whose stated parcel count disagrees with the waybills listed on them.
 *
 * Empty is the expected answer and is worth saying out loud; a non-empty result
 * means a handover is not fully written down.
 */
export function formsWithCountMismatch(): { form: ErpodForm; listed: number }[] {
  return ERPOD_FORMS.filter((f) => f.parcels.length !== f.statedCount).map((f) => ({
    form: f,
    listed: f.parcels.length,
  }))
}

/** Every waybill proved arrived, keyed by waybill. */
export function erpodArrivals(): Map<string, ErpodArrival> {
  const out = new Map<string, ErpodArrival>()
  for (const f of ERPOD_FORMS) {
    for (const p of f.parcels) {
      // A waybill on two forms would mean the same box handed over twice. Keep
      // the earliest, and let the duplicate show up in the count rather than
      // silently replacing the first.
      const existing = out.get(p.awb)
      const at = `${f.date}T${p.at}`
      if (!existing || at < existing.at) {
        out.set(p.awb, { awb: p.awb, date: f.date, at, driver: f.driver })
      }
    }
  }
  return out
}

/** Waybills listed on more than one form. */
export function duplicateAwbs(): string[] {
  const seen = new Set<string>()
  const twice = new Set<string>()
  for (const f of ERPOD_FORMS) for (const p of f.parcels) (seen.has(p.awb) ? twice : seen).add(p.awb)
  return [...twice].sort()
}

/** The newest and oldest handover on file, for saying how current this is. */
export function erpodSpan(): { from: string; to: string } | null {
  if (ERPOD_FORMS.length === 0) return null
  const dates = ERPOD_FORMS.map((f) => f.date).sort()
  return { from: dates[0], to: dates[dates.length - 1] }
}
