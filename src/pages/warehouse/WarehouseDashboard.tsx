import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, PackageCheck, Truck, Undo2, AlertTriangle, XCircle } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import StatTile from '../../components/StatTile'
import Card from '../../components/Card'
import { formatCurrency, formatNumber } from '../../lib/format'
import { useInventory } from './hooks'
import { EmptyState } from './FormBits'

export default function WarehouseDashboard() {
  const { rows, rtsReturns, purchaseOrders, movements, locations } = useInventory()

  const totals = useMemo(() => {
    const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0)
    return {
      products: rows.length,
      units: sum((r) => r.stock.physical),
      available: sum((r) => r.stock.available),
      reserved: sum((r) => r.stock.reserved),
      inFulfillment: sum((r) => r.stock.inFulfillment),
      inTransit: sum((r) => r.stock.inTransit),
      forInspection: sum((r) => r.stock.forInspection),
      damaged: sum((r) => r.stock.damaged + r.stock.defective),
      missing: sum((r) => r.stock.missing + r.stock.lost),
      availableValue: sum((r) => r.availableValue),
      physicalValue: sum((r) => r.physicalValue),
      unsellableValue: sum((r) => r.unsellableValue),
      missingValue: sum((r) => (r.stock.missing + r.stock.lost) * (r.product.unitCost ?? 0)),
      lowStock: rows.filter((r) => r.status === 'LOW_STOCK').length,
      outOfStock: rows.filter((r) => r.status === 'OUT_OF_STOCK').length,
      toBuy: rows.filter((r) => r.suggestedBuy > 0),
    }
  }, [rows])

  const pendingRts = rtsReturns.filter((r) => r.status === 'FOR_INSPECTION')
  const overduePos = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return purchaseOrders.filter(
      (p) => (p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED') && p.expectedDate != null && p.expectedDate < today,
    )
  }, [purchaseOrders])

  // "What happened today" — read straight off the ledger.
  const today = useMemo(() => {
    const day = new Date().toDateString()
    const todays = movements.filter((m) => new Date(m.timestamp).toDateString() === day)
    const qty = (type: string, state?: string) =>
      todays.filter((m) => m.type === type && (!state || m.toState === state)).reduce((s, m) => s + m.quantity, 0)
    return {
      received: qty('RECEIPT'),
      sentToFulfillment: qty('FULFILLMENT_OUT'),
      rts: qty('RTS_IN'),
      damaged: todays.filter((m) => m.toState === 'DAMAGED' || m.toState === 'DEFECTIVE').reduce((s, m) => s + m.quantity, 0),
      adjustments: todays.filter((m) => m.type === 'ADJUSTMENT').length,
      count: todays.length,
    }
  }, [movements])

  const inTransitCount = useMemo(
    () => rows.reduce((s, r) => s + r.stock.inTransit, 0),
    [rows],
  )

  if (rows.length === 0) {
    return (
      <div>
        <PageHeader
          title="Warehouse Control Center"
          description="Complete visibility over physical inventory — what you have, where it is, what moved, and what needs attention."
        />
        <Card>
          <EmptyState
            message="No products yet. Add your SKUs first, then receive stock against them — every unit in this system belongs to a product and carries a full movement history."
            action={
              <Link to="/products" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--series-aqua)' }}>
                Add your first product
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  const alerts = [
    totals.outOfStock > 0 && { color: 'var(--status-critical)', text: `${formatNumber(totals.outOfStock)} SKU(s) out of stock`, to: '/inventory' },
    totals.lowStock > 0 && { color: 'var(--status-warning)', text: `${formatNumber(totals.lowStock)} SKU(s) low on stock`, to: '/inventory' },
    pendingRts.length > 0 && { color: 'var(--status-critical)', text: `${formatNumber(pendingRts.length)} RTS package(s) waiting for inspection`, to: '/rts' },
    totals.missing > 0 && { color: 'var(--status-critical)', text: `${formatNumber(totals.missing)} unit(s) missing or lost — ${formatCurrency(totals.missingValue)}`, to: '/discrepancies' },
    inTransitCount > 0 && { color: 'var(--status-warning)', text: `${formatNumber(inTransitCount)} unit(s) in transit awaiting receipt`, to: '/transfers' },
    overduePos.length > 0 && { color: 'var(--status-warning)', text: `${formatNumber(overduePos.length)} purchase order(s) past their expected date`, to: '/purchases' },
    totals.toBuy.length > 0 && { color: 'var(--series-blue)', text: `${formatNumber(totals.toBuy.length)} SKU(s) need reordering`, to: '/purchases' },
  ].filter(Boolean) as { color: string; text: string; to: string }[]

  return (
    <div>
      <PageHeader
        title="Warehouse Control Center"
        description={`${formatNumber(totals.products)} products · ${formatNumber(locations.length)} locations · every figure below derived from ${formatNumber(movements.length)} ledger movements`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatTile label="Total Units" value={formatNumber(totals.units)} icon={<Boxes size={16} />} accent="var(--series-aqua)" />
        <StatTile label="Available" value={formatNumber(totals.available)} icon={<PackageCheck size={16} />} accent="var(--status-good)" />
        <StatTile label="Reserved" value={formatNumber(totals.reserved)} accent="var(--series-violet)" />
        <StatTile label="With Fulfillment" value={formatNumber(totals.inFulfillment)} icon={<Truck size={16} />} accent="var(--series-blue)" />
        <StatTile label="For Inspection" value={formatNumber(totals.forInspection)} icon={<Undo2 size={16} />} accent="var(--status-warning)" />
        <StatTile label="Damaged" value={formatNumber(totals.damaged)} icon={<XCircle size={16} />} accent="var(--status-critical)" />
        <StatTile label="Missing" value={formatNumber(totals.missing)} icon={<AlertTriangle size={16} />} accent="var(--status-critical)" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Available Inventory Value" value={formatCurrency(totals.availableValue)} sub="at unit cost, not selling price" accent="var(--status-good)" />
        <StatTile label="Total Physical Value" value={formatCurrency(totals.physicalValue)} accent="var(--series-aqua)" />
        <StatTile label="Unsellable Value" value={formatCurrency(totals.unsellableValue)} sub="damaged, defective, quarantined" accent="var(--status-critical)" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Action required" description="Everything the warehouse needs a decision on, most urgent first.">
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--status-good)' }}>
              Nothing needs attention — stock levels healthy, no returns pending, no discrepancies.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {alerts.map((a) => (
                <Link
                  key={a.text}
                  to={a.to}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                    {a.text}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Today" description="Movements posted today.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="Received" value={`+${formatNumber(today.received)}`} color="var(--status-good)" />
            <Metric label="To fulfillment" value={`-${formatNumber(today.sentToFulfillment)}`} color="var(--series-blue)" />
            <Metric label="RTS received" value={`+${formatNumber(today.rts)}`} color="var(--status-warning)" />
            <Metric label="Damaged" value={formatNumber(today.damaged)} color="var(--status-critical)" />
            <Metric label="Adjustments" value={formatNumber(today.adjustments)} color="var(--text-primary)" />
            <Metric label="Movements" value={formatNumber(today.count)} color="var(--text-primary)" />
          </div>
          {today.count === 0 && (
            <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Nothing recorded today yet.
            </p>
          )}
        </Card>
      </div>

      {totals.toBuy.length > 0 && (
        <Card
          title="Purchase alerts"
          description="Suggested quantity accounts for what is reserved and what is already on order, so you don't double-buy."
          className="mt-4"
          actions={
            <Link to="/purchases" className="text-xs font-medium" style={{ color: 'var(--series-aqua)' }}>
              Reorder center →
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['Product', 'Available', 'Reserved', 'Incoming', 'Reorder pt', 'Target', 'Suggested buy'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {totals.toBuy.slice(0, 8).map((r) => (
                  <tr key={r.product.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                      {r.product.sku} — {r.product.name}
                    </td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(r.stock.available)}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(r.stock.reserved)}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(r.stock.incoming)}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{r.product.reorderPoint ?? '—'}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{r.product.targetStockLevel ?? '—'}</td>
                    <td className="px-3 py-2 text-xs tabular font-semibold" style={{ color: r.status === 'OUT_OF_STOCK' ? 'var(--status-critical)' : 'var(--status-warning)' }}>
                      {formatNumber(r.suggestedBuy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border-hairline)' }}>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular" style={{ color }}>
        {value}
      </div>
    </div>
  )
}
