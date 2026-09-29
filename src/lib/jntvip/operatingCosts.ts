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
}

/** An average calendar month, used to pro-rate monthly bills across a statement period. */
export const DAYS_PER_MONTH = 30.4375

export const OPERATING_EXPENSES: OperatingExpense[] = [
  {
    key: 'support',
    label: 'Customer support',
    basis: 'PER_DAY',
    rate: 60000,
    detail: 'Answering buyers and confirming orders — paid every day, busy or quiet',
  },
  {
    key: 'fulfillment',
    label: 'Warehouse fulfilment',
    basis: 'PER_BOTTLE',
    rate: 600,
    detail: 'Picking and packing, charged on every bottle that leaves — including ones that come back',
  },
  {
    key: 'utilities',
    label: 'Electricity and food',
    basis: 'PER_MONTH',
    rate: 600000,
    detail: 'Meralco plus food, treated as a monthly bill and pro-rated across the period',
    assumed: true,
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
export function chargeOperatingExpenses(days: number, bottlesFulfilled: number): ExpenseCharge[] {
  return OPERATING_EXPENSES.map((e) => {
    switch (e.basis) {
      case 'PER_DAY':
        return { ...e, quantity: days, quantityLabel: `${days} days`, amount: e.rate * days }
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
export function fixedCostPerDay(): number {
  return OPERATING_EXPENSES.filter((e) => e.basis !== 'PER_BOTTLE').reduce(
    (t, e) => t + (e.basis === 'PER_DAY' ? e.rate : Math.round(e.rate / DAYS_PER_MONTH)),
    0,
  )
}

/** The part of the bill that grows with each bottle packed. */
export function variableCostPerBottle(): number {
  return OPERATING_EXPENSES.filter((e) => e.basis === 'PER_BOTTLE').reduce((t, e) => t + e.rate, 0)
}
