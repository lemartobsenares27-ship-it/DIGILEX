// What the business owns and owes.
//
// A balance sheet is normally a statement of fact. This one cannot be, because
// the two largest assets are not recorded anywhere: cash across seven accounts,
// and stock sitting in the warehouse. So it does not pretend.
//
// Every line is either KNOWN, with a figure and where it came from, or UNKNOWN,
// with what to go and get. Totals add up the known lines only and say so. A
// balance sheet that silently treats an unknown as zero is worse than none: it
// produces a confident bottom line that is wrong by whatever is missing, and
// the missing part here is most of the cash.

export type LineState = 'KNOWN' | 'PARTIAL' | 'UNKNOWN'

export interface BalanceLine {
  label: string
  /** Centavos. Null when nothing is known. */
  amount: number | null
  state: LineState
  /** Where the figure came from, or what would close the gap. */
  note: string
}

export interface BalanceSheet {
  asOf: string
  assets: BalanceLine[]
  liabilities: BalanceLine[]
  knownAssets: number
  knownLiabilities: number
  /** Known assets less known liabilities. NOT equity — too much is missing. */
  knownNet: number
  unknownAssetLines: number
  unknownLiabilityLines: number
}

export interface BalanceInputs {
  asOf: string
  /** Owed by J&T: unpaid statements plus delivered-but-unbilled. */
  dueFromCourier: number
  /** Bottles already dispatched, valued at what they cost to build. */
  stockInTransit: number
  /** Card balances that have actually been read. */
  cardDebtKnown: number
  cardsRead: number
  cardsTotal: number
  /** Bills due this month and not yet settled. */
  billsDue: number
  /** The running P&L position since the business started. */
  accumulatedResult: number
}

export function balanceSheet(i: BalanceInputs): BalanceSheet {
  const assets: BalanceLine[] = [
    {
      label: 'Cash at bank and in wallets',
      amount: null,
      state: 'UNKNOWN',
      note: 'Seven accounts — MariBank, GoTyme, RCBC, PNB, Maya, UnionBank, Metrobank. No balance is recorded anywhere. This is the single largest hole in this statement.',
    },
    {
      label: 'Due from J&T',
      amount: i.dueFromCourier,
      state: 'KNOWN',
      note: 'Collected at the door and not yet remitted: unpaid statements plus parcels delivered since the last statement closed.',
    },
    {
      label: 'Stock in transit, at cost',
      amount: i.stockInTransit,
      state: 'KNOWN',
      note: 'Bottles already dispatched and not yet settled, valued at build cost. Some of it will come back rather than sell.',
    },
    {
      label: 'Stock on hand',
      amount: null,
      state: 'UNKNOWN',
      note: 'Bottles in the warehouse. Never counted into this app. A stock count would close it.',
    },
  ]

  const liabilities: BalanceLine[] = [
    {
      label: 'Credit cards',
      amount: i.cardDebtKnown,
      state: i.cardsRead < i.cardsTotal ? 'PARTIAL' : 'KNOWN',
      note:
        i.cardsRead < i.cardsTotal
          ? `${i.cardsRead} of ${i.cardsTotal} cards read. The rest carry balances nobody has written down, so the real figure is higher.`
          : 'Every card read.',
    },
    {
      label: 'UnionBank loan',
      amount: null,
      state: 'UNKNOWN',
      note: 'PHP150,000 principal from 15 Jul 2024 at PHP4,700 a month, auto-debited. What remains depends on the interest and is not in any screen seen so far.',
    },
    {
      label: 'Bills due this month',
      amount: i.billsDue,
      state: 'PARTIAL',
      note: 'Only the bills with an amount entered. Several have none set, so this is a floor.',
    },
  ]

  const sum = (l: BalanceLine[]) => l.reduce((t, x) => t + (x.amount ?? 0), 0)
  const knownAssets = sum(assets)
  const knownLiabilities = sum(liabilities)

  return {
    asOf: i.asOf,
    assets,
    liabilities,
    knownAssets,
    knownLiabilities,
    knownNet: knownAssets - knownLiabilities,
    unknownAssetLines: assets.filter((a) => a.state === 'UNKNOWN').length,
    unknownLiabilityLines: liabilities.filter((a) => a.state !== 'KNOWN').length,
  }
}
