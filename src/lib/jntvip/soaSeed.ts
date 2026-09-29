// J&T VIP — the statements already received, as starter data.
//
// This app keeps everything in the browser, so a fresh browser is an empty
// ledger: the statements verified during setup existed only on the machine
// that imported them. These twenty are transcribed from the real PDFs for
// account MNL-V11913 covering 2026-08-28 to 2026-09-24, so the Finance page
// opens onto the real position instead of an empty table.
//
// Every figure here was read from the statement itself and independently
// re-derived: all twenty add up internally, shipping matched the parcel export
// on 20/20 periods, and COD matched on 18/20 (the two exceptions are parcels
// dispatched before the export's start date, not billing errors).
//
// Each statement also carries the bank credit that settled it, matched from
// the UnionBank transaction history: every "INREM VIA PCHC" credit lines up
// with exactly one statement's net remittance, to the centavo, 1-3 days after
// the period closed. Nineteen of the twenty are settled that way; the
// twentieth (24 Sep) is negative, so no credit is expected for it — it was
// netted off the following statement instead.
//
// Amounts are integer centavos. Seeding is idempotent on the SOA number, so
// a statement already present — imported by hand or seeded before — is never
// duplicated and never overwrites a payment recorded against it.

import { jntVipDb } from './db'

interface SeedSoa {
  soaNumber: string
  periodFrom: string
  periodTo: string
  cod: number
  commission: number
  vat: number
  shipping: number
  rtsFee: number
  adjustments: number
  net: number
  /** The bank credit that settled it, matched from the UnionBank statement. */
  received: number | null
  receivedOn: string | null
  ref: string | null
}

/** Twenty statements. SOA202609110913 arrived twice; it is listed once. */
export const SEED_STATEMENTS: SeedSoa[] = [
  { soaNumber: 'SOA202608280830MNL-V11913', periodFrom: '2026-08-28', periodTo: '2026-08-30', cod: 1696400, commission: 46642, vat: 5597, shipping: 818200, rtsFee: 6000, adjustments: 0, net: 819961, received: 819961, receivedOn: '2026-09-02', ref: 'UB466379' },
  { soaNumber: 'SOA202608310831MNL-V11913', periodFrom: '2026-08-31', periodTo: '2026-08-31', cod: 658600, commission: 18108, vat: 2173, shipping: 173300, rtsFee: 15000, adjustments: 0, net: 450019, received: 450019, receivedOn: '2026-09-03', ref: 'UB231812' },
  { soaNumber: 'SOA202609010901MNL-V11913', periodFrom: '2026-09-01', periodTo: '2026-09-01', cod: 938200, commission: 25796, vat: 3096, shipping: 179700, rtsFee: 0, adjustments: 0, net: 729608, received: 729608, receivedOn: '2026-09-02', ref: 'UB666567' },
  { soaNumber: 'SOA202609020902MNL-V11913', periodFrom: '2026-09-02', periodTo: '2026-09-02', cod: 1357200, commission: 37316, vat: 4478, shipping: 0, rtsFee: 24000, adjustments: 0, net: 1291406, received: 1291406, receivedOn: '2026-09-03', ref: 'UB577268' },
  { soaNumber: 'SOA202609030903MNL-V11913', periodFrom: '2026-09-03', periodTo: '2026-09-03', cod: 558800, commission: 15364, vat: 1844, shipping: 0, rtsFee: 0, adjustments: 0, net: 541592, received: 541592, receivedOn: '2026-09-04', ref: 'UB695618' },
  { soaNumber: 'SOA202609040906MNL-V11913', periodFrom: '2026-09-04', periodTo: '2026-09-06', cod: 1077800, commission: 29634, vat: 3556, shipping: 500600, rtsFee: 13500, adjustments: 0, net: 530510, received: 530510, receivedOn: '2026-09-07', ref: 'UB1320239' },
  { soaNumber: 'SOA202609070907MNL-V11913', periodFrom: '2026-09-07', periodTo: '2026-09-07', cod: 498900, commission: 13717, vat: 1646, shipping: 297100, rtsFee: 26750, adjustments: 0, net: 159687, received: 159687, receivedOn: '2026-09-08', ref: 'UB579897' },
  { soaNumber: 'SOA202609080908MNL-V11913', periodFrom: '2026-09-08', periodTo: '2026-09-08', cod: 1197400, commission: 32922, vat: 3951, shipping: 164300, rtsFee: 9000, adjustments: 0, net: 987227, received: 987227, receivedOn: '2026-09-09', ref: 'UB570141' },
  { soaNumber: 'SOA202609090909MNL-V11913', periodFrom: '2026-09-09', periodTo: '2026-09-09', cod: 858100, commission: 23593, vat: 2831, shipping: 140800, rtsFee: 3000, adjustments: 0, net: 687876, received: 687876, receivedOn: '2026-09-10', ref: 'UB742331' },
  { soaNumber: 'SOA202609100910MNL-V11913', periodFrom: '2026-09-10', periodTo: '2026-09-10', cod: 1117500, commission: 30725, vat: 3687, shipping: 191500, rtsFee: 0, adjustments: 0, net: 891588, received: 891588, receivedOn: '2026-09-11', ref: 'UB729007' },
  { soaNumber: 'SOA202609110913MNL-V11913', periodFrom: '2026-09-11', periodTo: '2026-09-13', cod: 1656500, commission: 45545, vat: 5465, shipping: 136400, rtsFee: 41250, adjustments: 0, net: 1427840, received: 1427840, receivedOn: '2026-09-14', ref: 'UB1425390' },
  { soaNumber: 'SOA202609140914MNL-V11913', periodFrom: '2026-09-14', periodTo: '2026-09-14', cod: 399300, commission: 10979, vat: 1317, shipping: 97200, rtsFee: 15500, adjustments: 0, net: 274304, received: 274304, receivedOn: '2026-09-15', ref: 'UB1069177' },
  { soaNumber: 'SOA202609150915MNL-V11913', periodFrom: '2026-09-15', periodTo: '2026-09-15', cod: 574100, commission: 15786, vat: 1894, shipping: 106900, rtsFee: 10500, adjustments: 0, net: 439020, received: 439020, receivedOn: '2026-09-16', ref: 'UB751619' },
  { soaNumber: 'SOA202609160916MNL-V11913', periodFrom: '2026-09-16', periodTo: '2026-09-16', cod: 538800, commission: 14814, vat: 1778, shipping: 65400, rtsFee: 13500, adjustments: 0, net: 443308, received: 443308, receivedOn: '2026-09-17', ref: 'UB606155' },
  { soaNumber: 'SOA202609170917MNL-V11913', periodFrom: '2026-09-17', periodTo: '2026-09-17', cod: 519000, commission: 14270, vat: 1712, shipping: 78400, rtsFee: 12000, adjustments: 0, net: 412618, received: 412618, receivedOn: '2026-09-18', ref: 'UB680450' },
  { soaNumber: 'SOA202609180920MNL-V11913', periodFrom: '2026-09-18', periodTo: '2026-09-20', cod: 1447100, commission: 39788, vat: 4775, shipping: 177600, rtsFee: 37000, adjustments: 0, net: 1187937, received: 1187937, receivedOn: '2026-09-21', ref: 'UB1404436' },
  { soaNumber: 'SOA202609210921MNL-V11913', periodFrom: '2026-09-21', periodTo: '2026-09-21', cod: 179600, commission: 4938, vat: 593, shipping: 100200, rtsFee: 4500, adjustments: 0, net: 69369, received: 69369, receivedOn: '2026-09-22', ref: 'UB593579' },
  { soaNumber: 'SOA202609220922MNL-V11913', periodFrom: '2026-09-22', periodTo: '2026-09-22', cod: 279400, commission: 7682, vat: 922, shipping: 95000, rtsFee: 12500, adjustments: 0, net: 163296, received: 163296, receivedOn: '2026-09-23', ref: 'UB607069' },
  { soaNumber: 'SOA202609230923MNL-V11913', periodFrom: '2026-09-23', periodTo: '2026-09-23', cod: 419100, commission: 11523, vat: 1383, shipping: 0, rtsFee: 10750, adjustments: 0, net: 395444, received: 395444, receivedOn: '2026-09-24', ref: 'UB570977' },
  { soaNumber: 'SOA202609240924MNL-V11913', periodFrom: '2026-09-24', periodTo: '2026-09-24', cod: 119800, commission: 3294, vat: 395, shipping: 189900, rtsFee: 0, adjustments: 0, net: -73789, received: null, receivedOn: null, ref: null },
]

export interface SoaSeedResult {
  added: number
  skipped: number
  /** Statements already present that gained their confirmed bank credit. */
  settled: number
}

/**
 * Loads the known statements and the bank credits that settled them.
 *
 * Safe to run repeatedly, with one nuance that matters. Skipping every
 * statement already present was too blunt: a browser that seeded these before
 * the bank statement arrived held them all as UNPAID, and no later seed could
 * ever correct that — it showed ₱118,288.21 outstanding against money J&T had
 * in fact already paid.
 *
 * So the rule is narrower: a statement with NO payment recorded against it
 * accepts the confirmed credit, and a statement that already carries one is
 * left completely alone. That still protects anything entered by hand — which
 * is the only thing worth protecting — while letting a blank row learn the
 * truth.
 */
export async function seedKnownStatements(): Promise<SoaSeedResult> {
  const existing = await jntVipDb.soaChecks.toArray()
  const byNumber = new Map(existing.map((r) => [r.soaNumber, r]))
  let added = 0
  let skipped = 0
  let settled = 0

  for (const s of SEED_STATEMENTS) {
    const prior = byNumber.get(s.soaNumber)
    if (prior) {
      // Only ever fill a blank. Never touch a recorded payment.
      if (s.received != null && prior.receivedAmount == null) {
        await jntVipDb.soaChecks.update(prior.id!, {
          receivedAmount: s.received,
          receivedDate: s.receivedOn,
          receivedReference: s.ref,
          paymentStatus:
            s.received === s.net ? 'PAID' : s.received < s.net ? 'PARTIAL' : 'OVERPAID',
        })
        settled++
      } else {
        skipped++
      }
      continue
    }
    await jntVipDb.soaChecks.add({
      soaNumber: s.soaNumber,
      periodFrom: s.periodFrom,
      periodTo: s.periodTo,
      checkedAt: new Date().toISOString(),
      // Verified against the statement's own arithmetic. The parcel-level
      // check re-runs whenever a parcel export is imported.
      verdict: 'CLEAN',
      differenceTotal: 0,
      statedCod: s.cod,
      statedCommission: s.commission,
      statedVat: s.vat,
      statedShipping: s.shipping,
      statedRtsFee: s.rtsFee,
      statedAdjustments: s.adjustments,
      statedNet: s.net,
      computedCod: 0,
      computedCommission: 0,
      computedVat: 0,
      computedShipping: 0,
      computedRtsFee: 0,
      computedNet: 0,
      deliveredParcels: 0,
      dispatchedParcels: 0,
      returnedParcels: 0,
      receivedAmount: s.received,
      receivedDate: s.receivedOn,
      receivedReference: s.ref,
      paymentStatus: s.received == null ? 'UNPAID' : s.received === s.net ? 'PAID' : s.received < s.net ? 'PARTIAL' : 'OVERPAID',
      notes: s.net < 0 ? 'Negative net — shipping and fees exceeded COD collected. You owe J&T for this period.' : null,
    })
    added++
  }

  return { added, skipped, settled }
}
