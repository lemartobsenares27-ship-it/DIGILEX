// What J&T owes you, and what is still in the air.
//
// In a COD business the profit on a delivered parcel is real before the money
// is. J&T collects at the door, holds it, closes a period, and remits. So a
// month can close profitable with a large part of that profit sitting in the
// courier's account, and "we made PHP34,006" and "we have PHP34,006" are
// different sentences.
//
// Three buckets, and only the first two are receivable:
//
//   1. Statements issued but not yet paid.
//   2. Parcels DELIVERED after the last statement closed — the money is
//      collected, the statement simply has not been cut yet.
//   3. Parcels still moving. NOT receivable: nobody has paid anything, and on
//      this account about one in eight comes back instead.

import type { JntVipParcelRow, JntVipSoaCheckRow } from './types'
import { DEFAULT_TERMS } from './soaCheck'

export interface Receivables {
  /** The last day any statement covers. Everything after it is unbilled. */
  billedThrough: string | null

  /** Statements issued and not settled, at their net. */
  unpaidStatements: { soaNumber: string; periodTo: string; net: number; received: number }[]
  unpaidStatementsTotal: number

  /** Delivered after the last statement closed. */
  unbilledParcels: number
  unbilledCod: number
  unbilledShipping: number
  unbilledCommission: number
  unbilledVat: number
  unbilledRtsFee: number
  /** What J&T should remit for them once the statement is cut. */
  unbilledNet: number

  /** Everything the courier owes, billed or not. */
  total: number

  /** Still moving. Not owed to you by anyone yet. */
  inFlightParcels: number
  inFlightDeclared: number
  /** In-flight value discounted by the return rate this account actually runs. */
  inFlightExpected: number
  /** The return rate used for that discount. */
  rtsRate: number
}

export function receivables(
  rows: JntVipSoaCheckRow[],
  parcels: JntVipParcelRow[],
  terms = DEFAULT_TERMS,
): Receivables {
  const billedThrough =
    rows.length > 0 ? rows.map((r) => r.periodTo).sort().slice(-1)[0] : null

  // Only a statement J&T actually owes money on. A net of zero or less is not
  // a debt — one period closed at -PHP737.89, which is the owner owing J&T,
  // and counting it as a receivable would invent money.
  const unpaid = rows
    .filter((r) => {
      const net = r.statedNet ?? r.computedNet ?? 0
      return net > 0 && (r.receivedAmount ?? 0) < net
    })
    .map((r) => ({
      soaNumber: r.soaNumber,
      periodTo: r.periodTo,
      net: r.statedNet ?? r.computedNet ?? 0,
      received: r.receivedAmount ?? 0,
    }))
  const unpaidStatementsTotal = unpaid.reduce((t, s) => t + (s.net - s.received), 0)

  const after = (d: string | null) => d != null && billedThrough != null && d > billedThrough
  const deliveredUnbilled = parcels.filter((p) => p.status === 'DELIVERED' && after(p.podDate))
  const returnedUnbilled = parcels.filter((p) => p.status === 'RETURNED' && after(p.podDate))

  const unbilledCod = deliveredUnbilled.reduce((t, p) => t + p.cod, 0)
  const unbilledShipping = deliveredUnbilled.reduce((t, p) => t + p.shippingCost, 0)
  // Commission is charged per parcel and rounded per parcel, then summed —
  // 2.75% of the grand total is off by a few pesos. Same rule as soaCheck.
  const unbilledCommission = deliveredUnbilled.reduce(
    (t, p) => t + Math.round(p.cod * terms.commissionRate),
    0,
  )
  const unbilledVat = Math.round(unbilledCommission * terms.vatRate)
  const unbilledRtsFee = returnedUnbilled.reduce(
    (t, p) => t + Math.round(p.freight * terms.rtsShareOfFreight),
    0,
  )
  const unbilledNet =
    unbilledCod - unbilledShipping - unbilledCommission - unbilledVat - unbilledRtsFee

  const inFlight = parcels.filter(
    (p) => p.status === 'IN_TRANSIT' || p.status === 'DELIVERING' || p.status === 'FOR_RETURN',
  )
  const inFlightDeclared = inFlight.reduce((t, p) => t + p.cod, 0)

  // The return rate from settled parcels only. Counting the undecided ones as
  // delivered would flatter it, which is the mistake that makes an in-flight
  // pile look safer than it is.
  const delivered = parcels.filter((p) => p.status === 'DELIVERED').length
  const returned = parcels.filter((p) => p.status === 'RETURNED').length
  const rtsRate = delivered + returned > 0 ? returned / (delivered + returned) : 0

  return {
    billedThrough,
    unpaidStatements: unpaid,
    unpaidStatementsTotal,
    unbilledParcels: deliveredUnbilled.length,
    unbilledCod,
    unbilledShipping,
    unbilledCommission,
    unbilledVat,
    unbilledRtsFee,
    unbilledNet,
    total: unpaidStatementsTotal + unbilledNet,
    inFlightParcels: inFlight.length,
    inFlightDeclared,
    inFlightExpected: Math.round(inFlightDeclared * (1 - rtsRate)),
    rtsRate,
  }
}
