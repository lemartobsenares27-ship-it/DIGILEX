// Facebook ad spend, from the bank and card statements that actually paid it.
//
// This replaces a list transcribed from Meta's own transaction receipts, which
// was wrong by a factor of nearly seven for August — PHP23,752 of receipts
// against PHP160,812 actually charged. The receipts were not false; they were a
// fraction of the charges, because only some were uploaded and Meta issues one
// per payment attempt rather than one per day. Reading spend from receipts was
// the mistake. The statements are the record of money leaving.
//
// Two payment streams run in parallel and must BOTH be counted:
//
//   GOTYME  card ...9509, funded by transfers from MariBank. Carries the bulk
//           of the spend from late July onward.
//   RCBC    card ...7035 / ...8003. Carries July, nothing from 9 Aug to 22 Sep,
//           then a second stream of charges from 23 September.
//
// They were checked for double counting on date-and-amount: zero collisions.
// These are genuinely separate charges, not the same spend seen twice.
//
// Instalment lines on the RCBC card (UNLI 0% ... 01/03) and their reversals are
// excluded. Converting a charge to instalments does not spend money again, and
// counting both the original and the three parts would inflate July fourfold.
// Refunds are included as negative rows so a reversed charge nets to zero.
//
// Cards checked and found to carry NO advertising:
//
//   JCB Platinum ...2007. The 1 Oct 2026 statement is groceries, dining and
//   retail — NABE, DALI, Starbucks, Lifestyles — plus older instalment plans
//   for Octagon Computer (07/12) and Yamaha Kart Plaza (21/24). Not one
//   Facebook charge. It is listed here so it does not get re-examined every
//   time it turns up, and because its PHP12,800.74 a month of instalments is
//   real money leaving the same pocket even though no part of it is ad spend
//   or, on the face of it, a business cost.
//
// Coverage, which matters as much as the amounts: a month is only as complete
// as the statements behind it. RCBC's charges end 7 Oct 2026 because that is
// where its statement ends, NOT because the card went quiet — the next
// statement has not been read. The reason October is nonetheless believed
// complete is that GoTyme's daily spend steps from PHP2,635 to PHP7,841 on
// exactly the day RCBC stops, which is what moving the spend to one card looks
// like. If an RCBC statement covering 8 Oct to 7 Nov shows further Facebook
// charges, October's profit falls peso for peso and this note is how to know
// it was never verified.
//
// Amounts are integer centavos.

import raw from '../../data/jntAdCharges.json'

export type AdSource = 'GOTYME' | 'RCBC'

export interface AdCharge {
  /** The day the card was charged. */
  chargedOn: string
  amount: number
  source: AdSource
}

type Packed = [chargedOn: string, amount: number, source: string]

export const AD_CHARGES: AdCharge[] = (raw as Packed[]).map(([chargedOn, amount, source]) => ({
  chargedOn,
  amount,
  source: source as AdSource,
}))

/** The last day a statement covers. Beyond this, spend is unknown, not zero. */
export const AD_COVERAGE_TO = AD_CHARGES.length > 0 ? AD_CHARGES[AD_CHARGES.length - 1].chargedOn : null

/**
 * The last day each card has a statement behind it.
 *
 * Per source, not just the latest overall, because the latest overall hides
 * the thing that matters: one card can be months behind while the other is
 * current, and the total then looks complete when it is not. RCBC's charges
 * stop on 7 Oct 2026 and GoTyme's run to 1 Nov, so any window reaching past
 * those dates is short by whatever the unread statements hold — which is the
 * whole of a PHP63,828 discrepancy against Meta's own figures that otherwise
 * looks like money appearing from nowhere.
 */
export const COVERAGE_BY_SOURCE: Record<AdSource, string | null> = (() => {
  const out: Record<string, string | null> = { GOTYME: null, RCBC: null }
  for (const c of AD_CHARGES) {
    const seen = out[c.source]
    if (seen == null || c.chargedOn > seen) out[c.source] = c.chargedOn
  }
  return out as Record<AdSource, string | null>
})()

/** Ad spend charged within [from, to] inclusive. */
/**
 * Advertising that Meta's own reports show but no statement has billed yet.
 *
 * The card statements are the record of money leaving, and they stay that way.
 * But RCBC has no statement read past 7 October, and Meta's Ads Manager puts
 * October's spend across all four accounts at PHP277,777 against PHP236,208
 * charged. The difference is not missing money or another payment method — the
 * owner uses two cards and this is one of them, unread. Leaving it out made
 * every page report October PHP41,570 better than it was: PHP95,977 of profit
 * where the honest figure is PHP56,613.
 *
 * So it is accrued, dated across the days it was actually spent, and labelled
 * as an estimate rather than folded into the verified charges. When the
 * statement arrives, the real charges go into jntAdCharges.json and the
 * matching entry here is deleted — the `supersededBy` note says exactly what
 * replaces it.
 */
export interface AccruedAdSpend {
  from: string
  to: string
  amount: number
  source: AdSource
  basis: string
  supersededBy: string
}

export const ACCRUED_AD_SPEND: AccruedAdSpend[] = [
  {
    from: '2026-10-08',
    to: '2026-10-31',
    amount: 4156967,
    source: 'RCBC',
    basis:
      "Meta Ads Manager reports PHP277,777 of October spend across all four accounts (1 Oct-4 Nov export, less four days of November at its own daily rate). Card charges for October total PHP236,208. The difference falls entirely in the window RCBC has no statement for, and works out at PHP1,732 a day against the PHP3,942 it ran before 8 October.",
    supersededBy: 'The RCBC Airmiles statement dated about 8 Nov 2026, covering 8 Oct to 7 Nov.',
  },
]

/** Accrued spend overlapping a window, apportioned by day. */
export function accruedBetween(from: string, to: string): number {
  let total = 0
  for (const a of ACCRUED_AD_SPEND) {
    const start = a.from > from ? a.from : from
    const end = a.to < to ? a.to : to
    if (end < start) continue
    const days = Math.round((Date.parse(a.to) - Date.parse(a.from)) / 86400000) + 1
    const covered = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1
    total += Math.round((a.amount * covered) / days)
  }
  return total
}

/**
 * What advertising cost over a window: charges that reached a statement, plus
 * spend that has happened and has not been billed yet.
 *
 * Both, deliberately. Counting only the charges understates a month whose
 * statements have not all arrived, and every page that asks this question is
 * asking what the period COST, not what has cleared a bank.
 */
export function adSpendBetween(from: string, to: string): number {
  return adChargedBetween(from, to) + accruedBetween(from, to)
}

/** Only what a statement actually billed. The verified figure. */
export function adChargedBetween(from: string, to: string): number {
  return AD_CHARGES.filter((c) => c.chargedOn >= from && c.chargedOn <= to).reduce((t, c) => t + c.amount, 0)
}

export function adChargesBetween(from: string, to: string): AdCharge[] {
  return AD_CHARGES.filter((c) => c.chargedOn >= from && c.chargedOn <= to)
}

/** Split by card, so the two streams can be seen separately. */
export function adSpendBySource(from: string, to: string): Record<AdSource, number> {
  const out: Record<AdSource, number> = { GOTYME: 0, RCBC: 0 }
  for (const c of adChargesBetween(from, to)) out[c.source] += c.amount
  return out
}
