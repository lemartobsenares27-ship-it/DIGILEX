// The J&T parcel export, as starter data.
//
// Everything parcel-derived in this app — return rate, per-product figures,
// cost per delivered parcel — was blank for weeks, and not because the
// calculations were wrong. The importer existed on a page nothing pointed to,
// so the file never got in. That is fixed, but a fresh browser is still an
// empty table, and the statements are seeded for exactly this reason.
//
// So the export is seeded too: 963 parcels dispatched 2026-09-15 to 2026-10-14,
// checked before being written down. No duplicate waybills, no negative
// amounts, no parcel delivered before it shipped, every row dated. Shipping
// reconciles to the centavo against all eight statements that overlap it.
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
}

/**
 * Loads the parcels this export covers, once.
 *
 * Only ever ADDS a waybill the database has not seen. A parcel already present
 * was either imported by the user from a more recent export or seeded before,
 * and in both cases it knows at least as much as this snapshot does — a parcel
 * that has since been delivered must not be pushed back to IN_TRANSIT because a
 * three-week-old file still said so. Re-importing through the Import page is
 * the way to move statuses forward; that path compares and updates properly.
 */
export async function seedParcels(): Promise<ParcelSeedResult> {
  const { jntVipDb } = await import('./db')
  const known = new Set((await jntVipDb.parcels.toArray()).map((p) => p.awb))

  const missing = (raw as Packed[]).filter((p) => !known.has(p[0])).map(unpack)
  if (missing.length > 0) await jntVipDb.parcels.bulkAdd(missing)
  return { added: missing.length, skipped: (raw as Packed[]).length - missing.length }
}
