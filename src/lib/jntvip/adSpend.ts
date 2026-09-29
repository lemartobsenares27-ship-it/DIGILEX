// Meta ad spend, transcribed from the transaction receipts.
//
// Two things about this data matter, and both come from the receipts themselves.
//
// FAILED receipts are not spend. Meta marks a receipt "Failed" when the card
// declined; no money moved. It then retries, usually splitting the amount, and
// each retry is its own receipt. Twelve failed receipts totalling PHP26,875.02
// sit in the same export as these — adding them would overstate ad spend by a
// third. Only "Paid" receipts are recorded here.
//
// A receipt is a PAYMENT record, not a spend-per-day record. Each one covers a
// billing window ("From Aug 30 to Sep 02"), and consecutive windows OVERLAP
// because Meta charges on a threshold rather than on a calendar boundary. So the
// amounts must never be spread across their days and re-summed per day — that
// double-counts the overlap. They are attributed to the day the card was
// charged, which is exact and needs no assumption. Over a period of weeks the
// edge effect is a small shift at the boundaries, not a distortion of the total.
//
// Amounts are integer centavos.

export interface AdCharge {
  /** The day the card was actually charged. Spend is attributed here. */
  chargedOn: string
  /** Start of the billing window the receipt covers. Shown for context only. */
  coversFrom: string
  amount: number
  /** First 8 characters of the receipt file, so any line can be traced back. */
  receipt: string
}

/** 36 paid receipts, 2026-08-01 to 2026-09-28. Total PHP83,562.50. */
export const AD_CHARGES: AdCharge[] = [
  { chargedOn: '2026-08-01', coversFrom: '2026-07-31', amount: 9910, receipt: '7e604f06' },
  { chargedOn: '2026-08-03', coversFrom: '2026-07-31', amount: 69376, receipt: '9b642e03' },
  { chargedOn: '2026-08-05', coversFrom: '2026-08-02', amount: 8506, receipt: 'e620f2f1' },
  { chargedOn: '2026-08-05', coversFrom: '2026-08-04', amount: 42536, receipt: 'd7ac54da' },
  { chargedOn: '2026-08-05', coversFrom: '2026-08-05', amount: 17012, receipt: 'f6926a10' },
  { chargedOn: '2026-08-07', coversFrom: '2026-08-05', amount: 9109, receipt: '4b565793' },
  { chargedOn: '2026-08-08', coversFrom: '2026-08-06', amount: 18218, receipt: '15db2cd0' },
  { chargedOn: '2026-08-08', coversFrom: '2026-08-06', amount: 45549, receipt: 'cd2a4139' },
  { chargedOn: '2026-08-10', coversFrom: '2026-08-07', amount: 61189, receipt: 'a0e6630a' },
  { chargedOn: '2026-08-12', coversFrom: '2026-08-08', amount: 67590, receipt: '6a62f7bd' },
  { chargedOn: '2026-08-13', coversFrom: '2026-08-11', amount: 43520, receipt: 'bd8dda4c' },
  { chargedOn: '2026-08-21', coversFrom: '2026-08-12', amount: 96394, receipt: 'c36813fa' },
  { chargedOn: '2026-08-25', coversFrom: '2026-08-21', amount: 286300, receipt: '0e0326a7' },
  { chargedOn: '2026-08-25', coversFrom: '2026-08-24', amount: 63302, receipt: '61a13af5' },
  { chargedOn: '2026-08-26', coversFrom: '2026-08-24', amount: 183140, receipt: 'e6887747' },
  { chargedOn: '2026-08-29', coversFrom: '2026-08-25', amount: 276000, receipt: '4f2f48bc' },
  { chargedOn: '2026-08-29', coversFrom: '2026-08-28', amount: 38925, receipt: 'e3ae65f6' },
  { chargedOn: '2026-08-30', coversFrom: '2026-08-28', amount: 293900, receipt: '74634e5d' },
  { chargedOn: '2026-08-31', coversFrom: '2026-08-29', amount: 293900, receipt: '622e183e' },
  { chargedOn: '2026-09-02', coversFrom: '2026-08-30', amount: 338200, receipt: '04fc6619' },
  { chargedOn: '2026-09-03', coversFrom: '2026-08-31', amount: 338200, receipt: '80d5685b' },
  { chargedOn: '2026-09-04', coversFrom: '2026-09-01', amount: 338200, receipt: '32b0a397' },
  { chargedOn: '2026-09-05', coversFrom: '2026-09-02', amount: 338200, receipt: '9be60241' },
  { chargedOn: '2026-09-07', coversFrom: '2026-09-04', amount: 338200, receipt: 'f8f9b165' },
  { chargedOn: '2026-09-08', coversFrom: '2026-09-05', amount: 296765, receipt: 'f6afe569' },
  { chargedOn: '2026-09-08', coversFrom: '2026-09-06', amount: 42394, receipt: '4197fa16' },
  { chargedOn: '2026-09-09', coversFrom: '2026-09-06', amount: 338200, receipt: 'e19b4025' },
  { chargedOn: '2026-09-14', coversFrom: '2026-09-10', amount: 601200, receipt: 'd9c68e42' },
  { chargedOn: '2026-09-17', coversFrom: '2026-09-13', amount: 601200, receipt: 'b13955f0' },
  { chargedOn: '2026-09-21', coversFrom: '2026-09-15', amount: 601200, receipt: '7b871f7c' },
  { chargedOn: '2026-09-23', coversFrom: '2026-09-19', amount: 526467, receipt: '2d58ee06' },
  { chargedOn: '2026-09-23', coversFrom: '2026-09-20', amount: 75209, receipt: '13917729' },
  { chargedOn: '2026-09-25', coversFrom: '2026-09-21', amount: 601200, receipt: 'a2c14b70' },
  { chargedOn: '2026-09-25', coversFrom: '2026-09-23', amount: 3315, receipt: 'd49b53a2' },
  { chargedOn: '2026-09-26', coversFrom: '2026-09-23', amount: 452524, receipt: 'a06d73ee' },
  { chargedOn: '2026-09-28', coversFrom: '2026-09-25', amount: 601200, receipt: '1112887f' },
]

/** Declined attempts, kept only so the page can say why they are excluded. */
export const AD_FAILED_TOTAL = 2687502
export const AD_FAILED_COUNT = 12

/** Ad spend charged within [from, to] inclusive. */
export function adSpendBetween(from: string, to: string): number {
  return AD_CHARGES.filter((c) => c.chargedOn >= from && c.chargedOn <= to).reduce((t, c) => t + c.amount, 0)
}

export function adChargesBetween(from: string, to: string): AdCharge[] {
  return AD_CHARGES.filter((c) => c.chargedOn >= from && c.chargedOn <= to)
}
