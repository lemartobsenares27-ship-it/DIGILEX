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
  POSReconciliationRow,
  EvidenceRow,
  FollowUpRow,
} from './types'

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
  posReconciliation!: Table<POSReconciliationRow, number>
  evidence!: Table<EvidenceRow, number>
  followUp!: Table<FollowUpRow, number>
  products!: Table<ProductRow, number>
  fixedExpenses!: Table<FixedExpenseRow, number>
  meta!: Table<KeyValueRow, string>

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
  }
}

export const db = new DigilexDB()

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
  if (seeded?.value) return

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
    loadJson<{ rows: FulfillmentVerificationRow[] }>('fulfillmentVerification'),
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
    db.posReconciliation.clear(),
    db.evidence.clear(),
    db.followUp.clear(),
    db.products.clear(),
    db.fixedExpenses.clear(),
  ])
  await db.meta.delete('seeded')
  await ensureSeeded()
}
