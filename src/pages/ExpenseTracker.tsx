import { useMemo } from 'react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import DataTable, { type ColumnDef } from '../components/DataTable'
import HorizontalBarChart from '../components/charts/HorizontalBarChart'
import type { ExpenseRow } from '../lib/types'
import { formatCurrency } from '../lib/format'
import settingsSeed from '../data/settings.json'

const CATEGORY_OPTIONS = settingsSeed.dropdowns['Expense Categories'] ?? []

const COLUMNS: ColumnDef<ExpenseRow>[] = [
  { key: 'Date', label: 'Date', type: 'date', editable: true, width: '100px' },
  { key: 'Category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS, editable: true },
  { key: 'Description', label: 'Description', editable: true, width: '260px' },
  { key: 'Amount', label: 'Amount', type: 'currency', editable: true, align: 'right' },
  { key: 'Payment Method', label: 'Payment Method', editable: true },
  { key: 'Supplier', label: 'Supplier', editable: true },
  { key: 'Reference Number', label: 'Reference #', editable: true },
  { key: 'Notes', label: 'Notes', editable: true },
]

export default function ExpenseTracker() {
  const rows = useLiveTable(db.expenses)

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      const cat = r.Category ?? 'Uncategorized'
      map.set(cat, (map.get(cat) ?? 0) + (r.Amount ?? 0))
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [rows])

  const total = rows.reduce((s, r) => s + (r.Amount ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Expense Tracker"
        description="Rows from your bank statements, NPMCM's per-batch deductions, and credit-card statements. Double-click a cell to edit."
      />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Total Expenses" className="flex flex-col justify-center">
          <div className="text-3xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(total)}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            across {rows.length} recorded transactions
          </div>
        </Card>
        <Card title="Category Totals" className="lg:col-span-2">
          <HorizontalBarChart data={byCategory.slice(0, 8)} height={220} />
        </Card>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        getId={(r) => r.id!}
        searchKeys={['Description', 'Supplier', 'Category']}
        pageSize={50}
        csvName="expense-tracker"
        onUpdate={(id, key, value) => db.expenses.update(id, { [key]: value })}
        onDelete={(id) => db.expenses.delete(id)}
        onAdd={() =>
          db.expenses.add({
            Date: new Date().toISOString().slice(0, 10),
            Category: 'Miscellaneous',
            Description: '',
            Amount: 0,
            'Payment Method': 'Bank Transfer',
            Supplier: null,
            'Reference Number': null,
            Notes: null,
          })
        }
      />
    </div>
  )
}
