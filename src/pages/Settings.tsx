import { useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { db, resetAndReseed } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import { useMeta } from '../hooks/useMeta'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import DataTable, { type ColumnDef } from '../components/DataTable'
import { exportFullWorkbook } from '../lib/exportWorkbook'
import type { ProductRow, FixedExpenseRow } from '../lib/db'

interface Business {
  businessName?: string
  currency?: string
  fulfillmentPartner?: string
  reportGenerated?: string
}

interface FeeBenchmark {
  label: string
  value: unknown
  note: string | null
}

const PRODUCT_COLUMNS: ColumnDef<ProductRow>[] = [
  { key: 'Product / SKU', label: 'Product / SKU', editable: true, width: '260px' },
  { key: 'Selling Price', label: 'Selling Price', type: 'currency', editable: true, align: 'right' },
  { key: 'Base Product Cost', label: 'Base Cost', type: 'currency', editable: true, align: 'right' },
  { key: 'Markup %', label: 'Markup %', type: 'percent', editable: true, align: 'right' },
  { key: 'Total Cost of Goods', label: 'Total COGS', type: 'currency', editable: true, align: 'right' },
  { key: 'Notes', label: 'Notes', editable: true },
]

const FIXED_EXPENSE_COLUMNS: ColumnDef<FixedExpenseRow>[] = [
  { key: 'Item', label: 'Item', editable: true },
  { key: 'Monthly Amount', label: 'Monthly Amount', type: 'currency', editable: true, align: 'right' },
]

export default function SettingsPage() {
  const products = useLiveTable(db.products)
  const fixedExpenses = useLiveTable(db.fixedExpenses)
  const [business, setBusiness] = useMeta<Business>('business', {})
  const [feeBenchmarks] = useMeta<FeeBenchmark[]>('feeBenchmarks', [])
  const [resetting, setResetting] = useState(false)

  async function handleReset() {
    if (!window.confirm('This clears every edit you have made and reloads the original workbook data. Continue?')) {
      return
    }
    setResetting(true)
    await resetAndReseed()
    setResetting(false)
  }

  return (
    <div>
      <PageHeader title="Settings & Assumptions" description="Business info, product pricing, fee benchmarks, and data management." />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Business Info">
          <div className="flex flex-col gap-3 text-sm">
            {(['businessName', 'currency', 'fulfillmentPartner'] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {field === 'businessName' ? 'Business Name' : field === 'currency' ? 'Currency' : 'Fulfillment Partner'}
                </span>
                <input
                  value={business[field] ?? ''}
                  onChange={(e) => setBusiness({ ...business, [field]: e.target.value })}
                  className="rounded-lg border px-2.5 py-1.5"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                />
              </label>
            ))}
          </div>
        </Card>

        <Card title="Fee Benchmarks" description="Observed averages from Digilex SOAs — for reference only">
          <div className="flex flex-col gap-2 text-sm">
            {feeBenchmarks.map((fb) => (
              <div key={fb.label} className="flex items-center justify-between border-b py-1.5 last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{fb.label}</span>
                <span className="tabular font-medium" style={{ color: 'var(--text-primary)' }}>
                  {String(fb.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Product Settings" className="mb-4">
        <DataTable
          columns={PRODUCT_COLUMNS}
          rows={products}
          getId={(r) => r.id!}
          csvName="product-settings"
          onUpdate={(id, key, value) => db.products.update(id, { [key]: value })}
          onDelete={(id) => db.products.delete(id)}
          onAdd={() =>
            db.products.add({
              'Product / SKU': '',
              'Selling Price': 0,
              'Base Product Cost': 0,
              'Markup %': 0.15,
              'Total Cost of Goods': 0,
              Notes: null,
            })
          }
        />
      </Card>

      <Card title="Fixed Monthly Expenses" description="Rent, salary, software subscriptions, etc." className="mb-4">
        <DataTable
          columns={FIXED_EXPENSE_COLUMNS}
          rows={fixedExpenses}
          getId={(r) => r.id!}
          csvName="fixed-monthly-expenses"
          onUpdate={(id, key, value) => db.fixedExpenses.update(id, { [key]: value })}
          onDelete={(id) => db.fixedExpenses.delete(id)}
          onAdd={() => db.fixedExpenses.add({ Item: '', 'Monthly Amount': 0 })}
        />
      </Card>

      <Card title="Data Management">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => exportFullWorkbook()}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
          >
            <Download size={16} />
            Export full workbook (.xlsx)
          </button>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: 'var(--status-critical)', color: 'var(--status-critical)' }}
          >
            <RotateCcw size={16} />
            {resetting ? 'Resetting…' : 'Reset to original data'}
          </button>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Everything you edit is saved locally in this browser (IndexedDB). Export to Excel regularly to keep an
          off-browser backup.
        </p>
      </Card>
    </div>
  )
}
