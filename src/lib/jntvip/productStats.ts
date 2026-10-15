// Per-product performance, from the one J&T export that covers all of them.
//
// Every figure here is derived from parcels, not from statements. A statement
// gives totals for a period and never says which product they belong to, so the
// only way to answer "which SKU is bleeding" is to attribute parcels and add up
// from there. That means these numbers are only as complete as the parcel
// export: products are compared against each other honestly, but the absolute
// revenue will sit under the statements whenever the export starts late.

import type { JntVipParcelRow } from './types'
import type { ProductResolver } from './rts'
import type { JntVipProductRow } from './types'

export interface ProductStats {
  name: string
  dispatched: number
  delivered: number
  returned: number
  inFlight: number
  settled: number
  rtsRate: number
  /** COD actually collected, i.e. on delivered parcels only. */
  revenue: number
  /** Shipping billed on everything that went out, landed or not. */
  shippingCost: number
  /** Half the returned parcels' freight — what RTS costs at J&T's rate. */
  rtsFeeEstimate: number
  /** Shipping spent on parcels that came back and earned nothing. */
  wastedShipping: number
  avgOrderValue: number

  /** Bottles delivered, inferred from COD against the product's own price. */
  bottles: number
  /** What those bottles cost to make. Null when the product has no unit cost yet. */
  cogs: number | null
  /** 2.75% commission plus 12% VAT on it, the way J&T charges. */
  codService: number
  /**
   * Revenue less product, shipping, COD service and the RTS fees — everything
   * this product causes. Advertising and the running costs are deliberately
   * absent: neither is attributable per SKU without a per-campaign split, and
   * apportioning them by revenue would invent a number rather than measure one.
   */
  contribution: number | null
  contributionPerBottle: number | null
}

export function productStats(
  parcels: JntVipParcelRow[],
  productOf: ProductResolver,
  catalogue: JntVipProductRow[] = [],
): ProductStats[] {
  const costOf = new Map(catalogue.map((p) => [p.name, p]))
  const byName = new Map<string, JntVipParcelRow[]>()
  for (const p of parcels) {
    const name = productOf(p)
    if (!byName.has(name)) byName.set(name, [])
    byName.get(name)!.push(p)
  }

  return [...byName.entries()]
    .map(([name, rows]) => {
      const delivered = rows.filter((p) => p.status === 'DELIVERED')
      const returned = rows.filter((p) => p.status === 'RETURNED')
      const inFlight = rows.filter((p) => p.status === 'IN_TRANSIT' || p.status === 'DELIVERING' || p.status === 'FOR_RETURN')
      const settled = delivered.length + returned.length
      const revenue = delivered.reduce((t, p) => t + p.cod, 0)
      const cat = costOf.get(name)
      // Bottles from COD against the product's own price. A two-bottle order is
      // discounted, so rounding the ratio recovers the count where dividing
      // would not.
      const price = cat?.price && cat.price > 0 ? cat.price : 39900
      const bottles = delivered.reduce((t, p) => t + Math.max(1, Math.round(p.cod / price)), 0)
      const cogs = cat && cat.unitCost > 0 ? bottles * cat.unitCost : null
      const commission = delivered.reduce((t, p) => t + Math.round(p.cod * 0.0275), 0)
      const codService = commission + Math.round(commission * 0.12)
      const shipping = rows.reduce((t, p) => t + p.shippingCost, 0)
      const rtsFee = returned.reduce((t, p) => t + Math.round(p.freight * 0.5), 0)
      const contribution = cogs == null ? null : revenue - cogs - shipping - codService - rtsFee
      return {
        name,
        dispatched: rows.length,
        delivered: delivered.length,
        returned: returned.length,
        inFlight: inFlight.length,
        settled,
        rtsRate: settled > 0 ? returned.length / settled : 0,
        revenue,
        shippingCost: shipping,
        // J&T charges RTS at half the returned parcel's own freight — verified
        // to the centavo across twelve statement windows.
        rtsFeeEstimate: rtsFee,
        wastedShipping: returned.reduce((t, p) => t + p.shippingCost, 0),
        avgOrderValue: delivered.length > 0 ? Math.round(revenue / delivered.length) : 0,
        bottles,
        cogs,
        codService,
        contribution,
        contributionPerBottle: contribution == null || bottles === 0 ? null : Math.round(contribution / bottles),
      }
    })
    .sort((a, b) => b.settled - a.settled)
}
