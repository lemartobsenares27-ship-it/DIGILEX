import { useMemo } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatCurrency, formatDateTime, formatNumber } from '../../lib/format'
import { useInventory } from './hooks'

export default function Discrepancies() {
  const { rows, movements, locations, rtsReturns } = useInventory()

  const locationById = useMemo(() => new Map(locations.filter((l) => l.id != null).map((l) => [l.id!, l])), [locations])
  const productById = useMemo(() => new Map(rows.map((r) => [r.product.id!, r.product])), [rows])

  const missing = useMemo(() => rows.filter((r) => r.stock.missing + r.stock.lost > 0), [rows])
  const damaged = useMemo(() => rows.filter((r) => r.stock.damaged + r.stock.defective + r.stock.quarantine > 0), [rows])

  const missingValue = missing.reduce((s, r) => s + (r.stock.missing + r.stock.lost) * (r.product.unitCost ?? 0), 0)
  const damagedValue = damaged.reduce((s, r) => s + (r.stock.damaged + r.stock.defective + r.stock.quarantine) * (r.product.unitCost ?? 0), 0)

  // The movement that produced each shortfall — the "last known movement"
  // a loss investigation actually needs.
  const lossMovements = useMemo(
    () =>
      movements
        .filter((m) => m.toState === 'MISSING' || m.toState === 'LOST')
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [movements],
  )

  const damageMovements = useMemo(
    () =>
      movements
        .filter((m) => m.toState === 'DAMAGED' || m.toState === 'DEFECTIVE' || m.toState === 'QUARANTINE')
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [movements],
  )

  const pendingRts = rtsReturns.filter((r) => r.status === 'FOR_INSPECTION')

  return (
    <div>
      <PageHeader
        title="Discrepancies"
        description="Everything the warehouse cannot fully account for: stock that is missing, stock that cannot be sold, and returns still waiting on a decision."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Missing units" value={formatNumber(missing.reduce((s, r) => s + r.stock.missing + r.stock.lost, 0))} accent="var(--status-critical)" />
        <StatTile label="Missing value" value={formatCurrency(missingValue)} accent="var(--status-critical)" />
        <StatTile label="Unsellable units" value={formatNumber(damaged.reduce((s, r) => s + r.stock.damaged + r.stock.defective + r.stock.quarantine, 0))} accent="var(--status-warning)" />
        <StatTile label="Unsellable value" value={formatCurrency(damagedValue)} accent="var(--status-warning)" />
      </div>

      {pendingRts.length > 0 && (
        <Card className="mb-4">
          <p className="text-sm" style={{ color: 'var(--status-warning)' }}>
            {formatNumber(pendingRts.length)} return(s) are still awaiting inspection, holding{' '}
            {formatNumber(pendingRts.reduce((s, r) => s + r.quantity, 0))} unit(s) out of sellable stock.
          </p>
        </Card>
      )}

      <Card title="Missing / loss center" description="Where the shortfall was found, what it cost, and the movement that recorded it." className="mb-4">
        {lossMovements.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--status-good)' }}>
            No missing stock recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['Discovered', 'Product', 'Qty', 'Location', 'Reason', 'Cost impact', 'Recorded by'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lossMovements.map((m) => {
                  const p = productById.get(m.productId)
                  return (
                    <tr key={m.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(m.timestamp)}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{p ? `${p.sku} — ${p.name}` : '—'}</td>
                      <td className="px-3 py-2 text-xs tabular font-medium" style={{ color: 'var(--status-critical)' }}>{formatNumber(m.quantity)}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.toLocationId != null ? locationById.get(m.toLocationId)?.name ?? '—' : '—'}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.reason ?? '—'}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>
                        {p?.unitCost != null ? formatCurrency(m.quantity * p.unitCost) : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{m.user || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Damage center" description="Stock you still physically hold but cannot sell as-is.">
        {damageMovements.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--status-good)' }}>
            No damaged or quarantined stock recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['When', 'Product', 'Qty', 'State', 'Source', 'Reason', 'Cost impact'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {damageMovements.map((m) => {
                  const p = productById.get(m.productId)
                  return (
                    <tr key={m.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(m.timestamp)}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{p ? `${p.sku} — ${p.name}` : '—'}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(m.quantity)}</td>
                      <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--status-critical)' }}>{m.toState}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.source ?? (m.type === 'INSPECTION' ? 'RTS inspection' : m.type === 'RECEIPT' ? 'Received damaged' : '—')}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.reason ?? '—'}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>
                        {p?.unitCost != null ? formatCurrency(m.quantity * p.unitCost) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
