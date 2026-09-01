// J&T VIP — manual review actions. Every action is logged to jntVipAuditLog
// with a before/after snapshot, per spec section 16-17. There is no
// server-side auth in this app (it's a single-user, browser-only tool), so
// "reviewedBy" is a free-text name the reviewer types once and it's
// remembered for next time — see getReviewerName/setReviewerName.

import { jntVipDb } from './db'
import { runJntVipReconciliation } from './reconcile'
import type { JntVipManualStatus, JntVipMatchRow } from './types'

const REVIEWER_NAME_META_KEY = 'jntVipReviewerName'

export async function getReviewerName(): Promise<string> {
  const row = await jntVipDb.meta.get(REVIEWER_NAME_META_KEY)
  return (row?.value as string | undefined) ?? ''
}

export async function setReviewerName(name: string): Promise<void> {
  await jntVipDb.meta.put({ key: REVIEWER_NAME_META_KEY, value: name })
}

async function logAction(matchId: number, action: string, previousValue: unknown, newValue: unknown, reviewedBy: string, note: string | null) {
  await jntVipDb.auditLog.add({
    timestamp: new Date().toISOString(),
    matchId,
    action,
    previousValue,
    newValue,
    reviewedBy: reviewedBy || null,
    note,
  })
}

async function setManualStatus(matchId: number, manualStatus: JntVipManualStatus, action: string, reviewedBy: string, note: string | null) {
  const existing = await jntVipDb.matches.get(matchId)
  if (!existing) throw new Error('Match not found.')
  const previousValue = { manualStatus: existing.manualStatus, status: existing.status }
  const reviewDate = new Date().toISOString()
  await jntVipDb.matches.update(matchId, { manualStatus, reviewedBy: reviewedBy || existing.reviewedBy, reviewDate, notes: note ?? existing.notes })
  await runJntVipReconciliation()
  const after = await jntVipDb.matches.get(matchId)
  await logAction(matchId, action, previousValue, { manualStatus, status: after?.status }, reviewedBy, note)
}

export async function confirmMatch(matchId: number, reviewedBy: string, note: string | null = null): Promise<void> {
  await setManualStatus(matchId, 'confirmed', 'Confirmed Match', reviewedBy, note)
}

export async function rejectMatch(matchId: number, reviewedBy: string, note: string | null = null): Promise<void> {
  await setManualStatus(matchId, 'rejected', 'Rejected Match', reviewedBy, note)
}

export async function markDuplicate(matchId: number, reviewedBy: string, note: string | null = null): Promise<void> {
  await setManualStatus(matchId, 'duplicate', 'Marked as Duplicate', reviewedBy, note)
}

export async function markExpectedDifference(matchId: number, reviewedBy: string, note: string | null = null): Promise<void> {
  await setManualStatus(matchId, 'expected-difference', 'Marked as Expected Difference', reviewedBy, note)
}

export async function ignoreMatch(matchId: number, reviewedBy: string, note: string | null = null): Promise<void> {
  await setManualStatus(matchId, 'ignored', 'Ignored', reviewedBy, note)
}

export async function reopenMatch(matchId: number, reviewedBy: string): Promise<void> {
  await setManualStatus(matchId, null, 'Reopened', reviewedBy, null)
}

export async function addNote(matchId: number, note: string, reviewedBy: string): Promise<void> {
  const existing = await jntVipDb.matches.get(matchId)
  if (!existing) throw new Error('Match not found.')
  const previousValue = { notes: existing.notes }
  await jntVipDb.matches.update(matchId, { notes: note, reviewedBy: reviewedBy || existing.reviewedBy, reviewDate: new Date().toISOString() })
  await logAction(matchId, 'Added Note', previousValue, { notes: note }, reviewedBy, note)
}

/** Manually pairs an unmatched POS order with an unmatched shipment (or vice versa).
 *  Creates a pinned 'manual' match that survives future re-reconciliation runs
 *  (see reconcile.ts's pinnedPairs handling) — the two prior POS_ONLY/JNT_ONLY
 *  rows are cleaned up automatically by the reconciliation run this triggers. */
export async function linkManually(
  posOrderId: number,
  shipmentId: number,
  reviewedBy: string,
  note: string | null = null,
): Promise<void> {
  const shipment = await jntVipDb.shipments.get(shipmentId)
  if (!shipment) throw new Error('Shipment not found.')

  const draft: JntVipMatchRow = {
    posOrderId,
    shipmentId,
    soaBatchId: shipment.batchId,
    matchMethod: 'manual',
    matchConfidence: 'HIGH',
    status: 'MATCHED',
    codDifference: null,
    shippingDifference: null,
    totalPosExpected: null,
    totalJntAmount: null,
    totalDifference: null,
    statusMismatch: false,
    discrepancyTypes: [],
    manualStatus: 'confirmed',
    reviewedBy: reviewedBy || null,
    reviewDate: new Date().toISOString(),
    notes: note,
  }
  const matchId = await jntVipDb.matches.add(draft)
  await runJntVipReconciliation()
  await logAction(matchId, 'Linked Manually', null, { posOrderId, shipmentId }, reviewedBy, note)
}
