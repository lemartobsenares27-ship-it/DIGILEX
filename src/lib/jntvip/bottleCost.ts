// What one finished bottle costs to put in a box.
//
// This is the only part of the P&L that cannot be read off a statement or a
// receipt — it is built from purchase prices, so it is written down here in full
// and shown on the page rather than appearing as a single unexplained number.
//
// The one arithmetic trap is the capsules. They are bought in bulk and split
// across bottles, so the cost per bottle is the bulk price scaled by the yield,
// not the bulk price itself. Alaska Garlic at PHP155.00 for 500 capsules is not
// PHP155.00 of cost in a bottle that holds 60 — it is PHP18.60. Getting this
// backwards would overstate product cost by roughly eight times and make a
// healthy product look unsellable.
//
// Only the two SKUs currently being sold are listed. A test product that is no
// longer running does not belong in a cost model used to judge live margin.
//
// All amounts are integer centavos.

export interface BottleCostLine {
  label: string
  amount: number
  /** How the figure was arrived at, shown beside it on the page. */
  detail: string
}

export interface BottleCost {
  sku: string
  /** What the capsules are and how the per-bottle share was derived. */
  capsuleSource: string
  lines: BottleCostLine[]
  total: number
  price: number
  grossProfit: number
  grossMargin: number
}

interface BottleInput {
  sku: string
  capsuleName: string
  /** What a bulk pack costs. */
  bulkPrice: number
  /** How many capsules are in that pack. */
  bulkCapsules: number
  /** How many capsules go into one bottle. */
  capsulesPerBottle: number
  /** Everything that is not the capsules, in the order it is assembled. */
  packaging: BottleCostLine[]
  price: number
}

const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Scales a bulk purchase down to one bottle.
 *
 * Multiplying before dividing keeps the centavo exact where dividing first would
 * round the per-capsule cost and then multiply the error up by the yield.
 */
function capsuleCost(bulkPrice: number, bulkCapsules: number, capsulesPerBottle: number): number {
  return Math.round((bulkPrice * capsulesPerBottle) / bulkCapsules)
}

function build(i: BottleInput): BottleCost {
  const caps = capsuleCost(i.bulkPrice, i.bulkCapsules, i.capsulesPerBottle)
  const lines: BottleCostLine[] = [
    {
      label: `${i.capsuleName} capsules`,
      amount: caps,
      detail: `${peso(i.bulkPrice)} buys ${i.bulkCapsules} capsules, and ${i.capsulesPerBottle} go in a bottle`,
    },
    ...i.packaging,
  ]
  const total = lines.reduce((t, l) => t + l.amount, 0)
  return {
    sku: i.sku,
    capsuleSource: `${i.capsuleName}, ${i.bulkCapsules} capsules for ${peso(i.bulkPrice)}`,
    lines,
    total,
    price: i.price,
    grossProfit: i.price - total,
    grossMargin: (i.price - total) / i.price,
  }
}

const BOTTLE = { label: 'Bottle', amount: 1100, detail: 'The empty bottle itself' }
const FOAM = { label: 'Foam seal', amount: 100, detail: 'Under the cap' }
const SHRINK = { label: 'Shrink wrap', amount: 100, detail: 'Tamper band' }

/** The two SKUs currently selling. Both go out at PHP399.00 COD. */
export const BOTTLE_COSTS: BottleCost[] = [
  build({
    sku: 'EYE CARE',
    capsuleName: 'Alaska Garlic',
    bulkPrice: 15500,
    bulkCapsules: 500,
    capsulesPerBottle: 60,
    packaging: [BOTTLE, FOAM, SHRINK, { label: 'Label', amount: 300, detail: 'Printed wrap label' }],
    price: 39900,
  }),
  build({
    sku: 'TESTOMAXX',
    capsuleName: 'Alingatong',
    bulkPrice: 8000,
    bulkCapsules: 100,
    capsulesPerBottle: 30,
    packaging: [BOTTLE, FOAM, SHRINK, { label: 'Sticker', amount: 300, detail: 'Printed sticker' }],
    price: 39900,
  }),
]

export const bottleCost = (sku: string) => BOTTLE_COSTS.find((b) => b.sku === sku) ?? null

/**
 * The cost used when the SKU mix behind a period cannot be resolved.
 *
 * The dearer of the two, deliberately: an unknown mix should understate profit
 * rather than flatter it. At a PHP5.40 spread the choice moves the bottom line
 * very little, which is the point — it is a safe default, not a guess that
 * matters.
 */
export const PRUDENT_UNIT_COST = Math.max(...BOTTLE_COSTS.map((b) => b.total))
