// J&T VIP — export helpers (spec section 20). Each export is a single-sheet
// .xlsx built with the same SheetJS library the rest of the app already uses.

import * as XLSX from 'xlsx'
import type { JntVipReconciliationRow } from './selectors'
import type { JntVipAuditLogRow } from './types'

function downloadSheet(rows: object[], sheetName: string, fileBaseName: string) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName.slice(0, 31))
  XLSX.writeFile(wb, `${fileBaseName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function flattenRow(r: JntVipReconciliationRow) {
  return {
    Status: r.status,
    'Match Confidence': r.matchConfidence ?? '',
    'Match Method': r.matchMethod,
    'POS Order ID': r.orderId ?? '',
    'J&T Tracking Number': r.trackingNumber ?? '',
    Customer: r.customer ?? '',
    Phone: r.phone ?? '',
    Product: r.productName ?? '',
    'Order Date': r.orderDate ?? '',
    'Ship Date': r.shipDate ?? '',
    'Delivery Date': r.deliveryDate ?? '',
    'POS Status': r.posStatus ?? '',
    'J&T Status': r.jntStatus ?? '',
    'POS COD': r.posCod ?? '',
    'J&T COD': r.jntCod ?? '',
    'COD Difference': r.codDifference ?? '',
    'POS Shipping': r.posShipping ?? '',
    'J&T Shipping': r.jntShipping ?? '',
    'Shipping Difference': r.shippingDifference ?? '',
    'Other J&T Fees': r.otherJntFees ?? '',
    'Total POS Expected': r.totalPosExpected ?? '',
    'Total J&T Amount': r.totalJntAmount ?? '',
    'Total Difference': r.totalDifference ?? '',
    'SOA Batch': r.soaLabel ?? '',
    Discrepancies: r.discrepancySummary,
    'Manual Status': r.manualStatus,
    Notes: r.notes ?? '',
    'Reviewed By': r.reviewedBy ?? '',
    'Review Date': r.reviewDate ?? '',
  }
}

export function exportFullReconciliation(rows: JntVipReconciliationRow[]) {
  downloadSheet(rows.map(flattenRow), 'J&T VIP Reconciliation', 'JntVip_Full_Reconciliation')
}

export function exportMismatchesOnly(rows: JntVipReconciliationRow[]) {
  downloadSheet(rows.filter((r) => r.status === 'MISMATCH').map(flattenRow), 'Mismatches', 'JntVip_Mismatches')
}

export function exportJntOnly(rows: JntVipReconciliationRow[]) {
  downloadSheet(rows.filter((r) => r.status === 'JNT_ONLY').map(flattenRow), 'J&T Only', 'JntVip_JntOnly')
}

export function exportPosOnly(rows: JntVipReconciliationRow[]) {
  downloadSheet(rows.filter((r) => r.status === 'POS_ONLY').map(flattenRow), 'POS Only', 'JntVip_PosOnly')
}

export function exportFinancialDiscrepancyReport(rows: JntVipReconciliationRow[]) {
  const withIssues = rows.filter((r) => r.discrepancyTypes.length > 0)
  downloadSheet(withIssues.map(flattenRow), 'Discrepancy Report', 'JntVip_Discrepancy_Report')
}

export function exportAuditLog(entries: JntVipAuditLogRow[]) {
  downloadSheet(
    entries.map((e) => ({
      Timestamp: e.timestamp,
      'Match ID': e.matchId ?? '',
      Action: e.action,
      'Reviewed By': e.reviewedBy ?? '',
      Note: e.note ?? '',
      'Previous Value': JSON.stringify(e.previousValue ?? null),
      'New Value': JSON.stringify(e.newValue ?? null),
    })),
    'Audit Log',
    'JntVip_Audit_Log',
  )
}
