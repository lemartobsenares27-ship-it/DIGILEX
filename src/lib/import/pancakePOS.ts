import { findColumn, findHeaderRow, gridToRecords, toDateString, toNumber, type RawSheet } from './parseFile'
import { findBestMatch } from './fuzzy'
import { existingOrderIds } from './dedupe'
import { db } from '../db'
import type { POSSaleDraft } from './types'

// Real Pancake POS exports use these exact column names, in addition to a
// cleaner/generic template some users may upload instead — keep both so
// either works.
const HEADER_VARIANTS = [
  ['Order Date', 'Date', 'Day created'],
  ['Order ID'],
  ['Customer Name', 'Customer'],
  ['Customer Phone', 'Phone'],
  ['Product Name', 'Product'],
  ['Quantity', 'Qty'],
  ['Unit Price (PHP)', 'Unit Price'],
  ['Total Amount (PHP)', 'Total Amount', 'Total price'],
  ['Discount (PHP)', 'Discount'],
  ['Net Amount (PHP)', 'Net Amount'],
  ['Payment Method'],
  ['Order Status', 'Status'],
  ['Courier'],
  ['Tracking Number'],
  ['COD Fee (PHP)', 'COD Fee'],
  ['Shipping Fee (PHP)', 'Shipping Fee'],
  ['Notes'],
  ['Day updated'],
  ['Shipping status'],
]

// Real Pancake exports have no Courier column — the courier has to be
// inferred from the tracking number prefix. Only map prefixes we've actually
// confirmed against a real file; an unrecognized prefix is left null rather
// than guessed.
function inferCourierFromTracking(trackingNumber: string | null): string | null {
  if (!trackingNumber) return null
  const upper = trackingNumber.trim().toUpperCase()
  if (upper.startsWith('JT')) return 'J&T Express'
  return null
}

// 'Day created' / 'Day updated' in real Pancake exports are plain text in
// DD/MM/YYYY form (e.g. "12/07/2026" = July 12, 2026) — JS's Date parser
// would misread that as MM/DD/YYYY, so parse it explicitly before falling
// back to the generic parser for other date shapes (Excel serials, ISO, etc).
function parsePancakeDate(value: unknown): string | null {
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) {
      const [, dd, mm, yyyy] = m
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    }
  }
  return toDateString(value)
}

export async function parsePancakePOS(sheet: RawSheet): Promise<POSSaleDraft[]> {
  const { grid } = sheet
  const { headerRowIndex, headers } = findHeaderRow(grid, HEADER_VARIANTS)
  const records = gridToRecords(grid, headerRowIndex, headers)

  const [
    dateCol,
    orderIdCol,
    customerCol,
    phoneCol,
    productCol,
    qtyCol,
    unitPriceCol,
    totalCol,
    discountCol,
    netCol,
    paymentCol,
    statusCol,
    courierCol,
    trackingCol,
    codFeeCol,
    shippingFeeCol,
    notesCol,
    statusDateCol,
    shippingStatusCol,
  ] = HEADER_VARIANTS.map((v) => findColumn(headers, v))

  const [products, mappings, existingIds, feeBenchmarks] = await Promise.all([
    db.products.toArray(),
    db.productNameMappings.toArray(),
    existingOrderIds(),
    db.meta.get('feeBenchmarks'),
  ])
  const candidates = products
    .filter((p) => p['Product / SKU'])
    .map((p) => ({ key: p['Product / SKU']!, label: p['Product / SKU']! }))
  const mappingByRaw = new Map(mappings.map((m) => [m.rawName.toUpperCase(), m.mappedSku]))

  // When the file has no explicit fee columns (typical for a raw Pancake
  // export), estimate from this business's own established fee benchmarks
  // (Settings → Fee Benchmarks) rather than inventing new figures.
  const benchmarks = (feeBenchmarks?.value as { label: string; value: unknown }[] | undefined) ?? []
  const codFeeRate = Number(benchmarks.find((b) => b.label.includes('COD Fee'))?.value ?? 0.0275)
  const avgShippingFee = Number(benchmarks.find((b) => b.label.includes('Shipping (SF) Fee'))?.value ?? 47)

  return records.map((r, i) => {
    const productNameRaw = productCol ? String(r[productCol] ?? '').trim() || null : null
    let matchedProductSku: string | null = null
    if (productNameRaw) {
      matchedProductSku = mappingByRaw.get(productNameRaw.toUpperCase()) ?? findBestMatch(productNameRaw, candidates)?.key ?? null
    }
    const orderId = orderIdCol ? String(r[orderIdCol] ?? '').trim() || null : null
    const isDuplicate = !!orderId && existingIds.has(orderId.toUpperCase())
    const status = statusCol ? String(r[statusCol] ?? '').trim() || null : null
    const isCancelled = (status ?? '').toUpperCase().includes('CANCEL')
    const trackingNumber = trackingCol ? String(r[trackingCol] ?? '').trim() || null : null
    const totalAmount = totalCol ? toNumber(r[totalCol]) : 0
    // This business is COD-only end to end — if the file has no Payment
    // Method column at all, assume COD rather than treating the sale as
    // already-received revenue.
    const paymentMethod = paymentCol ? String(r[paymentCol] ?? '').trim() || null : 'COD'
    const shippingStatus = shippingStatusCol ? String(r[shippingStatusCol] ?? '').trim() || null : null

    return {
      key: `pos-${i}`,
      date: dateCol ? parsePancakeDate(r[dateCol]) : null,
      orderId,
      customerName: customerCol ? String(r[customerCol] ?? '').trim() || null : null,
      customerPhone: phoneCol ? String(r[phoneCol] ?? '').trim() || null : null,
      productNameRaw,
      matchedProductSku,
      quantity: qtyCol ? toNumber(r[qtyCol]) : 1,
      unitPrice: unitPriceCol ? toNumber(r[unitPriceCol]) : 0,
      totalAmount,
      discount: discountCol ? toNumber(r[discountCol]) : 0,
      netAmount: netCol ? toNumber(r[netCol]) : 0,
      paymentMethod,
      status,
      courier: courierCol ? String(r[courierCol] ?? '').trim() || null : inferCourierFromTracking(trackingNumber),
      trackingNumber,
      codFee: codFeeCol ? toNumber(r[codFeeCol]) : Number((totalAmount * codFeeRate).toFixed(2)),
      shippingFee: shippingFeeCol ? toNumber(r[shippingFeeCol]) : avgShippingFee,
      notes: notesCol ? String(r[notesCol] ?? '').trim() || null : shippingStatus,
      statusDate: statusDateCol ? parsePancakeDate(r[statusDateCol]) : null,
      include: !isDuplicate && !isCancelled,
      isDuplicate,
    }
  })
}
