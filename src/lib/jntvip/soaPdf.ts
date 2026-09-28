// J&T VIP — reading a statement straight out of its PDF.
//
// Typing eleven figures per statement was fine for one. It is not fine for
// twenty, and twenty is what a month of daily SOAs actually looks like. This
// reads the text layer J&T's PDFs already carry — no OCR, no guessing.
//
// The layout is fixed enough to parse but weird enough to be worth writing
// down. J&T's generator emits labels and values in separate text runs, so the
// extracted text has all the labels in one block and the numbers in another.
// The five headline figures arrive as a bare run immediately after the COD
// period, in this order and nothing else between them:
//
//     2026-09-18+2026-09-20 14471      <- period, then COD collected
//     2.75% 397.88                     <- rate, then commission
//     47.75                            <- VAT
//     0                                <- commission CWT
//     1776                             <- shipping fee
//
// Everything else is addressable by its own label. Parsed values are never
// silently trusted: the caller re-derives every total and reports mismatches.

import type { SoaStated } from './soaCheck'

export interface ParsedSoaPdf {
  fileName: string
  soaNumber: string
  clientCode: string | null
  accountName: string | null
  generatedAt: string | null
  periodFrom: string
  periodTo: string
  codCollected: number
  commission: number
  vat: number
  commissionCwt: number
  shippingFee: number
  codPayable: number
  rtsFee: number
  totalDeduction: number
  totalAdjustment: number
  netRemittance: number
  /** Internal arithmetic problems found in the statement itself. */
  issues: string[]
  /** Things true of the statement that are worth surfacing, not errors. */
  notes: string[]
  rawText: string
}

const num = (s: string | undefined | null): number => {
  if (s == null) return 0
  const n = Number(String(s).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}
const c = (peso: number) => Math.round(peso * 100)

/** Extracts the text layer from a PDF in the browser. */
export async function pdfToText(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    // Vite emits the worker as an asset and hands back its hashed URL, which
    // keeps working under the app's relative base on static hosting.
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useWorkerFetch: false }).promise
  const out: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    // Join with newlines: the parser depends on runs staying separated, and
    // space-joining would merge the value block into one unsplittable line.
    out.push(content.items.map((it) => ('str' in it ? it.str : '')).join('\n'))
  }
  return out.join('\n')
}

export function parseSoaText(text: string, fileName = ''): ParsedSoaPdf {
  const issues: string[] = []
  const notes: string[] = []
  const one = (re: RegExp): string | null => text.match(re)?.[1] ?? null

  const soaNumber = one(/(SOA\d{12}[A-Z-]*V?\d*)/) ?? one(/SOA:\s*\n?\s*(\S+)/)
  if (!soaNumber) throw new Error('No SOA number found — is this a J&T statement PDF?')

  const period = text.match(/(\d{4}-\d{2}-\d{2})\+(\d{4}-\d{2}-\d{2})/)
  if (!period) throw new Error(`${soaNumber}: no billing period found.`)

  // The five headline figures, in the fixed order J&T emits them.
  const head = text.match(
    /\+\d{4}-\d{2}-\d{2}\s*\n?\s*([\d.,]+)\s*\n\s*2\.75%\s*\n?\s*([\d.,]+)\s*\n\s*([\d.,]+)\s*\n\s*([\d.,]+)\s*\n\s*([\d.,]+)/,
  )
  if (!head) throw new Error(`${soaNumber}: could not read the COD / commission / VAT / shipping block.`)

  const parsed: ParsedSoaPdf = {
    fileName,
    soaNumber,
    clientCode: one(/CLIENT CODE:\s*\n?\s*(\S+)/) ?? one(/(MNL-V\d+)/),
    accountName: one(/ACCOUNT NAME:\s*\n?\s*(.+)/)?.trim() ?? null,
    generatedAt: one(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/),
    periodFrom: period[1],
    periodTo: period[2],
    codCollected: num(head[1]),
    commission: num(head[2]),
    vat: num(head[3]),
    commissionCwt: num(head[4]),
    shippingFee: num(head[5]),
    codPayable: num(one(/TOTAL COD PAYABLE\s*\n?\s*(-?[\d.,]+)/)),
    rtsFee: num(one(/RTS FEE\s+\d{4}-\d{2}-\d{2}\+\d{4}-\d{2}-\d{2}\s*\n?\s*(-?[\d.,]+)/)),
    totalDeduction: num(one(/TOTAL DEDUCTION\s*\n?\s*(-?[\d.,]+)/)),
    totalAdjustment: num(one(/TOTAL ADJUSTMENT\s*\n?\s*(-?[\d.,]+)/)),
    netRemittance: num(one(/NET REMITTANCE\s*\n?\s*(-?[\d.,]+)/)),
    issues,
    notes,
    rawText: text,
  }

  // Re-derive every total from its own components. A statement that does not
  // add up is the whole point of reading it, so this is never skipped.
  const payable = c(parsed.codCollected) - c(parsed.commission) - c(parsed.vat) - c(parsed.commissionCwt)
  if (payable !== c(parsed.codPayable)) {
    issues.push(`COD payable should be ${(payable / 100).toFixed(2)} but the statement says ${parsed.codPayable.toFixed(2)}`)
  }
  const vat = Math.round(c(parsed.commission) * 0.12)
  if (vat !== c(parsed.vat)) {
    issues.push(`VAT should be 12% of commission = ${(vat / 100).toFixed(2)} but the statement says ${parsed.vat.toFixed(2)}`)
  }
  const deduction = c(parsed.shippingFee) + c(parsed.rtsFee)
  if (deduction !== c(parsed.totalDeduction)) {
    issues.push(`Total deduction should be ${(deduction / 100).toFixed(2)} but the statement says ${parsed.totalDeduction.toFixed(2)}`)
  }
  const net = c(parsed.codPayable) - c(parsed.totalDeduction) + c(parsed.totalAdjustment)
  if (net !== c(parsed.netRemittance)) {
    issues.push(`Net remittance should be ${(net / 100).toFixed(2)} but the statement says ${parsed.netRemittance.toFixed(2)}`)
  }

  // Not errors — facts about this statement that change what you do with it.
  if (parsed.netRemittance < 0) {
    notes.push(
      `Negative net: shipping and fees (₱${(parsed.shippingFee + parsed.rtsFee).toFixed(2)}) exceeded COD collected ` +
        `(₱${parsed.codCollected.toFixed(2)}). You owe J&T ₱${Math.abs(parsed.netRemittance).toFixed(2)} for this period — ` +
        `expect it netted off a later remittance rather than paid to you.`,
    )
  }
  if (parsed.shippingFee === 0 && parsed.codCollected > 0) {
    notes.push('No shipping billed in this period despite COD collected — nothing was dispatched, or shipping landed on another statement.')
  }
  if (parsed.totalAdjustment !== 0) {
    notes.push(`Carries an adjustment of ₱${parsed.totalAdjustment.toFixed(2)} — check what J&T applied and why.`)
  }

  return parsed
}

export async function parseSoaPdf(file: File): Promise<ParsedSoaPdf> {
  return parseSoaText(await pdfToText(file), file.name)
}

/** Feeds the verification engine the figures exactly as the statement printed them. */
export function toSoaStated(p: ParsedSoaPdf): SoaStated {
  return {
    soaNumber: p.soaNumber,
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    codCollected: p.codCollected,
    commission: p.commission,
    vat: p.vat,
    codPayable: p.codPayable,
    shippingFee: p.shippingFee,
    rtsFee: p.rtsFee,
    totalDeduction: p.totalDeduction,
    adjustments: p.totalAdjustment,
    netRemittance: p.netRemittance,
  }
}
