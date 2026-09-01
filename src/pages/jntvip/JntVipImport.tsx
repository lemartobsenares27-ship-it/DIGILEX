import { useState } from 'react'
import { ShoppingCart, FileSpreadsheet, RotateCcw } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import Badge from '../../components/Badge'
import Toast from '../../components/import/Toast'
import { formatDateTime, formatNumber } from '../../lib/format'
import { undoJntVipBatch } from '../../lib/jntvip/post'
import { useJntVipTables } from './hooks'
import JntVipPosWizard from './import/JntVipPosWizard'
import JntVipSoaWizard from './import/JntVipSoaWizard'

type Mode = 'pos' | 'soa' | null

export default function JntVipImport() {
  const [mode, setMode] = useState<Mode>(null)
  const [toast, setToast] = useState<string | null>(null)
  const { batches } = useJntVipTables()

  function handleDone(message: string) {
    setToast(message)
    setMode(null)
  }

  async function handleUndo(batchId: number) {
    if (!window.confirm('This removes every record this import added and re-runs reconciliation. Continue?')) return
    await undoJntVipBatch(batchId)
    setToast('Import reversed — records removed and reconciliation re-run.')
  }

  if (mode === 'pos') return <JntVipPosWizard onBack={() => setMode(null)} onDone={handleDone} />
  if (mode === 'soa') return <JntVipSoaWizard onBack={() => setMode(null)} onDone={handleDone} />

  const sortedBatches = [...batches].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())

  return (
    <div>
      <PageHeader
        title="J&T VIP — Import"
        description="Upload → Preview & Validate → Import → Reconcile. Nothing is committed until you confirm, and every import can be undone."
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={() => setMode('pos')}
          className="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:border-[color:var(--series-blue)]"
          style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ color: 'var(--series-aqua)', background: 'color-mix(in srgb, var(--series-aqua) 14%, transparent)' }}>
            <ShoppingCart size={20} />
          </span>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Import POS Orders
            </div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Pancake POS export (or similar) — orders that should have shipped via J&T VIP.
            </div>
          </div>
        </button>
        <button
          onClick={() => setMode('soa')}
          className="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:border-[color:var(--series-blue)]"
          style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ color: 'var(--series-orange)', background: 'color-mix(in srgb, var(--series-orange) 14%, transparent)' }}>
            <FileSpreadsheet size={20} />
          </span>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Import J&T VIP SOA
            </div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Statement of Account from J&T VIP — CSV or Excel. Becomes its own reconciliation batch.
            </div>
          </div>
        </button>
      </div>

      <Card title="Import History" description="Every import is logged. Undoing one removes everything it added and re-runs reconciliation.">
        {sortedBatches.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No imports yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['Date', 'Type', 'Batch', 'File', 'Records', 'Status', 'Summary', ''].map((h) => (
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
                      {b.kind === 'pos' ? 'POS Orders' : 'SOA'}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{b.soaLabel ?? '—'}</td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }} title={b.fileName}>
                      {b.fileName}
                    </td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(b.recordsImported)}</td>
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
