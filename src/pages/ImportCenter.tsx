import { useState } from 'react'
import { Landmark, Megaphone, Truck, ShoppingCart, PackagePlus, RotateCcw, Download } from 'lucide-react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Toast from '../components/import/Toast'
import { formatDateTime, formatNumber } from '../lib/format'
import { undoImportBatch } from '../lib/import/post'
import type { ImportKind } from '../lib/import/types'
import BankSOAWizard from './import/BankSOAWizard'
import FacebookAdsWizard from './import/FacebookAdsWizard'
import CourierWizard from './import/CourierWizard'
import PancakePOSWizard from './import/PancakePOSWizard'
import PurchaseOrderWizard from './import/PurchaseOrderWizard'

const IMPORT_TYPES: { kind: ImportKind; label: string; icon: typeof Landmark; hint: string; accent: string }[] = [
  { kind: 'bank-soa', label: 'Bank SOA', icon: Landmark, hint: 'UnionBank Corporate / Purchaser Fund statement', accent: 'var(--series-blue)' },
  { kind: 'facebook-ads', label: 'FB Ads Manager', icon: Megaphone, hint: 'Ads Manager performance export', accent: 'var(--series-violet)' },
  { kind: 'courier', label: 'Courier Remittance', icon: Truck, hint: 'Ninja Van, J&T, Entrego, GogoXpress, LBC', accent: 'var(--series-orange)' },
  { kind: 'pancake-pos', label: 'Pancake POS', icon: ShoppingCart, hint: 'Sales / order export', accent: 'var(--series-aqua)' },
  { kind: 'purchase-order', label: 'Purchase Orders', icon: PackagePlus, hint: 'Inventory receipts from any supplier', accent: 'var(--series-yellow)' },
]

const TYPE_LABEL: Record<ImportKind, string> = {
  'bank-soa': 'Bank SOA',
  'facebook-ads': 'Facebook Ads Manager',
  courier: 'Courier Remittance',
  'pancake-pos': 'Pancake POS',
  'purchase-order': 'Purchase Order',
}

export default function ImportCenter() {
  const [kind, setKind] = useState<ImportKind | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const batches = useLiveTable(db.importBatches)

  function handleDone(message: string) {
    setToast(message)
    setKind(null)
  }

  async function handleUndo(batchId: number) {
    if (!window.confirm('This voids every record posted by this import. Continue?')) return
    await undoImportBatch(batchId)
    setToast('Import reversed — all posted records were removed or restored.')
  }

  if (kind === 'bank-soa') return <BankSOAWizard onBack={() => setKind(null)} onDone={handleDone} />
  if (kind === 'facebook-ads') return <FacebookAdsWizard onBack={() => setKind(null)} onDone={handleDone} />
  if (kind === 'courier') return <CourierWizard onBack={() => setKind(null)} onDone={handleDone} />
  if (kind === 'pancake-pos') return <PancakePOSWizard onBack={() => setKind(null)} onDone={handleDone} />
  if (kind === 'purchase-order') return <PurchaseOrderWizard onBack={() => setKind(null)} onDone={handleDone} />

  const sortedBatches = [...batches].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())

  return (
    <div>
      <PageHeader
        title="Import Center"
        description="Upload files from your real business sources — bank, Facebook Ads, couriers, POS, suppliers — and they're auto-parsed, categorized, and posted straight into your dashboard. No manual re-entry."
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {IMPORT_TYPES.map(({ kind: k, label, icon: Icon, hint, accent }) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:border-[color:var(--series-blue)]"
            style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
            >
              <Icon size={20} />
            </span>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {label}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {hint}
              </div>
            </div>
          </button>
        ))}
      </div>

      <Card title="Import History" description="Every import is logged for audit. Reversing an import voids everything it posted.">
        {sortedBatches.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No imports yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['Date', 'Type', 'File', 'Records', 'Status', 'Summary', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedBatches.map((b) => (
                  <tr key={b.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="whitespace-nowrap px-3 py-2 tabular text-xs" style={{ color: 'var(--text-primary)' }}>
                      {formatDateTime(b.importedAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                      {TYPE_LABEL[b.type]}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }} title={b.fileName}>
                      {b.fileName}
                    </td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>
                      {formatNumber(b.recordsImported)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge label={b.status} />
                    </td>
                    <td className="max-w-[320px] truncate px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }} title={b.summary}>
                      {b.summary}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {b.status !== 'reversed' && b.id && (
                        <button
                          onClick={() => handleUndo(b.id!)}
                          className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium"
                          style={{ borderColor: 'var(--border-hairline)', color: 'var(--status-critical)' }}
                        >
                          <RotateCcw size={12} /> Undo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Morning routine" className="mt-4">
        <ol className="flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex items-center gap-2">
            <Download size={14} /> Download yesterday's FB Ads Manager CSV → upload here → posts to Ad Spend + Expense Tracker
          </li>
          <li className="flex items-center gap-2">
            <Download size={14} /> Download courier remittance report → upload here → updates Orders Database + posts remittance
          </li>
          <li className="flex items-center gap-2">
            <Download size={14} /> Export Pancake POS orders → upload here → posts sales + reduces inventory
          </li>
          <li className="flex items-center gap-2">
            <Download size={14} /> Once a week: download UB bank SOA → upload here → reconciles bank vs ledger
          </li>
        </ol>
      </Card>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
