// J&T VIP — the statements arranged as monthly books.
//
// The Finance ledger answers "was this statement paid". This answers the
// bookkeeping question instead: for a given month, what did J&T collect on my
// behalf, what did they charge me for it, and what was left. Same shape as the
// financial dashboard's Monthly Bookkeeping, because that is the format these
// books are already kept in.
//
// A statement belongs to the month its period ENDS in. A period spanning a
// month boundary would otherwise be counted twice or not at all, and the
// closing date is what J&T settles against.
//
// All amounts are integer centavos.

import type { JntVipSoaCheckRow } from './types'

export interface BookLine {
  label: string
  detail: string
  amount: number
}

export interface BookMonth {
  month: string
  monthLabel: string
  statements: JntVipSoaCheckRow[]
  /** COD collected, one line per statement. */
  revenue: BookLine[]
  revenueTotal: number
  /** What J&T charged, grouped by kind. */
  deductions: BookLine[]
  deductionTotal: number
  /** Revenue less deductions — what the statements say you are owed. */
  net: number
  received: number
  outstanding: number
  /** Deductions as a share of what was collected. */
  costRatio: number
  unpaidCount: number
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}

const val = (stated: number | null, computed: number) => stated ?? computed

export function buildBooks(rows: JntVipSoaCheckRow[]): BookMonth[] {
  const byMonth = new Map<string, JntVipSoaCheckRow[]>()
  for (const r of rows) {
    const key = r.periodTo.slice(0, 7)
    const list = byMonth.get(key)
    if (list) list.push(r)
    else byMonth.set(key, [r])
  }

  return [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, list]) => {
      const statements = [...list].sort((a, b) => a.periodFrom.localeCompare(b.periodFrom))

      const revenue: BookLine[] = statements.map((s) => ({
        label: s.periodFrom === s.periodTo ? s.periodFrom : `${s.periodFrom} → ${s.periodTo}`,
        detail: s.soaNumber,
        amount: val(s.statedCod, s.computedCod),
      }))
      const revenueTotal = revenue.reduce((t, l) => t + l.amount, 0)

      const sum = (f: (s: JntVipSoaCheckRow) => number) => statements.reduce((t, s) => t + f(s), 0)
      const shipping = sum((s) => val(s.statedShipping, s.computedShipping))
      const commission = sum((s) => val(s.statedCommission, s.computedCommission))
      const vat = sum((s) => val(s.statedVat, s.computedVat))
      const rtsFee = sum((s) => val(s.statedRtsFee, s.computedRtsFee))
      const adjustments = sum((s) => s.statedAdjustments ?? 0)

      const deductions: BookLine[] = [
        { label: 'Shipping fees', detail: 'Billed per parcel on dispatch, whether or not it delivered', amount: shipping },
        { label: 'COD commission', detail: '2.75% of each parcel, floored to the centavo', amount: commission },
        { label: 'VAT on commission', detail: '12% of the commission above', amount: vat },
        { label: 'RTS fees', detail: "50% of each returned parcel's base freight", amount: rtsFee },
      ].filter((l) => l.amount !== 0)

      if (adjustments !== 0) {
        deductions.push({ label: 'Adjustments', detail: 'Applied by J&T on the statement', amount: -adjustments })
      }

      const deductionTotal = deductions.reduce((t, l) => t + l.amount, 0)
      const net = sum((s) => val(s.statedNet, s.computedNet))
      const received = sum((s) => s.receivedAmount ?? 0)

      return {
        month,
        monthLabel: monthLabel(month),
        statements,
        revenue,
        revenueTotal,
        deductions,
        deductionTotal,
        net,
        received,
        outstanding: net - received,
        costRatio: revenueTotal > 0 ? deductionTotal / revenueTotal : 0,
        unpaidCount: statements.filter((s) => (s.receivedAmount ?? 0) < val(s.statedNet, s.computedNet)).length,
      }
    })
}

export interface BooksTotals {
  months: number
  statements: number
  revenue: number
  deductions: number
  net: number
  received: number
  outstanding: number
  costRatio: number
}

export function booksTotals(books: BookMonth[]): BooksTotals {
  const sum = (f: (b: BookMonth) => number) => books.reduce((t, b) => t + f(b), 0)
  const revenue = sum((b) => b.revenueTotal)
  const deductions = sum((b) => b.deductionTotal)
  return {
    months: books.length,
    statements: sum((b) => b.statements.length),
    revenue,
    deductions,
    net: sum((b) => b.net),
    received: sum((b) => b.received),
    outstanding: sum((b) => b.outstanding),
    costRatio: revenue > 0 ? deductions / revenue : 0,
  }
}
