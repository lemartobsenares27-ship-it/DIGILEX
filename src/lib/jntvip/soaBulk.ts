// J&T VIP — importing a batch of statement PDFs at once.
//
// J&T issues a statement most days, so a month is twenty-odd PDFs. They arrive
// in batches, they sometimes arrive twice, and the same period can be reissued
// with different figures. All three cases are handled explicitly here rather
// than left to whoever is clicking.

import { jntVipDb } from './db'
import { parseSoaPdf, toSoaStated, type ParsedSoaPdf } from './soaPdf'
import { checkSoa, DEFAULT_TERMS, type Terms } from './soaCheck'
import type { JntVipParcelRow, JntVipSoaCheckRow } from './types'

export type BatchOutcome = 'SAVED' | 'UPDATED' | 'DUPLICATE' | 'REISSUED' | 'FAILED'

export interface BatchItem {
  fileName: string
  outcome: BatchOutcome
  parsed: ParsedSoaPdf | null
  /** Set when the parcel export covers this period and could verify it. */
  verified: 'CLEAN' | 'DISCREPANCY' | 'NOT_CHECKED'
  error: string | null
  message: string
}

export interface BatchResult {
  items: BatchItem[]
  saved: number
  updated: number
  duplicates: number
  reissued: number
  failed: number
}

const c = (peso: number) => Math.round(peso * 100)

/**
 * Parses and files a batch of statement PDFs.
 *
 * A statement already in the ledger is compared figure-by-figure before
 * anything is written. Identical means J&T sent the same file twice and it is
 * skipped — counting it again would double the money. Different figures means
 * J&T reissued the period, which is a real event worth flagging loudly, so the
 * row is updated and reported as REISSUED rather than quietly overwritten.
 *
 * A recorded payment is never touched by either path.
 */
export async function importSoaPdfBatch(
  files: File[],
  parcels: JntVipParcelRow[] = [],
  terms: Terms = DEFAULT_TERMS,
): Promise<BatchResult> {
  const items: BatchItem[] = []

  for (const file of files) {
    let parsed: ParsedSoaPdf
    try {
      parsed = await parseSoaPdf(file)
    } catch (e) {
      items.push({
        fileName: file.name,
        outcome: 'FAILED',
        parsed: null,
        verified: 'NOT_CHECKED',
        error: e instanceof Error ? e.message : String(e),
        message: 'Could not be read.',
      })
      continue
    }

    // Verify against the parcel ledger when it covers this period. Without
    // parcels the statement's own arithmetic is still checked by the parser.
    let verified: BatchItem['verified'] = 'NOT_CHECKED'
    let computed = {
      cod: 0,
      commission: 0,
      vat: 0,
      shipping: 0,
      rtsFee: 0,
      net: 0,
      delivered: 0,
      dispatched: 0,
      returned: 0,
    }
    if (parcels.length > 0) {
      const r = checkSoa(parcels, toSoaStated(parsed), terms)
      const pick = (k: string) => r.lines.find((l) => l.key === k)?.computed ?? 0
      computed = {
        cod: pick('cod'),
        commission: pick('commission'),
        vat: pick('vat'),
        shipping: pick('shipping'),
        rtsFee: pick('rts'),
        net: pick('net'),
        delivered: r.delivered.length,
        dispatched: r.dispatched.length,
        returned: r.returned.length,
      }
      // Only claim a verdict when the parcel file actually covers the period;
      // an empty window means "not checked", never "clean".
      if (r.delivered.length > 0 || r.dispatched.length > 0) {
        verified = r.verdict === 'DISCREPANCY' ? 'DISCREPANCY' : 'CLEAN'
      }
    }

    const row: Omit<JntVipSoaCheckRow, 'id' | 'receivedAmount' | 'receivedDate' | 'receivedReference' | 'paymentStatus'> = {
      soaNumber: parsed.soaNumber,
      periodFrom: parsed.periodFrom,
      periodTo: parsed.periodTo,
      checkedAt: new Date().toISOString(),
      verdict: parsed.issues.length > 0 ? 'DISCREPANCY' : verified === 'DISCREPANCY' ? 'DISCREPANCY' : verified === 'CLEAN' ? 'CLEAN' : 'INCOMPLETE',
      differenceTotal: 0,
      statedCod: c(parsed.codCollected),
      statedCommission: c(parsed.commission),
      statedVat: c(parsed.vat),
      statedShipping: c(parsed.shippingFee),
      statedRtsFee: c(parsed.rtsFee),
      statedAdjustments: c(parsed.totalAdjustment),
      statedNet: c(parsed.netRemittance),
      computedCod: computed.cod,
      computedCommission: computed.commission,
      computedVat: computed.vat,
      computedShipping: computed.shipping,
      computedRtsFee: computed.rtsFee,
      computedNet: computed.net,
      deliveredParcels: computed.delivered,
      dispatchedParcels: computed.dispatched,
      returnedParcels: computed.returned,
      notes: [...parsed.issues, ...parsed.notes].join(' · ') || null,
    }

    const existing = await jntVipDb.soaChecks.where('soaNumber').equals(parsed.soaNumber).first()

    if (existing) {
      const sameMoney =
        existing.statedCod === row.statedCod &&
        existing.statedNet === row.statedNet &&
        existing.statedShipping === row.statedShipping &&
        existing.statedRtsFee === row.statedRtsFee
      if (sameMoney) {
        items.push({
          fileName: file.name,
          outcome: 'DUPLICATE',
          parsed,
          verified,
          error: null,
          message: `Already in the ledger with identical figures — skipped so it is not counted twice.`,
        })
        continue
      }
      await jntVipDb.soaChecks.update(existing.id!, row)
      items.push({
        fileName: file.name,
        outcome: 'REISSUED',
        parsed,
        verified,
        error: null,
        message:
          `Same SOA number already in the ledger but with DIFFERENT figures — J&T reissued this period. ` +
          `Net was ₱${((existing.statedNet ?? 0) / 100).toFixed(2)}, now ₱${parsed.netRemittance.toFixed(2)}. ` +
          `Updated; any payment recorded against it is unchanged.`,
      })
      continue
    }

    await jntVipDb.soaChecks.add({
      ...row,
      receivedAmount: null,
      receivedDate: null,
      receivedReference: null,
      paymentStatus: 'UNPAID',
    })
    items.push({
      fileName: file.name,
      outcome: 'SAVED',
      parsed,
      verified,
      error: null,
      message: parsed.issues.length > 0 ? `Saved, but the statement does not add up: ${parsed.issues[0]}` : 'Saved to the ledger as unpaid.',
    })
  }

  return {
    items,
    saved: items.filter((i) => i.outcome === 'SAVED').length,
    updated: items.filter((i) => i.outcome === 'UPDATED').length,
    duplicates: items.filter((i) => i.outcome === 'DUPLICATE').length,
    reissued: items.filter((i) => i.outcome === 'REISSUED').length,
    failed: items.filter((i) => i.outcome === 'FAILED').length,
  }
}
