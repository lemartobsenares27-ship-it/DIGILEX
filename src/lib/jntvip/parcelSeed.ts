// The J&T parcel export, as starter data.
//
// Everything parcel-derived in this app — return rate, per-product figures,
// cost per delivered parcel — was blank for weeks, and not because the
// calculations were wrong. The importer existed on a page nothing pointed to,
// so the file never got in. That is fixed, but a fresh browser is still an
// empty table, and the statements are seeded for exactly this reason.
//
// So the export is seeded too: 2,665 parcels dispatched 2026-09-15 to
// 2026-11-16, from three exports, checked before being written down. No
// duplicate waybills, no negative amounts, no parcel delivered before it
// shipped, every row dated. Shipping reconciles to the centavo against every
// statement that overlaps them, and RTS against all the late-October ones.
//
// The November 16 export has the "Cod" column back, so `cod` here is now what
// J&T ACTUALLY COLLECTED, not what should have been. That is the column an
// earlier export dropped, and getting it back is the only reason a parcel
// delivered and signed for with PHP0 collected can be seen at all.
//
// Four parcels sit at cod 0. Three are delivered — JT0024762590797 (PHP798),
// JT0025487836984 (PHP399) and JT0027182011676 (PHP399) — and none of them is
// a loss: the customer paid the owner directly by GCash, PHP1,596 in all,
// recorded in directPayments.ts so the money is counted once and not through
// a statement that never carried it. The fourth is still in transit.
//
// Because an older seed stored ITEM VALUE in this field, a browser that
// loaded the app before 2026-11-17 holds the should-have-been figure on the
// waybills the exports share. correctSeededMoney below repairs exactly those
// rows, and only those: a parcel the owner imported from a file themselves
// carries its `raw` record and is never touched.
//
// Stored as a positional array rather than objects: at 2,665 rows the key
// names would be most of the file, and this keeps it to 474 KB.

import raw from '../../data/jntParcels.json'
import type { JntVipParcelRow } from './types'

type Packed = [
  awb: string,
  status: string,
  rawStatus: string,
  podAt: string | null,
  shipAt: string | null,
  cod: number,
  shippingCost: number,
  freight: number,
  province: string | null,
  city: string | null,
  rtsReason: string | null,
  remarks: string | null,
]

const day = (ts: string | null) => (ts ? ts.slice(0, 10) : null)

function unpack(p: Packed): JntVipParcelRow {
  return {
    awb: p[0],
    status: p[1] as JntVipParcelRow['status'],
    rawStatus: p[2],
    podAt: p[3],
    podDate: day(p[3]),
    shipAt: p[4],
    shipDate: day(p[4]),
    cod: p[5],
    shippingCost: p[6],
    freight: p[7],
    weight: 0,
    province: p[8],
    city: p[9],
    receiver: null,
    rtsReason: p[10],
    remarks: p[11],
    creatorCode: null,
    updatedAt: new Date().toISOString(),
    raw: null,
  }
}

export interface ParcelSeedResult {
  added: number
  skipped: number
  /** Seed-fed rows whose money fields were repaired from the newer export. */
  corrected: number
  advanced: number
}

/**
 * How far through its life a parcel is. A parcel only ever moves up this list.
 *
 * Ranking the statuses is what makes it safe for the seed to correct a stored
 * parcel at all. Without it the rule has to be "never touch what is already
 * there", which leaves a browser that imported in mid-October still showing
 * those parcels as IN_TRANSIT for ever — and a return rate computed from them
 * reads far too low, because the returns are sitting in the undecided pile.
 */
const PROGRESS: Record<string, number> = {
  IN_TRANSIT: 0,
  DELIVERING: 1,
  FOR_RETURN: 2,
  DELIVERED: 3,
  RETURNED: 3,
}

/**
 * Loads the parcels this export covers, once.
 *
 * Adds any waybill the database has not seen, and advances one it has only
 * where the seed knows the parcel got further — never the reverse. A parcel
 * that has since been delivered is never pushed back to IN_TRANSIT because an
 * older file still says so, and a delivery is never rewritten as a return.
 * Importing a fresh export through the Import page remains the way to bring in
 * new waybills and corrections; this keeps an existing browser from being
 * stranded on statuses that have since settled.
 */
export async function seedParcels(): Promise<ParcelSeedResult> {
  const { jntVipDb } = await import('./db')
  const stored = await jntVipDb.parcels.toArray()
  const known = new Set(stored.map((p) => p.awb))
  const byAwb = new Map(stored.map((p) => [p.awb, p]))

  const missing = (raw as Packed[]).filter((p) => !known.has(p[0])).map(unpack)
  if (missing.length > 0) await jntVipDb.parcels.bulkAdd(missing)

  // Parcels already stored: advance the ones the seed now knows more about.
  //
  // Strictly forward, and never between two settled states. DELIVERED and
  // RETURNED both rank 3, so neither can be rewritten as the other and a
  // delivery is never quietly turned into a return. Anything below them can
  // only move up. The result does not depend on which file is newer, so a
  // stale seed cannot undo a fresh import — the case this function used to
  // refuse to touch anything at all to avoid.
  let advanced = 0
  for (const packed of raw as Packed[]) {
    if (!known.has(packed[0])) continue
    const stored = byAwb.get(packed[0])
    if (!stored?.id) continue
    const to = PROGRESS[packed[1]]
    const from = PROGRESS[stored.status]
    if (to === undefined || from === undefined || to <= from) continue
    const next = unpack(packed)
    await jntVipDb.parcels.update(stored.id, {
      status: next.status,
      rawStatus: next.rawStatus,
      podAt: next.podAt,
      podDate: next.podDate,
      rtsReason: next.rtsReason ?? stored.rtsReason,
      updatedAt: next.updatedAt,
    })
    advanced++
  }

  // Money fields: repair the rows an older seed wrote, and nothing else.
  //
  // The status pass above cannot do this. A status has a direction, so
  // "only ever forward" makes it safe; an amount has none, and the first
  // version of this seed stored ITEM VALUE in `cod` because the export it
  // came from had no "Cod" column. The November 16 export restored that
  // column, so for the waybills the exports share the stored figure is what
  // SHOULD have been collected while the seed now holds what WAS. Left
  // alone, a browser that opened the app earlier keeps reading the wrong
  // one, and the parcel delivered with nothing collected goes on looking
  // like it paid in full.
  //
  // The guard is `raw`. A parcel the owner imported from a file themselves
  // keeps that file's record on the row; a seeded parcel has raw === null.
  // So this only ever overwrites figures this seed itself put there, and a
  // fresh import through the Import page always wins. Nothing is deleted,
  // no row is removed, and the count comes back in the result rather than
  // being applied in silence.
  let corrected = 0
  for (const packed of raw as Packed[]) {
    const stored = byAwb.get(packed[0])
    if (!stored?.id) continue
    if (stored.raw != null) continue // imported by hand — leave it alone
    const next = unpack(packed)
    if (
      stored.cod === next.cod &&
      stored.shippingCost === next.shippingCost &&
      stored.freight === next.freight
    )
      continue
    await jntVipDb.parcels.update(stored.id, {
      cod: next.cod,
      shippingCost: next.shippingCost,
      freight: next.freight,
      updatedAt: next.updatedAt,
    })
    corrected++
  }

  return {
    added: missing.length,
    skipped: (raw as Packed[]).length - missing.length - advanced,
    advanced,
    corrected,
  }
}
