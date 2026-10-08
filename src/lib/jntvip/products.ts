// The product catalogue, and how a parcel is attributed to one.
//
// The J&T export is a single file covering everything you sell, and the only
// product clue in it is the item text the shipper typed — free-form, abbreviated
// ("TSTMX"), and prefixed with quantities ("2 BOTTLES ..."). That is good enough
// to sort most parcels and not good enough to trust, so attribution runs in a
// fixed order of confidence:
//
//   1. An explicit mapping, from a POS export that covers exactly one product.
//      Every waybill in such a file is known, not inferred.
//   2. An alias match on the parcel's item text.
//   3. Unclassified — named, counted and shown, never quietly folded into
//      whichever product happens to be first.
//
// Step 3 is the one that matters. The previous version returned "Other" for
// anything it did not recognise, so adding a third and fourth product would
// have merged them into one meaningless bucket while every rate still looked
// plausible.

import type { JntVipParcelRow, JntVipProductRow } from './types'

/** Shown wherever a parcel's product could not be established. */
export const UNCLASSIFIED = 'Unclassified'

/** The catalogue as it stood when products became data. */
export const SEED_PRODUCTS: Omit<JntVipProductRow, 'id' | 'updatedAt'>[] = [
  { name: 'EYE CARE', aliases: ['EYE CARE', 'EYECARE'], unitCost: 3460, price: 39900, active: true },
  { name: 'TESTOMAXX', aliases: ['TESTOMAXX', 'TSTMX'], unitCost: 4000, price: 39900, active: true },
]

/** The text J&T carries back for a parcel, normalised for matching. */
export function parcelText(p: JntVipParcelRow): string {
  return `${p.remarks ?? ''}`.toUpperCase()
}

/**
 * Resolves a parcel to a product name.
 *
 * Aliases are tried longest-first so a specific name is never shadowed by a
 * shorter one it contains — without that, an alias like "EYE" would claim
 * "EYE CARE PLUS" for the wrong product purely because it was checked earlier.
 */
export function resolveProduct(
  p: JntVipParcelRow,
  products: JntVipProductRow[],
  pinned: Map<string, string>,
): string {
  const explicit = pinned.get(p.awb)
  if (explicit) return explicit

  const text = parcelText(p)
  if (!text) return UNCLASSIFIED

  const candidates = products
    .filter((prod) => prod.active)
    .flatMap((prod) => prod.aliases.map((a) => ({ name: prod.name, alias: a.toUpperCase().trim() })))
    .filter((c) => c.alias.length > 0)
    .sort((a, b) => b.alias.length - a.alias.length)

  for (const c of candidates) if (text.includes(c.alias)) return c.name
  return UNCLASSIFIED
}

/** Builds the awb → product map once, rather than per parcel. */
export function pinnedMap(rows: { awb: string; product: string }[]): Map<string, string> {
  return new Map(rows.map((r) => [r.awb, r.product]))
}

/**
 * The item texts that matched nothing, with how often each occurs.
 *
 * This is what turns an unclassified pile into an action: the commonest
 * unmatched phrase is almost always a product spelled a way the catalogue has
 * not been told about, and adding it as an alias fixes every parcel at once.
 */
export function unmatchedSamples(
  parcels: JntVipParcelRow[],
  products: JntVipProductRow[],
  pinned: Map<string, string>,
  limit = 8,
): { text: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of parcels) {
    if (resolveProduct(p, products, pinned) !== UNCLASSIFIED) continue
    // Strip the quantity prefix and the trailing price so near-identical
    // descriptions of the same product collapse into one suggestion.
    const cleaned = parcelText(p)
      .replace(/^\s*\d+\s*(PC|PCS|BOTTLES?|BTL)?\s*[-–:]?\s*/i, '')
      .replace(/\s*[/|]?\s*CAPSULES?\s*:?\s*\d+\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!cleaned) continue
    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Writes any seed product the catalogue has never seen. Run once, at startup. */
export async function seedProducts(): Promise<void> {
  const { jntVipDb } = await import('./db')
  const existing = await jntVipDb.products.toArray()
  const seen = new Set(existing.map((r) => r.name))
  const missing = SEED_PRODUCTS.filter((p) => !seen.has(p.name))
  if (missing.length === 0) return
  await jntVipDb.products.bulkAdd(missing.map((p) => ({ ...p, updatedAt: new Date().toISOString() })))
}
