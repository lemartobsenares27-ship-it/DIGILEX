import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatCurrency, formatDateTime, formatNumber } from '../../lib/format'
import { applyCountAdjustment } from '../../lib/warehouse/operations'
import { balanceAt } from '../../lib/warehouse/inventory'
import { getWarehouseUser, setWarehouseUser } from '../../lib/warehouse/db'
import { useInventory } from './hooks'
import { Field, TextInput, Select, ErrorNote, SuccessNote, locationOptions } from './FormBits'

const REASONS = [
  'Physical count correction',
  'Missing',
  'Damaged',
  'Counting error',
  'Unrecorded shipment',
  'Unrecorded receipt',
  'Other',
]

export default function StockCount() {
  const { products, locations, movements, balances } = useInventory()

  const [locationId, setLocationId] = useState('')
  const [user, setUser] = useState('')
  const [counted, setCounted] = useState<Record<number, string>>({})
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    getWarehouseUser().then(setUser)
  }, [])

  const productById = useMemo(() => new Map(products.filter((p) => p.id != null).map((p) => [p.id!, p])), [products])
  const locationById = useMemo(() => new Map(locations.filter((l) => l.id != null).map((l) => [l.id!, l])), [locations])

  // Count sheet for the chosen location: system quantity comes from the
  // ledger, so what you are checking against is always the derived number.
  const sheet = useMemo(() => {
    if (!locationId) return []
    const lid = Number(locationId)
    return products
      .filter((p) => p.id != null && p.active)
      .map((p) => ({ product: p, system: balanceAt(balances, p.id!, lid, 'AVAILABLE') }))
  }, [products, locationId, balances])

  const adjustments = useMemo(
    () => movements.filter((m) => m.type === 'ADJUSTMENT').sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20),
    [movements],
  )

  async function post(productId: number, system: number) {
    setError(null)
    setResult(null)
    const raw = counted[productId]
    if (raw == null || raw.trim() === '') return setError('Enter a counted quantity first.')
    const countedQty = Number(raw)
    if (!Number.isFinite(countedQty) || countedQty < 0) return setError('Counted quantity must be zero or more.')
    const reason = reasons[productId] || REASONS[0]

    setBusyId(productId)
    try {
      if (user.trim()) await setWarehouseUser(user.trim())
      const res = await applyCountAdjustment({
        productId,
        locationId: Number(locationId),
        systemQuantity: system,
        countedQuantity: countedQty,
        reason,
        user: user.trim(),
        reference: null,
        notes: null,
      })
      if (res.difference === 0) {
        setResult('Counted quantity matches the ledger — no adjustment needed.')
      } else {
        setResult(
          res.difference > 0
            ? `+${formatNumber(res.difference)} adjustment posted (found stock). The original figure is preserved in the ledger.`
            : `${formatNumber(res.difference)} adjustment posted — the shortfall is recorded as MISSING for investigation, not deleted.`,
        )
      }
      setCounted((prev) => ({ ...prev, [productId]: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Stock Count"
        description="Count a location and reconcile it against the ledger. A difference is posted as an adjustment movement with a reason — the system quantity is never overwritten."
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Location to count">
            <Select value={locationId} onChange={setLocationId} options={locationOptions(locations, ['warehouse', 'shelf'])} />
          </Field>
          <Field label="Counted by">
            <TextInput value={user} onChange={setUser} placeholder="Your name" />
          </Field>
        </div>
      </Card>

      {error && <div className="mb-3"><ErrorNote>{error}</ErrorNote></div>}
      {result && <div className="mb-3"><SuccessNote>{result}</SuccessNote></div>}

      {!locationId ? (
        <Card>
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Choose a location to generate its count sheet.
          </p>
        </Card>
      ) : (
        <Card title={`Count sheet — ${locationById.get(Number(locationId))?.name ?? ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['SKU', 'Product', 'System', 'Counted', 'Difference', 'Reason', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.map(({ product, system }) => {
                  const raw = counted[product.id!]
                  const diff = raw != null && raw.trim() !== '' ? Number(raw) - system : null
                  return (
                    <tr key={product.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{product.sku}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{product.name}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(system)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={raw ?? ''}
                          onChange={(e) => setCounted((prev) => ({ ...prev, [product.id!]: e.target.value }))}
                          className="w-24 rounded border px-2 py-1 text-xs"
                          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs tabular font-medium" style={{ color: diff == null || diff === 0 ? 'var(--text-muted)' : 'var(--status-critical)' }}>
                        {diff == null ? '—' : `${diff > 0 ? '+' : ''}${formatNumber(diff)}`}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={reasons[product.id!] ?? REASONS[0]}
                          onChange={(e) => setReasons((prev) => ({ ...prev, [product.id!]: e.target.value }))}
                          className="rounded border px-2 py-1 text-xs"
                          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                        >
                          {REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => post(product.id!, system)}
                          disabled={busyId === product.id || diff == null || diff === 0}
                          className="rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                        >
                          Post
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Recent adjustments" className="mt-4">
        {adjustments.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No adjustments recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['When', 'Product', 'Change', 'Reason', 'By', 'Value'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adjustments.map((m) => {
                  const isLoss = m.toState === 'MISSING'
                  const product = productById.get(m.productId)
                  return (
                    <tr key={m.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(m.timestamp)}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{product?.sku ?? '—'}</td>
                      <td className="px-3 py-2 text-xs tabular font-medium" style={{ color: isLoss ? 'var(--status-critical)' : 'var(--status-good)' }}>
                        {isLoss ? '-' : '+'}
                        {formatNumber(m.quantity)}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.reason ?? '—'}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{m.user || '—'}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                        {product?.unitCost != null ? formatCurrency(m.quantity * product.unitCost) : '—'}
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
