// Parcels the courier says came back, against stock the warehouse actually has.
//
// The warehouse has a complete RTS workflow — receive, inspect, and only then
// return to sellable stock — and nothing has ever been put through it. The
// courier export says 222 parcels were returned to sender. The warehouse has
// received none of them. Those bottles are physically somewhere, they are not
// in available stock, and until now nothing in the system said so.
//
// That is the gap this closes: not another report, but a worklist of returns
// that are owed to the warehouse and have not arrived.
//
// HOW THE TWO APPS ARE CONNECTED, AND HOW THEY ARE NOT.
//
// They are not. The courier app and the warehouse app have separate IndexedDB
// databases and share nothing at runtime, which is deliberate and stays that
// way. What they share is a FILE — the same parcel export JSON, imported at
// build time by both. This module reads that file and nothing else: it cannot
// see the courier app's database, cannot write to it, and will not change its
// behaviour if that database is edited. A build-time constant is the only
// thing crossing the boundary.
//
// The consequence is worth stating plainly: this list is only as current as
// the last parcel export that was committed. It is a worklist, not a live feed.
//
// Nothing here moves stock. Receiving a return still goes through the existing
// receiveRts operation, which posts it to FOR_INSPECTION and leaves it there
// until somebody physically looks at it. A parcel coming back is not the same
// event as a sellable bottle returning to the shelf, and collapsing the two is
// exactly how phantom stock appears.

import raw from '../../data/jntParcels.json'
import type { RtsReturnRow } from './types'

/** The packed parcel row, as the courier export stores it. */
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

export interface ExpectedReturn {
  awb: string
  /** When the courier marked it returned. */
  returnedOn: string | null
  shippedOn: string | null
  /** Product name as the courier echoes it back, not a warehouse SKU. */
  productName: string
  bottles: number
  reason: string | null
  province: string | null
  /** What the customer would have paid, for sizing the loss. */
  cod: number
  /** Set once a warehouse return row carries the same tracking number. */
  received: RtsReturnRow | null
}

export interface ReturnsSummary {
  rows: ExpectedReturn[]
  expected: number
  expectedBottles: number
  received: number
  receivedBottles: number
  inspected: number
  outstanding: number
  outstandingBottles: number
  /** Value of the bottles that have not come back, at a stated unit cost. */
  outstandingValue: number
  /** Product names the courier reports that the warehouse has no product for. */
  unmatchedProducts: string[]
  /** The newest return date in the export, so the page can say how fresh it is. */
  coverTo: string | null
}

const QTY = /^\s*(\d+)\s*Pc/i
const NAMES = ['EYE CARE', 'TESTOMAXX', 'GOLDEN EAR', 'ALMUTRIA'] as const

function productOf(remarks: string | null): string {
  const d = (remarks ?? '').toUpperCase()
  // Longest first, so a short name never claims a longer one containing it.
  for (const n of [...NAMES].sort((a, b) => b.length - a.length)) {
    if (d.includes(n)) return n
  }
  return 'Unidentified'
}

function bottlesOf(remarks: string | null): number {
  const m = QTY.exec(remarks ?? '')
  if (m) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > 0 && n < 100) return n
  }
  // One, not zero. A returned parcel held at least one bottle, and counting it
  // as none would quietly shrink the gap this page exists to show.
  return 1
}

/** Every parcel the courier marked RETURNED, newest first. */
export function expectedReturns(): Omit<ExpectedReturn, 'received'>[] {
  return (raw as Packed[])
    .filter((p) => p[1] === 'RETURNED')
    .map((p) => ({
      awb: p[0],
      returnedOn: p[3] ? p[3].slice(0, 10) : null,
      shippedOn: p[4] ? p[4].slice(0, 10) : null,
      productName: productOf(p[11]),
      bottles: bottlesOf(p[11]),
      reason: p[10],
      province: p[8],
      cod: p[5],
    }))
    .sort((a, b) => (b.returnedOn ?? '').localeCompare(a.returnedOn ?? ''))
}

/**
 * Matches expected returns against what the warehouse has received.
 *
 * Matching is on tracking number alone, and only an exact one counts. A
 * returned parcel has no other identifier the two sides reliably share, and a
 * fuzzy match here would mark a return as arrived when it has not — the one
 * error this page must never make, since its whole purpose is to show what is
 * missing.
 */
export function summariseReturns(
  received: RtsReturnRow[],
  warehouseProductNames: string[],
  unitCost: number,
): ReturnsSummary {
  const byTracking = new Map<string, RtsReturnRow>()
  for (const r of received) {
    if (r.trackingNumber) byTracking.set(r.trackingNumber.trim().toUpperCase(), r)
  }

  const rows: ExpectedReturn[] = expectedReturns().map((e) => ({
    ...e,
    received: byTracking.get(e.awb.toUpperCase()) ?? null,
  }))

  const have = rows.filter((r) => r.received != null)
  const missing = rows.filter((r) => r.received == null)
  const catalogue = warehouseProductNames.map((n) => n.toUpperCase())
  const unmatchedProducts = [...new Set(rows.map((r) => r.productName))]
    .filter((n) => n !== 'Unidentified')
    .filter((n) => !catalogue.some((c) => c.includes(n) || n.includes(c)))

  const dates = rows.map((r) => r.returnedOn).filter((d): d is string => !!d)

  return {
    rows,
    expected: rows.length,
    expectedBottles: rows.reduce((t, r) => t + r.bottles, 0),
    received: have.length,
    receivedBottles: have.reduce((t, r) => t + r.bottles, 0),
    inspected: have.filter((r) => r.received?.status === 'INSPECTED').length,
    outstanding: missing.length,
    outstandingBottles: missing.reduce((t, r) => t + r.bottles, 0),
    outstandingValue: missing.reduce((t, r) => t + r.bottles, 0) * unitCost,
    unmatchedProducts,
    coverTo: dates.length > 0 ? dates.reduce((a, b) => (b > a ? b : a)) : null,
  }
}
