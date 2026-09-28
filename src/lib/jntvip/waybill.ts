// J&T VIP — the "My Waybill" export.
//
// This is the parcel-level file from vip.jtexpress.ph → Management → My Waybill
// → Export. It is the only source that carries per-parcel COD, shipping cost
// and POD time, which is what makes an SOA checkable: the SOA itself is a
// one-page summary with no parcel list.
//
// Parcels are upserted by waybill number, never appended. A parcel's status
// matures over days — In Transit → Delivering → Delivered or Returned — so a
// later export of the same AWB is a newer truth about the same parcel, not a
// second parcel. Re-importing therefore corrects statuses instead of
// double-counting them, and every change is reported back to the user.

import { parseSpreadsheetFile, findColumn, findHeaderRow, gridToRecords, toNumber, type RawSheet } from '../import/parseFile'
import { jntVipDb } from './db'
import type { JntVipParcelRow } from './types'

/** The statuses J&T's export actually emits, normalised to our own set. */
export type ParcelStatus = 'DELIVERED' | 'RETURNED' | 'FOR_RETURN' | 'DELIVERING' | 'IN_TRANSIT' | 'OTHER'

export function normaliseStatus(raw: unknown): ParcelStatus {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'delivered') return 'DELIVERED'
  if (s === 'returned') return 'RETURNED'
  if (s === 'for return') return 'FOR_RETURN'
  if (s === 'delivering') return 'DELIVERING'
  if (s === 'in transit') return 'IN_TRANSIT'
  return 'OTHER'
}

export const PARCEL_STATUS_LABEL: Record<ParcelStatus, string> = {
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
  FOR_RETURN: 'For return',
  DELIVERING: 'Delivering',
  IN_TRANSIT: 'In transit',
  OTHER: 'Other',
}

/** A parcel is settled once it can no longer change outcome. */
export function isSettled(status: ParcelStatus): boolean {
  return status === 'DELIVERED' || status === 'RETURNED'
}

const HEADER_VARIANTS = [
  ['waybill number', 'waybill no', 'awb', 'awb no'],
  ['order status', 'status'],
  ['cod', 'cod amount'],
]

/** Date-only, from either a Date cell or a "YYYY-MM-DD HH:mm:ss" string. */
function dayOf(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}`
  }
  const s = String(value).trim()
  const m = s.match(/(\d{4})[-/](\d{2})[-/](\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function stamp(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  const s = String(value).trim()
  return s || null
}

export interface ParsedWaybillFile {
  parcels: JntVipParcelRow[]
  /** Rows skipped, with the reason — never silently dropped. */
  skipped: { row: number; reason: string }[]
  duplicatesInFile: string[]
  headers: string[]
}

export function parseWaybillSheet(sheet: RawSheet): ParsedWaybillFile {
  const { headerRowIndex, headers } = findHeaderRow(sheet.grid, HEADER_VARIANTS)
  const records = gridToRecords(sheet.grid, headerRowIndex, headers)

  const col = {
    awb: findColumn(headers, ['waybill number', 'waybill no', 'awb no', 'awb']),
    status: findColumn(headers, ['order status', 'status']),
    pod: findColumn(headers, ['signingtime', 'signing time', 'pod time', 'delivery time']),
    ship: findColumn(headers, ['submission time', 'pickup time', 'shipping date', 'order date']),
    cod: findColumn(headers, ['cod', 'cod amount']),
    shippingCost: findColumn(headers, ['total shipping cost', 'shipping cost']),
    freight: findColumn(headers, ['receivable freight', 'freight']),
    weight: findColumn(headers, ['settlement weight', 'weight']),
    province: findColumn(headers, ['province']),
    city: findColumn(headers, ['city']),
    receiver: findColumn(headers, ['receiver', 'consignee']),
    rtsReason: findColumn(headers, ['rts reason', 'return reason']),
    remarks: findColumn(headers, ['remarks', 'item name']),
    creator: findColumn(headers, ['creator code', 'client code']),
  }

  if (!col.awb) throw new Error('No "Waybill Number" column found. Export from My Waybill without changing the columns.')
  if (!col.status) throw new Error('No "Order Status" column found. Export from My Waybill without changing the columns.')
  if (!col.cod) throw new Error('No "Cod" column found. Export from My Waybill without changing the columns.')

  const parcels: JntVipParcelRow[] = []
  const skipped: ParsedWaybillFile['skipped'] = []
  const seen = new Set<string>()
  const duplicatesInFile: string[] = []

  records.forEach((rec, i) => {
    const rowNo = headerRowIndex + 2 + i
    const awb = String(rec[col.awb!] ?? '').trim()
    if (!awb) {
      skipped.push({ row: rowNo, reason: 'no waybill number' })
      return
    }
    if (seen.has(awb)) {
      duplicatesInFile.push(awb)
      skipped.push({ row: rowNo, reason: `duplicate waybill ${awb} within this file` })
      return
    }
    seen.add(awb)

    parcels.push({
      awb,
      status: normaliseStatus(rec[col.status!]),
      rawStatus: String(rec[col.status!] ?? '').trim(),
      podAt: col.pod ? stamp(rec[col.pod]) : null,
      podDate: col.pod ? dayOf(rec[col.pod]) : null,
      shipAt: col.ship ? stamp(rec[col.ship]) : null,
      shipDate: col.ship ? dayOf(rec[col.ship]) : null,
      cod: col.cod ? toNumber(rec[col.cod]) : 0,
      shippingCost: col.shippingCost ? toNumber(rec[col.shippingCost]) : 0,
      freight: col.freight ? toNumber(rec[col.freight]) : 0,
      weight: col.weight ? toNumber(rec[col.weight]) : 0,
      province: col.province ? String(rec[col.province] ?? '').trim() || null : null,
      city: col.city ? String(rec[col.city] ?? '').trim() || null : null,
      receiver: col.receiver ? String(rec[col.receiver] ?? '').trim() || null : null,
      rtsReason: col.rtsReason ? String(rec[col.rtsReason] ?? '').trim() || null : null,
      remarks: col.remarks ? String(rec[col.remarks] ?? '').trim() || null : null,
      creatorCode: col.creator ? String(rec[col.creator] ?? '').trim() || null : null,
      updatedAt: new Date().toISOString(),
      raw: rec,
    })
  })

  return { parcels, skipped, duplicatesInFile, headers }
}

export async function parseWaybillFile(file: File): Promise<ParsedWaybillFile> {
  return parseWaybillSheet(await parseSpreadsheetFile(file))
}

export interface WaybillImportResult {
  added: number
  updated: number
  unchanged: number
  /** Parcels whose status moved on — the reason a re-import is worth doing. */
  statusChanges: { awb: string; from: string; to: string }[]
  skipped: { row: number; reason: string }[]
  duplicatesInFile: string[]
}

/** Upserts by waybill. A newer export is a newer truth about the same parcels. */
export async function importParcels(parsed: ParsedWaybillFile): Promise<WaybillImportResult> {
  const result: WaybillImportResult = {
    added: 0,
    updated: 0,
    unchanged: 0,
    statusChanges: [],
    skipped: parsed.skipped,
    duplicatesInFile: parsed.duplicatesInFile,
  }

  const existing = await jntVipDb.parcels.toArray()
  const byAwb = new Map(existing.map((p) => [p.awb, p]))

  for (const parcel of parsed.parcels) {
    const prior = byAwb.get(parcel.awb)
    if (!prior) {
      await jntVipDb.parcels.add(parcel)
      result.added++
      continue
    }
    const changed =
      prior.status !== parcel.status ||
      prior.podDate !== parcel.podDate ||
      prior.cod !== parcel.cod ||
      prior.shippingCost !== parcel.shippingCost
    if (!changed) {
      result.unchanged++
      continue
    }
    if (prior.status !== parcel.status) {
      result.statusChanges.push({ awb: parcel.awb, from: PARCEL_STATUS_LABEL[prior.status], to: PARCEL_STATUS_LABEL[parcel.status] })
    }
    await jntVipDb.parcels.update(prior.id!, { ...parcel, id: prior.id })
    result.updated++
  }

  return result
}
