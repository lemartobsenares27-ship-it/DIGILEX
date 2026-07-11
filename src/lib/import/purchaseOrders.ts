import { findColumn, findHeaderRow, gridToRecords, toDateString, toNumber, type RawSheet } from './parseFile'
import { findBestMatch } from './fuzzy'
import { db } from '../db'
import type { PODraft } from './types'

const HEADER_VARIANTS = [
  ['Product Name', 'Product', 'SKU', 'Product / SKU'],
  ['Quantity Received', 'Quantity', 'Qty'],
  ['Unit Cost (PHP)', 'Unit Cost'],
  ['Total Cost (PHP)', 'Total Cost'],
  ['Supplier Name', 'Supplier'],
  ['PO Number', 'DR Number', 'PO / DR Number'],
  ['Received Date', 'Date'],
]

export async function parsePurchaseOrders(sheet: RawSheet): Promise<PODraft[]> {
  const { grid } = sheet
  const { headerRowIndex, headers } = findHeaderRow(grid, HEADER_VARIANTS)
  const records = gridToRecords(grid, headerRowIndex, headers)

  const [productCol, qtyCol, unitCostCol, totalCostCol, supplierCol, poCol, dateCol] = HEADER_VARIANTS.map((v) =>
    findColumn(headers, v),
  )

  const products = await db.products.toArray()
  const candidates = products.filter((p) => p['Product / SKU']).map((p) => ({ key: p['Product / SKU']!, label: p['Product / SKU']! }))

  return records.map((r, i) => {
    const productNameRaw = productCol ? String(r[productCol] ?? '').trim() || null : null
    const matchedProductSku = productNameRaw ? findBestMatch(productNameRaw, candidates)?.key ?? null : null
    const quantityReceived = qtyCol ? toNumber(r[qtyCol]) : 0
    const unitCost = unitCostCol ? toNumber(r[unitCostCol]) : 0
    const totalCost = totalCostCol ? toNumber(r[totalCostCol]) : quantityReceived * unitCost

    return {
      key: `po-${i}`,
      productNameRaw,
      matchedProductSku,
      quantityReceived,
      unitCost,
      totalCost,
      supplierName: supplierCol ? String(r[supplierCol] ?? '').trim() || null : null,
      poNumber: poCol ? String(r[poCol] ?? '').trim() || null : null,
      receivedDate: dateCol ? toDateString(r[dateCol]) : null,
      include: true,
    }
  })
}
