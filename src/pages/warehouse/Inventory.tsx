import { useMemo, useState } from 'react'
import { Search, X, Download, AlertTriangle, AlertOctagon, CheckCircle2, MinusCircle, Boxes, Wallet, ShoppingCart, Ban } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatCurrency, formatDateTime, formatNumber } from '../../lib/format'
import { MOVEMENT_TYPE_LABEL, type InventoryState, type ProductKind } from '../../lib/warehouse/types'
import { useInventory, type ProductRowWithStock } from './hooks'
import { CatalogueEmptyState } from './CatalogueLoader'
import * as XLSX from 'xlsx'

/**
 * Status colours are the reserved status palette, never a series colour, and
 * every one of them ships with an icon and a word — colour alone never carries
 * the meaning.
 */
const STATUS_STYLE: Record<string, { label: string; color: string; Icon: typeof AlertTriangle }> = {
  OUT_OF_STOCK: { label: 'Out of stock', color: 'var(--status-critical)', Icon: AlertOctagon },
  LOW_STOCK: { label: 'Low stock', color: 'var(--status-warning-ink)', Icon: AlertTriangle },
  NORMAL: { label: 'Healthy', color: 'var(--status-good-ink)', Icon: CheckCircle2 },
  NO_THRESHOLD: { label: 'No threshold', color: 'var(--text-muted)', Icon: MinusCircle },
}

const KIND_LABEL: Record<ProductKind, string> = {
  FINISHED: 'Finished goods',
  COMPONENT: 'Components',
  SIMPLE: 'Simple products',
  CONSUMABLE: 'Consumables',
}

const KIND_NOTE: Record<ProductKind, string> = {
  FINISHED: 'Assembled from components — what you actually ship.',
  COMPONENT: 'Consumed by production. Running out of one caps everything it goes into.',
  SIMPLE: 'Bought and sold as-is, no recipe.',
  CONSUMABLE: 'Used by the operation, not part of any one unit.',
}

const KIND_ORDER: ProductKind[] = ['FINISHED', 'SIMPLE', 'COMPONENT', 'CONSUMABLE']

/**
 * Sellable against its reorder point and target, on one bar.
 *
 * The scale is the target where there is one, so bars are comparable within a
 * product's own plan rather than across unrelated SKUs. The tick is the reorder
 * point: fill short of the tick is why the row is flagged.
 */
function StockMeter({
  sellable,
  reorderPoint,
  target,
  color,
}: {
  sellable: number
  reorderPoint: number | null | undefined
  target: number | null | undefined
  color: string
}) {
  const scale = Math.max(target ?? 0, (reorderPoint ?? 0) * 1.5, sellable, 1)
  const pct = Math.max(sellable > 0 ? 2 : 0, Math.min(100, (sellable / scale) * 100))
  const tick = reorderPoint != null && reorderPoint > 0 ? Math.min(100, (reorderPoint / scale) * 100) : null

  return (
    <div className="w-28">
      <div
        className="relative h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}
        title={`${formatNumber(sellable)} sellable${target != null ? ` of ${formatNumber(target)} target` : ''}${
          reorderPoint != null ? ` · reorder at ${formatNumber(reorderPoint)}` : ''
        }`}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        {tick != null && (
          <div
            className="absolute inset-y-0 w-0.5"
            style={{ left: `calc(${tick}% - 1px)`, background: 'var(--text-secondary)', opacity: 0.55 }}
          />
        )}
      </div>
      <div className="mt-1 text-[10px] tabular" style={{ color: 'var(--text-muted)' }}>
        {target != null ? `of ${formatNumber(target)} target` : reorderPoint != null ? `reorder at ${formatNumber(reorderPoint)}` : 'no plan set'}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const { label, color, Icon } = STATUS_STYLE[status]
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <Icon size={11} /> {label}
    </span>
  )
}

/** Zero reads as absence, not as a number worth looking at. */
function Qty({ value, tone = 'muted', alert }: { value: number; tone?: 'primary' | 'secondary' | 'muted'; alert?: string }) {
  if (value === 0) {
    return (
      <span className="tabular" style={{ color: 'var(--text-muted)', opacity: 0.45 }}>
        —
      </span>
    )
  }
  return (
    <span className="tabular" style={{ color: alert ?? `var(--text-${tone})` }}>
      {formatNumber(value)}
    </span>
  )
}

export default function Inventory() {
  const { rows, locations, movements, balances } = useInventory()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [kindFilter, setKindFilter] = useState('ALL')
  const [selected, setSelected] = useState<ProductRowWithStock | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (kindFilter !== 'ALL' && (r.product.kind ?? 'COMPONENT') !== kindFilter) return false
      if (!q) return true
      return [r.product.sku, r.product.name, r.product.variant, r.product.category, r.product.supplier].some(
        (v) => v && v.toLowerCase().includes(q),
      )
    })
  }, [rows, query, statusFilter, kindFilter])

  const groups = useMemo(() => {
    return KIND_ORDER.map((kind) => ({
      kind,
      rows: filtered
        .filter((r) => (r.product.kind ?? 'COMPONENT') === kind)
        .sort((a, b) => a.product.sku.localeCompare(b.product.sku)),
    })).filter((g) => g.rows.length > 0)
  }, [filtered])

  const totals = useMemo(() => {
    const sum = (f: (r: ProductRowWithStock) => number) => filtered.reduce((s, r) => s + f(r), 0)
    return {
      sellable: sum((r) => r.stock.sellable),
      physical: sum((r) => r.stock.physical),
      value: sum((r) => r.availableValue),
      lockedValue: sum((r) => r.unsellableValue + (r.stock.missing + r.stock.lost) * (r.product.unitCost ?? 0)),
      needsAction: filtered.filter((r) => r.status === 'OUT_OF_STOCK' || r.status === 'LOW_STOCK').length,
      toBuy: filtered.filter((r) => r.suggestedBuy > 0).length,
      noPlan: filtered.filter((r) => r.product.reorderPoint == null).length,
    }
  }, [filtered])

  function exportInventory() {
    const data = filtered.map((r) => ({
      SKU: r.product.sku,
      Product: r.product.name,
      Type: KIND_LABEL[(r.product.kind ?? 'COMPONENT') as ProductKind],
      Variant: r.product.variant ?? '',
      Category: r.product.category ?? '',
      Sellable: r.stock.sellable,
      Available: r.stock.available,
      Reserved: r.stock.reserved,
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
        <PageHeader title="Inventory" description="Every SKU with its balances broken out by state, derived from the movement ledger." />
        <Card>
          <CatalogueEmptyState
            heading="No stock to show yet"
            message="Inventory is empty because no products exist yet. Load the catalogue transcribed from your real supplier orders to see it populated, or add products by hand on the Products page and receive stock against them."
          />
        </Card>
      </div>
    )
  }

  const COLS = 15

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Sellable subtracts reservations; physical counts everything you own wherever it sits. Click any row for the movement history that produced the number."
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

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Sellable units"
          value={formatNumber(totals.sellable)}
          icon={<Boxes size={15} />}
          accent="var(--series-aqua)"
          sub={`${formatNumber(totals.physical)} owned across all states`}
        />
        <StatTile
          label="Stock value at cost"
          value={formatCurrency(totals.value)}
          icon={<Wallet size={15} />}
          accent="var(--series-blue)"
          sub="Available units × unit cost"
        />
        <StatTile
          label="Needs attention"
          value={formatNumber(totals.needsAction)}
          icon={<AlertTriangle size={15} />}
          accent="var(--status-warning-ink)"
          sub={totals.noPlan > 0 ? `${formatNumber(totals.noPlan)} more have no reorder point set` : 'Out of stock or at/below reorder point'}
        />
        <StatTile
          label="Value locked up"
          value={formatCurrency(totals.lockedValue)}
          icon={<Ban size={15} />}
          accent={totals.lockedValue > 0 ? 'var(--status-critical)' : 'var(--text-muted)'}
          sub="Damaged, defective, quarantined or missing"
        />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
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
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          >
            <option value="ALL">All product types</option>
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          >
            <option value="ALL">All statuses</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
            <option value="LOW_STOCK">Low stock</option>
            <option value="NORMAL">Healthy</option>
            <option value="NO_THRESHOLD">No threshold</option>
          </select>
          <span className="ml-auto text-xs tabular" style={{ color: 'var(--text-muted)' }}>
            {formatNumber(filtered.length)} of {formatNumber(rows.length)} SKUs
          </span>
        </div>
      </Card>

      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
                <th colSpan={2} className="px-3 pt-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Product
                </th>
                <th colSpan={3} className="border-l px-3 pt-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-hairline)' }}>
                  Stock level
                </th>
                <th colSpan={4} className="border-l px-3 pt-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-hairline)' }}>
                  Where it sits
                </th>
                <th colSpan={3} className="border-l px-3 pt-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-hairline)' }}>
                  Issues
                </th>
                <th colSpan={2} className="border-l px-3 pt-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-hairline)' }}>
                  Planning
                </th>
                <th className="border-l px-3 pt-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-hairline)' }}>
                  Value
                </th>
              </tr>
              <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
                {[
                  ['SKU', false],
                  ['Product', false],
                  ['vs plan', true],
                  ['Sellable', false],
                  ['Status', false],
                  ['Available', true],
                  ['Reserved', false],
                  ['Fulfillment', false],
                  ['Transit', false],
                  ['Inspection', true],
                  ['Damaged', false],
                  ['Missing', false],
                  ['Incoming', true],
                  ['Buy', false],
                  ['At cost', true],
                ].map(([h, divider]) => (
                  <th
                    key={h as string}
                    className={`whitespace-nowrap px-3 pb-2 pt-1 text-left text-xs font-semibold ${divider ? 'border-l' : ''}`}
                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-hairline)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => {
              const gSellable = g.rows.reduce((s, r) => s + r.stock.sellable, 0)
              const gValue = g.rows.reduce((s, r) => s + r.availableValue, 0)
              return (
                <tbody key={g.kind}>
                  <tr>
                    <td colSpan={COLS} className="border-t px-3 py-2" style={{ borderColor: 'var(--border-hairline)', background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)' }}>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                          {KIND_LABEL[g.kind]}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {KIND_NOTE[g.kind]}
                        </span>
                        <span className="ml-auto text-[11px] tabular" style={{ color: 'var(--text-secondary)' }}>
                          {formatNumber(g.rows.length)} SKU{g.rows.length === 1 ? '' : 's'} · {formatNumber(gSellable)} sellable ·{' '}
                          {formatCurrency(gValue)}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {g.rows.map((r) => {
                    const color = STATUS_STYLE[r.status].color
                    return (
                      <tr
                        key={r.product.id}
                        onClick={() => setSelected(r)}
                        className="cursor-pointer border-t transition-colors hover:brightness-[0.98]"
                        style={{ borderColor: 'var(--border-hairline)' }}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {r.product.sku}
                        </td>
                        <td className="min-w-[190px] px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                          {r.product.name}
                          {r.product.variant ? <span style={{ color: 'var(--text-muted)' }}> · {r.product.variant}</span> : null}
                          {r.product.supplier ? (
                            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {r.product.supplier}
                            </div>
                          ) : null}
                        </td>
                        <td className="border-l px-3 py-2" style={{ borderColor: 'var(--border-hairline)' }}>
                          <StockMeter
                            sellable={r.stock.sellable}
                            reorderPoint={r.product.reorderPoint}
                            target={r.product.targetStockLevel}
                            color={color}
                          />
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                          {formatNumber(r.stock.sellable)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="border-l px-3 py-2 text-xs" style={{ borderColor: 'var(--border-hairline)' }}>
                          <Qty value={r.stock.available} tone="secondary" />
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Qty value={r.stock.reserved} />
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Qty value={r.stock.inFulfillment} />
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Qty value={r.stock.inTransit} />
                        </td>
                        <td className="border-l px-3 py-2 text-xs" style={{ borderColor: 'var(--border-hairline)' }}>
                          <Qty value={r.stock.forInspection} alert={r.stock.forInspection > 0 ? 'var(--status-warning-ink)' : undefined} />
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Qty
                            value={r.stock.damaged + r.stock.defective}
                            alert={r.stock.damaged + r.stock.defective > 0 ? 'var(--status-critical)' : undefined}
                          />
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Qty
                            value={r.stock.missing + r.stock.lost}
                            alert={r.stock.missing + r.stock.lost > 0 ? 'var(--status-critical)' : undefined}
                          />
                        </td>
                        <td className="border-l px-3 py-2 text-xs" style={{ borderColor: 'var(--border-hairline)' }}>
                          <Qty value={r.stock.incoming} tone="secondary" />
                        </td>
                        <td className="px-3 py-2 text-xs font-medium">
                          <Qty value={r.suggestedBuy} alert={r.suggestedBuy > 0 ? 'var(--series-aqua)' : undefined} />
                        </td>
                        <td className="border-l px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-hairline)' }}>
                          {r.product.unitCost == null ? (
                            <span style={{ color: 'var(--text-muted)' }} title="No unit cost recorded for this product">
                              cost not set
                            </span>
                          ) : (
                            formatCurrency(r.availableValue)
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              )
            })}
            <tfoot>
              <tr className="border-t-2" style={{ borderColor: 'var(--border-hairline)', background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Total — {formatNumber(filtered.length)} SKU{filtered.length === 1 ? '' : 's'}
                </td>
                <td className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(totals.sellable)}
                </td>
                <td colSpan={10} />
                <td className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(totals.value)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No SKU matches these filters. Clear the search or switch the status filter back to “All statuses”.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-2 text-[11px]" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
          <span>The bar shows sellable against target; the tick is the reorder point.</span>
          {(['NORMAL', 'LOW_STOCK', 'OUT_OF_STOCK', 'NO_THRESHOLD'] as const).map((s) => {
            const { label, color, Icon } = STATUS_STYLE[s]
            return (
              <span key={s} className="inline-flex items-center gap-1">
                <Icon size={11} style={{ color }} /> {label}
              </span>
            )
          })}
        </div>
      </div>

      {selected && (
        <ProductDrawer row={selected} locations={locations} movements={movements} balances={balances} onClose={() => setSelected(null)} />
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
      <div
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l p-5"
        style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {row.product.sku}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {row.product.name}
              {row.product.variant ? ` · ${row.product.variant}` : ''}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StatusPill status={row.status} />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {KIND_LABEL[(row.product.kind ?? 'COMPONENT') as ProductKind]}
                {row.product.unitCost != null ? ` · ${formatCurrency(row.product.unitCost)} per ${row.product.unit ?? 'pc'}` : ''}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {(
            [
              ['Sellable', row.stock.sellable],
              ['Available', row.stock.available],
              ['Reserved', row.stock.reserved],
              ['Fulfillment', row.stock.inFulfillment],
              ['In transit', row.stock.inTransit],
              ['Inspection', row.stock.forInspection],
              ['Damaged', row.stock.damaged + row.stock.defective],
              ['Missing', row.stock.missing + row.stock.lost],
              ['Incoming', row.stock.incoming],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border p-2" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>
                {label}
              </div>
              <div className="text-base font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                {formatNumber(value)}
              </div>
            </div>
          ))}
        </div>

        {row.suggestedBuy > 0 && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl border p-3 text-xs"
            style={{
              borderColor: 'color-mix(in srgb, var(--status-warning-ink) 35%, var(--border-hairline))',
              background: 'color-mix(in srgb, var(--status-warning-ink) 8%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            <ShoppingCart size={14} style={{ color: 'var(--status-warning-ink)' }} />
            Buy {formatNumber(row.suggestedBuy)} to reach the target of {formatNumber(row.product.targetStockLevel ?? 0)} — open POs
            are already credited, so this is not a double order.
          </div>
        )}

        <div className="mb-4 rounded-xl border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Where it is
          </div>
          {byLocation.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No stock anywhere.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {byLocation.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-primary)' }}>
                    {b.name} <span style={{ color: 'var(--text-muted)' }}>/ {b.state}</span>
                  </span>
                  <span className="tabular font-medium" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(b.qty)}
                  </span>
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
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No movements yet.
            </p>
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
