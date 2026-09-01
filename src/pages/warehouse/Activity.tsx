import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import * as XLSX from 'xlsx'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatDateTime, formatNumber } from '../../lib/format'
import { MOVEMENT_TYPE_LABEL, type MovementType } from '../../lib/warehouse/types'
import { useInventory } from './hooks'

const PAGE_SIZE = 50

export default function Activity() {
  const { movements, locations, rows, auditLog } = useInventory()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState(0)

  const productById = useMemo(() => new Map(rows.map((r) => [r.product.id!, r.product])), [rows])
  const locationById = useMemo(() => new Map(locations.filter((l) => l.id != null).map((l) => [l.id!, l])), [locations])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return movements
      .filter((m) => {
        if (typeFilter !== 'ALL' && m.type !== typeFilter) return false
        if (!q) return true
        const p = productById.get(m.productId)
        return [p?.sku, p?.name, m.reference, m.reason, m.user, m.notes].some((v) => v && String(v).toLowerCase().includes(q))
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [movements, query, typeFilter, productById])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clamped = Math.min(page, pageCount - 1)
  const paged = filtered.slice(clamped * PAGE_SIZE, clamped * PAGE_SIZE + PAGE_SIZE)

  function exportLedger() {
    const data = filtered.map((m) => {
      const p = productById.get(m.productId)
      return {
        Timestamp: m.timestamp,
        Type: MOVEMENT_TYPE_LABEL[m.type],
        SKU: p?.sku ?? '',
        Product: p?.name ?? '',
        Quantity: m.quantity,
        From: m.fromLocationId != null ? `${locationById.get(m.fromLocationId)?.name ?? ''} / ${m.fromState}` : '',
        To: m.toLocationId != null ? `${locationById.get(m.toLocationId)?.name ?? ''} / ${m.toState}` : '',
        Reference: m.reference ?? '',
        Reason: m.reason ?? '',
        User: m.user ?? '',
        Batch: m.batchNo ?? '',
        'Unit Cost': m.unitCost ?? '',
        Notes: m.notes ?? '',
      }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Movements')
    XLSX.writeFile(wb, `Warehouse_Movements_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div>
      <PageHeader
        title="Activity"
        description={`The complete movement ledger — ${formatNumber(movements.length)} movements and ${formatNumber(auditLog.length)} audit entries. Every balance in this system is the sum of these rows.`}
        actions={
          <button
            onClick={exportLedger}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            <Download size={12} /> Export ledger
          </button>
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
              placeholder="Search SKU, reference, reason, user…"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(0)
            }}
            className="rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          >
            <option value="ALL">All movement types</option>
            {(Object.keys(MOVEMENT_TYPE_LABEL) as MovementType[]).map((t) => (
              <option key={t} value={t}>
                {MOVEMENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs tabular" style={{ color: 'var(--text-muted)' }}>
            {formatNumber(filtered.length)} movements
          </span>
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                {['When', 'Type', 'Product', 'Qty', 'From', 'To', 'Reference', 'Reason', 'By'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No movements recorded yet.
                  </td>
                </tr>
              )}
              {paged.map((m) => {
                const p = productById.get(m.productId)
                return (
                  <tr key={m.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(m.timestamp)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{MOVEMENT_TYPE_LABEL[m.type]}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{p?.sku ?? '—'}</td>
                    <td className="px-3 py-2 text-xs tabular font-medium" style={{ color: 'var(--text-primary)' }}>{formatNumber(m.quantity)}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {m.fromLocationId != null ? `${locationById.get(m.fromLocationId)?.name ?? '?'} / ${m.fromState}` : 'external'}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {m.toLocationId != null ? `${locationById.get(m.toLocationId)?.name ?? '?'} / ${m.toState}` : 'external'}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.reference ?? '—'}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }} title={m.reason ?? ''}>{m.reason ?? '—'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{m.user || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
            <span>
              Page {clamped + 1} of {pageCount}
            </span>
            <div className="flex gap-1">
              <button disabled={clamped === 0} onClick={() => setPage(clamped - 1)} className="rounded border px-2 py-1 disabled:opacity-40" style={{ borderColor: 'var(--border-hairline)' }}>
                Prev
              </button>
              <button disabled={clamped >= pageCount - 1} onClick={() => setPage(clamped + 1)} className="rounded border px-2 py-1 disabled:opacity-40" style={{ borderColor: 'var(--border-hairline)' }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
