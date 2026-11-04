// What the business leaves YOU, after the money that is yours and not its.
//
// Every other page here stops at business profit. That is the right number for
// judging the business and the wrong one for judging a month, because the
// money does not stop there: card instalments and transfers to family come out
// of the same account and never appear in a profit and loss. A month can clear
// PHP56,000 and leave you with nothing, and nothing on a business P&L explains
// that.
//
// Two kinds of outflow, and the difference is the useful part:
//
//   INSTALMENTS end. Each has a number of payments left, so the page can say
//   when the money comes back rather than treating it as permanent. The
//   Yamaha, the computer and two three-month plans are between PHP12,800 a
//   month now and PHP0 by April — a rise in take-home that needs no extra
//   sales and no decision.
//
//   TRANSFERS do not. They recur for as long as they recur, and are shown as
//   last month's actual figure rather than a budget nobody set.
//
// Nothing here is a business cost and none of it belongs in the P&L. Supplier
// payments and stock explicitly do NOT appear: those are already inside the
// per-bottle cost, and counting them again was an error worth PHP19,044 when
// a Shopee stock purchase was read as personal spending.
//
// All amounts are integer centavos.

export interface Instalment {
  key: string
  label: string
  /** Charged each month. */
  amount: number
  /** First month it was charged, as YYYY-MM. */
  from: string
  /** How many payments in total. */
  months: number
  detail: string
}

export interface Recurring {
  key: string
  label: string
  amount: number
  detail: string
  /** True where the figure is last month's actual rather than a set amount. */
  variable?: boolean
}

/**
 * The card instalment plans, read from the RCBC statements.
 *
 * Each statement prints the instalment number — "21/24", "07/12" — so the
 * remaining count is read, not guessed. `from` is worked back from that
 * number and the statement month.
 */
export const INSTALMENTS: Instalment[] = [
  {
    key: 'yamaha',
    label: 'Yamaha Kart Plaza',
    amount: 516424,
    from: '2025-02',
    months: 24,
    detail: 'A 24-month plan, read from the instalment number on the statement',
  },
  {
    key: 'octagon',
    label: 'Octagon Computer',
    amount: 373403,
    from: '2026-04',
    months: 12,
    detail: 'A 12-month plan, read from the instalment number on the statement',
  },
  {
    key: 'nabe',
    label: 'NABE SM Bicutan',
    amount: 196914,
    from: '2026-10',
    months: 3,
    detail: 'Converted to a 3-month plan in October, with a PHP100 fee',
  },
  {
    key: 'lifestyles',
    label: 'Lifestyles Makati',
    amount: 193333,
    from: '2026-10',
    months: 3,
    detail: 'Converted to a 3-month plan in October, with a PHP100 fee',
  },
]

export const RECURRING: Recurring[] = [
  {
    key: 'family',
    label: 'Transfers to family',
    amount: 668100,
    detail: 'Mariella, Lea, Mark Joseph and others — October actual, from the bank statement',
    variable: true,
  },
  {
    key: 'unli-fees',
    label: 'Card instalment conversion fees',
    amount: 40000,
    detail: 'PHP100 per conversion — four in October. Only charged when you convert a purchase',
    variable: true,
  },
]

export interface OutflowLine {
  key: string
  label: string
  amount: number
  detail: string
  /** Payments left after this month. Null for a recurring cost. */
  remaining: number | null
  variable?: boolean
}

const monthIndex = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return y * 12 + (m - 1)
}

/** Personal outflows charged in one month, with instalments counted down. */
export function personalOutflows(month: string): OutflowLine[] {
  const now = monthIndex(month)
  const lines: OutflowLine[] = []
  for (const i of INSTALMENTS) {
    const start = monthIndex(i.from)
    const n = now - start + 1
    // Only while the plan is actually running. A finished plan is dropped
    // rather than shown at zero, and a plan that had not started yet never
    // appears in a month before it existed.
    if (n < 1 || n > i.months) continue
    lines.push({
      key: i.key,
      label: i.label,
      amount: i.amount,
      // The payment number lives in the badge beside the label, so the detail
      // stays as written. Appending it here printed "payment 21 of 24" twice
      // in the same row.
      detail: i.detail,
      remaining: i.months - n,
    })
  }
  for (const r of RECURRING) {
    lines.push({ key: r.key, label: r.label, amount: r.amount, detail: r.detail, remaining: null, variable: r.variable })
  }
  return lines
}

export interface TakeHome {
  month: string
  businessProfit: number
  outflows: OutflowLine[]
  outflowTotal: number
  takeHome: number
  /** Instalment money that returns once every plan finishes. */
  freedWhenInstalmentsEnd: number
  /** The month the last instalment is paid, YYYY-MM. */
  lastInstalmentMonth: string | null
}

export function takeHomeFor(month: string, businessProfit: number): TakeHome {
  const outflows = personalOutflows(month)
  const outflowTotal = outflows.reduce((t, l) => t + l.amount, 0)
  const running = outflows.filter((l) => l.remaining != null)
  const freed = running.reduce((t, l) => t + l.amount, 0)
  let last: string | null = null
  for (const i of INSTALMENTS) {
    const end = monthIndex(i.from) + i.months - 1
    if (end < monthIndex(month)) continue
    const ym = `${Math.floor(end / 12)}-${String((end % 12) + 1).padStart(2, '0')}`
    if (last == null || ym > last) last = ym
  }
  return {
    month,
    businessProfit,
    outflows,
    outflowTotal,
    takeHome: businessProfit - outflowTotal,
    freedWhenInstalmentsEnd: freed,
    lastInstalmentMonth: last,
  }
}
