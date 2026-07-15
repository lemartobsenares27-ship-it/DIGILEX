import { db } from '../db'
import type { ImportAuditLogRow, ImportBatchRow } from '../db'
import type { BankTxnDraft, CourierTxnDraft, FBAdsRowDraft, PODraft, POSSaleDraft, PostSummary } from './types'

type TableName = ImportAuditLogRow['tableName']

function getTable(name: TableName) {
  switch (name) {
    case 'income':
      return db.income
    case 'expenses':
      return db.expenses
    case 'cashFlow':
      return db.cashFlow
    case 'orders':
      return db.orders
    case 'products':
      return db.products
    case 'fbTxns':
      return db.fbTxns
  }
}

async function logInsert(batchId: number, tableName: TableName, rowId: number) {
  await db.importAuditLog.add({ batchId, tableName, action: 'insert', rowId, previousValues: null })
}

async function logUpdate(batchId: number, tableName: TableName, rowId: number, previousValues: Record<string, unknown>) {
  await db.importAuditLog.add({ batchId, tableName, action: 'update', rowId, previousValues })
}

async function createBatch(type: ImportBatchRow['type'], fileName: string): Promise<number> {
  return db.importBatches.add({
    type,
    fileName,
    importedAt: new Date().toISOString(),
    status: 'success',
    recordsImported: 0,
    recordsSkipped: 0,
    summary: '',
  })
}

async function finalizeBatch(batchId: number, summary: PostSummary) {
  await db.importBatches.update(batchId, {
    recordsImported: summary.recordsPosted,
    recordsSkipped: summary.recordsSkipped,
    status: summary.recordsPosted === 0 ? 'failed' : summary.needsReview > 0 ? 'partial' : 'success',
    summary: summary.messages.join(' '),
  })
}

// ---------------------------------------------------------------------------
// Bank SOA
// ---------------------------------------------------------------------------
export async function postBankSOA(drafts: BankTxnDraft[], fileName: string): Promise<{ batchId: number; summary: PostSummary }> {
  const batchId = await createBatch('bank-soa', fileName)
  const included = drafts.filter((d) => d.include)
  let posted = 0

  const dailyTotals = new Map<string, { income: number; expenses: number }>()

  for (const d of included) {
    if (d.credit > 0) {
      const id = await db.income.add({
        Date: d.date,
        Source: 'Bank SOA Import',
        'Order ID': d.referenceNumber,
        Product: null,
        Customer: null,
        'Selling Price': d.credit,
        Courier: null,
        'Tracking Number': null,
        'Fulfillment Company': null,
        Status: 'Confirmed',
        'Amount Received': d.credit,
        'Payout Date': d.date,
        Notes: d.description,
        Department: d.department,
      })
      await logInsert(batchId, 'income', id)
      posted++
    }
    if (d.debit > 0) {
      const id = await db.expenses.add({
        Date: d.date,
        Category: d.category,
        Description: d.description,
        Amount: d.debit,
        'Payment Method': 'Bank Transfer',
        Supplier: null,
        'Reference Number': d.referenceNumber,
        Notes: null,
        Department: d.department,
      })
      await logInsert(batchId, 'expenses', id)
      posted++
    }
    if (d.date) {
      const t = dailyTotals.get(d.date) ?? { income: 0, expenses: 0 }
      t.income += d.credit
      t.expenses += d.debit
      dailyTotals.set(d.date, t)
    }
  }

  // Roll the daily totals into Cash Flow, chaining opening/closing balances.
  const existingCashFlow = await db.cashFlow.toArray()
  const byDate = new Map(existingCashFlow.filter((r) => r.Date).map((r) => [r.Date as string, r]))
  const sortedDates = [...dailyTotals.keys()].sort()
  const allKnownDates = [...byDate.keys()].sort()

  function closingBalanceBefore(date: string): number {
    let best: string | null = null
    for (const d of allKnownDates) {
      if (d < date && (!best || d > best)) best = d
    }
    return best ? Number(byDate.get(best)?.['Closing Balance'] ?? 0) : 0
  }

  for (const date of sortedDates) {
    const totals = dailyTotals.get(date)!
    const opening = closingBalanceBefore(date)
    const net = totals.income - totals.expenses
    const closing = opening + net
    const existingRow = byDate.get(date)
    if (existingRow?.id) {
      const previous = { ...existingRow }
      await db.cashFlow.update(existingRow.id, {
        'Opening Balance': opening,
        Income: totals.income,
        Expenses: totals.expenses,
        'Net Cash Flow': net,
        'Closing Balance': closing,
      })
      await logUpdate(batchId, 'cashFlow', existingRow.id, previous)
    } else {
      const id = await db.cashFlow.add({
        Date: date,
        'Opening Balance': opening,
        Income: totals.income,
        Expenses: totals.expenses,
        'Net Cash Flow': net,
        'Closing Balance': closing,
      })
      await logInsert(batchId, 'cashFlow', id)
      byDate.set(date, { id, Date: date, 'Opening Balance': opening, Income: totals.income, Expenses: totals.expenses, 'Net Cash Flow': net, 'Closing Balance': closing })
      allKnownDates.push(date)
      allKnownDates.sort()
    }
  }

  const summary: PostSummary = {
    recordsPosted: posted,
    recordsSkipped: drafts.length - included.length,
    needsReview: 0,
    messages: [`Posted ${posted} bank transactions across ${sortedDates.length} day(s) and updated Cash Flow.`],
  }
  await finalizeBatch(batchId, summary)
  return { batchId, summary }
}

// ---------------------------------------------------------------------------
// Facebook Ads Manager
// ---------------------------------------------------------------------------
export async function postFacebookAds(
  drafts: FBAdsRowDraft[],
  fileName: string,
  granularity: 'daily' | 'per-campaign' = 'daily',
): Promise<{ batchId: number; summary: PostSummary }> {
  const batchId = await createBatch('facebook-ads', fileName)
  const included = drafts.filter((d) => d.include)

  for (const d of included) {
    const id = await db.fbTxns.add({
      Date: d.date,
      'Ad Account': d.campaign,
      'Account ID': null,
      'Card (Network + Last 4)': null,
      Amount: d.amountSpent,
      Status: 'Paid',
      'Data Source': 'Facebook Ads Manager Import',
      'On File Card Statement?': null,
      Notes: null,
      Campaign: d.campaign,
      'Ad Set': d.adSet,
      Impressions: d.impressions,
      'Link Clicks': d.linkClicks,
      CTR: d.ctr,
      CPC: d.cpc,
      CPM: d.cpm,
      Results: d.results,
      ROAS: d.roas,
      'Purchase Value': d.purchaseValue,
    })
    await logInsert(batchId, 'fbTxns', id)
  }

  const groupKey = (d: FBAdsRowDraft) => (granularity === 'daily' ? d.date ?? 'unknown' : `${d.date ?? 'unknown'}|${d.campaign ?? ''}`)
  const groups = new Map<string, { date: string | null; campaign: string | null; total: number; count: number }>()
  for (const d of included) {
    const key = groupKey(d)
    const g = groups.get(key) ?? { date: d.date, campaign: granularity === 'per-campaign' ? d.campaign : null, total: 0, count: 0 }
    g.total += d.amountSpent
    g.count += 1
    groups.set(key, g)
  }

  for (const g of groups.values()) {
    const id = await db.expenses.add({
      Date: g.date,
      Category: 'Facebook Ad Spend',
      Description: g.campaign
        ? `Facebook Ads — ${g.campaign}`
        : `Facebook Ads Manager import — ${g.count} campaign row(s)`,
      Amount: g.total,
      'Payment Method': 'Bank Transfer',
      Supplier: null,
      'Reference Number': null,
      Notes: null,
      Department: 'Sales & Marketing',
    })
    await logInsert(batchId, 'expenses', id)
  }

  const totalSpend = included.reduce((s, d) => s + d.amountSpent, 0)
  const summary: PostSummary = {
    recordsPosted: included.length,
    recordsSkipped: drafts.length - included.length,
    needsReview: 0,
    messages: [`Posted ${included.length} ad rows totaling ${totalSpend.toFixed(2)} to Facebook Ads Tracker and Expense Tracker.`],
  }
  await finalizeBatch(batchId, summary)
  return { batchId, summary }
}

// ---------------------------------------------------------------------------
// Courier remittance
// ---------------------------------------------------------------------------
export async function postCourierFile(drafts: CourierTxnDraft[], fileName: string): Promise<{ batchId: number; summary: PostSummary }> {
  const batchId = await createBatch('courier', fileName)
  const included = drafts.filter((d) => d.include)
  let updated = 0
  let needsReview = 0

  for (const d of included) {
    if (!d.matchedOrderId) {
      needsReview++
      continue
    }
    const existing = await db.orders.get(d.matchedOrderId)
    if (!existing) {
      needsReview++
      continue
    }
    const previous = { ...existing }
    const patch: Record<string, unknown> = {}
    if (d.status === 'Delivered') {
      patch.Status = 'Delivered'
      if (d.deliveryDate) patch['Delivered Date'] = d.deliveryDate
    } else if (d.status === 'RTS') {
      patch.Status = 'Confirmed RTS'
      if (d.deliveryDate) patch['RTS Date'] = d.deliveryDate
    } else if (d.status === 'Failed') {
      patch.Status = 'Cancelled'
    }
    if (d.remittanceReference) patch['Payout Batch'] = d.remittanceReference
    await db.orders.update(d.matchedOrderId, patch)
    await logUpdate(batchId, 'orders', d.matchedOrderId, previous)
    updated++
  }

  const remittanceTotal = included.reduce((s, d) => s + (d.remittanceAmount ?? 0), 0)
  if (remittanceTotal > 0) {
    const dateCounts = new Map<string, number>()
    for (const d of included) {
      if (d.remittanceDate) dateCounts.set(d.remittanceDate, (dateCounts.get(d.remittanceDate) ?? 0) + 1)
    }
    const mostCommonDate = [...dateCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const courierName = included[0]?.courier ?? 'Courier'
    const id = await db.income.add({
      Date: mostCommonDate,
      Source: `${courierName} Remittance`,
      'Order ID': null,
      Product: null,
      Customer: null,
      'Selling Price': remittanceTotal,
      Courier: courierName,
      'Tracking Number': null,
      'Fulfillment Company': courierName,
      Status: 'Confirmed',
      'Amount Received': remittanceTotal,
      'Payout Date': mostCommonDate,
      Notes: `Consolidated remittance from ${fileName}`,
      Department: 'Logistics',
    })
    await logInsert(batchId, 'income', id)
  }

  const expectedCOD = included.filter((d) => d.status === 'Delivered').reduce((s, d) => s + d.codAmount, 0)
  const diff = remittanceTotal - expectedCOD

  const summary: PostSummary = {
    recordsPosted: updated,
    recordsSkipped: drafts.length - included.length,
    needsReview,
    messages: [
      `Updated ${updated} order(s) from the courier file.`,
      needsReview > 0 ? `${needsReview} row(s) had no matching order and were skipped.` : '',
      remittanceTotal > 0
        ? `Expected COD ₱${expectedCOD.toFixed(2)} vs remitted ₱${remittanceTotal.toFixed(2)} (difference ₱${diff.toFixed(2)}).`
        : '',
    ].filter(Boolean),
  }
  await finalizeBatch(batchId, summary)
  return { batchId, summary }
}

// ---------------------------------------------------------------------------
// Pancake POS
// ---------------------------------------------------------------------------
export async function postPancakePOS(drafts: POSSaleDraft[], fileName: string): Promise<{ batchId: number; summary: PostSummary }> {
  const batchId = await createBatch('pancake-pos', fileName)
  const included = drafts.filter((d) => d.include)
  let needsReview = 0

  function mapStatus(raw: string | null): string {
    const u = (raw ?? '').toUpperCase()
    if (u.includes('RETURN')) return 'Confirmed RTS'
    if (u.includes('DELIVER')) return 'Delivered'
    return 'Pending / Unmatched'
  }

  const [products, feeBenchmarks] = await Promise.all([db.products.toArray(), db.meta.get('feeBenchmarks')])
  const productBySku = new Map(products.filter((p) => p['Product / SKU']).map((p) => [p['Product / SKU'], p]))
  const benchmarks = (feeBenchmarks?.value as { label: string; value: unknown }[] | undefined) ?? []
  const avgFulfillmentFee = Number(benchmarks.find((b) => b.label.includes('Fulfillment Fee'))?.value ?? 15)

  for (const d of included) {
    const amount = d.netAmount || d.totalAmount
    const status = mapStatus(d.status)
    const product = d.matchedProductSku ? productBySku.get(d.matchedProductSku) : undefined
    const cogs = product?.['Total Cost of Goods'] ?? 0
    const logisticsFee = d.shippingFee + avgFulfillmentFee

    const incomeId = await db.income.add({
      Date: d.date,
      Source: 'Pancake POS Sale',
      'Order ID': d.orderId,
      Product: d.productNameRaw,
      Customer: d.customerName,
      'Selling Price': amount,
      Courier: d.courier,
      'Tracking Number': d.trackingNumber,
      'Fulfillment Company': null,
      Status: status,
      'Amount Received': (d.paymentMethod ?? '').toUpperCase() === 'COD' ? null : amount,
      'Payout Date': null,
      Notes: d.notes,
      Department: 'Sales & Marketing',
    })
    await logInsert(batchId, 'income', incomeId)

    const orderId = await db.orders.add({
      'Order / Tracking #': d.trackingNumber ?? d.orderId,
      'Date Ordered (Shipped)': d.date,
      Product: d.productNameRaw,
      'Selling Price (COD)': amount,
      Customer: d.customerName,
      Phone: d.customerPhone,
      City: null,
      Province: null,
      Courier: d.courier,
      Status: status,
      'Delivered Date': status === 'Delivered' ? (d.statusDate ?? d.date) : null,
      'RTS Date': status === 'Confirmed RTS' ? (d.statusDate ?? d.date) : null,
      'Cost of Goods': cogs,
      'Logistics Fee': logisticsFee,
      'Net Order Profit': amount - cogs - logisticsFee,
      'Payout Batch': null,
      'Courier Fee (SF+Insurance)': d.shippingFee,
      'Fulfillment Fee': avgFulfillmentFee,
      'Duplicate Check': null,
      'RTS Reason': status === 'Confirmed RTS' ? d.notes : null,
    })
    await logInsert(batchId, 'orders', orderId)

    if (!d.matchedProductSku) {
      needsReview++
    } else if (product?.id) {
      const previous = { ...product }
      const nextQty = (product.quantityOnHand ?? 0) - d.quantity
      await db.products.update(product.id, { quantityOnHand: nextQty })
      await logUpdate(batchId, 'products', product.id, previous)
      // Keep the local snapshot in sync so a repeat SKU later in this same
      // batch decrements from the right running total, not the pre-import one.
      productBySku.set(d.matchedProductSku, { ...product, quantityOnHand: nextQty })
    }
  }

  const totalRevenue = included.reduce((s, d) => s + (d.netAmount || d.totalAmount), 0)
  const codCount = included.filter((d) => (d.paymentMethod ?? '').toUpperCase() === 'COD').length
  const cancelledCount = drafts.filter((d) => (d.status ?? '').toUpperCase().includes('CANCEL')).length

  const summary: PostSummary = {
    recordsPosted: included.length,
    recordsSkipped: drafts.length - included.length,
    needsReview,
    messages: [
      `Posted ${included.length} order(s) totaling ₱${totalRevenue.toFixed(2)} (${codCount} COD).`,
      cancelledCount > 0 ? `${cancelledCount} cancelled order(s) skipped.` : '',
      needsReview > 0 ? `${needsReview} row(s) had no matching product in Settings — inventory not updated for those.` : '',
    ].filter(Boolean),
  }
  await finalizeBatch(batchId, summary)
  return { batchId, summary }
}

// ---------------------------------------------------------------------------
// Purchase orders / inventory receipts
// ---------------------------------------------------------------------------
export async function postPurchaseOrders(drafts: PODraft[], fileName: string): Promise<{ batchId: number; summary: PostSummary }> {
  const batchId = await createBatch('purchase-order', fileName)
  const included = drafts.filter((d) => d.include)
  let needsReview = 0

  for (const d of included) {
    const expenseId = await db.expenses.add({
      Date: d.receivedDate,
      Category: 'Product Cost',
      Description: `Purchase: ${d.productNameRaw ?? 'Unknown product'} x${d.quantityReceived}${d.poNumber ? ` (PO ${d.poNumber})` : ''}`,
      Amount: d.totalCost,
      'Payment Method': 'Bank Transfer',
      Supplier: d.supplierName,
      'Reference Number': d.poNumber,
      Notes: null,
      Department: 'Operations',
    })
    await logInsert(batchId, 'expenses', expenseId)

    if (d.matchedProductSku) {
      const product = (await db.products.toArray()).find((p) => p['Product / SKU'] === d.matchedProductSku)
      if (product?.id) {
        const previous = { ...product }
        const nextQty = (product.quantityOnHand ?? 0) + d.quantityReceived
        await db.products.update(product.id, { quantityOnHand: nextQty })
        await logUpdate(batchId, 'products', product.id, previous)
      }
    } else {
      needsReview++
    }
  }

  const totalCost = included.reduce((s, d) => s + d.totalCost, 0)
  const summary: PostSummary = {
    recordsPosted: included.length,
    recordsSkipped: drafts.length - included.length,
    needsReview,
    messages: [
      `Posted ${included.length} purchase line(s) totaling ₱${totalCost.toFixed(2)} to Expense Tracker.`,
      needsReview > 0 ? `${needsReview} row(s) had no matching product in Settings — stock not updated for those.` : '',
    ].filter(Boolean),
  }
  await finalizeBatch(batchId, summary)
  return { batchId, summary }
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------
export async function undoImportBatch(batchId: number): Promise<void> {
  const entries = await db.importAuditLog.where('batchId').equals(batchId).toArray()
  for (const entry of entries.reverse()) {
    const table = getTable(entry.tableName)
    if (entry.action === 'insert') {
      await table.delete(entry.rowId)
    } else if (entry.action === 'update' && entry.previousValues) {
      await table.update(entry.rowId, entry.previousValues)
    }
  }
  await db.importAuditLog.where('batchId').equals(batchId).delete()
  await db.importBatches.update(batchId, { status: 'reversed', reversedAt: new Date().toISOString() })
}
