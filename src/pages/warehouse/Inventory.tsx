import { useMemo, useState } from 'react'
import { Search, X, Download } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatCurrency, formatDateTime, formatNumber } from '../../lib/format'
import { MOVEMENT_TYPE_LABEL, type InventoryState } from '../../lib/warehouse/types'
import { useInventory, type ProductRowWithStock } from './hooks'
import { EmptyState } from './FormBits'
import * as XLSX from 'xlsx'

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  OUT_OF_STOCK: { label: 'Out of stock', color: 'var(--status-critical)' },
  LOW_STOCK: { label: 'Low stock', color: 'var(--status-warning)' },
  NORMAL: { label: 'Normal', color: 'var(--status-good)' },
  NO_THRESHOLD: { label: 'No threshold', color: 'var(--text-muted)' },
}

export default function Inventory() {
  const { rows, locations, movements, balances } = useInventory()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState<ProductRowWithStock | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (!q) return true
      return [r.product.sku, r.product.name, r.product.variant, r.product.category, r.product.supplier]
        .some((v) => v && v.toLowerCase().includes(q))
    })
  }, [rows, query, statusFilter])

  function exportInventory() {
    const data = filtered.map((r) => ({
      SKU: r.product.sku,
      Product: r.product.name,
      Variant: r.product.variant ?? '',
      Category: r.product.category ?? '',
      Available: r.stock.available,
      Reserved: r.stock.reserved,
      Sellable: r.stock.sellable,
      'In Fulfillment': r.stock.inFulfillment,
      'In Transit': r.stock.inTransit,
      'For Inspection': r.stock.forInspection,
      Damaged: r.stock.damaged,
      Defective: r.stock.defective,
      Missing: r.stock.missing,
      'Physical Total': r.stock.physical,
      Incoming: r.stock.incoming,
      'Unit Cost': r.product.unitCost ?? '',
      'Available Value': r.availableValue,
      'Reorder Point': r.product.reorderPoint ?? '',
      Target: r.product.targetStockLevel ?? '',
      'Suggested Buy': r.suggestedBuy,
      Status: STATUS_STYLE[r.status].label,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Inventory')
    XLSX.writeFile(wb, `Warehouse_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (rows.length === 0) {
    return (
      <div>
        <PageHeader title="Inventory" />
        <Card>
          <EmptyState message="No products yet. Add products, then receive stock against them." />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Every SKU with its balances broken out by state. Sellable subtracts reservations; physical counts everything you own wherever it sits."
        actions={
          <button
            onClick={exportInventory}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            <Download size={12} /> Export
          </button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--border-hairline)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SKU, product, category, supplier…"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          >
            <option value="ALL">All statuses</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
            <option value="LOW_STOCK">Low stock</option>
            <option value="NORMAL">Normal</option>
          </select>
          <span className="ml-auto text-xs tabular" style={{ color: 'var(--text-muted)' }}>
            {formatNumber(filtered.length)} of {formatNumber(rows.length)} SKUs
          </span>
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                {['SKU', 'Product', 'Sellable', 'Available', 'Reserved', 'Fulfillment', 'Transit', 'Inspection', 'Damaged', 'Missing', 'Incoming', 'Value', 'Status'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.product.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-t"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.product.sku}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                    {r.product.name}
                    {r.product.variant ? <span style={{ color: 'var(--text-muted)' }}> · {r.product.variant}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs tabular font-semibold" style={{ color: 'var(--text-primary)' }}>{formatNumber(r.stock.sellable)}</td>
                  <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>{formatNumber(r.stock.available)}</td>
                  <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(r.stock.reserved)}</td>
                  <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(r.stock.inFulfillment)}</td>
                  <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(r.stock.inTransit)}</td>
                  <td className="px-3 py-2 text-xs tabular" style={{ color: r.stock.forInspection > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>{formatNumber(r.stock.forInspection)}</td>
                  <td className="px-3 py-2 text-xs tabular" style={{ color: r.stock.damaged > 0 ? 'var(--status-critical)' : 'var(--text-muted)' }}>{formatNumber(r.stock.damaged + r.stock.defective)}</td>
                  <td className="px-3 py-2 text-xs tabular" style={{ color: r.stock.missing > 0 ? 'var(--status-critical)' : 'var(--text-muted)' }}>{formatNumber(r.stock.missing + r.stock.lost)}</td>
                  <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(r.stock.incoming)}</td>
                  <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatCurrency(r.availableValue)}</td>
                  <td className="px-3 py-2">
                    <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: STATUS_STYLE[r.status].color, background: `color-mix(in srgb, ${STATUS_STYLE[r.status].color} 14%, transparent)` }}>
                      {STATUS_STYLE[r.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <ProductDrawer
          row={selected}
          locations={locations}
          movements={movements}
          balances={balances}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function ProductDrawer({
  row,
  locations,
  movements,
  balances,
  onClose,
}: {
  row: ProductRowWithStock
  locations: ReturnType<typeof useInventory>['locations']
  movements: ReturnType<typeof useInventory>['movements']
  balances: ReturnType<typeof useInventory>['balances']
  onClose: () => void
}) {
  const pid = row.product.id!
  const history = useMemo(
    () => movements.filter((m) => m.productId === pid).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [movements, pid],
  )
  const locationById = useMemo(() => new Map(locations.filter((l) => l.id != null).map((l) => [l.id!, l])), [locations])

  const byLocation = useMemo(() => {
    const out: { name: string; state: InventoryState; qty: number }[] = []
    for (const l of locations) {
      if (l.id == null) continue
      const states = balances.get(pid)?.get(l.id)
      if (!states) continue
      for (const [state, qty] of states) {
        if (qty !== 0) out.push({ name: l.name, state, qty })
      }
    }
    return out
  }, [locations, balances, pid])

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l p-5" style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {row.product.sku}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {row.product.name}
              {row.product.variant ? ` · ${row.product.variant}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            ['Sellable', row.stock.sellable],
            ['Available', row.stock.available],
            ['Reserved', row.stock.reserved],
            ['Fulfillment', row.stock.inFulfillment],
            ['In transit', row.stock.inTransit],
            ['Inspection', row.stock.forInspection],
            ['Damaged', row.stock.damaged + row.stock.defective],
            ['Missing', row.stock.missing + row.stock.lost],
            ['Incoming', row.stock.incoming],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border p-2" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>{label}</div>
              <div className="text-base font-semibold tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(value as number)}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-xl border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Where it is
          </div>
          {byLocation.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No stock anywhere.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {byLocation.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-primary)' }}>
                    {b.name} <span style={{ color: 'var(--text-muted)' }}>/ {b.state}</span>
                  </span>
                  <span className="tabular font-medium" style={{ color: 'var(--text-primary)' }}>{formatNumber(b.qty)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Movement history — this is why the balance is what it is
          </div>
          {history.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No movements yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((m) => (
                <div key={m.id} className="border-b pb-2 text-xs last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {MOVEMENT_TYPE_LABEL[m.type]} · {formatNumber(m.quantity)}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{formatDateTime(m.timestamp)}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {m.fromLocationId != null ? `${locationById.get(m.fromLocationId)?.name ?? '?'} / ${m.fromState}` : 'external'}
                    {' → '}
                    {m.toLocationId != null ? `${locationById.get(m.toLocationId)?.name ?? '?'} / ${m.toState}` : 'external'}
                    {m.reason ? ` · ${m.reason}` : ''}
                    {m.user ? ` · ${m.user}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
