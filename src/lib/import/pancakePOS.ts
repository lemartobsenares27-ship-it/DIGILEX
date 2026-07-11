import { findColumn, findHeaderRow, gridToRecords, toDateString, toNumber, type RawSheet } from './parseFile'
import { findBestMatch } from './fuzzy'
import { existingOrderIds } from './dedupe'
import { db } from '../db'
import type { POSSaleDraft } from './types'

const HEADER_VARIANTS = [
  ['Order Date', 'Date'],
  ['Order ID'],
  ['Customer Name', 'Customer'],
  ['Customer Phone', 'Phone'],
  ['Product Name', 'Product'],
  ['Quantity', 'Qty'],
  ['Unit Price (PHP)', 'Unit Price'],
  ['Total Amount (PHP)', 'Total Amount'],
  ['Discount (PHP)', 'Discount'],
  ['Net Amount (PHP)', 'Net Amount'],
  ['Payment Method'],
  ['Order Status', 'Status'],
  ['Courier'],
  ['Tracking Number'],
  ['COD Fee (PHP)', 'COD Fee'],
  ['Shipping Fee (PHP)', 'Shipping Fee'],
  ['Notes'],
]

export async function parsePancakePOS(sheet: RawSheet): Promise<POSSaleDraft[]> {
  const { grid } = sheet
  const { headerRowIndex, headers } = findHeaderRow(grid, HEADER_VARIANTS)
  const records = gridToRecords(grid, headerRowIndex, headers)

  const [dateCol, orderIdCol, customerCol, phoneCol, productCol, qtyCol, unitPriceCol, totalCol, discountCol, netCol, paymentCol, statusCol, courierCol, trackingCol, codFeeCol, shippingFeeCol, notesCol] =
    HEADER_VARIANTS.map((v) => findColumn(headers, v))

  const [products, mappings, existingIds] = await Promise.all([
    db.products.toArray(),
    db.productNameMappings.toArray(),
    existingOrderIds(),
  ])
  const candidates = products
    .filter((p) => p['Product / SKU'])
    .map((p) => ({ key: p['Product / SKU']!, label: p['Product / SKU']! }))
  const mappingByRaw = new Map(mappings.map((m) => [m.rawName.toUpperCase(), m.mappedSku]))

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

    return {
      key: `pos-${i}`,
      date: dateCol ? toDateString(r[dateCol]) : null,
      orderId,
      customerName: customerCol ? String(r[customerCol] ?? '').trim() || null : null,
      customerPhone: phoneCol ? String(r[phoneCol] ?? '').trim() || null : null,
      productNameRaw,
      matchedProductSku,
      quantity: qtyCol ? toNumber(r[qtyCol]) : 1,
      unitPrice: unitPriceCol ? toNumber(r[unitPriceCol]) : 0,
      totalAmount: totalCol ? toNumber(r[totalCol]) : 0,
      discount: discountCol ? toNumber(r[discountCol]) : 0,
      netAmount: netCol ? toNumber(r[netCol]) : 0,
      paymentMethod: paymentCol ? String(r[paymentCol] ?? '').trim() || null : null,
      status,
      courier: courierCol ? String(r[courierCol] ?? '').trim() || null : null,
      trackingNumber: trackingCol ? String(r[trackingCol] ?? '').trim() || null : null,
      codFee: codFeeCol ? toNumber(r[codFeeCol]) : 0,
      shippingFee: shippingFeeCol ? toNumber(r[shippingFeeCol]) : 0,
      notes: notesCol ? String(r[notesCol] ?? '').trim() || null : null,
      include: !isDuplicate && !isCancelled,
      isDuplicate,
    }
  })
}
