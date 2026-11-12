// How advertising actually divides between products.
//
// Spend arrives per campaign and revenue arrives per parcel, and neither names
// the other. Until Meta's campaign exports arrived there was nothing to go on,
// so the per-product page split advertising by each product's share of
// parcels. That guess was wrong by PHP43,441 on TESTOMAXX across five weeks —
// enough to make the business's second-best product look like its problem, and
// to hide that ALMUTRIA was the one losing money on every order.
//
// Campaign names carry a product code, so the split can be measured. These are
// those measurements.
//
// WHAT IS AND IS NOT IN THIS REPOSITORY. The four Ads Manager exports are not
// committed — they were read once, totalled by product, and the totals written
// down here. So this file cannot be re-derived from anything in the repository.
// It records what the exports said, the window they covered and how many
// campaigns were behind each figure, and that is the whole of its authority. A
// later export replaces it; it does not get adjusted by hand.
//
// SHARES, NOT AMOUNTS. The exports cover 1 October to 4 November, which is no
// month and no week. Applying their peso totals to a period would be wrong for
// every period. Their SHARES hold up far better — the mix of what is being
// advertised changes slowly, while the amount changes weekly — so a period's
// own ad spend is divided by these shares instead.
//
// TO REFRESH IT, after exporting the next period from Ads Manager: total
// each account's Amount spent and Purchases by the product code in the
// campaign name, add the four accounts together, and write the four products
// plus the window into src/data/jntAdByProduct.json. Campaigns whose names
// carry no product code go in `unattributed` rather than being forced into a
// product. Nothing else needs changing: the page reads the window and labels
// any period the window does not cover as a parcel-share estimate rather than
// a measurement, so an out-of-date file understates what is known and never
// overstates it.
//
// All amounts are integer centavos.

import raw from '../../data/jntAdByProduct.json'

interface ProductSpend {
  name: string
  spend: number
  purchases: number
  campaigns: number
}

interface AdByProductFile {
  window: { from: string; to: string }
  source: string
  totalSpend: number
  products: ProductSpend[]
  unattributed: { spend: number; purchases: number; campaigns: number }
}

const file = raw as AdByProductFile

export const AD_PRODUCT_WINDOW = file.window
export const AD_PRODUCT_SOURCE = file.source

export interface ProductAdShare {
  product: string
  /** Share of all attributed spend, 0–1. */
  share: number
  spend: number
  purchases: number
  campaigns: number
  /** What one order cost to win, in centavos. */
  costPerPurchase: number
}

/**
 * Share of advertising per product, normalised across the four that are named.
 *
 * The PHP4,508 in campaigns whose names carry no product is spread across them
 * pro rata rather than held back. It is 1.5% of spend; holding it out would
 * leave every product's share slightly low and the page would not add up,
 * which costs more in confusion than the precision is worth. The figure is
 * reported by `unattributedSpend()` so it stays visible.
 */
export const AD_SHARES: ProductAdShare[] = (() => {
  const attributed = file.products.reduce((t, p) => t + p.spend, 0)
  return file.products.map((p) => ({
    product: p.name,
    share: attributed > 0 ? p.spend / attributed : 0,
    spend: p.spend,
    purchases: p.purchases,
    campaigns: p.campaigns,
    costPerPurchase: p.purchases > 0 ? Math.round(p.spend / p.purchases) : 0,
  }))
})()

export const unattributedSpend = () => file.unattributed

/** The measured share for a product, or null where no campaign named it. */
export function shareOf(product: string): number | null {
  const hit = AD_SHARES.find((s) => s.product.toUpperCase() === product.toUpperCase())
  return hit ? hit.share : null
}

/**
 * Whether a period falls inside the window the exports measured.
 *
 * Outside it the shares are not evidence, and the caller falls back to
 * splitting by parcels — which is weaker, and is labelled as such rather than
 * quietly standing in for a measurement.
 */
export function windowCovers(from: string, to: string): boolean {
  return from >= file.window.from && to <= file.window.to
}
