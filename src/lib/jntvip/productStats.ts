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
}

export function productStats(parcels: JntVipParcelRow[], productOf: ProductResolver): ProductStats[] {
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
      return {
        name,
        dispatched: rows.length,
        delivered: delivered.length,
        returned: returned.length,
        inFlight: inFlight.length,
        settled,
        rtsRate: settled > 0 ? returned.length / settled : 0,
        revenue,
        shippingCost: rows.reduce((t, p) => t + p.shippingCost, 0),
        // J&T charges RTS at half the returned parcel's own freight — verified
        // to the centavo across twelve statement windows.
        rtsFeeEstimate: returned.reduce((t, p) => t + Math.round(p.freight * 0.5), 0),
        wastedShipping: returned.reduce((t, p) => t + p.shippingCost, 0),
        avgOrderValue: delivered.length > 0 ? Math.round(revenue / delivered.length) : 0,
      }
    })
    .sort((a, b) => b.settled - a.settled)
}
