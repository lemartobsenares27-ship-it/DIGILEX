// Why the bank balance falls in a month the business made money.
//
// This page exists because that question kept having to be answered by hand.
// Profit and cash are not the same thing and diverge for reasons that are all
// perfectly healthy, which is exactly why the gap is alarming when nobody has
// written it down: a profitable month can still end with less in the account
// than it started with, and the owner reasonably concludes the profit figure
// is a lie.
//
// Four things separate the two here, and each is shown rather than netted off:
//
//   1. STARTUP LOSSES. A month's profit is not the business's position. Two
//      loss-making months at the start have to be earned back before the bank
//      balance can grow at all, and until the cumulative total crosses zero
//      every profitable month is repaying a debt rather than accumulating.
//      This is almost always the real answer and it is the first thing shown.
//
//   2. MONEY NOT YET REMITTED. COD collected is counted as revenue when the
//      statement closes; J&T pays it days later. Anything unpaid is profit
//      that exists and cash that does not.
//
//   3. GROWTH. Advertising more this month than last consumes cash now for
//      revenue that arrives later. It is an investment, not a loss, but it
//      leaves the account the same way a loss does.
//
//   4. MONEY THAT IS NOT THE BUSINESS'S. Card instalments, family transfers
//      and personal spending leave the same account and never appear in an
//      operating P&L.
//
// All amounts are integer centavos.

import { AD_CHARGES } from './adSpend'
import type { JntVipParcelRow, JntVipSoaCheckRow } from './types'
import { OPERATING_EXPENSES, type OperatingExpense } from './operatingCosts'
import { profitByMonth, type ProfitPeriod } from './profit'

export interface CashMonth extends ProfitPeriod {
  /** Profit of every month up to and including this one. */
  cumulative: number
  /** True for the first month whose cumulative total is not negative. */
  crossesZero: boolean
}

export interface CashPosition {
  months: CashMonth[]
  /** Profit across every month on record. Negative means still behind. */
  cumulative: number
  /** The most recent month, which is the rate the projection uses. */
  latest: CashMonth | null
  /** Profit per day at the latest month's rate; null if that month lost money. */
  dailyRate: number | null
  /** Days until cumulative profit reaches zero. Null if already there, or never. */
  daysToBreakEven: number | null
  /** The date that lands on. */
  breakEvenOn: string | null
  /** Earned but not yet remitted by J&T. */
  outstanding: number
  /** Advertising growth in the latest month — cash spent on revenue not yet in. */
  adGrowth: number
  /**
   * Advertising that falls in no statement period, so no month's P&L counts it.
   *
   * The monthly P&L prices ads between a month's first and last statement
   * DATES, which is correct for comparing a month's trading. It also means
   * money spent before the first statement opened — a launch campaign running
   * weeks before the first parcel moved — lands in no month at all and
   * silently improves the cumulative total. It is reported separately rather
   * than folded in, because whether launch spend belongs against this business
   * is a judgement for the owner, not for this function.
   */
  adsOutsidePeriods: number
  /** Spent in the launch month, before the first statement opened. */
  adsBefore: number
  /** Spent after the last statement closed — the next month, already running. */
  adsAfter: number
  /**
   * Spent in months entirely before the launch month.
   *
   * Held apart because it is the earlier test product, which the owner asked
   * to be kept out of figures judging the live business. Reported so it is
   * visible, never added in.
   */
  adsPriorProduct: number
  firstPeriod: string | null
  lastPeriod: string | null
}

const DAY = 86400000

/**
 * The cash story, month by month.
 *
 * Months come from the statements' closing dates, the same cut the P&L uses, so
 * the two pages can never disagree about which month a statement belongs to.
 */
export function cashPosition(
  rows: JntVipSoaCheckRow[],
  parcels: JntVipParcelRow[],
  expenses: OperatingExpense[] = OPERATING_EXPENSES,
): CashPosition | null {
  const periods = profitByMonth(rows, parcels, expenses)
  if (periods.length === 0) return null

  let running = 0
  let crossed = false
  const months: CashMonth[] = periods.map((p) => {
    running += p.profit
    // Only the FIRST month to reach zero is marked. Without that guard every
    // subsequent month claims the milestone and the page reads as though the
    // business broke even four times.
    const crossesZero = !crossed && running >= 0
    if (crossesZero) crossed = true
    return { ...p, cumulative: running, crossesZero }
  })

  const latest = months[months.length - 1] ?? null
  const dailyRate = latest && latest.profit > 0 && latest.days > 0 ? latest.profit / latest.days : null

  let daysToBreakEven: number | null = null
  let breakEvenOn: string | null = null
  if (running < 0 && dailyRate != null && dailyRate > 0) {
    daysToBreakEven = Math.ceil(-running / dailyRate)
    // Dated from the end of the last statement, not from today. Today can be
    // weeks ahead of the data, and anchoring to it would move the answer every
    // time the page was opened without a single new number arriving.
    const end = lastPeriodEnd(rows)
    if (end) breakEvenOn = new Date(Date.parse(end) + daysToBreakEven * DAY).toISOString().slice(0, 10)
  }

  const outstanding = rows.reduce((t, r) => {
    const due = netDueOf(r)
    return t + Math.max(0, due - (r.receivedAmount ?? 0))
  }, 0)

  const adGrowth =
    months.length >= 2 ? months[months.length - 1].adSpend - months[months.length - 2].adSpend : 0

  const first = rows.reduce<string | null>((a, r) => (a == null || r.periodFrom < a ? r.periodFrom : a), null)
  const last = lastPeriodEnd(rows)
  const periodsAll = rows.map((r) => [r.periodFrom, r.periodTo] as const)
  const inside = (d: string) => periodsAll.some(([a, b]) => d >= a && d <= b)
  // The launch month is the one the first statement closes in. Spend in that
  // month but before the first statement is this business's launch campaign;
  // spend in any EARLIER month belongs to the test product that ran before it.
  const launchMonth = first ? first.slice(0, 7) : null
  let adsBefore = 0
  let adsAfter = 0
  let adsPriorProduct = 0
  for (const c of AD_CHARGES) {
    if (inside(c.chargedOn)) continue
    if (first && c.chargedOn < first) {
      if (launchMonth && c.chargedOn.slice(0, 7) < launchMonth) adsPriorProduct += c.amount
      else adsBefore += c.amount
    } else if (last && c.chargedOn > last) adsAfter += c.amount
  }

  return {
    months,
    cumulative: running,
    latest,
    dailyRate,
    daysToBreakEven,
    breakEvenOn,
    outstanding,
    adGrowth,
    adsOutsidePeriods: adsBefore + adsAfter,
    adsBefore,
    adsAfter,
    adsPriorProduct,
    firstPeriod: first,
    lastPeriod: last,
  }
}

function lastPeriodEnd(rows: JntVipSoaCheckRow[]): string | null {
  let latest: string | null = null
  for (const r of rows) if (latest == null || r.periodTo > latest) latest = r.periodTo
  return latest
}

/** What a statement should pay out: COD less everything J&T charges for it. */
function netDueOf(r: JntVipSoaCheckRow): number {
  const v = (stated: number | null, computed: number) => stated ?? computed
  return (
    v(r.statedCod, r.computedCod) -
    v(r.statedShipping, r.computedShipping) -
    v(r.statedCommission, r.computedCommission) -
    v(r.statedVat, r.computedVat) -
    v(r.statedRtsFee, r.computedRtsFee)
  )
}

export interface BridgeLine {
  label: string
  amount: number
  detail: string
  /** 'earned' starts the bridge, 'use' consumes it, 'left' is the remainder. */
  kind: 'earned' | 'use' | 'left'
}

/**
 * Where the latest month's profit went.
 *
 * Deliberately NOT a full cash-flow statement: it accounts for the profit the
 * business made, and stops. Anything it cannot see from the data it holds — a
 * card instalment, a personal transfer, money moved to another account — is
 * named as unseen rather than being quietly absorbed into a balancing figure,
 * because a bridge that always balances teaches the reader nothing.
 */
export function profitBridge(pos: CashPosition): BridgeLine[] {
  const m = pos.latest
  if (!m) return []
  const lines: BridgeLine[] = [
    {
      label: `Profit earned in ${m.label}`,
      amount: m.profit,
      detail: 'Revenue less every cost on the P&L',
      kind: 'earned',
    },
  ]
  if (pos.cumulative < 0 && m.profit > 0) {
    // The whole of a profitable month goes to repaying the hole while the
    // cumulative total is still negative — there is nothing left over to
    // become a bank balance until it crosses zero.
    lines.push({
      label: 'Repaying earlier losses',
      amount: -m.profit,
      detail: `Still ${peso(-pos.cumulative)} behind since the business started, so every peso this month went to paying that down before it could build a balance`,
      kind: 'use',
    })
  }
  if (pos.adGrowth > 0) {
    lines.push({
      label: 'Extra advertising vs last month',
      amount: -pos.adGrowth,
      detail: 'Cash spent now for orders that arrive later. An investment, but it leaves the account like a cost',
      kind: 'use',
    })
  }
  if (pos.outstanding > 0) {
    lines.push({
      label: 'Earned but not yet remitted',
      amount: -pos.outstanding,
      detail: 'Counted as revenue when the statement closed; J&T has not paid it across yet',
      kind: 'use',
    })
  }
  return lines
}

const peso = (c: number) =>
  '₱' + (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
