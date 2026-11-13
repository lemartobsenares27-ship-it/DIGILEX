// Did the returned parcels actually come back?
//
// Every other page treats a return as settled business: the freight is spent,
// the RTS fee is charged, and the bottles come back sellable, so they carry no
// product cost. That last part is an assumption, and until now nothing checked
// it. The courier's export says a parcel went back to sender. It does not say
// the box reached the house.
//
// The distinction costs real money. A return whose bottles came home costs the
// outbound freight, the RTS fee, the packing and the advertising. A return
// whose bottles did not costs all of that AND the stock, and the shelf count is
// wrong by that much, which is how a stock count ends up disagreeing with the
// system for reasons nobody can trace months later.
//
// WHAT THE EXPORT CAN AND CANNOT TELL YOU. A RETURNED parcel's POD date is when
// it was marked returned at the delivery end. No column records the handover
// back to the sender, so arrival cannot be derived — it has to be recorded by
// whoever took the boxes in. This module therefore reports three states and
// never guesses between them:
//
//   RECEIVED    somebody confirmed the parcel arrived.
//   MISSING     somebody chased it and established it is not coming.
//   unconfirmed neither of those has happened yet.
//
// Age is NOT one of the states. An old unconfirmed parcel is a parcel to chase,
// not a loss, and turning one into the other on a timer would book a loss that
// may not exist and quietly reduce the stock on hand. Only MISSING does that,
// and only a person can set it.
//
// All amounts are integer centavos.

import type { JntVipParcelRow, JntVipRtsHomecomingRow } from './types'
import { bottlesIn } from './profit'
import { bottleCost, PRUDENT_UNIT_COST } from './bottleCost'
import type { ProductResolver } from './rts'

/**
 * How long a return plausibly takes to travel back, in days.
 *
 * Not a rule from J&T — it is the working assumption this page states openly so
 * the reader can disagree with it. Below it, an unconfirmed parcel is probably
 * still moving. Above it, silence means nobody has looked.
 */
export const TRANSIT_DAYS = 7

export type Homecoming = 'RECEIVED' | 'MISSING' | 'UNCONFIRMED'

export interface ReturnRow {
  awb: string
  /** When the courier marked it returned, as YYYY-MM-DD. */
  returnedOn: string
  /** Whole days between that and the as-of date. */
  ageDays: number
  province: string
  city: string
  product: string
  bottles: number
  /** What the bottles in it cost to build. */
  stockValue: number
  /** COD that was never collected, for sizing the order that was lost. */
  cod: number
  reason: string | null
  status: Homecoming
  settledOn: string | null
  recordedBy: string | null
  note: string | null
}

export interface ReturnsBand {
  key: 'transit' | 'chase' | 'overdue'
  label: string
  detail: string
  parcels: number
  bottles: number
  stockValue: number
}

export interface ReturnsHome {
  rows: ReturnRow[]
  /** Every parcel the courier says went back, in the export loaded. */
  total: number
  received: number
  missing: number
  unconfirmed: number
  /** Bottles and build cost sitting in parcels nobody has confirmed. */
  unconfirmedBottles: number
  unconfirmedValue: number
  /** Bottles and build cost in parcels established as not coming back. */
  missingBottles: number
  missingValue: number
  /** Unconfirmed parcels by age. Received and missing ones are not banded. */
  bands: ReturnsBand[]
  /** The newest return date in the export — how current this worklist is. */
  latestReturn: string | null
  asOf: string
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '')

/** What one parcel's bottles cost to build, by its own SKU where that is known. */
function stockValueOf(product: string, bottles: number): number {
  return bottles * (bottleCost(product)?.total ?? PRUDENT_UNIT_COST)
}

/**
 * Build the return worklist.
 *
 * `asOf` is passed in rather than read from the clock so the result is
 * reproducible and testable; the page passes today.
 */
export function returnsHome(
  parcels: JntVipParcelRow[],
  homecoming: JntVipRtsHomecomingRow[],
  productOf: ProductResolver,
  asOf: string,
): ReturnsHome {
  const byAwb = new Map(homecoming.map((h) => [h.awb, h]))
  const asOfMs = Date.parse(asOf + 'T00:00:00Z')

  const rows: ReturnRow[] = parcels
    .filter((p) => p.status === 'RETURNED' && p.podDate)
    .map((p) => {
      const returnedOn = day(p.podDate)
      const record = byAwb.get(p.awb)
      const product = productOf(p)
      const bottles = bottlesIn(p)
      return {
        awb: p.awb,
        returnedOn,
        ageDays: Math.max(0, Math.round((asOfMs - Date.parse(returnedOn + 'T00:00:00Z')) / 86400000)),
        province: p.province ?? '',
        city: p.city ?? '',
        product,
        bottles,
        stockValue: stockValueOf(product, bottles),
        cod: p.cod,
        reason: p.rtsReason ?? null,
        status: record ? record.status : ('UNCONFIRMED' as const),
        settledOn: record?.settledOn ?? null,
        recordedBy: record?.recordedBy ?? null,
        note: record?.note ?? null,
      }
    })
    // Oldest first: the parcel least likely to still be moving is the one to
    // ask about, and a worklist sorted newest-first buries exactly that.
    .sort((a, b) => a.returnedOn.localeCompare(b.returnedOn) || a.awb.localeCompare(b.awb))

  const open = rows.filter((r) => r.status === 'UNCONFIRMED')
  const gone = rows.filter((r) => r.status === 'MISSING')

  const band = (
    key: ReturnsBand['key'],
    label: string,
    detail: string,
    pick: (r: ReturnRow) => boolean,
  ): ReturnsBand => {
    const hit = open.filter(pick)
    return {
      key,
      label,
      detail,
      parcels: hit.length,
      bottles: hit.reduce((t, r) => t + r.bottles, 0),
      stockValue: hit.reduce((t, r) => t + r.stockValue, 0),
    }
  }

  return {
    rows,
    total: rows.length,
    received: rows.filter((r) => r.status === 'RECEIVED').length,
    missing: gone.length,
    unconfirmed: open.length,
    unconfirmedBottles: open.reduce((t, r) => t + r.bottles, 0),
    unconfirmedValue: open.reduce((t, r) => t + r.stockValue, 0),
    missingBottles: gone.reduce((t, r) => t + r.bottles, 0),
    missingValue: gone.reduce((t, r) => t + r.stockValue, 0),
    bands: [
      band(
        'transit',
        'Probably still travelling',
        `Marked returned within the last ${TRANSIT_DAYS} days`,
        (r) => r.ageDays <= TRANSIT_DAYS,
      ),
      band(
        'chase',
        'Worth asking about',
        `Between ${TRANSIT_DAYS + 1} and 21 days`,
        (r) => r.ageDays > TRANSIT_DAYS && r.ageDays <= 21,
      ),
      band(
        'overdue',
        'Long overdue',
        'More than 21 days with no confirmed arrival',
        (r) => r.ageDays > 21,
      ),
    ],
    latestReturn: rows.length > 0 ? rows[rows.length - 1].returnedOn : null,
    asOf,
  }
}
