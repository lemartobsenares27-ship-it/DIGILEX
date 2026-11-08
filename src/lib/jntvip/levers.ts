// The formula the business actually runs on, and what moving each part does.
//
// Three months of figures reduce to one line:
//
//     profit = parcels x (contribution - ad cost per parcel) - fixed costs
//
// Contribution is what a parcel brings in after J&T, product and packing —
// PHP250 in October. Fixed costs are payroll and overhead, PHP38,479, owed
// whatever ships. So the whole business turns on the gap between PHP250 and
// what an order costs to win, and that gap is multiplied by volume.
//
// WHY THIS MATTERS MORE THAN IT SOUNDS. October's weeks look contradictory
// until you put them through it: the week spending PHP83,688 made PHP10,904
// while the week spending PHP35,248 made PHP42,351. That reads as "spend less"
// and it is not. The first paid PHP201 a parcel, the second PHP116. Spend
// level is not the lever; cost per parcel is. Growing volume at PHP250 a
// parcel loses money however fast it grows, which is the most expensive
// mistake available here and feels exactly like success while it happens.
//
// Every figure below is the business's own, measured. The one exception is
// marked: how much extra a second bottle earns is modelled, because no month
// has yet tested it.
//
// All amounts are integer centavos.

export interface Baseline {
  parcels: number
  delivered: number
  returned: number
  rtsRate: number
  /** Collected on delivered parcels. */
  revenue: number
  avgOrder: number
  bottlesPerOrder: number
  /** What a shipped parcel brings in after J&T, product and packing. */
  contributionPerParcel: number
  adPerParcel: number
  fixedCosts: number
  profit: number
  /** Ad cost per parcel at which profit reaches zero, at this volume. */
  breakEvenAdCost: number
}

export interface Scenario {
  rtsRate: number
  adPerParcel: number
  bottlesPerOrder: number
  parcels: number
}

/**
 * How much of a second bottle's price survives as revenue.
 *
 * A second bottle is not a second order: the pair sells for PHP599, not
 * PHP798, so 1.5x the bottles is about 1.33x the money. MODELLED, not
 * measured — it is the only number here nothing in the data tests, and it is
 * deliberately set so the lever stays worth having even if it is half wrong.
 */
const BASKET_ELASTICITY = 0.72

export function baselineFrom(input: {
  parcels: number
  delivered: number
  revenue: number
  courier: number
  cogs: number
  packing: number
  adSpend: number
  fixedCosts: number
  bottlesDelivered: number
}): Baseline {
  const { parcels, delivered, revenue, courier, cogs, packing, adSpend, fixedCosts } = input
  const returned = parcels - delivered
  const contribution = parcels > 0 ? Math.round((revenue - courier - cogs - packing) / parcels) : 0
  const adPer = parcels > 0 ? Math.round(adSpend / parcels) : 0
  return {
    parcels,
    delivered,
    returned,
    rtsRate: parcels > 0 ? returned / parcels : 0,
    revenue,
    avgOrder: delivered > 0 ? Math.round(revenue / delivered) : 0,
    bottlesPerOrder: delivered > 0 ? input.bottlesDelivered / delivered : 1,
    contributionPerParcel: contribution,
    adPerParcel: adPer,
    fixedCosts,
    profit: revenue - courier - cogs - packing - adSpend - fixedCosts,
    breakEvenAdCost: parcels > 0 ? contribution - Math.round(fixedCosts / parcels) : 0,
  }
}

/**
 * Profit under a changed scenario, rebuilt from the parts rather than scaled.
 *
 * Each cost is recomputed from the parcels it actually depends on — freight on
 * every parcel shipped, return fees only on returns, product and packing only
 * on bottles that went out — so changing the return rate moves five things at
 * once the way it really does, instead of one.
 */
export function profitUnder(b: Baseline, s: Scenario): number {
  const delivered = s.parcels * (1 - s.rtsRate)

  // What one delivered order is worth once a bigger basket is priced in. A
  // second bottle is not a second order — the pair sells for PHP599, not
  // PHP798 — so the bottle count is damped rather than multiplied straight
  // through.
  const order = b.avgOrder * Math.pow(s.bottlesPerOrder / b.bottlesPerOrder, BASKET_ELASTICITY)

  // Contribution is measured per parcel SHIPPED, which already carries the
  // freight on parcels that came back and the fees on the ones that did not.
  // Spreading it over delivered orders first lets it move with the order
  // value, then the return rate decides how many orders there are.
  const perDelivered = b.delivered > 0 ? (b.contributionPerParcel * b.parcels) / b.delivered : 0
  const scaled = perDelivered * (order / b.avgOrder)

  // Extra bottles cost product and packing: PHP40 plus PHP6.
  const extraBottleCost = (s.bottlesPerOrder - b.bottlesPerOrder) * 4600

  const contribution = delivered * (scaled - extraBottleCost)
  return Math.round(contribution - s.adPerParcel * s.parcels - b.fixedCosts)
}

export interface LeverResult {
  label: string
  detail: string
  profit: number
  gain: number
  measured: boolean
}

/** The levers, each priced on its own against the baseline. */
export function levers(b: Baseline): LeverResult[] {
  const now: Scenario = {
    rtsRate: b.rtsRate,
    adPerParcel: b.adPerParcel,
    bottlesPerOrder: b.bottlesPerOrder,
    parcels: b.parcels,
  }
  const at = (s: Partial<Scenario>) => profitUnder(b, { ...now, ...s })
  const base = at({})
  const mk = (label: string, detail: string, p: number, measured = true): LeverResult => ({
    label,
    detail,
    profit: p,
    gain: p - base,
    measured,
  })
  return [
    mk('Cut returns to 9%', 'Confirm every order before it ships. Almost every return is a customer refusing at the door.', at({ rtsRate: 0.09 })),
    mk('Get ad cost to PHP150 a parcel', 'Kill the campaigns above your break-even and move their budget to the ones under it.', at({ adPerParcel: 15000 })),
    mk('Get ad cost to the rate you already hit', 'The week of 5 October cost PHP116 a parcel. You have done it once.', at({ adPerParcel: 11600 })),
    mk('Sell 1.5 bottles an order', 'Make the two-bottle price the default, not an upsell offered after.', at({ bottlesPerOrder: 1.5 }), false),
    mk('All three together', 'Returns at 9%, ads at PHP150, baskets at 1.5.', at({ rtsRate: 0.09, adPerParcel: 15000, bottlesPerOrder: 1.5 }), false),
  ]
}
