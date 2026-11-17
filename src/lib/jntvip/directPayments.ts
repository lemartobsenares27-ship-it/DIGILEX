// Money that reached the owner without passing through J&T's COD.
//
// A parcel J&T delivers but collects nothing on is not automatically a loss.
// It is a loss only if nobody ever paid. Three parcels on record were marked
// Delivered with Cod PHP0.00, and the customer later paid the owner directly
// through GCash — so the sale happened, the stock is gone and the money
// arrived; it simply never touched the courier's books.
//
// This is kept SEPARATE from the statements rather than folded into them,
// because J&T's figures are right exactly as they stand: they collected
// nothing, so they billed nothing and remitted nothing. Editing a parcel's COD
// to paper over this would break the reconciliation that proved the statements
// honest in the first place.
//
// All amounts are integer centavos.

export interface DirectPayment {
  awb: string
  /** The day the money reached the owner, as YYYY-MM-DD. */
  paidOn: string
  amount: number
  via: string
  note: string
}

export const DIRECT_PAYMENTS: DirectPayment[] = [
  {
    awb: 'JT0024762590797',
    paidOn: '2026-09-28',
    amount: 79800,
    via: 'GCash',
    note: 'Delivered 28 Sep in SILANG with Cod PHP0.00. Customer paid direct. Date assumed to be the delivery date; it is used only to place the money in a month.',
  },
  {
    awb: 'JT0025487836984',
    paidOn: '2026-10-12',
    amount: 39900,
    via: 'GCash',
    note: 'Delivered 12 Oct in QUEZON-CITY with Cod PHP0.00. Customer paid direct.',
  },
  {
    awb: 'JT0027182011676',
    paidOn: '2026-11-11',
    amount: 39900,
    via: 'GCash',
    note: 'Delivered 11 Nov in TARLAC-VICTORIA, signed for, Cod PHP0.00. This is the whole of the PHP399 that made the 11 November statement look short. Customer paid direct.',
  },
]

/** Direct payments received within [from, to] inclusive. */
export function directPaymentsBetween(from: string, to: string): number {
  return DIRECT_PAYMENTS.filter((p) => p.paidOn >= from && p.paidOn <= to).reduce((t, p) => t + p.amount, 0)
}

/** Waybills settled outside COD, so they are not counted as collection failures. */
export const DIRECT_PAID_AWBS = new Set(DIRECT_PAYMENTS.map((p) => p.awb))
