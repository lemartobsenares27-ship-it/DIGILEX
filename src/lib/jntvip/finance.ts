// J&T VIP — the money ledger.
//
// The SOA Check page answers "is this statement arithmetically correct".
// This answers the separate question the business actually runs on: for every
// statement ever issued, was the money received, and does what landed match
// what was promised?
//
// Those are genuinely different failures. A statement can be perfectly correct
// and never paid. A statement can be paid to the centavo and be wrong. Nothing
// here collapses the two.
//
// All amounts are integer centavos.

import type { JntVipSoaCheckRow } from './types'

export type PaymentStatus = JntVipSoaCheckRow['paymentStatus']

/** Derived, never stored blindly — the status must follow the numbers. */
export function paymentStatusOf(netDue: number, received: number | null): PaymentStatus {
  if (received == null) return 'UNPAID'
  if (received === 0) return 'UNPAID'
  if (received === netDue) return 'PAID'
  return received < netDue ? 'PARTIAL' : 'OVERPAID'
}

export interface StatementRow {
  soa: JntVipSoaCheckRow
  /** What J&T owes for this period: their stated net where given, else ours. */
  netDue: number
  received: number
  /** received − netDue. Negative means short. */
  variance: number
  paymentStatus: PaymentStatus
  /** Days since the period closed, for chasing. */
  ageDays: number
  /** The three buckets the COD split into. */
  shipping: number
  serviceFees: number
  cod: number
}

const dayMs = 86_400_000

export function toStatementRows(rows: JntVipSoaCheckRow[], today = new Date()): StatementRow[] {
  return rows
    .map((soa) => {
      // Prefer what the statement itself claims — that is the amount J&T has
      // committed to. Our computed figure is the check on it, not a substitute.
      const netDue = soa.statedNet ?? soa.computedNet
      const received = soa.receivedAmount ?? 0
      const cod = soa.statedCod ?? soa.computedCod
      const shipping = soa.statedShipping ?? soa.computedShipping
      const commission = soa.statedCommission ?? soa.computedCommission
      const vat = soa.statedVat ?? soa.computedVat
      const rts = soa.statedRtsFee ?? soa.computedRtsFee
      const end = new Date(soa.periodTo + 'T00:00:00Z')
      return {
        soa,
        netDue,
        received,
        variance: received - netDue,
        paymentStatus: paymentStatusOf(netDue, soa.receivedAmount),
        ageDays: Math.max(0, Math.floor((today.getTime() - end.getTime()) / dayMs)),
        shipping,
        serviceFees: commission + vat + rts,
        cod,
      }
    })
    .sort((a, b) => b.soa.periodTo.localeCompare(a.soa.periodTo))
}

export interface FinanceTotals {
  statements: number
  codCollected: number
  shipping: number
  serviceFees: number
  /** Everything J&T kept. */
  jntTake: number
  netDue: number
  received: number
  outstanding: number
  /** Statements with money still owed. */
  unpaidCount: number
  /** Owed for more than this many days — the ones to chase. */
  overdueCount: number
  overdueAmount: number
  /** Statements whose received amount does not match what was promised. */
  varianceCount: number
  varianceTotal: number
  /** Statements that failed their arithmetic check. */
  discrepancyCount: number
  /** Share of COD that reached the bank. */
  keptShare: number
}

export function financeTotals(rows: StatementRow[], overdueAfterDays = 14): FinanceTotals {
  const sum = (f: (r: StatementRow) => number) => rows.reduce((s, r) => s + f(r), 0)
  const codCollected = sum((r) => r.cod)
  const netDue = sum((r) => r.netDue)
  const received = sum((r) => r.received)
  const unpaid = rows.filter((r) => r.paymentStatus === 'UNPAID' || r.paymentStatus === 'PARTIAL')
  const overdue = unpaid.filter((r) => r.ageDays > overdueAfterDays)
  const withVariance = rows.filter((r) => r.soa.receivedAmount != null && r.variance !== 0)

  return {
    statements: rows.length,
    codCollected,
    shipping: sum((r) => r.shipping),
    serviceFees: sum((r) => r.serviceFees),
    jntTake: sum((r) => r.shipping + r.serviceFees),
    netDue,
    received,
    outstanding: netDue - received,
    unpaidCount: unpaid.length,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, r) => s + (r.netDue - r.received), 0),
    varianceCount: withVariance.length,
    varianceTotal: withVariance.reduce((s, r) => s + r.variance, 0),
    discrepancyCount: rows.filter((r) => r.soa.verdict === 'DISCREPANCY').length,
    keptShare: codCollected > 0 ? netDue / codCollected : 0,
  }
}

/**
 * Gaps between consecutive statement periods.
 *
 * A missing SOA is invisible by construction — you cannot notice a statement
 * that never arrived by looking at the ones that did. Comparing each period's
 * start against the previous period's end surfaces the days nobody billed for,
 * which is where un-remitted COD hides.
 */
export interface PeriodGap {
  afterSoa: string
  from: string
  to: string
  days: number
}

export function findPeriodGaps(rows: StatementRow[]): PeriodGap[] {
  const byDate = [...rows].sort((a, b) => a.soa.periodFrom.localeCompare(b.soa.periodFrom))
  const gaps: PeriodGap[] = []
  for (let i = 1; i < byDate.length; i++) {
    const prevEnd = new Date(byDate[i - 1].soa.periodTo + 'T00:00:00Z')
    const thisStart = new Date(byDate[i].soa.periodFrom + 'T00:00:00Z')
    const gapDays = Math.round((thisStart.getTime() - prevEnd.getTime()) / dayMs) - 1
    if (gapDays > 0) {
      const from = new Date(prevEnd.getTime() + dayMs).toISOString().slice(0, 10)
      const to = new Date(thisStart.getTime() - dayMs).toISOString().slice(0, 10)
      gaps.push({ afterSoa: byDate[i - 1].soa.soaNumber, from, to, days: gapDays })
    }
  }
  return gaps
}

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIAL: 'Part paid',
  PAID: 'Paid',
  OVERPAID: 'Overpaid',
}
