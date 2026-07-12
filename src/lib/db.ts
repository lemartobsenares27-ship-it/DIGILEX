import Dexie, { type Table } from 'dexie'
import type {
  IncomeRow,
  ExpenseRow,
  FBAccountRow,
  FBTxnRow,
  CreditCardRow,
  CashFlowRow,
  BillRow,
  MonthlyPLRow,
  BookkeepingEntry,
  OrderRow,
  SOAReconciliationRow,
  FulfillmentVerificationRow,
  UnmatchedFulfillmentFeeRow,
  POSReconciliationRow,
  EvidenceRow,
  FollowUpRow,
} from './types'
import { DEFAULT_CATEGORIZATION_RULES } from './import/defaultRules'

export interface KeyValueRow {
  key: string
  value: unknown
}

export interface ProductRow {
  id?: number
  'Product / SKU': string | null
  'Selling Price': number | null
  'Base Product Cost': number | null
  'Markup %': number | null
  'Total Cost of Goods': number | null
  Notes: string | null
  quantityOnHand?: number | null
}

export interface ImportBatchRow {
  id?: number
  type: 'bank-soa' | 'facebook-ads' | 'courier' | 'pancake-pos' | 'purchase-order'
  fileName: string
  importedAt: string
  status: 'success' | 'partial' | 'failed' | 'reversed'
  recordsImported: number
  recordsSkipped: number
  summary: string
  reversedAt?: string | null
}

export interface ImportAuditLogRow {
  id?: number
  batchId: number
  tableName: 'income' | 'expenses' | 'cashFlow' | 'orders' | 'products' | 'fbTxns'
  action: 'insert' | 'update'
  rowId: number
  previousValues: Record<string, unknown> | null
}

export interface CategorizationRuleRow {
  id?: number
  keywords: string[]
  category: string
  department: string
}

export interface CourierColumnMappingRow {
  id?: number
  courierName: string
  mapping: Record<string, string>
}

export interface ProductNameMappingRow {
  id?: number
  rawName: string
  mappedSku: string
}

export interface FixedExpenseRow {
  id?: number
  Item: string | null
  'Monthly Amount': number | null
}

export interface SoaBatchRow {
  id?: number
  'SOA Batch': string | null
  Period: string | null
  'Parcels Delivered (this window)': number | null
  'Parcels Fulfilled/Dispatched (this window)': number | null
  'Gap (Fulfilled - Delivered)': number | null
  'What the Gap Means': string | null
}

class DigilexDB extends Dexie {
  income!: Table<IncomeRow, number>
  expenses!: Table<ExpenseRow, number>
  fbAccounts!: Table<FBAccountRow, number>
  fbTxns!: Table<FBTxnRow, number>
  creditCard!: Table<CreditCardRow, number>
  cashFlow!: Table<CashFlowRow, number>
  bills!: Table<BillRow, number>
  monthlyPL!: Table<MonthlyPLRow, number>
  bookkeeping!: Table<BookkeepingEntry, number>
  orders!: Table<OrderRow, number>
  soaReconciliation!: Table<SOAReconciliationRow, number>
  soaBatches!: Table<SoaBatchRow, number>
  fulfillmentVerification!: Table<FulfillmentVerificationRow, number>
  unmatchedFulfillmentFees!: Table<UnmatchedFulfillmentFeeRow, number>
  posReconciliation!: Table<POSReconciliationRow, number>
  evidence!: Table<EvidenceRow, number>
  followUp!: Table<FollowUpRow, number>
  products!: Table<ProductRow, number>
  fixedExpenses!: Table<FixedExpenseRow, number>
  meta!: Table<KeyValueRow, string>
  importBatches!: Table<ImportBatchRow, number>
  importAuditLog!: Table<ImportAuditLogRow, number>
  categorizationRules!: Table<CategorizationRuleRow, number>
  courierColumnMappings!: Table<CourierColumnMappingRow, number>
  productNameMappings!: Table<ProductNameMappingRow, number>

  constructor() {
    super('digilex-financial-control-center')
    this.version(1).stores({
      income: '++id, Date, Status',
      expenses: '++id, Date, Category',
      fbAccounts: '++id',
      fbTxns: '++id, Date',
      creditCard: '++id',
      cashFlow: '++id, Date',
      bills: '++id, month, status',
      monthlyPL: '++id',
      bookkeeping: '++id, month, section, category',
      orders: '++id, Status',
      soaReconciliation: '++id',
      soaBatches: '++id',
      fulfillmentVerification: '++id',
      posReconciliation: '++id',
      evidence: '++id',
      followUp: '++id',
      products: '++id',
      fixedExpenses: '++id',
      meta: 'key',
    })
    this.version(2).stores({
      importBatches: '++id, type, importedAt',
      importAuditLog: '++id, batchId',
      categorizationRules: '++id',
      courierColumnMappings: '++id, courierName',
      productNameMappings: '++id, rawName',
    })
    this.version(3).stores({
      unmatchedFulfillmentFees: '++id',
    })
  }
}

export const db = new DigilexDB()

// If another tab has an older schema version open, IndexedDB blocks this
// tab's upgrade indefinitely until that connection closes. Ask the older
// tab to close itself, and surface the (otherwise silent) block here.
db.on('versionchange', () => {
  db.close()
  window.location.reload()
})
db.on('blocked', () => {
  console.warn('Digilex database upgrade is blocked by another open tab of this app.')
})

async function loadJson<T>(name: string): Promise<T> {
  const mod = (await import(`../data/${name}.json`)) as { default: T }
  return mod.default
}

let seedingPromise: Promise<void> | null = null

export function ensureSeeded(): Promise<void> {
  if (!seedingPromise) {
    seedingPromise = ensureSeededOnce().catch((err) => {
      seedingPromise = null
      throw err
    })
  }
  return seedingPromise
}

async function ensureSeededOnce(): Promise<void> {
  const seeded = await db.meta.get('seeded')
  if (seeded?.value) {
    await ensureDefaultCategorizationRules()
    await ensureUnmatchedFulfillmentFeesBackfill()
    await ensureRenamedFieldsMigration()
    await ensureMonthlyPLJuneCorrection()
    return
  }

  const [
    incomeTracker,
    expenseTracker,
    facebookAds,
    creditCardReconciliation,
    cashFlowData,
    billsReminders,
    monthlyPL,
    monthlyBookkeeping,
    ordersDatabase,
    fulfillmentSOAReconciliation,
    soaBreakdown,
    fulfillmentVerification,
    posOrderReconciliation,
    evidenceNotInSOA,
    followUpList,
    settings,
  ] = await Promise.all([
    loadJson<{ rows: IncomeRow[] }>('incomeTracker'),
    loadJson<{ rows: ExpenseRow[] }>('expenseTracker'),
    loadJson<{ accountCoverage: FBAccountRow[]; transactions: FBTxnRow[] }>('facebookAds'),
    loadJson<{ rows: CreditCardRow[] }>('creditCardReconciliation'),
    loadJson<{ rows: CashFlowRow[] }>('cashFlow'),
    loadJson<{ months: { month: string; bills: Omit<BillRow, 'month'>[] }[] }>('billsReminders'),
    loadJson<{ rows: MonthlyPLRow[] }>('monthlyPL'),
    loadJson<{
      months: {
        month: string
        income: Omit<BookkeepingEntry, 'id' | 'month' | 'section'>[]
        expenses: Omit<BookkeepingEntry, 'id' | 'month' | 'section'>[]
      }[]
    }>('monthlyBookkeeping'),
    loadJson<{ rows: OrderRow[] }>('ordersDatabase'),
    loadJson<{ rows: SOAReconciliationRow[] }>('fulfillmentSOAReconciliation'),
    loadJson<{ batchTable: SoaBatchRow[] }>('soaBreakdown'),
    loadJson<{ rows: FulfillmentVerificationRow[]; unmatchedDetail: UnmatchedFulfillmentFeeRow[] }>('fulfillmentVerification'),
    loadJson<{ rows: POSReconciliationRow[] }>('posOrderReconciliation'),
    loadJson<{ rows: EvidenceRow[] }>('evidenceNotInSOA'),
    loadJson<{ rows: FollowUpRow[] }>('followUpList'),
    loadJson<{
      products: ProductRow[]
      fixedExpenses: FixedExpenseRow[]
      business: Record<string, unknown>
      feeBenchmarks: { label: string; value: unknown; note: string | null }[]
      dropdowns: Record<string, string[]>
      tax: unknown
    }>('settings'),
  ])

  const bills: BillRow[] = billsReminders.months.flatMap((m) =>
    m.bills.map((b) => ({ ...b, month: m.month })),
  )
  const bookkeeping: BookkeepingEntry[] = monthlyBookkeeping.months.flatMap((m) => [
    ...m.income.map((e) => ({ ...e, month: m.month, section: 'INCOME' as const })),
    ...m.expenses.map((e) => ({ ...e, month: m.month, section: 'EXPENSES' as const })),
  ])

  await db.transaction(
    'rw',
    [
      db.income,
      db.expenses,
      db.fbAccounts,
      db.fbTxns,
      db.creditCard,
      db.cashFlow,
      db.bills,
      db.monthlyPL,
      db.bookkeeping,
      db.orders,
      db.soaReconciliation,
      db.soaBatches,
      db.fulfillmentVerification,
      db.unmatchedFulfillmentFees,
      db.posReconciliation,
      db.evidence,
      db.followUp,
      db.products,
      db.fixedExpenses,
      db.meta,
    ],
    async () => {
      await db.income.bulkAdd(incomeTracker.rows)
      await db.expenses.bulkAdd(expenseTracker.rows)
      await db.fbAccounts.bulkAdd(facebookAds.accountCoverage)
      await db.fbTxns.bulkAdd(facebookAds.transactions)
      await db.creditCard.bulkAdd(creditCardReconciliation.rows)
      await db.cashFlow.bulkAdd(cashFlowData.rows)
      await db.bills.bulkAdd(bills)
      await db.monthlyPL.bulkAdd(monthlyPL.rows)
      await db.bookkeeping.bulkAdd(bookkeeping)
      await db.orders.bulkAdd(ordersDatabase.rows)
      await db.soaReconciliation.bulkAdd(fulfillmentSOAReconciliation.rows)
      await db.soaBatches.bulkAdd(soaBreakdown.batchTable)
      await db.fulfillmentVerification.bulkAdd(fulfillmentVerification.rows)
      await db.unmatchedFulfillmentFees.bulkAdd(fulfillmentVerification.unmatchedDetail)
      await db.posReconciliation.bulkAdd(posOrderReconciliation.rows)
      await db.evidence.bulkAdd(evidenceNotInSOA.rows)
      await db.followUp.bulkAdd(followUpList.rows)
      await db.products.bulkAdd(settings.products)
      await db.fixedExpenses.bulkAdd(settings.fixedExpenses)
      await db.meta.put({ key: 'business', value: settings.business })
      await db.meta.put({ key: 'feeBenchmarks', value: settings.feeBenchmarks })
      await db.meta.put({ key: 'dropdowns', value: settings.dropdowns })
      await db.meta.put({ key: 'tax', value: settings.tax })
      await db.meta.put({ key: 'seeded', value: true })
    },
  )
  await ensureDefaultCategorizationRules()
}

export async function ensureDefaultCategorizationRules(): Promise<void> {
  const count = await db.categorizationRules.count()
  if (count > 0) return
  await db.categorizationRules.bulkAdd(DEFAULT_CATEGORIZATION_RULES.map((r) => ({ ...r })))
}

async function ensureUnmatchedFulfillmentFeesBackfill(): Promise<void> {
  const count = await db.unmatchedFulfillmentFees.count()
  if (count > 0) return
  const data = await loadJson<{ unmatchedDetail: UnmatchedFulfillmentFeeRow[] }>('fulfillmentVerification')
  await db.unmatchedFulfillmentFees.bulkAdd(data.unmatchedDetail)
}

// Browsers seeded before certain fields were renamed (e.g. "Digilex Status" ->
// "NPMCM Status") still have rows carrying the old key, which the current
// code no longer reads — those columns render blank even though the data is
// there. Repair rows in place (preserving every other field, including any
// user edits or imports) rather than requiring a full reset.
async function migrateTableKey<T extends { id?: number }>(table: Table<T, number>, oldKey: string, newKey: string): Promise<void> {
  const all = await table.toArray()
  const stale = all.filter((r) => Object.prototype.hasOwnProperty.call(r, oldKey))
  if (stale.length === 0) return
  await Promise.all(
    stale.map((r) => {
      const rec = r as unknown as Record<string, unknown>
      const { [oldKey]: value, ...rest } = rec
      return table.put({ ...rest, [newKey]: value } as T)
    }),
  )
}

async function ensureRenamedFieldsMigration(): Promise<void> {
  await migrateTableKey(db.fulfillmentVerification, 'Parcels Fulfilled (Digilex)', 'Parcels Fulfilled (NPMCM)')
  await migrateTableKey(db.posReconciliation, 'Digilex Status', 'NPMCM Status')
  await migrateTableKey(db.posReconciliation, 'Digilex COD Amount Paid', 'NPMCM COD Amount Paid')
  await migrateTableKey(db.evidence, 'Digilex Status', 'NPMCM Status')
  await migrateTableKey(db.evidence, 'Digilex Batch (if any)', 'NPMCM Batch (if any)')
  await migrateTableKey(db.followUp, 'Digilex Response / Notes', 'NPMCM Response / Notes')
}

// Browsers seeded before the Jun 30-Jul 6 SOA batch was folded into Orders
// Database still carry the June 2026 / Total P&L figures as they stood before
// that batch existed. Correct those specific cells in place, but only where
// the stored value still exactly matches the stale pre-batch figure — if a
// user has since typed over a cell themselves, that edit is left alone.
const MONTHLY_PL_JUNE_CORRECTIONS: Record<string, { stale: { Jun: number; Total: number }; correct: { Jun: number; Total: number } }> = {
  'Revenue (Delivered COD Sales)': { stale: { Jun: 300010, Total: 1575578 }, correct: { Jun: 307994, Total: 1583562 } },
  'Cost of Goods Sold': { stale: { Jun: 53227.75, Total: 257550.55 }, correct: { Jun: 54665.25, Total: 258988.05 } },
  'Fulfillment Cost': { stale: { Jun: 11505, Total: 56970 }, correct: { Jun: 11820, Total: 57285 } },
  'Courier Fees': { stale: { Jun: 40050.3, Total: 197669.24 }, correct: { Jun: 41185.71, Total: 198804.65 } },
  'GROSS PROFIT': { stale: { Jun: 99994.95, Total: 706972.62 }, correct: { Jun: 105091.04, Total: 712068.71 } },
  'Total Expenses (COGS+Ads+Fulfillment+Courier+OpEx)': { stale: { Jun: 219613.34, Total: 937683.36 }, correct: { Jun: 222501.25, Total: 940571.27 } },
  'NET PROFIT': { stale: { Jun: 80396.66, Total: 637894.64 }, correct: { Jun: 85492.75, Total: 642990.73 } },
  'Profit Margin %': { stale: { Jun: 0.2679799340022, Total: 0.404863891219603 }, correct: { Jun: 0.27757927102476, Total: 0.406040767585987 } },
}

async function ensureMonthlyPLJuneCorrection(): Promise<void> {
  const rows = await db.monthlyPL.toArray()
  await Promise.all(
    rows.map(async (r) => {
      const fix = MONTHLY_PL_JUNE_CORRECTIONS[r['Line Item'] ?? '']
      if (!fix || r.id == null) return
      const jun = r['Jun 2026']
      const total = r['Total']
      if (jun === fix.stale.Jun && total === fix.stale.Total) {
        await db.monthlyPL.update(r.id, { 'Jun 2026': fix.correct.Jun, Total: fix.correct.Total })
      }
    }),
  )
}

export async function resetAndReseed(): Promise<void> {
  await Promise.all([
    db.income.clear(),
    db.expenses.clear(),
    db.fbAccounts.clear(),
    db.fbTxns.clear(),
    db.creditCard.clear(),
    db.cashFlow.clear(),
    db.bills.clear(),
    db.monthlyPL.clear(),
    db.bookkeeping.clear(),
    db.orders.clear(),
    db.soaReconciliation.clear(),
    db.soaBatches.clear(),
    db.fulfillmentVerification.clear(),
    db.unmatchedFulfillmentFees.clear(),
    db.posReconciliation.clear(),
    db.evidence.clear(),
    db.followUp.clear(),
    db.products.clear(),
    db.fixedExpenses.clear(),
    db.importBatches.clear(),
    db.importAuditLog.clear(),
    db.categorizationRules.clear(),
    db.courierColumnMappings.clear(),
    db.productNameMappings.clear(),
  ])
  await db.meta.delete('seeded')
  seedingPromise = null
  await ensureSeeded()
}
