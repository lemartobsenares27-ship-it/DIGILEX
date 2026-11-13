// Recording what came back, and what did not.
//
// Two writes, both logged. Nothing here changes a parcel, a statement or a
// profit figure: the courier export stays exactly as imported, and these rows
// sit beside it saying what happened after the courier's part ended. Correcting
// a mistake overwrites the row for that waybill and leaves the previous value
// in the audit log, so a confirmation entered against the wrong parcel can be
// traced rather than vanishing.

import { jntVipDb } from './db'
import type { JntVipRtsHomecomingRow } from './types'

async function log(
  action: string,
  awb: string,
  previousValue: unknown,
  newValue: unknown,
  recordedBy: string,
  note: string | null,
) {
  await jntVipDb.auditLog.add({
    timestamp: new Date().toISOString(),
    // These rows hang off a waybill, not a POS/shipment match, so there is no
    // match to point at. The waybill is in the action text instead.
    matchId: null,
    action: `${action} ${awb}`,
    previousValue,
    newValue,
    reviewedBy: recordedBy || null,
    note,
  })
}

/**
 * Record a returned parcel as arrived, or as established missing.
 *
 * `settledOn` is the day it arrived or the day it was written off — not today,
 * unless they are the same day. Boxes are usually logged after the fact.
 */
export async function recordHomecoming(
  awb: string,
  status: 'RECEIVED' | 'MISSING',
  settledOn: string,
  recordedBy: string,
  note?: string,
): Promise<void> {
  if (!awb) throw new Error('A waybill is required.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(settledOn)) throw new Error('A date is required, as YYYY-MM-DD.')
  if (!recordedBy.trim()) throw new Error('Please put your name to this, so the record says who checked.')

  const existing = await jntVipDb.rtsHomecoming.where('awb').equals(awb).first()
  const row: JntVipRtsHomecomingRow = {
    ...(existing?.id ? { id: existing.id } : {}),
    awb,
    status,
    settledOn,
    recordedBy: recordedBy.trim(),
    note: note?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  }
  await jntVipDb.rtsHomecoming.put(row)
  await log(existing ? 'RTS homecoming corrected' : 'RTS homecoming recorded', awb, existing ?? null, row, recordedBy, note?.trim() || null)
}

/**
 * Undo a record, putting the waybill back to unconfirmed.
 *
 * Deliberately available: the alternative is a wrong confirmation that can only
 * be overwritten with another wrong state. The previous value goes to the audit
 * log, so this removes the claim without erasing that it was made.
 */
export async function clearHomecoming(awb: string, recordedBy: string): Promise<void> {
  const existing = await jntVipDb.rtsHomecoming.where('awb').equals(awb).first()
  if (!existing) return
  await jntVipDb.rtsHomecoming.delete(existing.id as number)
  await log('RTS homecoming cleared', awb, existing, null, recordedBy, null)
}

/**
 * Confirm a batch of waybills as arrived on one day.
 *
 * Returns come back in sacks, not one at a time, so confirming 60 parcels
 * one click at a time is the kind of work nobody does — and a worklist nobody
 * keeps is worse than none, because it looks maintained. Every waybill passed
 * is written and logged individually; this only saves the typing.
 *
 * Waybills that already carry a record are left ALONE rather than overwritten.
 * A bulk action that silently restates existing confirmations is exactly how a
 * careful record gets quietly wrecked, so the count of what it skipped comes
 * back for the caller to show.
 */
export async function recordArrivals(
  awbs: string[],
  settledOn: string,
  recordedBy: string,
  note?: string,
): Promise<{ written: number; skipped: string[] }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(settledOn)) throw new Error('A date is required, as YYYY-MM-DD.')
  if (!recordedBy.trim()) throw new Error('Please put your name to this, so the record says who checked.')

  const skipped: string[] = []
  let written = 0
  for (const awb of awbs) {
    const existing = await jntVipDb.rtsHomecoming.where('awb').equals(awb).first()
    if (existing) {
      skipped.push(awb)
      continue
    }
    await recordHomecoming(awb, 'RECEIVED', settledOn, recordedBy, note)
    written += 1
  }
  return { written, skipped }
}
