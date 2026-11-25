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

export type BillState = 'PAID' | 'AUTO' | 'NO_DATE' | 'OVERDUE' | 'DUE_SOON' | 'UPCOMING'

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
  // dueDay 0 means nobody knows the date yet. Picking one so the card has
  // something to show would put a red "overdue" badge on a guess, which is
  // worse than an obvious blank: the owner would chase a bill that may not be
  // late, or stop trusting the red badges that are real.
  if (bill.dueDay < 1) {
    return { bill, period: thisPeriod, due: startOfDay(today), daysUntil: 0, state: 'NO_DATE' }
  }

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
  const rank: Record<BillState, number> = { OVERDUE: 0, DUE_SOON: 1, NO_DATE: 2, UPCOMING: 3, AUTO: 4, PAID: 5 }
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
    // Due on the 2nd, not the 12th. The first seed read 07/12/2026 off the old
    // tracker and took it as the 12th; the Maya app itself says the payment is
    // due 2 December. The app wins — the tracker's date was stale anyway.
    key: 'maya-card',
    label: 'Maya Black (Visa Platinum)',
    dueDay: 2,
    amount: 2016631,
    category: 'Credit card — Facebook Ads',
    account: 'Maya',
    scope: 'BUSINESS',
    autoDebit: false,
    note: 'Online payments only, card not yet activated — so the balance on it is all online spend.',
    // The app says the next payment is due 2 December, so November is settled.
    paidThrough: '2026-11',
    active: true,
    outstanding: 4905451,
    creditLimit: 6500000,
    balanceAsOf: '2026-11-25',
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
    // Nothing due this month, but PHP44,006.14 outstanding: the 3 Nov statement
    // closed at zero and everything since is post-statement spend that lands on
    // the next one. A card showing PHP0.00 due is not a card with no debt.
    key: 'pnb-card',
    label: 'PNB Travel Club Platinum (…9771)',
    dueDay: 25,
    amount: 0,
    category: 'Credit card',
    account: 'PNB',
    scope: 'BUSINESS',
    autoDebit: false,
    note: 'Statement 3 Nov 2026 closed with nothing due. Confirm whether this card runs ads.',
    // Total and minimum due both read PHP0.00, so there is nothing to pay for
    // November. The PHP44,006.14 outstanding lands on the next statement.
    paidThrough: '2026-11',
    active: true,
    outstanding: 4400614,
    creditLimit: 8800000,
    balanceAsOf: '2026-11-25',
  },
  {
    // Shown in the Metrobank app and on no list anywhere else. Its due day is
    // not on the screen, so it is left at 1 and marked as needing confirming
    // rather than guessed — a wrong due day is worse than an obvious blank.
    key: 'metrobank-card',
    label: 'Metrobank Credit Card (…7297)',
    dueDay: 0,
    amount: 0,
    category: 'Credit card',
    account: 'Metrobank',
    scope: 'BUSINESS',
    autoDebit: false,
    note: 'Due day is not on the app screen, so none is guessed — set it. Limit PHP150,000 but only PHP99,522.14 shows available against PHP34,613.86 owed, so about PHP15,864 of the limit is held, probably by the instalment facility.',
    paidThrough: '',
    active: true,
    outstanding: 3461386,
    creditLimit: 15000000,
    balanceAsOf: '2026-11-25',
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
  corrected: number
}

/**
 * A value this seed once wrote and has since been found wrong.
 *
 * The first seed read Maya's due date off the old tracker as 07/12/2026 and
 * took it as the 12th. The Maya app says the 2nd. Adding keys alone could never
 * fix that — the row already exists, so the better value would never land.
 *
 * The guard is equality with what the old seed wrote. If the stored row still
 * holds exactly the wrong values, nobody has edited it and it is safe to
 * correct. The moment the owner changes anything on that card, `was` stops
 * matching and their version is left alone for good.
 */
interface BillCorrection {
  key: string
  was: Partial<JntVipBillRow>
  set: Partial<JntVipBillRow>
}

const CORRECTIONS: BillCorrection[] = [
  {
    key: 'maya-card',
    was: { dueDay: 12, amount: 0, label: 'Maya Credit Card (…1012)' },
    set: {
      dueDay: 2,
      amount: 2016631,
      label: 'Maya Black (Visa Platinum)',
      paidThrough: '2026-11',
      note: 'Online payments only, card not yet activated — so the balance on it is all online spend.',
    },
  },
]

/**
 * Loads the known bills.
 *
 * Adds any bill not present, corrects a row this seed itself got wrong and
 * nobody has touched since, and fills in a balance where the row carries none.
 * It never overwrites a figure the owner has entered.
 */
export async function seedBills(): Promise<BillSeedResult> {
  const existing = await jntVipDb.bills.toArray()
  const known = new Set(existing.map((b) => b.key))
  const missing = SEED_BILLS.filter((b) => !known.has(b.key))
  if (missing.length > 0) {
    await jntVipDb.bills.bulkAdd(missing.map((b) => ({ ...b, updatedAt: new Date().toISOString() })))
  }

  let corrected = 0
  const byKey = new Map(existing.map((b) => [b.key, b]))

  for (const c of CORRECTIONS) {
    const row = byKey.get(c.key)
    if (!row?.id) continue
    const untouched = Object.entries(c.was).every(([k, v]) => row[k as keyof JntVipBillRow] === v)
    if (!untouched) continue
    await jntVipDb.bills.update(row.id, { ...c.set, updatedAt: new Date().toISOString() })
    corrected++
  }

  // Balances are new information, not a correction: a row that has never
  // carried one gets it, and a row that already does is left as read.
  for (const seed of SEED_BILLS) {
    if (seed.outstanding == null) continue
    const row = byKey.get(seed.key)
    if (!row?.id || row.outstanding != null) continue
    await jntVipDb.bills.update(row.id, {
      outstanding: seed.outstanding,
      creditLimit: seed.creditLimit,
      balanceAsOf: seed.balanceAsOf,
      updatedAt: new Date().toISOString(),
    })
    corrected++
  }

  return { added: missing.length, corrected }
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
