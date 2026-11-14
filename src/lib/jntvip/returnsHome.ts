// Did the returned parcels actually come back?
//
// Every other page treats a return as settled business: the freight is spent,
// the RTS fee is charged, and the bottles come back sellable, so they carry no
// product cost. That last part is an assumption, and until the E-RPOD forms
// arrived nothing could check it.
//
// THREE SOURCES, IN ORDER OF AUTHORITY.
//
//   1. The E-RPOD Monitoring Form. The courier fills one in at the handover,
//      listing every waybill with the second it was scanned, signed by both
//      sides with a photograph attached. A waybill on one of these HAS come
//      back. Nothing outranks it.
//   2. A record somebody entered here, for a box that arrived without a form
//      or a return chased and established as lost.
//   3. The waybill export, which says a parcel is on its way back and cannot
//      say whether it got there. Its date on a RETURNED parcel is the day it
//      was marked returned at the delivery end.
//
// WHICH PARCELS COUNT AS COMING BACK. Both RETURNED and FOR_RETURN. The export
// moves a parcel to FOR_RETURN when the return is queued and to RETURNED when
// the leg is done, and a box in either state is a box that should turn up. The
// earlier version watched RETURNED alone, which missed the whole queue: of the
// 16 parcels on the 2 November form, 15 were still sitting at FOR_RETURN in the
// export and one was not in it at all.
//
// AND PARCELS THE EXPORT HAS NEVER HEARD OF. A form can name a waybill the
// export does not carry, because the export is a snapshot and the handover
// happened after it. Those are listed too, as arrived, rather than dropped for
// not matching — a proven arrival that silently vanishes is the worst failure
// this page could have.
//
// Age is NOT a status. An old unconfirmed parcel is one to ask about, not a
// loss, and turning one into the other on a timer would book a loss that may
// not exist and quietly take stock off the shelf. Only MISSING does that, and
// only a person can set it.
//
// All amounts are integer centavos.

import type { JntVipParcelRow, JntVipRtsHomecomingRow } from './types'
import { bottlesIn } from './profit'
import { bottleCost, PRUDENT_UNIT_COST } from './bottleCost'
import { erpodArrivals, type ErpodArrival } from './erpod'
import type { ProductResolver } from './rts'

/**
 * How long a return plausibly takes to travel back, in days.
 *
 * Not a rule from J&T — it is the working assumption this page states openly so
 * the reader can disagree with it. Below it, an unconfirmed parcel is probably
 * still moving. Above it, silence means nobody has looked.
 */
export const TRANSIT_DAYS = 7

/** Statuses that mean a box is on its way back to the sender. */
export const RETURN_STAGES = ['RETURNED', 'FOR_RETURN'] as const

export type Homecoming = 'RECEIVED' | 'MISSING' | 'UNCONFIRMED'
export type Stage =
  /** The export says the return leg is done. */
  | 'RETURNED'
  /** The export says the return is queued. */
  | 'FOR_RETURN'
  /**
   * The export carries this waybill, but at a status that is not a return at
   * all — IN_TRANSIT, DELIVERING — while a signed form says the box was handed
   * back. J&T's own status feed contradicting J&T's own signed form is worth
   * showing, not smoothing over.
   */
  | 'STATUS_STALE'
  /** The export has never heard of this waybill. */
  | 'NOT_IN_EXPORT'
/** Where the arrival record came from. */
export type Evidence = 'ERPOD' | 'MANUAL' | 'NONE'

export interface ReturnRow {
  awb: string
  stage: Stage
  /**
   * The day the return clock starts: the POD date where the export has one,
   * otherwise the dispatch date, otherwise the handover date from the form.
   */
  markedOn: string
  /** What `markedOn` actually is, so the column can say rather than imply. */
  markedFrom: 'returned' | 'dispatched' | 'handover'
  ageDays: number
  province: string
  city: string
  product: string
  bottles: number
  /** What the bottles in it cost to build. */
  stockValue: number
  /** COD that was never collected, for sizing the order that was lost. */
  cod: number
  reason: string | null
  status: Homecoming
  evidence: Evidence
  /** The day it arrived, or the day it was written off. */
  settledOn: string | null
  /** Full scan timestamp, where an E-RPOD form proved it. */
  arrivedAt: string | null
  driver: string | null
  recordedBy: string | null
  note: string | null
}

export interface ReturnsBand {
  key: 'transit' | 'chase' | 'overdue'
  label: string
  detail: string
  parcels: number
  bottles: number
  stockValue: number
}

export interface ReturnsHome {
  rows: ReturnRow[]
  total: number
  received: number
  /** Of those received, how many are backed by a courier form rather than a tick. */
  provenByForm: number
  missing: number
  unconfirmed: number
  unconfirmedBottles: number
  unconfirmedValue: number
  missingBottles: number
  missingValue: number
  /** Arrivals proved by a form for a waybill the export does not carry at all. */
  aheadOfExport: number
  /** Arrivals proved by a form that the export still shows as out for delivery. */
  contradicted: number
  bands: ReturnsBand[]
  /** How far the export itself reaches — everything after it is unknown to it. */
  exportThrough: string | null
  from: string
  asOf: string
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '')

function stockValueOf(product: string, bottles: number): number {
  return bottles * (bottleCost(product)?.total ?? PRUDENT_UNIT_COST)
}

/**
 * Build the return worklist.
 *
 * `from` starts the window; a parcel is in it when its return was marked on or
 * after that day, OR a form proves it arrived on or after it. The second half
 * matters: a parcel queued for return in late October and handed back in
 * November is a November arrival, and dropping it would lose a handover there
 * is signed proof of.
 *
 * `asOf` is passed in rather than read from the clock so the result is
 * reproducible; the page passes today.
 */
export function returnsHome(
  parcels: JntVipParcelRow[],
  homecoming: JntVipRtsHomecomingRow[],
  productOf: ProductResolver,
  asOf: string,
  from = '0000-01-01',
): ReturnsHome {
  const manual = new Map(homecoming.map((h) => [h.awb, h]))
  const arrivals = erpodArrivals()
  const asOfMs = Date.parse(asOf + 'T00:00:00Z')
  const ageOf = (d: string) =>
    d ? Math.max(0, Math.round((asOfMs - Date.parse(d + 'T00:00:00Z')) / 86400000)) : 0

  const seen = new Set<string>()
  const rows: ReturnRow[] = []

  const push = (
    awb: string,
    stage: Stage,
    markedOn: string,
    markedFrom: ReturnRow['markedFrom'],
    p: JntVipParcelRow | null,
    arrival: ErpodArrival | undefined,
  ) => {
    const record = manual.get(awb)
    const product = p ? productOf(p) : 'Unclassified'
    const bottles = p ? bottlesIn(p) : 1
    // A form outranks a typed record; a typed record outranks nothing at all.
    const status: Homecoming = arrival ? 'RECEIVED' : record ? record.status : 'UNCONFIRMED'
    const evidence: Evidence = arrival ? 'ERPOD' : record ? 'MANUAL' : 'NONE'
    rows.push({
      awb,
      stage,
      markedOn,
      markedFrom,
      ageDays: ageOf(markedOn),
      province: p?.province ?? '',
      city: p?.city ?? '',
      product,
      bottles,
      stockValue: stockValueOf(product, bottles),
      cod: p?.cod ?? 0,
      reason: p?.rtsReason ?? null,
      status,
      evidence,
      settledOn: arrival ? arrival.date : (record?.settledOn ?? null),
      arrivedAt: arrival?.at ?? null,
      driver: arrival?.driver ?? null,
      recordedBy: arrival ? null : (record?.recordedBy ?? null),
      note: record?.note ?? null,
    })
    seen.add(awb)
  }

  for (const p of parcels) {
    if (p.status !== 'RETURNED' && p.status !== 'FOR_RETURN') continue
    const arrival = arrivals.get(p.awb)
    // FOR_RETURN parcels carry no POD date, so the clock starts at dispatch.
    const pod = day(p.podDate)
    const markedOn = pod || day(p.shipDate)
    if (!markedOn) continue
    const inWindow = markedOn >= from || (arrival ? arrival.date >= from : false)
    if (!inWindow) continue
    push(p.awb, p.status, markedOn, pod ? 'returned' : 'dispatched', p, arrival)
  }

  // Waybills a form proves arrived that loop one did not reach — either the
  // export does not carry them, or it carries them at a status that is not a
  // return. The second case is NOT the same as the first and must not be
  // reported as it: the parcel's own city, product and COD are known, and the
  // discrepancy is between two J&T records rather than a gap in one.
  const byAwb = new Map(parcels.map((p) => [p.awb, p]))
  for (const [awb, arrival] of arrivals) {
    if (seen.has(awb)) continue
    if (arrival.date < from) continue
    const p = byAwb.get(awb) ?? null
    const pod = day(p?.podDate)
    const shipped = day(p?.shipDate)
    push(
      awb,
      p ? 'STATUS_STALE' : 'NOT_IN_EXPORT',
      pod || shipped || arrival.date,
      pod ? 'returned' : shipped ? 'dispatched' : 'handover',
      p,
      arrival,
    )
  }

  // Oldest first: the parcel least likely to still be moving is the one to ask
  // about, and a worklist sorted newest-first buries exactly that.
  rows.sort((a, b) => a.markedOn.localeCompare(b.markedOn) || a.awb.localeCompare(b.awb))

  const open = rows.filter((r) => r.status === 'UNCONFIRMED')
  const gone = rows.filter((r) => r.status === 'MISSING')
  const home = rows.filter((r) => r.status === 'RECEIVED')

  const band = (
    key: ReturnsBand['key'],
    label: string,
    detail: string,
    pick: (r: ReturnRow) => boolean,
  ): ReturnsBand => {
    const hit = open.filter(pick)
    return {
      key,
      label,
      detail,
      parcels: hit.length,
      bottles: hit.reduce((t, r) => t + r.bottles, 0),
      stockValue: hit.reduce((t, r) => t + r.stockValue, 0),
    }
  }

  const exportDates = parcels
    .map((p) => day(p.podDate) || day(p.shipDate))
    .filter(Boolean)
    .sort()

  return {
    rows,
    total: rows.length,
    received: home.length,
    provenByForm: home.filter((r) => r.evidence === 'ERPOD').length,
    missing: gone.length,
    unconfirmed: open.length,
    unconfirmedBottles: open.reduce((t, r) => t + r.bottles, 0),
    unconfirmedValue: open.reduce((t, r) => t + r.stockValue, 0),
    missingBottles: gone.reduce((t, r) => t + r.bottles, 0),
    missingValue: gone.reduce((t, r) => t + r.stockValue, 0),
    aheadOfExport: rows.filter((r) => r.stage === 'NOT_IN_EXPORT').length,
    contradicted: rows.filter((r) => r.stage === 'STATUS_STALE').length,
    bands: [
      band('transit', 'Probably still travelling', `Marked within the last ${TRANSIT_DAYS} days`, (r) => r.ageDays <= TRANSIT_DAYS),
      band('chase', 'Worth asking about', `Between ${TRANSIT_DAYS + 1} and 21 days`, (r) => r.ageDays > TRANSIT_DAYS && r.ageDays <= 21),
      band('overdue', 'Long overdue', 'More than 21 days with no proof of arrival', (r) => r.ageDays > 21),
    ],
    exportThrough: exportDates.length > 0 ? exportDates[exportDates.length - 1] : null,
    from,
    asOf,
  }
}

// ---------------------------------------------------------------------------
// What has no proof of handover at all
// ---------------------------------------------------------------------------
//
// Separate from the monitoring window on purpose. Monitoring starts in November
// because that is what can still be acted on; finding the missing paperwork
// reaches back over everything, because the forms for September and October
// either exist in the group chat and have not been collected, or were never
// issued. Those are very different problems and the first step is the same:
// know exactly which waybills have no form behind them.
//
// This is the gap that matters most. The courier issues an E-RPOD at every
// handover, so a return with no form is a return nobody has evidence arrived.

export interface ProofGapWeek {
  /** Monday of the week the return was marked, YYYY-MM-DD. */
  week: string
  parcels: number
  bottles: number
  stockValue: number
  /** COD on these parcels, which was never collected. */
  cod: number
  awbs: string[]
}

export interface ProofGaps {
  /**
   * Every return on record over all time: parcels the export puts on a return
   * leg, plus ones a form proves came back that the export still shows as out
   * for delivery. Waybills the export does not carry at all are excluded —
   * they are proven arrivals by definition, so they are never a proof gap.
   */
  returnStage: number
  /** How many of those a form proves arrived. */
  withForm: number
  /** How many have no form and no typed record either. */
  withoutAnyRecord: number
  bottles: number
  stockValue: number
  cod: number
  weeks: ProofGapWeek[]
  rows: ReturnRow[]
  /** Earliest and latest date in the gap, for saying what to search for. */
  span: { from: string; to: string } | null
}

/** Monday of the week containing `day`. */
function weekStart(day: string): string {
  const d = new Date(day + 'T00:00:00Z')
  const back = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - back)
  return d.toISOString().slice(0, 10)
}

export function proofGaps(
  parcels: JntVipParcelRow[],
  homecoming: JntVipRtsHomecomingRow[],
  productOf: ProductResolver,
  asOf: string,
): ProofGaps {
  // Reuse the one builder so a gap row carries exactly the same product,
  // bottle count and stock value the worklist shows. Two codepaths computing
  // the same parcel differently is how a dashboard starts disagreeing with
  // itself.
  const all = returnsHome(parcels, homecoming, productOf, asOf)
  const gaps = all.rows.filter((r) => r.evidence === 'NONE' && r.stage !== 'NOT_IN_EXPORT')

  const byWeek = new Map<string, ReturnRow[]>()
  for (const r of gaps) {
    const key = weekStart(r.markedOn)
    const list = byWeek.get(key)
    if (list) list.push(r)
    else byWeek.set(key, [r])
  }

  const dates = gaps.map((r) => r.markedOn).sort()

  return {
    returnStage: all.rows.filter((r) => r.stage !== 'NOT_IN_EXPORT').length,
    withForm: all.provenByForm,
    withoutAnyRecord: gaps.length,
    bottles: gaps.reduce((t, r) => t + r.bottles, 0),
    stockValue: gaps.reduce((t, r) => t + r.stockValue, 0),
    cod: gaps.reduce((t, r) => t + r.cod, 0),
    weeks: [...byWeek.entries()]
      .map(([week, rows]) => ({
        week,
        parcels: rows.length,
        bottles: rows.reduce((t, r) => t + r.bottles, 0),
        stockValue: rows.reduce((t, r) => t + r.stockValue, 0),
        cod: rows.reduce((t, r) => t + r.cod, 0),
        awbs: rows.map((r) => r.awb),
      }))
      .sort((a, b) => a.week.localeCompare(b.week)),
    rows: gaps,
    span: dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null,
  }
}
