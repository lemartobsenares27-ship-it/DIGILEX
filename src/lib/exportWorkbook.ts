import * as XLSX from 'xlsx'
import { db } from './db'

function sheetFrom<T extends object>(rows: T[]) {
  return XLSX.utils.json_to_sheet(rows)
}

export async function exportFullWorkbook(): Promise<void> {
  const [
    income,
    expenses,
    fbAccounts,
    fbTxns,
    creditCard,
    cashFlow,
    bills,
    monthlyPL,
    bookkeeping,
    orders,
    soaReconciliation,
    soaBatches,
    fulfillmentVerification,
    unmatchedFulfillmentFees,
    posReconciliation,
    evidence,
    followUp,
    products,
    fixedExpenses,
    adPerformance,
  ] = await Promise.all([
    db.income.toArray(),
    db.expenses.toArray(),
    db.fbAccounts.toArray(),
    db.fbTxns.toArray(),
    db.creditCard.toArray(),
    db.cashFlow.toArray(),
    db.bills.toArray(),
    db.monthlyPL.toArray(),
    db.bookkeeping.toArray(),
    db.orders.toArray(),
    db.soaReconciliation.toArray(),
    db.soaBatches.toArray(),
    db.fulfillmentVerification.toArray(),
    db.unmatchedFulfillmentFees.toArray(),
    db.posReconciliation.toArray(),
    db.evidence.toArray(),
    db.followUp.toArray(),
    db.products.toArray(),
    db.fixedExpenses.toArray(),
    db.adPerformance.toArray(),
  ])

  const wb = XLSX.utils.book_new()
  const sheets: [string, object[]][] = [
    ['Income Tracker', income],
    ['Expense Tracker', expenses],
    ['FB Ad Accounts', fbAccounts],
    ['FB Ad Transactions', fbTxns],
    ['Credit Card Reconciliation', creditCard],
    ['Cash Flow', cashFlow],
    ['Bills & Reminders', bills],
    ['Monthly P&L', monthlyPL],
    ['Monthly Bookkeeping', bookkeeping],
    ['Orders Database', orders],
    ['Fulfillment SOA Reconciliation', soaReconciliation],
    ['SOA Delivered vs Fulfilled', soaBatches],
    ['Fulfillment Verification', fulfillmentVerification],
    ['Unmatched Fulfillment Fees', unmatchedFulfillmentFees],
    ['POS Order Reconciliation', posReconciliation],
    ['Evidence - Not in SOA', evidence],
    ['NPMCM Follow-Up List', followUp],
    ['Product Settings', products],
    ['Fixed Monthly Expenses', fixedExpenses],
    ['Ads Management', adPerformance],
  ]
  for (const [name, rows] of sheets) {
    XLSX.utils.book_append_sheet(wb, sheetFrom(rows), name.slice(0, 31))
  }

  XLSX.writeFile(wb, `Digilex_Financial_Control_Center_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
