// Return-to-sender, broken down.
//
// A single RTS percentage over a month hides the thing worth knowing. Returns
// are not a constant tax: they move week to week with the creative, the offer,
// the areas being targeted and how orders are confirmed. A rate that reads 15%
// for September can be 5% in the first week and 25% in the fourth, which is the
// difference between a healthy operation and one quietly bleeding — and the
// month-level number shows neither.
//
// Splitting by product matters for the same reason. Two SKUs sold to different
// audiences return at different rates, and averaging them lets a bad one hide
// behind a good one.
//
// The rate is returns over SETTLED parcels — delivered plus returned. Parcels
// still moving are excluded deliberately: they have not had the chance to come
// back yet, so counting them in the denominator makes the recent weeks look
// better than they are, and recent weeks are the ones being judged.

import type { JntVipParcelRow } from './types'

/**
 * Which product a parcel carried.
 *
 * Read from the text J&T echoes back rather than from a stored field, so this
 * works on parcel exports that were imported before the app knew to keep one.
 * The waybill parser puts the item name into `remarks` when the export has no
 * separate remarks column, so both are searched.
 */
export function productOf(p: JntVipParcelRow): string {
  const text = `${p.remarks ?? ''}`.toUpperCase()
  if (text.includes('EYE CARE') || text.includes('EYECARE')) return 'EYE CARE'
  if (text.includes('TESTOMAXX') || text.includes('TSTMX')) return 'TESTOMAXX'
  return 'Other'
}

/** ISO week key, e.g. 2026-W38. Weeks start Monday and belong to the year holding their Thursday. */
export function isoWeek(day: string): string {
  const d = new Date(day + 'T00:00:00Z')
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export const monthKey = (day: string) => day.slice(0, 7)

export interface RtsCell {
  delivered: number
  returned: number
  settled: number
  rate: number
}

export interface RtsPeriod {
  key: string
  /** A human label — the week's date range, or the month's name. */
  label: string
  byProduct: Record<string, RtsCell>
  total: RtsCell
}

const cell = (delivered: number, returned: number): RtsCell => ({
  delivered,
  returned,
  settled: delivered + returned,
  rate: delivered + returned > 0 ? returned / (delivered + returned) : 0,
})

function weekLabel(key: string): string {
  const [y, w] = key.split('-W')
  // Monday of that ISO week.
  const jan4 = new Date(Date.UTC(Number(y), 0, 4))
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (Number(w) - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d: Date) => `${d.getUTCDate()} ${d.toLocaleString('en-PH', { month: 'short', timeZone: 'UTC' })}`
  return `${fmt(monday)} – ${fmt(sunday)}`
}

function monthLabel(key: string): string {
  return new Date(key + '-01T00:00:00Z').toLocaleString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * RTS rate per period, split by product.
 *
 * Settled parcels only, keyed on the POD date — the day the parcel's fate was
 * decided. Keying on dispatch instead would push a return back into the week it
 * was sent, which is the week whose rate you are trying to judge, and would make
 * the most recent weeks permanently understate.
 */
export function rtsByPeriod(parcels: JntVipParcelRow[], grain: 'week' | 'month'): RtsPeriod[] {
  const keyOf = grain === 'week' ? isoWeek : monthKey
  const buckets = new Map<string, Map<string, { d: number; r: number }>>()

  for (const p of parcels) {
    if (p.status !== 'DELIVERED' && p.status !== 'RETURNED') continue
    if (!p.podDate) continue
    const k = keyOf(p.podDate)
    const product = productOf(p)
    if (!buckets.has(k)) buckets.set(k, new Map())
    const byProduct = buckets.get(k)!
    if (!byProduct.has(product)) byProduct.set(product, { d: 0, r: 0 })
    const c = byProduct.get(product)!
    if (p.status === 'DELIVERED') c.d++
    else c.r++
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, byProduct]) => {
      const products: Record<string, RtsCell> = {}
      let d = 0
      let r = 0
      for (const [name, c] of byProduct) {
        products[name] = cell(c.d, c.r)
        d += c.d
        r += c.r
      }
      return {
        key,
        label: grain === 'week' ? weekLabel(key) : monthLabel(key),
        byProduct: products,
        total: cell(d, r),
      }
    })
}

/** Every product seen, commonest first — the column order for a breakdown. */
export function productsIn(periods: RtsPeriod[]): string[] {
  const totals = new Map<string, number>()
  for (const p of periods) {
    for (const [name, c] of Object.entries(p.byProduct)) {
      totals.set(name, (totals.get(name) ?? 0) + c.settled)
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}

/**
 * Is the rate getting worse?
 *
 * Compares the last two periods that have enough parcels to mean anything. A
 * week with four settled parcels can read 25% off a single return, so a small
 * period is skipped rather than allowed to declare a trend.
 */
export function rtsTrend(periods: RtsPeriod[], minSettled = 15): { change: number; from: RtsPeriod; to: RtsPeriod } | null {
  const solid = periods.filter((p) => p.total.settled >= minSettled)
  if (solid.length < 2) return null
  const to = solid[solid.length - 1]
  const from = solid[solid.length - 2]
  return { change: to.total.rate - from.total.rate, from, to }
}

/** RTS bands. Reserved status colours, each shown with a word beside it. */
export function rtsBand(rate: number): { color: string; word: string } {
  if (rate <= 0.08) return { color: 'var(--status-good-ink)', word: 'healthy' }
  if (rate <= 0.15) return { color: 'var(--status-warning-ink)', word: 'watch' }
  return { color: 'var(--status-critical)', word: 'too high' }
}
