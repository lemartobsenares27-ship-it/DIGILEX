// J&T VIP — POS import parsing.
//
// The real POS in this business is Pancake POS (confirmed from
// src/lib/import/pancakePOS.ts), so that's the default column preset here
// too. But this import is scoped to J&T VIP's own POS module/dashboard, kept
// fully separate from the NPMCM `db.orders` table, so any export the user
// hands it — Pancake or otherwise — goes through the same confirm-the-mapping
// flow as the SOA importer rather than being silently assumed.

import { jntVipDb } from './db'
import { findColumn, findHeaderRow, gridToRecords, toDateString, toNumber, type RawSheet } from '../import/parseFile'
import { guessHeaderRow } from './columnMap'
import type { JntVipPosDraft } from './types'

export const POS_FIELD_KEYS = [
  'orderId',
  'trackingNumber',
  'customerName',
  'customerPhone',
  'productName',
  'orderDate',
  'shipDate',
  'status',
  'quantity',
  'unitPrice',
  'totalAmount',
  'discount',
  'netAmount',
  'shippingFee',
  'notes',
] as const

export type PosFieldKey = (typeof POS_FIELD_KEYS)[number]

export const POS_FIELD_LABELS: Record<PosFieldKey, string> = {
  orderId: 'Order ID',
  trackingNumber: 'Tracking Number',
  customerName: 'Customer Name',
  customerPhone: 'Customer Phone',
  productName: 'Product Name',
  orderDate: 'Order Date',
  shipDate: 'Ship Date',
  status: 'Order Status',
  quantity: 'Quantity',
  unitPrice: 'Unit Price',
  totalAmount: 'Total Amount',
  discount: 'Discount',
  netAmount: 'Net Amount (COD Expected)',
  shippingFee: 'Shipping Fee (expected)',
  notes: 'Notes',
}

const PANCAKE_PRESET: Record<PosFieldKey, string[]> = {
  orderId: ['Order ID'],
  trackingNumber: ['Tracking Number'],
  customerName: ['Customer Name', 'Customer'],
  customerPhone: ['Customer Phone', 'Phone'],
  productName: ['Product Name', 'Product'],
  orderDate: ['Order Date', 'Date', 'Day created'],
  shipDate: ['Ship Date', 'Date Shipped', 'Dispatch Date', 'Day updated'],
  status: ['Order Status', 'Status'],
  quantity: ['Quantity', 'Qty'],
  unitPrice: ['Unit Price (PHP)', 'Unit Price'],
  totalAmount: ['Total Amount (PHP)', 'Total Amount', 'Total price'],
  discount: ['Discount (PHP)', 'Discount'],
  netAmount: ['Net Amount (PHP)', 'Net Amount'],
  shippingFee: ['Shipping Fee (PHP)', 'Shipping Fee'],
  notes: ['Notes'],
}

/** Best-effort header row guess biased towards the known Pancake column names. */
export function findPosHeaderRow(grid: unknown[][]): { headerRowIndex: number; headers: string[] } {
  try {
    return findHeaderRow(grid, Object.values(PANCAKE_PRESET))
  } catch {
    return guessHeaderRow(grid)
  }
}

export function presetPosColumnMap(headers: string[]): Record<PosFieldKey, string | null> {
  return Object.fromEntries(
    POS_FIELD_KEYS.map((k) => [k, findColumn(headers, PANCAKE_PRESET[k])]),
  ) as Record<PosFieldKey, string | null>
}

/** Every tracking number / order ID already imported into J&T VIP POS orders, for duplicate-vs-database detection. */
export async function existingJntVipPosKeys(): Promise<{ tracking: Set<string>; orderIds: Set<string> }> {
  const rows = await jntVipDb.posOrders.toArray()
  const tracking = new Set<string>()
  const orderIds = new Set<string>()
  for (const r of rows) {
    if (r.trackingNumber) tracking.add(r.trackingNumber.trim().toUpperCase())
    if (r.orderId) orderIds.add(r.orderId.trim().toUpperCase())
  }
  return { tracking, orderIds }
}

export function buildJntVipPosDrafts(
  grid: unknown[][],
  headerRowIndex: number,
  headers: string[],
  columnMap: Partial<Record<PosFieldKey, string | null>>,
  existing: { tracking: Set<string>; orderIds: Set<string> },
): JntVipPosDraft[] {
  const records = gridToRecords(grid, headerRowIndex, headers)
  const seenInFile = new Set<string>()

  return records.map((r, i) => {
    const get = (key: PosFieldKey) => {
      const col = columnMap[key]
      return col ? r[col] : null
    }
    const orderId = String(get('orderId') ?? '').trim() || null
    const trackingNumber = String(get('trackingNumber') ?? '').trim() || null
    const dedupeKey = (trackingNumber ?? orderId ?? '').toUpperCase()
    const isDuplicateInFile =
      !!dedupeKey && (seenInFile.has(dedupeKey) || existing.tracking.has(dedupeKey) || existing.orderIds.has(dedupeKey))
    if (dedupeKey) seenInFile.add(dedupeKey)

    const totalAmount = get('totalAmount') != null ? toNumber(get('totalAmount')) : null
    const discount = get('discount') != null ? toNumber(get('discount')) : null
    const shippingFee = get('shippingFee') != null ? toNumber(get('shippingFee')) : null
    const netAmount = get('netAmount') != null ? toNumber(get('netAmount')) : null
    // COD Expected = what the POS believes it should collect on delivery. Prefer an
    // explicit Net Amount column; otherwise derive it from total - discount + shipping
    // (only when we have at least a total to derive from — never fabricate a number).
    const codAmountExpected =
      netAmount ?? (totalAmount !== null ? Number((totalAmount - (discount ?? 0) + (shippingFee ?? 0)).toFixed(2)) : null)

    return {
      key: `jntvip-pos-${i}`,
      orderId,
      trackingNumber,
      customerName: String(get('customerName') ?? '').trim() || null,
      customerPhone: String(get('customerPhone') ?? '').trim() || null,
      productName: String(get('productName') ?? '').trim() || null,
      orderDate: toDateString(get('orderDate')),
      shipDate: toDateString(get('shipDate')),
      status: String(get('status') ?? '').trim() || null,
      productAmount: totalAmount,
      shippingFeeExpected: shippingFee,
      discount,
      codAmountExpected,
      quantity: get('quantity') != null ? toNumber(get('quantity')) : null,
      notes: String(get('notes') ?? '').trim() || null,
      raw: r,
      include: !isDuplicateInFile,
      isDuplicateInFile,
      missingRequiredFields: !orderId && !trackingNumber,
    }
  })
}

export async function parseJntVipPosFile(sheet: RawSheet): Promise<{
  headerRowIndex: number
  headers: string[]
  columnMap: Record<PosFieldKey, string | null>
  drafts: JntVipPosDraft[]
}> {
  const { headerRowIndex, headers } = findPosHeaderRow(sheet.grid)
  const columnMap = presetPosColumnMap(headers)
  const existing = await existingJntVipPosKeys()
  const drafts = buildJntVipPosDrafts(sheet.grid, headerRowIndex, headers, columnMap, existing)
  return { headerRowIndex, headers, columnMap, drafts }
}
