// Running the business, as opposed to making or shipping the product.
//
// These are the costs that never appear on a courier statement or an ad receipt,
// which is exactly why they get forgotten: nobody sends you a bill that says
// "this is what today cost you". Left out, they made the operation look roughly
// PHP25,000 more profitable per month than it is.
//
// They do not all scale the same way, and that difference matters more than the
// amounts. A per-bottle cost grows as you sell more and is paid for by each sale.
// A per-day or per-month cost is there whether you sell one bottle or a thousand,
// so it is carried entirely by volume — and it is the reason a quiet month hurts
// out of proportion to the drop in orders.
//
// All amounts are integer centavos.

export type ExpenseBasis = 'PER_DAY' | 'PER_BOTTLE' | 'PER_MONTH'

export interface OperatingExpense {
  key: string
  label: string
  basis: ExpenseBasis
  rate: number
  detail: string
  /** True where the rate was inferred rather than stated, so the page can say so. */
  assumed?: boolean
  /** Working days per week for a PER_DAY cost. Defaults to 7. */
  daysPerWeek?: number
  /** The window this rate applies to. Null on either side means open-ended. */
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

/**
 * The day the CSR admin's rate steps from PHP500 to PHP700.
 *
 * An ASSUMPTION. The two-week probation was described but not dated, and the
 * start date decides which days are charged at which rate. Both rows are
 * marked assumed and the date is editable; change it and every figure that
 * depends on payroll moves with it.
 */
export const CSR_RATE_CHANGES_ON = '2026-10-01'

/** An average calendar month, used to pro-rate monthly bills across a statement period. */
export const DAYS_PER_MONTH = 30.4375

export const OPERATING_EXPENSES: OperatingExpense[] = [
  // Payroll, per person, because one blended "support" rate was wrong in both
  // directions: Marcian works five days a week, not seven, and the CSR admin
  // costs more than the old PHP600 figure once past probation.
  {
    key: 'staff-marcian',
    label: 'Marcian',
    basis: 'PER_DAY',
    rate: 75000,
    daysPerWeek: 5,
    detail: 'PHP750 a day, five days a week',
  },
  {
    key: 'staff-csr-probation',
    label: 'CSR admin (probation rate)',
    basis: 'PER_DAY',
    rate: 50000,
    daysPerWeek: 7,
    effectiveTo: CSR_RATE_CHANGES_ON,
    detail: 'PHP500 a day for the first two weeks',
    assumed: true,
  },
  {
    key: 'staff-csr',
    label: 'CSR admin',
    basis: 'PER_DAY',
    rate: 70000,
    daysPerWeek: 7,
    effectiveFrom: CSR_RATE_CHANGES_ON,
    detail: 'PHP700 a day once past the first two weeks',
    assumed: true,
  },
  {
    key: 'fulfillment',
    label: 'Warehouse fulfilment',
    basis: 'PER_BOTTLE',
    rate: 600,
    detail: 'Picking and packing, charged on every bottle that leaves — including ones that come back',
  },
  {
    key: 'electricity',
    label: 'Electricity (Meralco)',
    basis: 'PER_MONTH',
    rate: 600000,
    detail: 'The monthly Meralco bill, pro-rated across the period',
  },
  {
    key: 'internet',
    label: 'Internet',
    basis: 'PER_MONTH',
    rate: 100000,
    detail: 'Monthly connection, pro-rated across the period',
  },
]

export interface ExpenseCharge extends OperatingExpense {
  /** Days, bottles, or fraction of a month — whatever the basis is counted in. */
  quantity: number
  quantityLabel: string
  amount: number
}

/**
 * Prices the expense list against one statement period.
 *
 * `bottlesFulfilled` must count every bottle that was PACKED, not every bottle
 * that was paid for. A parcel that comes back was picked, packed and handled
 * exactly like one that landed — the warehouse work happened either way, and
 * charging fulfilment only on delivered bottles would quietly make returns look
 * cheaper than they are.
 */
export function chargeOperatingExpenses(
  days: number,
  bottlesFulfilled: number,
  expenses: OperatingExpense[] = OPERATING_EXPENSES,
  /** The period being costed, needed for rates that start or stop part-way. */
  window?: { from: string; to: string },
): ExpenseCharge[] {
  return expenses.map((e) => {
    switch (e.basis) {
      case 'PER_DAY': {
        // A rate can start or end mid-period (a probationary wage that steps
        // up), and staff are not always paid seven days a week. Both have to
        // be handled or payroll is wrong by a large margin rather than a
        // rounding — a five-day week charged as seven overstates it by 40%.
        const span = overlapDays(days, window, e.effectiveFrom ?? null, e.effectiveTo ?? null)
        const perWeek = e.daysPerWeek ?? 7
        const worked = perWeek >= 7 ? span : Math.round((span * perWeek) / 7)
        const label =
          perWeek >= 7
            ? `${worked} days`
            : `${worked} working days of ${span} (${perWeek}/week)`
        return { ...e, quantity: worked, quantityLabel: label, amount: e.rate * worked }
      }
      case 'PER_BOTTLE':
        return {
          ...e,
          quantity: bottlesFulfilled,
          quantityLabel: `${bottlesFulfilled.toLocaleString('en-PH')} bottles packed`,
          amount: e.rate * bottlesFulfilled,
        }
      case 'PER_MONTH': {
        const months = days / DAYS_PER_MONTH
        return {
          ...e,
          quantity: months,
          quantityLabel: `${months.toFixed(2)} of a month`,
          amount: Math.round(e.rate * months),
        }
      }
    }
  })
}

/** What one day costs before a single bottle is sold. */
export function fixedCostPerDay(expenses: OperatingExpense[] = OPERATING_EXPENSES): number {
  return expenses
    .filter((e) => e.basis !== 'PER_BOTTLE')
    .reduce(
      (t, e) =>
        t +
        (e.basis === 'PER_DAY'
          ? Math.round((e.rate * (e.daysPerWeek ?? 7)) / 7)
          : Math.round(e.rate / DAYS_PER_MONTH)),
      0,
    )
}

/**
 * Days of a period that a rate's effective window covers.
 *
 * Without a window to compare against, a dated rate cannot be apportioned, so
 * it applies to the whole period — the same behaviour as before dates existed.
 */
function overlapDays(
  days: number,
  window: { from: string; to: string } | undefined,
  from: string | null,
  to: string | null,
): number {
  if (!window || (!from && !to)) return days
  const start = from && from > window.from ? from : window.from
  const end = to && to < window.to ? to : window.to
  if (end < start) return 0
  return Math.min(days, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1)
}

/** The part of the bill that grows with each bottle packed. */
export function variableCostPerBottle(expenses: OperatingExpense[] = OPERATING_EXPENSES): number {
  return expenses.filter((e) => e.basis === 'PER_BOTTLE').reduce((t, e) => t + e.rate, 0)
}

/**
 * Writes any expense the database has never seen. Run once, at startup.
 *
 * Seeding deliberately does NOT happen from the page. Writing to a table while
 * a live query on that same table is being set up races the subscription and
 * throws inside Dexie's notifier — the page rendered, then died. Seeding at
 * startup means the table is settled before anything subscribes to it.
 *
 * It only ever ADDS a key it has not seen. An expense the user has edited keeps
 * their figure: the constants above are a starting point, not the truth.
 */
export async function seedOperatingExpenses(): Promise<void> {
  const { jntVipDb } = await import('./db')
  const existing = await jntVipDb.operatingExpenses.toArray()
  const seen = new Set(existing.map((r) => r.key))

  // The old blended 'support' row is superseded by the per-person payroll
  // rows. Retire it rather than delete it — a period already costed with it
  // was costed correctly at the time — but it must not stay active alongside
  // the replacements, or payroll is charged twice.
  const superseded = existing.find((r) => r.key === 'support' && r.active)
  if (superseded && OPERATING_EXPENSES.some((e) => e.key === 'staff-marcian')) {
    await jntVipDb.operatingExpenses.update(superseded.id!, {
      active: false,
      detail: 'Replaced by the per-person payroll rows',
      updatedAt: new Date().toISOString(),
    })
  }

  const missing = OPERATING_EXPENSES.filter((e) => !seen.has(e.key))
  if (missing.length === 0) return
  await jntVipDb.operatingExpenses.bulkAdd(
    missing.map((e) => ({
      key: e.key,
      label: e.label,
      basis: e.basis,
      rate: e.rate,
      detail: e.detail,
      active: true,
      assumed: e.assumed ?? false,
      daysPerWeek: e.daysPerWeek,
      effectiveFrom: e.effectiveFrom ?? null,
      effectiveTo: e.effectiveTo ?? null,
      updatedAt: new Date().toISOString(),
    })),
  )
}

/** Stored rows to the shape the P&L consumes. Pure — safe inside a render. */
export function toOperatingExpenses(
  rows: {
    key: string
    label: string
    basis: ExpenseBasis
    rate: number
    detail: string
    active: boolean
    assumed: boolean
    daysPerWeek?: number
    effectiveFrom?: string | null
    effectiveTo?: string | null
  }[],
): OperatingExpense[] {
  return rows
    .filter((r) => r.active)
    .map((r) => ({
      key: r.key,
      label: r.label,
      basis: r.basis,
      rate: r.rate,
      detail: r.detail,
      assumed: r.assumed,
      daysPerWeek: r.daysPerWeek,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
    }))
}
