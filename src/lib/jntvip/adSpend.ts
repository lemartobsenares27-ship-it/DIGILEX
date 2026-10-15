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

/** Ad spend charged within [from, to] inclusive. */
export function adSpendBetween(from: string, to: string): number {
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
