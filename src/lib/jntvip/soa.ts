// J&T VIP — SOA (Statement of Account) import parsing.
//
// Per the brief: never assume J&T VIP's exact SOA layout. This importer only
// offers a best-effort starting guess for each column (common courier/SOA
// terminology) and always requires the user to confirm or fix the mapping
// before anything is parsed into drafts — nothing is committed on a guess.

import { findColumn, gridToRecords, toDateString, toNumber, type RawSheet } from '../import/parseFile'
import { db } from '../db'
import { guessHeaderRow, guessColumnMap } from './columnMap'
import type { JntVipSoaDraft } from './types'

export const SOA_FIELD_KEYS = [
  'trackingNumber',
  'orderReference',
  'consignee',
  'phone',
  'shipDate',
  'deliveryDate',
  'status',
  'codCollected',
  'shippingCharge',
  'codFee',
  'returnFee',
  'otherFees',
  'adjustments',
  'netSettlement',
  'settlementDate',
  'settlementReference',
] as const

export type SoaFieldKey = (typeof SOA_FIELD_KEYS)[number]

export const SOA_FIELD_LABELS: Record<SoaFieldKey, string> = {
  trackingNumber: 'Waybill / Tracking Number',
  orderReference: 'Order Reference / Merchant Order No.',
  consignee: 'Consignee / Receiver',
  phone: 'Phone',
  shipDate: 'Ship / Pickup Date',
  deliveryDate: 'Delivery / RTS Date',
  status: 'Delivery Status',
  codCollected: 'COD Collected',
  shippingCharge: 'Shipping Charge',
  codFee: 'COD Fee',
  returnFee: 'Return / RTS Fee',
  otherFees: 'Other Charges / Deductions',
  adjustments: 'Adjustments',
  netSettlement: 'Net Settlement / Remit Amount',
  settlementDate: 'Settlement Date',
  settlementReference: 'Settlement Reference',
}

const HEADER_GUESS_VARIANTS: Record<SoaFieldKey, string[]> = {
  trackingNumber: ['Waybill Number', 'Waybill No', 'Waybill No.', 'Tracking Number', 'Tracking No'],
  orderReference: ['Order Number', 'Order Reference', 'Merchant Order No', 'Reference Number', 'Order No'],
  consignee: ['Consignee', 'Receiver', 'Recipient', 'Recipient Name', 'Customer Name'],
  phone: ['Phone', 'Contact Number', 'Recipient Phone', 'Mobile Number'],
  shipDate: ['Ship Date', 'Pickup Date', 'Dispatch Date', 'Booking Date'],
  deliveryDate: ['Delivery Date', 'Delivery Timestamp', 'RTS Date', 'Status Date'],
  status: ['Delivery Status', 'Status', 'Shipment Status'],
  codCollected: ['COD Collected', 'COD Amount Collected', 'COD Amount', 'Actual COD'],
  shippingCharge: ['Shipping Charge', 'Shipping Fee', 'Freight Charge', 'Delivery Fee'],
  codFee: ['COD Fee', 'COD Service Fee', 'COD Handling Fee'],
  returnFee: ['Return Fee', 'RTS Fee', 'Return Charge'],
  otherFees: ['Other Charges', 'Other Fees', 'Deductions', 'Miscellaneous Charges'],
  adjustments: ['Adjustments', 'Adjustment Amount'],
  netSettlement: ['Net Settlement', 'Net Amount', 'Remit Amount', 'Remittance Amount', 'Amount Remitted'],
  settlementDate: ['Settlement Date', 'Remittance Date', 'Payout Date'],
  settlementReference: ['Settlement Reference', 'Remittance Reference', 'Remittance Batch', 'Payout Reference'],
}

export const SOA_COLUMN_MAPPING_META_KEY = 'jntVipSoaColumnMapping'

export function guessSoaHeaderRow(grid: unknown[][]): { headerRowIndex: number; headers: string[] } {
  return guessHeaderRow(grid)
}

export function guessSoaColumnMap(headers: string[]): Record<SoaFieldKey, string | null> {
  return guessColumnMap(headers, HEADER_GUESS_VARIANTS)
}

export async function loadSavedSoaMapping(): Promise<Record<string, string | null> | null> {
  const row = await db.meta.get(SOA_COLUMN_MAPPING_META_KEY)
  return (row?.value as Record<string, string | null> | undefined) ?? null
}

export async function saveSoaMapping(mapping: Record<SoaFieldKey, string | null>): Promise<void> {
  await db.meta.put({ key: SOA_COLUMN_MAPPING_META_KEY, value: mapping })
}

/** Waybill/order-reference keys already imported into J&T VIP shipments, for duplicate-vs-database detection. */
export async function existingJntVipShipmentKeys(): Promise<{ tracking: Set<string>; orderRefs: Set<string> }> {
  const rows = await db.jntVipShipments.toArray()
  const tracking = new Set<string>()
  const orderRefs = new Set<string>()
  for (const r of rows) {
    if (r.trackingNumber) tracking.add(r.trackingNumber.trim().toUpperCase())
    if (r.orderReference) orderRefs.add(r.orderReference.trim().toUpperCase())
  }
  return { tracking, orderRefs }
}

function normalizeStatus(raw: string | null): string {
  const u = (raw ?? '').toUpperCase()
  if (u.includes('DELIVER')) return 'Delivered'
  if (u.includes('RTS') || u.includes('RETURN')) return 'RTS'
  if (u.includes('FAIL')) return 'Failed'
  if (u.includes('CANCEL')) return 'Cancelled'
  if (u.includes('LOST')) return 'Lost'
  if (u.includes('DAMAGE')) return 'Damaged'
  if (u.includes('TRANSIT') || u.includes('PICK') || u.includes('TRANSPORT') || u.includes('PROCESS')) return 'Pending'
  return raw ? raw.trim() : 'Pending'
}

export function findColumnFromHeaders(headers: string[], variants: string[]): string | null {
  return findColumn(headers, variants)
}

export function buildJntVipSoaDrafts(
  grid: unknown[][],
  headerRowIndex: number,
  headers: string[],
  columnMap: Partial<Record<SoaFieldKey, string | null>>,
  existing: { tracking: Set<string>; orderRefs: Set<string> },
): JntVipSoaDraft[] {
  const records = gridToRecords(grid, headerRowIndex, headers)
  const seenInFile = new Set<string>()

  return records.map((r, i) => {
    const get = (key: SoaFieldKey) => {
      const col = columnMap[key]
      return col ? r[col] : null
    }
    const trackingNumber = String(get('trackingNumber') ?? '').trim() || null
    const orderReference = String(get('orderReference') ?? '').trim() || null
    const dedupeKey = (trackingNumber ?? orderReference ?? '').toUpperCase()
    const isDuplicateInFile =
      !!dedupeKey && (seenInFile.has(dedupeKey) || existing.tracking.has(dedupeKey) || existing.orderRefs.has(dedupeKey))
    if (dedupeKey) seenInFile.add(dedupeKey)

    const numOrNull = (key: SoaFieldKey) => (columnMap[key] ? toNumber(get(key)) : null)

    return {
      key: `jntvip-soa-${i}`,
      trackingNumber,
      orderReference,
      consignee: String(get('consignee') ?? '').trim() || null,
      phone: String(get('phone') ?? '').trim() || null,
      shipDate: toDateString(get('shipDate')),
      deliveryDate: toDateString(get('deliveryDate')),
      status: normalizeStatus(String(get('status') ?? '') || null),
      codCollected: numOrNull('codCollected'),
      shippingCharge: numOrNull('shippingCharge'),
      codFee: numOrNull('codFee'),
      returnFee: numOrNull('returnFee'),
      otherFees: numOrNull('otherFees'),
      adjustments: numOrNull('adjustments'),
      netSettlement: numOrNull('netSettlement'),
      settlementDate: toDateString(get('settlementDate')),
      settlementReference: String(get('settlementReference') ?? '').trim() || null,
      raw: r,
      include: !isDuplicateInFile,
      isDuplicateInFile,
      missingRequiredFields: !trackingNumber && !orderReference,
    }
  })
}

export async function parseJntVipSoaFile(sheet: RawSheet): Promise<{
  headerRowIndex: number
  headers: string[]
  columnMap: Record<SoaFieldKey, string | null>
}> {
  const { headerRowIndex, headers } = guessSoaHeaderRow(sheet.grid)
  const saved = await loadSavedSoaMapping()
  const guessed = guessSoaColumnMap(headers)
  // A saved mapping only applies where its column name still exists in this file's
  // headers — otherwise fall back to a fresh guess for that field rather than
  // pointing at a column that isn't there.
  const columnMap = { ...guessed }
  if (saved) {
    for (const key of SOA_FIELD_KEYS) {
      const savedCol = saved[key]
      if (savedCol && headers.includes(savedCol)) columnMap[key] = savedCol
    }
  }
  return { headerRowIndex, headers, columnMap }
}
