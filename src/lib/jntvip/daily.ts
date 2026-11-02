// Day by day, so a change can be seen while it is still happening.
//
// Every other view here is monthly, which is the right grain for judging a
// business and the wrong one for running an experiment on it. Start confirming
// orders before dispatch on a Monday and the monthly return rate will not say
// whether it worked until the month is over — by which time a month of ad
// spend has gone through whatever the answer turned out to be.
//
// Two things make a daily return rate honest, and without both it is worse
// than no number at all:
//
//   1. IT IS ROLLED. On a day with twelve settled parcels, one return is 8.3%
//      and two is 16.7%. Nothing happened between those days except chance.
//      A seven-day window is wide enough that a single parcel cannot swing it
//      and short enough to show a change within a fortnight.
//
//   2. IT IS DATED BY DISPATCH, NOT DELIVERY. A parcel delivers in days and
//      takes a median five more to come back. Dated by delivery, every recent
//      day looks excellent because its deliveries are all in and its returns
//      have not happened yet — a confirmation script would look like an
//      instant triumph purely from the lag. Dated by dispatch, a parcel stays
//      with the batch it left in, so the rate for a day only moves as that
//      day's own parcels settle.
//
// The second point has a cost: the most recent days are incomplete, because
// their parcels have not all settled. That is reported rather than hidden —
// those rows are marked, and the rolling line stops where maturity stops.
//
// All amounts are integer centavos.

import type { JntVipParcelRow } from './types'
import { AD_CHARGES } from './adSpend'

export interface DailyRow {
  day: string
  /** Parcels that left on this day. */
  dispatched: number
  delivered: number
  returned: number
  /** Dispatched parcels not yet delivered or returned. */
  open: number
  /** Share of this day's dispatches that have settled. */
  maturity: number
  /** Returns as a share of this day's SETTLED parcels. Null below the floor. */
  rts: number | null
  /** Seven-day rolling return rate, null until the window is both full and mature. */
  rolling: number | null
  /** COD on this day's delivered parcels. */
  cod: number
  /** Advertising charged on this day. */
  adSpend: number
}

/** A day holding fewer settled parcels than this says nothing worth plotting. */
const MIN_SETTLED = 8
/** Below this share settled, a day's own rate is still moving and is withheld. */
const MATURE_AT = 0.9
const WINDOW = 7

export function dailySeries(parcels: JntVipParcelRow[]): DailyRow[] {
  const by = new Map<string, DailyRow>()
  const blank = (day: string): DailyRow => ({
    day,
    dispatched: 0,
    delivered: 0,
    returned: 0,
    open: 0,
    maturity: 0,
    rts: null,
    rolling: null,
    cod: 0,
    adSpend: 0,
  })

  for (const p of parcels) {
    if (!p.shipDate) continue
    const row = by.get(p.shipDate) ?? blank(p.shipDate)
    row.dispatched++
    if (p.status === 'DELIVERED') {
      row.delivered++
      row.cod += p.cod
    } else if (p.status === 'RETURNED') row.returned++
    else row.open++
    by.set(p.shipDate, row)
  }

  for (const c of AD_CHARGES) {
    const row = by.get(c.chargedOn) ?? blank(c.chargedOn)
    row.adSpend += c.amount
    by.set(c.chargedOn, row)
  }

  const rows = [...by.values()].sort((a, b) => a.day.localeCompare(b.day))

  for (const r of rows) {
    const settled = r.delivered + r.returned
    r.maturity = r.dispatched > 0 ? settled / r.dispatched : 0
    r.rts = settled >= MIN_SETTLED && r.maturity >= MATURE_AT ? r.returned / settled : null
  }

  // The rolling window is computed over the raw counts, not over the daily
  // rates. Averaging rates would weight a twelve-parcel day the same as a
  // ninety-parcel one; summing the parcels first lets volume speak.
  for (let i = 0; i < rows.length; i++) {
    const w = rows.slice(Math.max(0, i - WINDOW + 1), i + 1)
    if (w.length < WINDOW) continue
    const d = w.reduce((t, x) => t + x.delivered, 0)
    const r = w.reduce((t, x) => t + x.returned, 0)
    const dispatched = w.reduce((t, x) => t + x.dispatched, 0)
    const settled = d + r
    // The whole window must be mature, not just its oldest day: one unsettled
    // day at the near end drags the rate down exactly where a reader is
    // looking hardest.
    if (dispatched === 0 || settled / dispatched < MATURE_AT || settled < MIN_SETTLED * 2) continue
    rows[i].rolling = r / settled
  }

  return rows
}

export interface DailySummary {
  rows: DailyRow[]
  /** Rows with a usable rolling rate, for the chart. */
  plotted: DailyRow[]
  /** The newest day whose parcels have essentially all settled. */
  matureTo: string | null
  /** Days after matureTo — shown in the table, marked as still moving. */
  pending: number
  latestRolling: number | null
  priorRolling: number | null
}

export function summariseDaily(parcels: JntVipParcelRow[]): DailySummary {
  const rows = dailySeries(parcels)
  const plotted = rows.filter((r) => r.rolling != null)
  const matureTo = plotted.length > 0 ? plotted[plotted.length - 1].day : null
  const pending = matureTo ? rows.filter((r) => r.day > matureTo && r.dispatched > 0).length : 0
  const latestRolling = plotted.length > 0 ? plotted[plotted.length - 1].rolling : null
  // A week back, so the comparison is between two non-overlapping windows.
  const prior = plotted.length > WINDOW ? plotted[plotted.length - 1 - WINDOW].rolling : null
  return { rows, plotted, matureTo, pending, latestRolling, priorRolling: prior }
}
