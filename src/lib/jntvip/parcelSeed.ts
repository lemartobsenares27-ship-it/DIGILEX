// The J&T parcel export, as starter data.
//
// Everything parcel-derived in this app — return rate, per-product figures,
// cost per delivered parcel — was blank for weeks, and not because the
// calculations were wrong. The importer existed on a page nothing pointed to,
// so the file never got in. That is fixed, but a fresh browser is still an
// empty table, and the statements are seeded for exactly this reason.
//
// So the export is seeded too: 1,876 parcels dispatched 2026-09-15 to
// 2026-11-01, from two exports, checked before being written down. No
// duplicate waybills, no negative amounts, no parcel delivered before it
// shipped, every row dated. Shipping reconciles to the centavo against every
// statement that overlaps them, and RTS against all twelve of the late-October
// ones.
//
// One caveat carried by the November export only. J&T dropped the "Cod" column
// from it, so for parcels after 14 October the `cod` field here holds ITEM
// VALUE instead. On the 595 waybills the two exports share, item value equals
// the old COD column on 590 — and differs on exactly the five where collection
// went wrong, including the parcel delivered with nothing collected and the one
// that came up PHP50 short. Item value is therefore what SHOULD have been
// collected, not what was. It is close enough to count bottles and far too
// weak to audit a remittance with, which is why the COD column is worth asking
// J&T to restore.
//
// Stored as a positional array rather than objects: at 963 rows the key names
// would be most of the file, and this keeps it to 167 KB.

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

  return {
    added: missing.length,
    skipped: (raw as Packed[]).length - missing.length - advanced,
    advanced,
  }
}
