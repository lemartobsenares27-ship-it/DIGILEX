import { useState } from 'react'
import { Download, RotateCcw, Plus, Trash2 } from 'lucide-react'
import { db, resetAndReseed } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import { useMeta } from '../hooks/useMeta'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import DataTable, { type ColumnDef } from '../components/DataTable'
import { exportFullWorkbook } from '../lib/exportWorkbook'
import { applyRules } from '../lib/import/categorize'
import { DEFAULT_AD_BENCHMARKS, type AdScoringBenchmarks } from '../lib/adScoring'
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
  { key: 'quantityOnHand', label: 'Stock on Hand', type: 'number', editable: true, align: 'right' },
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

        <Card title="Fee Benchmarks" description="Observed averages from NPMCM SOAs — for reference only">
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
              quantityOnHand: 0,
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

      <AdScoringBenchmarksCard />

      <CategorizationRulesCard />

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

const AD_BENCHMARK_FIELDS: { key: keyof AdScoringBenchmarks; label: string; step: number; hint: string }[] = [
  { key: 'targetCostPerResult', label: 'Target Cost per Result (₱)', step: 1, hint: 'Your real historical CPA — everything is scored against this' },
  { key: 'winnerRatio', label: 'Winner Ratio', step: 0.05, hint: 'Cost/result at or below this × target = Winner' },
  { key: 'loserRatio', label: 'Loser Ratio', step: 0.05, hint: 'Cost/result above this × target = Loser' },
  { key: 'minResultsForVerdict', label: 'Min Results for Verdict', step: 1, hint: 'Below this, an ad stays New/Unproven regardless of cost' },
  { key: 'fatigueFrequency', label: 'Fatigue Frequency Threshold', step: 0.1, hint: 'Frequency at or above this flags Fatigue even if cost still looks fine' },
  { key: 'fatigueCtrDropPct', label: 'Fatigue CTR Drop %', step: 0.05, hint: 'CTR drop vs. last upload (as a fraction) that flags Fatigue' },
]

function AdScoringBenchmarksCard() {
  const [benchmarks, setBenchmarks] = useMeta<AdScoringBenchmarks>('adScoringBenchmarks', DEFAULT_AD_BENCHMARKS)

  return (
    <Card
      title="Ad Scoring Benchmarks"
      description="Used by Ads Management to classify every uploaded ad as Winner / Potential / Fatigue / Loser / Unproven / New"
      className="mb-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AD_BENCHMARK_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {f.label}
            </span>
            <input
              type="number"
              step={f.step}
              value={benchmarks[f.key]}
              onChange={(e) => setBenchmarks({ ...benchmarks, [f.key]: Number(e.target.value) })}
              className="rounded-lg border px-2.5 py-1.5 text-sm"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {f.hint}
            </span>
          </label>
        ))}
      </div>
    </Card>
  )
}

function CategorizationRulesCard() {
  const rules = useLiveTable(db.categorizationRules)
  const [testInput, setTestInput] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newDepartment, setNewDepartment] = useState('')

  const testResult = testInput ? applyRules(testInput, rules) : null

  async function addRule() {
    if (!newKeywords.trim() || !newCategory.trim()) return
    await db.categorizationRules.add({
      keywords: newKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      category: newCategory.trim(),
      department: newDepartment.trim() || 'Admin',
    })
    setNewKeywords('')
    setNewCategory('')
    setNewDepartment('')
  }

  return (
    <Card
      title="Categorization Rules"
      description="Keyword rules the Import Center uses to auto-categorize bank/expense transactions. Applied to every future import automatically."
      className="mb-4"
    >
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>Test a description</span>
          <input
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="e.g. FACEBK *AB12CD3 FACEBOOK.COM"
            className="w-64 rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          />
        </label>
        {testResult && (
          <div className="text-xs" style={{ color: testResult.matchedRule ? 'var(--status-good)' : 'var(--text-muted)' }}>
            → {testResult.category} / {testResult.department}
            {!testResult.matchedRule && ' (no rule matched — fallback)'}
          </div>
        )}
      </div>

      <div className="mb-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
              {['Keywords', 'Category', 'Department', ''].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <td className="px-3 py-2">
                  <input
                    defaultValue={r.keywords.join(', ')}
                    onBlur={(e) =>
                      db.categorizationRules.update(r.id!, {
                        keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                      })
                    }
                    className="w-full min-w-[200px] rounded border bg-transparent px-1.5 py-1 text-xs"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={r.category}
                    onBlur={(e) => db.categorizationRules.update(r.id!, { category: e.target.value })}
                    className="w-full min-w-[160px] rounded border bg-transparent px-1.5 py-1 text-xs"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={r.department}
                    onBlur={(e) => db.categorizationRules.update(r.id!, { department: e.target.value })}
                    className="w-full min-w-[140px] rounded border bg-transparent px-1.5 py-1 text-xs"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => db.categorizationRules.delete(r.id!)} style={{ color: 'var(--text-muted)' }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>Keywords (comma-separated)</span>
          <input
            value={newKeywords}
            onChange={(e) => setNewKeywords(e.target.value)}
            className="w-56 rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>Category</span>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-48 rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>Department</span>
          <input
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            className="w-40 rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          />
        </label>
        <button
          onClick={addRule}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
        >
          <Plus size={14} /> Add rule
        </button>
      </div>
    </Card>
  )
}
