// J&T VIP — committing import drafts to the database, and undo.

import { jntVipDb } from './db'
import { runJntVipReconciliation } from './reconcile'
import type { JntVipImportBatchRow, JntVipPosDraft, JntVipPostSummary, JntVipSoaDraft } from './types'

function minMaxDates(dates: (string | null)[]): { min: string | null; max: string | null } {
  const valid = dates.filter((d): d is string => !!d).sort()
  return { min: valid[0] ?? null, max: valid[valid.length - 1] ?? null }
}

export async function postJntVipPos(drafts: JntVipPosDraft[], fileName: string): Promise<{ batchId: number; summary: JntVipPostSummary }> {
  const included = drafts.filter((d) => d.include && !d.missingRequiredFields)
  const skipped = drafts.length - included.length
  const { min, max } = minMaxDates(included.map((d) => d.orderDate))

  const batch: JntVipImportBatchRow = {
    kind: 'pos',
    fileName,
    importedAt: new Date().toISOString(),
    periodStart: min,
    periodEnd: max,
    soaLabel: null,
    recordsImported: included.length,
    recordsSkipped: skipped,
    status: included.length === 0 ? 'failed' : skipped > 0 ? 'partial' : 'success',
    summary: `Imported ${included.length} POS order(s)${skipped > 0 ? `, skipped ${skipped} (duplicate or missing both Order ID and Tracking Number)` : ''}.`,
  }
  const batchId = await jntVipDb.importBatches.add(batch)

  await jntVipDb.posOrders.bulkAdd(
    included.map((d) => ({
      batchId,
      orderId: d.orderId,
      trackingNumber: d.trackingNumber,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      productName: d.productName,
      orderDate: d.orderDate,
      shipDate: d.shipDate,
      status: d.status,
      productAmount: d.productAmount,
      shippingFeeExpected: d.shippingFeeExpected,
      discount: d.discount,
      codAmountExpected: d.codAmountExpected,
      quantity: d.quantity,
      notes: d.notes,
      raw: d.raw,
    })),
  )

  await runJntVipReconciliation()

  const summary: JntVipPostSummary = {
    recordsPosted: included.length,
    recordsSkipped: skipped,
    messages: [batch.summary],
  }
  return { batchId, summary }
}

export async function postJntVipSoa(
  drafts: JntVipSoaDraft[],
  fileName: string,
  soaLabel: string,
  periodStart: string | null,
  periodEnd: string | null,
): Promise<{ batchId: number; summary: JntVipPostSummary }> {
  const included = drafts.filter((d) => d.include && !d.missingRequiredFields)
  const skipped = drafts.length - included.length
  const inferred = minMaxDates(included.map((d) => d.shipDate))

  const batch: JntVipImportBatchRow = {
    kind: 'soa',
    fileName,
    importedAt: new Date().toISOString(),
    periodStart: periodStart ?? inferred.min,
    periodEnd: periodEnd ?? inferred.max,
    soaLabel,
    recordsImported: included.length,
    recordsSkipped: skipped,
    status: included.length === 0 ? 'failed' : skipped > 0 ? 'partial' : 'success',
    summary: `Imported ${included.length} shipment record(s)${skipped > 0 ? `, skipped ${skipped} (duplicate or missing both Waybill and Order Reference)` : ''}.`,
  }
  const batchId = await jntVipDb.importBatches.add(batch)

  await jntVipDb.shipments.bulkAdd(
    included.map((d) => ({
      batchId,
      trackingNumber: d.trackingNumber,
      orderReference: d.orderReference,
      consignee: d.consignee,
      phone: d.phone,
      shipDate: d.shipDate,
      deliveryDate: d.deliveryDate,
      status: d.status,
      codCollected: d.codCollected,
      shippingCharge: d.shippingCharge,
      codFee: d.codFee,
      returnFee: d.returnFee,
      otherFees: d.otherFees,
      adjustments: d.adjustments,
      netSettlement: d.netSettlement,
      settlementDate: d.settlementDate,
      settlementReference: d.settlementReference,
      raw: d.raw,
    })),
  )

  await runJntVipReconciliation()

  const summary: JntVipPostSummary = {
    recordsPosted: included.length,
    recordsSkipped: skipped,
    messages: [batch.summary],
  }
  return { batchId, summary }
}

export async function undoJntVipBatch(batchId: number): Promise<void> {
  const batch = await jntVipDb.importBatches.get(batchId)
  if (!batch) return

  if (batch.kind === 'pos') {
    const ids = await jntVipDb.posOrders.where('batchId').equals(batchId).primaryKeys()
    await jntVipDb.posOrders.bulkDelete(ids)
  } else {
    const ids = await jntVipDb.shipments.where('batchId').equals(batchId).primaryKeys()
    await jntVipDb.shipments.bulkDelete(ids)
  }

  await jntVipDb.importBatches.update(batchId, { status: 'reversed', reversedAt: new Date().toISOString() })
  await runJntVipReconciliation()
}
