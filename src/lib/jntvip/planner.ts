// The profitability calculator from the owner's seminar notes, rebuilt on this
// account's own rules.
//
// It runs FORWARDS from money spent: "if I put PHP200,000 into ads at 2.6x,
// what comes out?" That is the opposite direction from How to make more, which
// starts at parcels and works down, and it is the direction you need when
// deciding whether to scale.
//
// THREE THINGS THE SEMINAR SHEET GETS WRONG FOR THIS BUSINESS, all of which
// flatter the answer:
//
//   1. Shipping was charged once, on the parcels that landed. J&T bills
//      shipping ON DISPATCH — a parcel that comes back was still carried, and
//      you still pay for it. At a 12.6% return rate that is 12.6% more
//      shipping than the sheet counts.
//
//   2. The COD fee was 2.00%. Yours is 2.75%, plus 12% VAT on the fee itself,
//      which the sheet has no line for at all.
//
//   3. Product cost was charged on delivered parcels only, as though a return
//      costs nothing. The bottles in a returned parcel were bought, picked and
//      packed. Some come back saleable and some do not, so this model charges
//      the cost on everything dispatched and credits back what returns.
//
// The sheet also showed NET PROFIT of 6,368,064.29 against an OPEX of 1.00 —
// a typo that turned a million pesos of overhead into one peso and nobody
// noticed, because nothing checked it. Hence `warnings` below.

export interface PlannerInputs {
  /** Centavos put into advertising over the period. */
  adSpend: number
  /** Revenue per peso of ad spend. */
  roas: number
  /** Average COD collected per delivered parcel, centavos. */
  pricePerParcel: number
  /** Build cost of what goes in one parcel, centavos. */
  cogPerParcel: number
  /** Share of settled parcels that come back, 0-1. */
  rtsRate: number
  /** Shipping billed per DISPATCHED parcel, centavos. */
  shippingPerParcel: number
  /** COD commission, 0-1. */
  codFeeRate: number
  /** VAT charged on the commission, 0-1. */
  vatRate: number
  /** Fixed running costs for the period, centavos. */
  opex: number
  /** Share of a returned parcel's bottles that can be sold again, 0-1. */
  rtsRecoveryRate: number
  days: number
}

export interface PlannerLine {
  label: string
  amount: number
  kind: 'REVENUE' | 'COST' | 'SUBTOTAL' | 'RESULT'
  note?: string
}

export interface PlannerResult {
  dispatched: number
  delivered: number
  returned: number
  grossSales: number
  lines: PlannerLine[]
  grossProfit: number
  netProfit: number
  margin: number
  /** Ad cost per parcel that actually landed — the number that decides this. */
  adPerDelivered: number
  /** The ad cost per delivered parcel at which net profit reaches zero. */
  breakEvenAdPerDelivered: number
  profitPerDay: number
  warnings: string[]
}

export function plan(i: PlannerInputs): PlannerResult {
  const warnings: string[] = []

  // Gross sales is what the ads are expected to produce, before anything is
  // taken off. Parcels follow from it, not the other way round.
  const grossSales = Math.round(i.adSpend * i.roas)
  const dispatched = i.pricePerParcel > 0 ? grossSales / i.pricePerParcel : 0
  const returned = dispatched * i.rtsRate
  const delivered = dispatched - returned

  const collected = Math.round(delivered * i.pricePerParcel)
  // Billed on dispatch, so returns are in here too.
  const shipping = Math.round(dispatched * i.shippingPerParcel)
  const commission = Math.round(collected * i.codFeeRate)
  const vat = Math.round(commission * i.vatRate)
  // Everything dispatched costs its bottles; what comes back saleable is
  // credited. Charging only the delivered ones treats a return as free.
  const cogDispatched = Math.round(dispatched * i.cogPerParcel)
  const cogRecovered = Math.round(returned * i.cogPerParcel * i.rtsRecoveryRate)
  const cogNet = cogDispatched - cogRecovered

  const grossProfit = collected - shipping - commission - vat - cogNet - i.adSpend
  const netProfit = grossProfit - i.opex

  const lines: PlannerLine[] = [
    { label: 'Gross sales the ads should produce', amount: grossSales, kind: 'REVENUE', note: `${Math.round(dispatched).toLocaleString('en-PH')} parcels dispatched at ${(i.pricePerParcel / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { label: `Less returns at ${(i.rtsRate * 100).toFixed(2)}%`, amount: -(grossSales - collected), kind: 'COST', note: `${Math.round(returned).toLocaleString('en-PH')} parcels collect nothing` },
    { label: 'COD actually collected', amount: collected, kind: 'SUBTOTAL' },
    { label: 'Less shipping', amount: -shipping, kind: 'COST', note: 'Billed on dispatch — returns are charged too' },
    { label: `Less COD commission ${(i.codFeeRate * 100).toFixed(2)}%`, amount: -commission, kind: 'COST' },
    { label: `Less VAT on commission ${(i.vatRate * 100).toFixed(0)}%`, amount: -vat, kind: 'COST' },
    { label: 'Less product cost', amount: -cogNet, kind: 'COST', note: `${Math.round(dispatched).toLocaleString('en-PH')} parcels built, ${(i.rtsRecoveryRate * 100).toFixed(0)}% of returned stock credited back` },
    { label: 'Less advertising', amount: -i.adSpend, kind: 'COST' },
    { label: 'Gross profit', amount: grossProfit, kind: 'SUBTOTAL' },
    { label: 'Less running costs (OPEX)', amount: -i.opex, kind: 'COST', note: `over ${i.days} days` },
    { label: 'NET PROFIT', amount: netProfit, kind: 'RESULT' },
  ]

  // Break-even on the only lever that moves fast: what one landed parcel may
  // cost to win before the whole period reaches zero.
  const contributionPerDelivered =
    delivered > 0
      ? (collected - shipping - commission - vat - cogNet) / delivered
      : 0
  const breakEvenAdPerDelivered =
    delivered > 0 ? contributionPerDelivered - i.opex / delivered : 0

  if (i.opex < 100000 && i.opex > 0) {
    warnings.push(
      `OPEX of ${(i.opex / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })} looks like a typo. Your real running costs are around PHP50,000 a month. The seminar sheet showed a net profit of PHP6,368,064.29 on an OPEX of PHP1.00 for exactly this reason.`,
    )
  }
  if (i.opex === 0) warnings.push('OPEX is zero, so this shows gross profit wearing the name of net profit.')
  if (i.roas > 5) warnings.push(`A ROAS of ${i.roas.toFixed(2)}x is far above anything this account has done. Your best month was 2.61x.`)
  if (i.rtsRate < 0.05) warnings.push(`A return rate of ${(i.rtsRate * 100).toFixed(1)}% is well below the 12.6% this account actually runs.`)
  if (i.pricePerParcel > 0 && i.cogPerParcel / i.pricePerParcel > 0.5) warnings.push('Product cost is over half the selling price, which leaves nothing for ads.')

  return {
    dispatched,
    delivered,
    returned,
    grossSales,
    lines,
    grossProfit,
    netProfit,
    margin: collected > 0 ? netProfit / collected : 0,
    adPerDelivered: delivered > 0 ? Math.round(i.adSpend / delivered) : 0,
    breakEvenAdPerDelivered: Math.round(breakEvenAdPerDelivered),
    profitPerDay: i.days > 0 ? Math.round(netProfit / i.days) : 0,
    warnings,
  }
}

/**
 * Splitting a period's profit three ways, from the owner's notes.
 *
 * Company funds run the business, revolving funds buy the next cycle's stock
 * and ads, and the reserve is not touched. The point of naming a reserve is
 * that money without a name gets spent.
 */
export interface FundSplit {
  revolvingPct: number
  reservePct: number
}

export function splitFunds(profit: number, s: FundSplit) {
  const revolving = Math.round(profit * s.revolvingPct)
  const reserve = Math.round(profit * s.reservePct)
  return { revolving, reserve, company: profit - revolving - reserve }
}
