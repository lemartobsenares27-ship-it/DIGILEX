import { findColumn, findHeaderRow, gridToRecords, toDateString, toNumber, type HeaderMatch, type RawSheet } from './parseFile'
import { existingTrackingNumbers } from './dedupe'
import type { CourierName, CourierTxnDraft } from './types'

// [trackingNumber, orderNumber, recipient, codAmount, status, deliveryDate, remittanceDate, remittanceReference, remittanceAmount]
const PRESETS: Record<Exclude<CourierName, 'Other'>, string[][]> = {
  'Ninja Van': [
    ['Tracking Number'],
    ['Shipper Order Number', 'Order Number'],
    ['Recipient Name', 'Recipient'],
    ['COD Amount (PHP)', 'COD Amount'],
    ['Status'],
    ['Delivery Date'],
    ['Remittance Date'],
    ['Remittance Batch #', 'Remittance Batch'],
    ['Remittance Amount'],
  ],
  'J&T Express': [
    ['Waybill Number', 'Waybill No'],
    ['Order Number'],
    ['Consignee'],
    ['COD Amount (PHP)', 'COD Amount'],
    ['Delivery Status', 'Status'],
    ['Delivery Timestamp', 'Delivery Date'],
    ['Remittance Date'],
    ['Remittance Reference'],
    ['Remittance Amount'],
  ],
  Entrego: [
    ['Tracking Number', 'Waybill Number'],
    ['Order Number'],
    ['Recipient Name', 'Consignee', 'Recipient'],
    ['COD Amount (PHP)', 'COD Amount'],
    ['Status', 'Delivery Status'],
    ['Delivery Date', 'Delivery Timestamp'],
    ['Remittance Date'],
    ['Remittance Reference'],
    ['Remittance Amount'],
  ],
  GogoXpress: [
    ['Tracking Number', 'Waybill Number'],
    ['Order Number'],
    ['Recipient Name', 'Consignee', 'Recipient'],
    ['COD Amount (PHP)', 'COD Amount'],
    ['Status', 'Delivery Status'],
    ['Delivery Date', 'Delivery Timestamp'],
    ['Remittance Date'],
    ['Remittance Reference'],
    ['Remittance Amount'],
  ],
  LBC: [
    ['Tracking Number', 'Waybill Number'],
    ['Order Number'],
    ['Recipient Name', 'Consignee', 'Recipient'],
    ['COD Amount (PHP)', 'COD Amount'],
    ['Status', 'Delivery Status'],
    ['Delivery Date', 'Delivery Timestamp'],
    ['Remittance Date'],
    ['Remittance Reference'],
    ['Remittance Amount'],
  ],
}

const FIELD_KEYS = [
  'trackingNumber',
  'orderNumber',
  'recipient',
  'codAmount',
  'status',
  'deliveryDate',
  'remittanceDate',
  'remittanceReference',
  'remittanceAmount',
] as const

export type CourierFieldKey = (typeof FIELD_KEYS)[number]

export const COURIER_FIELD_LABELS: Record<CourierFieldKey, string> = {
  trackingNumber: 'Tracking Number',
  orderNumber: 'Order Number',
  recipient: 'Recipient',
  codAmount: 'COD Amount',
  status: 'Delivery Status',
  deliveryDate: 'Delivery Date',
  remittanceDate: 'Remittance Date',
  remittanceReference: 'Remittance Reference',
  remittanceAmount: 'Remittance Amount',
}

export function normalizeStatus(raw: string | null): string {
  const u = (raw ?? '').toUpperCase()
  if (u.includes('DELIVER')) return 'Delivered'
  if (u.includes('RETURN') || u.includes('RTS')) return 'RTS'
  if (u.includes('FAIL')) return 'Failed'
  if (u.includes('TRANSIT') || u.includes('PICK') || u.includes('TRANSPORT')) return 'Pending'
  return raw ? raw.trim() : 'Pending'
}

/** Locates the header row for a known courier preset. Throws if no confident match. */
export function findCourierHeaderRow(grid: unknown[][], courier: Exclude<CourierName, 'Other'>): HeaderMatch {
  return findHeaderRow(grid, PRESETS[courier])
}

/** Loosest possible header-row guess for "Other" couriers, before the user maps columns manually. */
export function findAnyHeaderRow(grid: unknown[][]): HeaderMatch {
  for (let r = 0; r < Math.min(20, grid.length); r++) {
    const row = grid[r] ?? []
    const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '')
    if (nonEmpty.length >= 3) {
      return { headerRowIndex: r, headers: row.map((c) => String(c ?? '').trim()) }
    }
  }
  return { headerRowIndex: 0, headers: (grid[0] ?? []).map((c) => String(c ?? '').trim()) }
}

export function presetColumnMap(headers: string[], courier: Exclude<CourierName, 'Other'>): Record<CourierFieldKey, string | null> {
  const variants = PRESETS[courier]
  return Object.fromEntries(FIELD_KEYS.map((k, i) => [k, findColumn(headers, variants[i])])) as Record<
    CourierFieldKey,
    string | null
  >
}

export function buildCourierDrafts(
  grid: unknown[][],
  headerRowIndex: number,
  headers: string[],
  courier: CourierName,
  columnMap: Partial<Record<CourierFieldKey, string | null>>,
  existingTracking: Map<string, number>,
): CourierTxnDraft[] {
  const records = gridToRecords(grid, headerRowIndex, headers)

  return records.map((r, i) => {
    const get = (key: CourierFieldKey) => {
      const col = columnMap[key]
      return col ? r[col] : null
    }
    const trackingNumber = String(get('trackingNumber') ?? '').trim() || null
    const matchedOrderId = trackingNumber ? existingTracking.get(trackingNumber.toUpperCase()) ?? null : null
    return {
      key: `courier-${i}`,
      courier,
      trackingNumber,
      orderNumber: String(get('orderNumber') ?? '').trim() || null,
      recipient: String(get('recipient') ?? '').trim() || null,
      codAmount: toNumber(get('codAmount')),
      status: normalizeStatus(String(get('status') ?? '') || null),
      deliveryDate: toDateString(get('deliveryDate')),
      remittanceDate: toDateString(get('remittanceDate')),
      remittanceReference: String(get('remittanceReference') ?? '').trim() || null,
      remittanceAmount: get('remittanceAmount') ? toNumber(get('remittanceAmount')) : null,
      include: true,
      matchedOrderId,
    }
  })
}

export async function parseCourierFile(sheet: RawSheet, courier: Exclude<CourierName, 'Other'>): Promise<CourierTxnDraft[]> {
  const { headerRowIndex, headers } = findCourierHeaderRow(sheet.grid, courier)
  const columnMap = presetColumnMap(headers, courier)
  const existingTracking = await existingTrackingNumbers()
  return buildCourierDrafts(sheet.grid, headerRowIndex, headers, courier, columnMap, existingTracking)
}

export { FIELD_KEYS as COURIER_FIELD_KEYS }
