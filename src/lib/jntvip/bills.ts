// Recurring bills, and when each one is next due.
//
// WHY THIS IS NOT A LIST OF DATES. The tracker this replaces stored one fixed
// due date per bill and never moved it, so by the time it was looked at again
// every card read "Overdue 107d", "Overdue 136d", "Overdue 133d" — six bills
// apparently months late, on an account that was never cut off. They were
// being paid; the tracker simply could not roll forward.
//
// A badge that is always red teaches the reader to ignore badges, which is
// worse than having none. So a bill here carries the DAY of the month it falls
// due and the last month it was settled, and the next due date is computed
// from today. Marking it paid advances the month rather than flipping a flag.

import { jntVipDb } from './db'
import type { JntVipBillRow } from './types'

/** 'YYYY-MM' for a date. */
export function periodOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** The day a bill falls due in a given month, clamped to that month's length. */
function dueDate(year: number, monthIndex: number, dueDay: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return new Date(year, monthIndex, Math.min(dueDay, lastDay))
}

export type BillState = 'PAID' | 'AUTO' | 'OVERDUE' | 'DUE_SOON' | 'UPCOMING'

export interface BillStatus {
  bill: JntVipBillRow
  /** The month this status is about, 'YYYY-MM'. */
  period: string
  due: Date
  /** Negative when the due date has passed. */
  daysUntil: number
  state: BillState
}

/**
 * Where a bill stands today.
 *
 * The period being judged is the first month not yet settled. A bill paid
 * through this month is simply PAID — it is not shown as due again until the
 * month turns, which is the behaviour the old tracker lacked.
 */
export function billStatus(bill: JntVipBillRow, today = new Date()): BillStatus {
  const thisPeriod = periodOf(today)

  // Settled for this month (or beyond): nothing to do.
  if (bill.paidThrough && bill.paidThrough >= thisPeriod) {
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return {
      bill,
      period: periodOf(next),
      due: dueDate(next.getFullYear(), next.getMonth(), bill.dueDay),
      daysUntil: Math.ceil((dueDate(next.getFullYear(), next.getMonth(), bill.dueDay).getTime() - startOfDay(today).getTime()) / 86400000),
      state: 'PAID',
    }
  }

  // Otherwise the open period is this month. A bill never recorded as paid is
  // judged on this month too, not on whenever it was first entered — an
  // unrecorded history is not evidence of months of arrears.
  const due = dueDate(today.getFullYear(), today.getMonth(), bill.dueDay)
  const daysUntil = Math.ceil((due.getTime() - startOfDay(today).getTime()) / 86400000)

  // An auto-debited bill is never "late": it leaves the account on its date
  // whether or not anyone remembered it. Calling it overdue puts a red badge
  // on the one bill that needs no action, which is how a reader learns to
  // ignore red badges. It can still FAIL for want of funds — that shows up as
  // a missing debit on the account, not as a reminder here.
  if (bill.autoDebit) return { bill, period: thisPeriod, due, daysUntil, state: 'AUTO' }

  const state: BillState = daysUntil < 0 ? 'OVERDUE' : daysUntil <= 5 ? 'DUE_SOON' : 'UPCOMING'
  return { bill, period: thisPeriod, due, daysUntil, state }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Soonest first, with anything overdue at the top. */
export function sortByUrgency(list: BillStatus[]): BillStatus[] {
  const rank: Record<BillState, number> = { OVERDUE: 0, DUE_SOON: 1, UPCOMING: 2, AUTO: 3, PAID: 4 }
  return [...list].sort((a, b) => rank[a.state] - rank[b.state] || a.daysUntil - b.daysUntil)
}

/**
 * The bills the owner has shown, as starter rows.
 *
 * Amounts are 0 wherever none was given. That reads as "not set" on the page,
 * never as PHP0.00 — a bill with an unknown amount is the kind you are late on,
 * so pretending it is zero would hide exactly the ones worth seeing.
 *
 * Due days come from the dates in the owner's own tracker. Two carry a note
 * asking which card falls on the 25th and which on the 30th; that uncertainty
 * is kept on the row rather than resolved by guessing.
 */
export const SEED_BILLS: Omit<JntVipBillRow, 'id' | 'updatedAt'>[] = [
  {
    key: 'bpi-card',
    label: 'BPI Credit Card (…1710222)',
    dueDay: 10,
    amount: 0,
    category: 'Credit card — Facebook Ads',
    account: 'BPI',
    scope: 'BUSINESS',
    autoDebit: false,
    note: 'Ask BPI for a higher credit limit, per your note.',
    paidThrough: '',
    active: true,
  },
  {
    key: 'maya-card',
    label: 'Maya Credit Card (…1012)',
    dueDay: 12,
    amount: 0,
    category: 'Credit card — Facebook Ads',
    account: 'Maya',
    scope: 'BUSINESS',
    autoDebit: false,
    note: '',
    paidThrough: '',
    active: true,
  },
  {
    key: 'internet',
    label: 'Wifi / Home Internet',
    dueDay: 15,
    amount: 0,
    category: 'Utilities',
    account: '',
    scope: 'BUSINESS',
    autoDebit: false,
    note: 'Amount and payment account not yet given.',
    paidThrough: '',
    active: true,
  },
  {
    key: 'unionbank-loan',
    label: 'UnionBank Loan',
    dueDay: 20,
    amount: 470000,
    category: 'Loan',
    account: 'UnionBank',
    scope: 'BUSINESS',
    autoDebit: true,
    note: 'Principal PHP150,000, started 15 Jul 2024. Auto-debited.',
    paidThrough: '',
    active: true,
  },
  {
    key: 'rcbc-card-personal',
    label: 'RCBC Credit Card #1 (…2841-2007)',
    dueDay: 25,
    amount: 0,
    category: 'Credit card — personal',
    account: 'RCBC',
    scope: 'PERSONAL',
    autoDebit: false,
    note: 'Personal spend card. Confirm this is the 25th-due card, not the 30th.',
    paidThrough: '',
    active: true,
  },
  {
    key: 'rcbc-card-ads',
    label: 'RCBC Credit Card #2 (…6033-8003)',
    dueDay: 30,
    amount: 0,
    category: 'Credit card — Facebook Ads',
    account: 'RCBC',
    scope: 'BUSINESS',
    autoDebit: false,
    note: 'Dedicated ad-spend card. Confirm this is the 30th-due card, not the 25th.',
    paidThrough: '',
    active: true,
  },
]

export interface BillSeedResult {
  added: number
}

/** Loads the known bills once. Never touches a row that already exists. */
export async function seedBills(): Promise<BillSeedResult> {
  const existing = await jntVipDb.bills.toArray()
  const known = new Set(existing.map((b) => b.key))
  const missing = SEED_BILLS.filter((b) => !known.has(b.key))
  if (missing.length === 0) return { added: 0 }
  await jntVipDb.bills.bulkAdd(
    missing.map((b) => ({ ...b, updatedAt: new Date().toISOString() })),
  )
  return { added: missing.length }
}

/** Records a bill as settled for a month, and nothing more. */
export async function markBillPaid(id: number, period: string): Promise<void> {
  await jntVipDb.bills.update(id, { paidThrough: period, updatedAt: new Date().toISOString() })
}

/** Undoes a mark-as-paid by stepping the settled month back one. */
export async function unmarkBillPaid(id: number, period: string): Promise<void> {
  const [y, m] = period.split('-').map(Number)
  const prev = new Date(y, m - 2, 1)
  await jntVipDb.bills.update(id, {
    paidThrough: periodOf(prev),
    updatedAt: new Date().toISOString(),
  })
}
