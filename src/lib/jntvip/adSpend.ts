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
/**
 * RCBC statements that have been read in full, by statement date.
 *
 * The last charge SEEN is not the same as the last charge THERE. A statement
 * read end to end proves nothing is missing up to its cut-off; a list of
 * charges only proves what someone happened to enter. These are the ones
 * checked line by line.
 *
 * UNLI 0% INSTALMENTS ARE NOT AD SPEND. RCBC converts a Facebook charge to a
 * 0% instalment plan by CREDITING the original in full and posting the
 * instalments in its place — the 8 October statement shows GJMY28NHG4 reversed
 * at PHP5,264.67 and reposted as 1/03 at PHP1,754.89, which is the same money
 * three times over. The July PHP16,376.00 charge became XBR75XZPS at
 * PHP5,458.67 x 3 the same way.
 *
 * So only the ORIGINAL dated charge is advertising, and every "UNLI 0%" line,
 * every 00/03 reversal and every processing fee is deliberately excluded.
 * Entering the instalments as well would count the same advertising twice and
 * date it to the wrong month on top.
 */
export const RCBC_STATEMENTS_READ = [
  { statementDate: '2026-09-08', covers: 'instalment postings only — no new advertising on it' },
  { statementDate: '2026-10-08', covers: '23 Sep to 7 Oct, 15 Facebook charges totalling PHP59,137.08, all recorded' },
  {
    statementDate: '2026-11-08',
    covers:
      '8 Oct to 7 Nov. 15 Facebook charges on 8-12 Oct totalling PHP34,213.45, then nothing for 23 days, then PHP14,593.17 on 5 Nov. Additions tie to its own BALANCE END of PHP52,565.51 exactly.',
  },
] as const

/** The last RCBC statement cut-off proved complete, rather than merely seen. */
export const RCBC_COMPLETE_THROUGH = '2026-11-07'

/**
 * GoTyme statements read in full.
 *
 * The 17 Oct - 10 Nov statement confirmed all 23 of its October charges were
 * already recorded and added 14 November ones. One 30 October charge of
 * PHP64.05 was refunded in full the same day and is deliberately NOT recorded:
 * a charge and its own refund are not advertising, they are nothing.
 */
export const GOTYME_COMPLETE_THROUGH = '2026-11-10'

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
  // EMPTY, and that is the point: October advertising is no longer estimated
  // at all.
  //
  // An accrual stood here for PHP41,570 while RCBC had no statement past
  // 7 October, then for PHP7,356 once that statement arrived and showed the
  // spend had moved to GoTyme. The GoTyme statement for 17 October to
  // 10 November has now been read too, and every one of its 23 October
  // charges was already recorded — nothing was missing on that side either.
  //
  // So both cards are read end to end for October and they come to
  // PHP270,421.24. The PHP277,777 the residual was measured against was never
  // a statement: it was Meta's own 1 October to 4 November export with four
  // days of November taken off at its own daily rate. Two complete statements
  // beat an apportioned window, so the cards win and the accrual goes.
  //
  // The difference is PHP7,356, and it moves October profit UP by that much,
  // because the estimate had been charging advertising that no card ever
  // billed.
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
