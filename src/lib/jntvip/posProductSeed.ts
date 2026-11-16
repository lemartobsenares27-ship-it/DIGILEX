// Which product each parcel carried, taken from the POS exports.
//
// The J&T export is one file for everything, and its only product clue is the
// item text the shipper typed — abbreviated, quantity-prefixed, and sometimes
// filed under the wrong product entirely. Alias matching handles it well, but
// it is inference. A POS export covers exactly one product, so every tracking
// number in it is KNOWN, and that is what these pins record.
//
// 890 tracking numbers came from four exports: TESTOMAXX 325, EYE CARE 377,
// ALMUTRIA 91, GOLDEN EAR 96. Checked against the parcel export before being
// written down — 889 of 890 match a known waybill, and exactly one parcel
// disagreed with its file: JT0024536854197 sat in the EYE CARE export, but its
// own POS product text and J&T's item text both say TESTOMAXX, so it is pinned
// as TESTOMAXX. A pin is only better than a guess when it is checked.
//
// 70 BELLY SLIM PLUS waybills were added later and COULD NOT be checked that
// way: every one of them is newer than the parcel export, which stops on
// 2 November, so none appears in it yet. They are pinned on the POS export's
// word alone. That is still far better than guessing from item text, but it is
// a weaker claim than the 890 above, and the next parcel export is what
// confirms them.

import raw from '../../data/jntPosProducts.json'

export interface PosPinSeedResult {
  added: number
  skipped: number
}

/**
 * Loads the pins, once. Only ever ADDS a waybill with no pin already.
 *
 * A pin the user set by hand, or imported from a newer POS export, is a
 * deliberate correction and outranks this snapshot. Overwriting it would undo
 * their work silently, which is the one thing a seed must never do.
 */
export async function seedPosProductPins(): Promise<PosPinSeedResult> {
  const { jntVipDb } = await import('./db')
  const pairs = raw as [string, string][]
  const known = new Set((await jntVipDb.parcelProducts.toArray()).map((r) => r.awb))
  const missing = pairs.filter(([awb]) => !known.has(awb))
  if (missing.length > 0) {
    const now = new Date().toISOString()
    await jntVipDb.parcelProducts.bulkAdd(
      missing.map(([awb, product]) => ({ awb, product, source: 'POS' as const, updatedAt: now })),
    )
  }
  return { added: missing.length, skipped: pairs.length - missing.length }
}
