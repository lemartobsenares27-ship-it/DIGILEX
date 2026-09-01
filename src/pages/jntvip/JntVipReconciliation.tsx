import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Download } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatCurrency, formatNumber } from '../../lib/format'
import { buildReconciliationRows, type JntVipReconciliationRow } from '../../lib/jntvip/selectors'
import type { JntVipMatchConfidence, JntVipReconStatus } from '../../lib/jntvip/types'
import { exportFullReconciliation, exportMismatchesOnly, exportJntOnly, exportPosOnly, exportFinancialDiscrepancyReport } from '../../lib/jntvip/exportCsv'
import { useJntVipTables } from './hooks'
import { ReconStatusBadge, ConfidenceBadge } from './StatusBadge'
import JntVipMatchDrawer from './JntVipMatchDrawer'

const STATUS_OPTIONS: { value: JntVipReconStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'MISMATCH', label: 'Mismatch' },
  { value: 'JNT_ONLY', label: 'J&T Only' },
  { value: 'POS_ONLY', label: 'POS Only' },
  { value: 'DUPLICATE', label: 'Duplicate' },
]

const CONFIDENCE_OPTIONS: { value: JntVipMatchConfidence | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All confidence levels' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

const PAGE_SIZE = 50

export default function JntVipReconciliation() {
  const { posOrders, shipments, matches, batches } = useJntVipTables()
  const rows = useMemo(() => buildReconciliationRows(matches, posOrders, shipments, batches), [matches, posOrders, shipments, batches])

  const [searchParams] = useSearchParams()
  const initialStatus = (searchParams.get('status') as JntVipReconStatus | null) ?? 'ALL'

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<JntVipReconStatus | 'ALL'>(initialStatus)
  const [confidence, setConfidence] = useState<JntVipMatchConfidence | 'ALL'>('ALL')
  const [batchFilter, setBatchFilter] = useState('ALL')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<JntVipReconciliationRow | null>(null)

  const batchOptions = useMemo(() => {
    const labels = new Set<string>()
    for (const r of rows) if (r.soaLabel) labels.add(r.soaLabel)
    return [...labels].sort()
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (status !== 'ALL' && r.status !== status) return false
      if (confidence !== 'ALL' && r.matchConfidence !== confidence) return false
      if (batchFilter !== 'ALL' && r.soaLabel !== batchFilter) return false
      if (!q) return true
      return [r.orderId, r.trackingNumber, r.customer, r.phone].some((v) => v && v.toLowerCase().includes(q))
    })
  }, [rows, query, status, confidence, batchFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const paged = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  const unmatchedPos = useMemo(() => {
    const ids = new Set(rows.filter((r) => r.status === 'POS_ONLY' && r.posOrderId != null).map((r) => r.posOrderId!))
    return posOrders.filter((p) => p.id != null && ids.has(p.id))
  }, [rows, posOrders])

  const unmatchedShipments = useMemo(() => {
    const ids = new Set(rows.filter((r) => r.status === 'JNT_ONLY' && r.shipmentId != null).map((r) => r.shipmentId!))
    return shipments.filter((s) => s.id != null && ids.has(s.id))
  }, [rows, shipments])

  return (
    <div>
      <PageHeader
        title="Reconciliation Table"
        description="Every POS order and J&T VIP shipment, matched and compared side by side. Click a row to review, link, or annotate it."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton label="Full" onClick={() => exportFullReconciliation(filtered)} />
            <ExportButton label="Mismatches" onClick={() => exportMismatchesOnly(rows)} />
            <ExportButton label="J&T Only" onClick={() => exportJntOnly(rows)} />
            <ExportButton label="POS Only" onClick={() => exportPosOnly(rows)} />
            <ExportButton label="Discrepancy Report" onClick={() => exportFinancialDiscrepancyReport(rows)} />
          </div>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--border-hairline)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Search order ID, tracking #, customer, phone…"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as JntVipReconStatus | 'ALL')
              setPage(0)
            }}
            className="rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={confidence}
            onChange={(e) => {
              setConfidence(e.target.value as JntVipMatchConfidence | 'ALL')
              setPage(0)
            }}
            className="rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          >
            {CONFIDENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={batchFilter}
            onChange={(e) => {
              setBatchFilter(e.target.value)
              setPage(0)
            }}
            className="rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          >
            <option value="ALL">All SOA batches</option>
            {batchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs tabular" style={{ color: 'var(--text-muted)' }}>
            {formatNumber(filtered.length)} of {formatNumber(rows.length)} rows
          </span>
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                {['Status', 'Confidence', 'Order ID', 'Tracking #', 'Customer', 'POS Status', 'J&T Status', 'POS COD', 'J&T COD', 'COD Diff', 'Total Diff', 'SOA Batch'].map((h) => (
                  <th key={h} className="sticky top-0 whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)', background: 'var(--surface-card)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No rows match these filters.
                  </td>
                </tr>
              )}
              {paged.map((r) => (
                <tr
                  key={r.matchId}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-t transition-colors hover:bg-[color:var(--surface-page)]"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  <td className="px-3 py-2">
                    <ReconStatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2">
                    <ConfidenceBadge confidence={r.matchConfidence} />
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{r.orderId ?? '—'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{r.trackingNumber ?? '—'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{r.customer ?? '—'}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.posStatus ?? '—'}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.jntStatus ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular" style={{ color: 'var(--text-primary)' }}>{formatCurrency(r.posCod)}</td>
                  <td className="px-3 py-2 text-right tabular" style={{ color: 'var(--text-primary)' }}>{formatCurrency(r.jntCod)}</td>
                  <td className="px-3 py-2 text-right tabular" style={{ color: r.codDifference && Math.abs(r.codDifference) > 1 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                    {r.codDifference !== null ? formatCurrency(r.codDifference) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular font-medium" style={{ color: r.totalDifference && Math.abs(r.totalDifference) > 1 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                    {r.totalDifference !== null ? formatCurrency(r.totalDifference) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.soaLabel ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
            <span>
              Page {clampedPage + 1} of {pageCount}
            </span>
            <div className="flex gap-1">
              <button disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)} className="rounded border px-2 py-1 disabled:opacity-40" style={{ borderColor: 'var(--border-hairline)' }}>
                Prev
              </button>
              <button disabled={clampedPage >= pageCount - 1} onClick={() => setPage(clampedPage + 1)} className="rounded border px-2 py-1 disabled:opacity-40" style={{ borderColor: 'var(--border-hairline)' }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <JntVipMatchDrawer
          row={selected}
          posOrder={posOrders.find((p) => p.id === selected.posOrderId)}
          shipment={shipments.find((s) => s.id === selected.shipmentId)}
          unmatchedPos={unmatchedPos}
          unmatchedShipments={unmatchedShipments}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
      style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
    >
      <Download size={12} /> {label}
    </button>
  )
}
