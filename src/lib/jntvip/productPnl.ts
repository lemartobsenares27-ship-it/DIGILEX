// A full profit and loss per product, per week or per month.
//
// The per-product page could already show a return rate by week. It could not
// show what any product EARNED in that week, which is the question underneath
// — a SKU returning 15% is only a problem if it is also losing money, and a
// SKU returning 6% can still be the one to drop.
//
// ONE PARCEL BELONGS TO ONE PERIOD, AND TAKES ALL ITS COSTS WITH IT.
//
// Every parcel is dated by the day it SETTLED — delivered or returned — and
// its own freight, return fee and product cost are counted in that same
// period. The alternative, pricing shipping when a parcel is dispatched and
// revenue when it is delivered, splits one parcel across two weeks and makes
// the first look expensive and the second free. At a week's grain that
// distortion is larger than the thing being measured.
//
// WHAT IS MEASURED AND WHAT IS SHARED OUT.
//
// Most of this is read from the parcel itself and is exact per product:
// freight, return fees, COD collected, and the bottles that went out. Two
// things cannot be:
//
//   ADVERTISING. The card charges say what was spent, never on which product.
//   It is shared out by each product's share of parcels settled in the period.
//   A product that converts cheaply is therefore charged too much and one that
//   converts dearly too little, which matters most when comparing two products
//   in the same week — so the page labels it rather than burying it.
//
//   OPERATING COSTS. Payroll, electricity and packing are not per product
//   either. Payroll and overhead are shared by parcel count; packing by bottle
//   count, since that is what it is actually charged on.
//
// Both are marked `allocated` so a reader can tell a measured peso from a
// shared one.
//
// All amounts are integer centavos.

import type { JntVipParcelRow } from './types'
import type { ProductResolver } from './rts'
import { isoWeek } from './rts'
import { PRUDENT_UNIT_COST, bottleCost } from './bottleCost'
import {
  OPERATING_EXPENSES,
  chargeOperatingExpenses,
  type OperatingExpense,
} from './operatingCosts'
import { adSpendBetween } from './adSpend'
import { shareOf, windowCovers } from './adByProduct'

/** COD commission plus the VAT charged on it, as the statements apply it. */
const COD_FEE_RATE = 0.0275 * 1.12

export interface ProductCell {
  product: string
  delivered: number
  returned: number
  settled: number
  rtsRate: number
  bottles: number
  /** Collected on delivered parcels. Measured. */
  revenue: number
  /** Outbound freight on every parcel that settled, delivered or not. Measured. */
  freight: number
  /** Half the receivable freight on returns. Measured. */
  rtsFee: number
  /** Commission plus VAT on what was collected. Measured. */
  codFee: number
  /** Bottles that actually left, at their own SKU cost. Measured. */
  cogs: number
  /** Share of the period's advertising. */
  adSpend: number
  /** True where the share came from campaign data, false where parcels stood in. */
  adMeasured: boolean
  /** Share of the period's payroll, overhead and packing. Allocated. */
  operating: number
  profit: number
  margin: number
  roas: number
  /** Revenue less the costs this product causes, before anything shared out. */
  contribution: number
}

export interface ProductPeriod {
  key: string
  label: string
  from: string
  to: string
  days: number
  cells: ProductCell[]
  total: ProductCell
  /** Period advertising, before it is shared out. */
  adSpend: number
  /** True where ad charges cover the whole period. */
  adComplete: boolean
  /**
   * True where the period is cut short by the end of the data.
   *
   * The newest week is almost always one or two days long, and its margin is
   * meaningless: a full week of payroll lands on a day of parcels, and
   * returns from those parcels have not happened yet. Flagged so the page can
   * say so instead of showing a collapse that is only the calendar.
   */
  partial: boolean
}

const MONTH_FMT = new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric' })
const DAY_FMT = new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short' })

function unitCostOf(product: string): number {
  return bottleCost(product)?.total ?? PRUDENT_UNIT_COST
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

function blank(product: string): ProductCell {
  return {
    product,
    delivered: 0,
    returned: 0,
    settled: 0,
    rtsRate: 0,
    bottles: 0,
    revenue: 0,
    freight: 0,
    rtsFee: 0,
    codFee: 0,
    cogs: 0,
    adSpend: 0,
    adMeasured: false,
    operating: 0,
    profit: 0,
    margin: 0,
    roas: 0,
    contribution: 0,
  }
}

function finish(c: ProductCell): ProductCell {
  c.settled = c.delivered + c.returned
  c.rtsRate = c.settled > 0 ? c.returned / c.settled : 0
  c.contribution = c.revenue - c.freight - c.rtsFee - c.codFee - c.cogs
  c.profit = c.contribution - c.adSpend - c.operating
  c.margin = c.revenue > 0 ? c.profit / c.revenue : 0
  c.roas = c.adSpend > 0 ? c.revenue / c.adSpend : 0
  return c
}

/**
 * Per-product profit and loss, cut into weeks or months.
 *
 * `expenses` are priced per period from the real day count, so a part-week at
 * either end is charged for the days it actually covers rather than a whole
 * week of payroll.
 */
export function productPnl(
  parcels: JntVipParcelRow[],
  grain: 'week' | 'month',
  productOf: ProductResolver,
  expenses: OperatingExpense[] = OPERATING_EXPENSES,
): ProductPeriod[] {
  const settled = parcels.filter(
    (p) => p.podDate && (p.status === 'DELIVERED' || p.status === 'RETURNED'),
  )
  if (settled.length === 0) return []

  const groups = new Map<string, JntVipParcelRow[]>()
  for (const p of settled) {
    const key = grain === 'week' ? isoWeek(p.podDate as string) : (p.podDate as string).slice(0, 7)
    const list = groups.get(key)
    if (list) list.push(p)
    else groups.set(key, [p])
  }

  // The span the data actually covers. Every period is clamped to it at BOTH
  // ends, and that is not a detail: without the floor, weekly and monthly
  // disagreed about the same data to the point of reversing its sign —
  // +PHP43,369 by week against -PHP71,505 by month. Months reach back to the
  // first of the month and weeks only to a Monday, so the monthly view was
  // charging two extra weeks of launch advertising that the weekly view never
  // saw. Clamped, both grains price exactly the days parcels were settling in
  // and come to the same answer.
  //
  // The end cap earns its place too: it stops the newest, part-finished period
  // being charged a full week of fixed costs against two days of parcels.
  const settledDays = settled.map((p) => p.podDate as string)
  const lastSettled = settledDays.reduce((a, b) => (b > a ? b : a))
  const firstSettled = settledDays.reduce((a, b) => (b < a ? b : a))

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, rows]) => {
      // Bounds come from the calendar, not from the key: isoWeek returns
      // "2026-W40", which is not a date and cannot be subtracted or formatted.
      const days = rows.map((p) => p.podDate as string).sort()
      const { from, to } = periodBounds(days[0], grain, firstSettled, lastSettled)
      const span = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1

      const byProduct = new Map<string, ProductCell>()
      for (const p of rows) {
        const name = productOf(p)
        const cell = byProduct.get(name) ?? blank(name)
        const bottles = bottlesOf(p)
        // Freight is paid on every parcel that moved, returned or not.
        cell.freight += p.shippingCost
        if (p.status === 'DELIVERED') {
          cell.delivered++
          cell.bottles += bottles
          cell.revenue += p.cod
          cell.codFee += Math.round(p.cod * COD_FEE_RATE)
          cell.cogs += bottles * unitCostOf(name)
        } else {
          cell.returned++
          cell.rtsFee += Math.round(p.freight * 0.5)
          // No cost of goods on a return: the bottles come back sellable, and
          // charging them here would count the same stock as lost twice.
        }
        byProduct.set(name, cell)
      }

      const cells = [...byProduct.values()]
      const totalSettled = rows.length
      const totalBottles = cells.reduce((t, c) => t + c.bottles, 0)

      const adSpend = adSpendBetween(from, to)
      const operatingLines = chargeOperatingExpenses(span, totalBottles, expenses, { from, to })
      const perBottleOps = operatingLines
        .filter((l) => l.basis === 'PER_BOTTLE')
        .reduce((t, l) => t + l.amount, 0)
      const fixedOps = operatingLines
        .filter((l) => l.basis !== 'PER_BOTTLE')
        .reduce((t, l) => t + l.amount, 0)

      // Advertising is split by MEASURED campaign share where the Meta exports
      // cover the period, and by parcels only where they do not.
      //
      // The parcel split was never more than a stand-in: it assumes every
      // product costs the same to advertise, and measured against real campaign
      // spend it was out by PHP43,441 on TESTOMAXX over five weeks — enough to
      // make a good product look like the problem one and to hide that ALMUTRIA
      // was losing money on every order. Where the measurement exists it is
      // used; where it does not, the fallback is flagged rather than passed off
      // as the same thing.
      const measured = windowCovers(from, to)
      const shares = cells.map((c) => (measured ? shareOf(c.product) : null))
      const haveAll = shares.every((v) => v != null)

      cells.forEach((c, i) => {
        // settled is derived in finish(), which has not run yet — so the share
        // is taken from the counts directly. Reading c.settled here made every
        // share zero and silently allocated no advertising at all.
        const cellSettled = c.delivered + c.returned
        const parcelShare = totalSettled > 0 ? cellSettled / totalSettled : 0
        const bottleShare = totalBottles > 0 ? c.bottles / totalBottles : 0

        const adShare = haveAll ? (shares[i] as number) : parcelShare
        c.adSpend = Math.round(adSpend * adShare)
        c.adMeasured = haveAll
        // Overhead and packing stay on parcels and bottles: those really are
        // what they are charged on, so there is nothing better to measure.
        c.operating = Math.round(fixedOps * parcelShare + perBottleOps * bottleShare)
        finish(c)
      })
      cells.sort((a, b) => b.revenue - a.revenue)

      const total = finish(
        cells.reduce((t, c) => {
          t.delivered += c.delivered
          t.returned += c.returned
          t.bottles += c.bottles
          t.revenue += c.revenue
          t.freight += c.freight
          t.rtsFee += c.rtsFee
          t.codFee += c.codFee
          t.cogs += c.cogs
          t.adSpend += c.adSpend
          t.adMeasured = c.adMeasured
          t.operating += c.operating
          return t
        }, blank('All products')),
      )

      const naturalDays = grain === 'week' ? 7 : daysInMonth(from)

      return {
        key,
        partial: span < naturalDays,
        label:
          grain === 'week'
            ? `${DAY_FMT.format(new Date(`${from}T00:00:00`))} – ${DAY_FMT.format(new Date(`${to}T00:00:00`))}`
            : MONTH_FMT.format(new Date(`${from}T00:00:00`)),
        from,
        to,
        days: span,
        cells,
        total,
        adSpend,
        adComplete: adSpend > 0,
      }
    })
}

/**
 * The calendar period a day falls in, with the end capped at the newest data.
 *
 * A week runs Monday to Sunday and a month from the first to the last day, so
 * advertising charged on a day nothing happened to settle is still counted —
 * it was spent in that period and belongs to it.
 */
function daysInMonth(from: string): number {
  const d = new Date(`${from}T00:00:00Z`)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
}

function periodBounds(
  day: string,
  grain: 'week' | 'month',
  floor: string,
  cap: string,
): { from: string; to: string } {
  const d = new Date(`${day}T00:00:00Z`)
  let start: Date
  let end: Date
  if (grain === 'week') {
    const dow = d.getUTCDay() || 7
    start = new Date(d)
    start.setUTCDate(d.getUTCDate() - (dow - 1))
    end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
  } else {
    start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
  }
  const iso = (x: Date) => x.toISOString().slice(0, 10)
  const from = iso(start)
  const to = iso(end)
  return { from: from < floor ? floor : from, to: to > cap ? cap : to }
}

/** One product's row across every period, for a single-product view. */
export function seriesFor(periods: ProductPeriod[], product: string): { period: ProductPeriod; cell: ProductCell }[] {
  return periods
    .map((period) => ({ period, cell: period.cells.find((c) => c.product === product) }))
    .filter((r): r is { period: ProductPeriod; cell: ProductCell } => r.cell != null)
}
