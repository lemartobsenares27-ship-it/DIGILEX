// Which product a Meta campaign was selling.
//
// Ad spend arrives per campaign and revenue arrives per parcel, and nothing
// in either names the other. The only bridge is the campaign name, which
// carries a product code written by hand — so the codes are written down here
// rather than guessed at each time, and the ones that were ASKED about are
// marked, because a code someone confirmed is worth more than a code that
// merely looked obvious.
//
// Why this matters more than it sounds: the dashboard currently splits ad
// spend between products by their share of parcels, for want of anything
// better. Measured against real campaign spend that guess was out by
// PHP43,441 on TESTOMAXX alone over five weeks — enough to move a product
// from looking like the weakest to one of the stronger ones. Allocation by
// actual spend replaces it.

export interface CampaignProduct {
  /** The product as the parcel data names it. */
  product: string
  /** Codes that appear in campaign names, matched case-insensitively. */
  codes: string[]
  /** True where the owner confirmed the code outright. */
  confirmed?: boolean
}

/**
 * Longest code first when matching, so a short code never claims a name that
 * belongs to a longer one containing it.
 */
export const CAMPAIGN_PRODUCTS: CampaignProduct[] = [
  {
    product: 'TESTOMAXX',
    // "HRBL SUPLMT and HRBL SPLMT is TESTOMAXX" — stated directly. Without it
    // these read as a separate herbal line and PHP23,732 of spend sat under
    // no product at all.
    codes: ['TSTMX', 'TSTO KNG', 'TESTOMAX', 'HRBL SPLMT', 'HRBL SUPLMT', 'HRBL SUPT', 'HRBAL SUPT', 'HERBAL SUPPT', 'HRBL SPLMNT'],
    confirmed: true,
  },
  { product: 'GOLDEN EAR', codes: ['GOLDEN ER', 'GLDN EAR', 'GOLDEN EAR', 'TENGA'] },
  { product: 'ALMUTRIA', codes: ['ALMUTRIA', 'ALMUTZ'] },
  { product: 'EYE CARE', codes: ['EYE CARE', 'EYE C E', 'EYE VISION', 'E  C A', 'EYE C'] },
]

/**
 * Codes seen spending that nobody has yet tied to a product.
 *
 * Listed rather than folded into the nearest guess. Between them they are
 * about 1.5% of spend, and naming them is how that stays visible instead of
 * quietly inflating whichever product they were assumed to belong to.
 */
export const UNMAPPED_CODES = ['ESL SUPT', 'ESS SUPP', 'DAVID AR', 'JENN GLDZA', 'GEORGE MD', 'HLT FS WLNS', 'WLNS']

const ORDERED = CAMPAIGN_PRODUCTS.flatMap((p) => p.codes.map((c) => [c.toUpperCase(), p.product] as const)).sort(
  (a, b) => b[0].length - a[0].length,
)

/** The product a campaign sold, or null where its name does not say. */
export function productOfCampaign(campaignName: string): string | null {
  const u = campaignName.toUpperCase()
  for (const [code, product] of ORDERED) if (u.includes(code)) return product
  return null
}
