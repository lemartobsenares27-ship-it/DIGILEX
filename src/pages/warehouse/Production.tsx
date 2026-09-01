import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatCurrency, formatNumber } from '../../lib/format'
import { warehouseDb, getWarehouseUser, setWarehouseUser } from '../../lib/warehouse/db'
import { computeBuildability, logWarehouseAudit } from '../../lib/warehouse/inventory'
import { produceFinishedGoods } from '../../lib/warehouse/operations'
import { useInventory } from './hooks'
import { Field, TextInput, TextArea, Select, SubmitButton, ErrorNote, SuccessNote, locationOptions, EmptyState } from './FormBits'
import { useLiveTable } from '../../hooks/useLiveTable'
import { Trash2 } from 'lucide-react'

export default function Production() {
  const { rows, products, locations, balances } = useInventory()
  const bom = useLiveTable(warehouseDb.bom)

  const [finishedId, setFinishedId] = useState('')
  const [componentId, setComponentId] = useState('')
  const [qtyPer, setQtyPer] = useState('1')
  const [buildQty, setBuildQty] = useState('')
  const [locationId, setLocationId] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [user, setUser] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    getWarehouseUser().then(setUser)
  }, [])

  const productById = useMemo(() => new Map(products.filter((p) => p.id != null).map((p) => [p.id!, p])), [products])
  const finished = useMemo(() => products.filter((p) => p.id != null && p.kind === 'FINISHED' && p.active), [products])
  const componentChoices = useMemo(
    () => products.filter((p) => p.id != null && p.active && p.kind !== 'FINISHED'),
    [products],
  )

  const buildability = useMemo(
    () => finished.map((p) => ({ product: p, calc: computeBuildability(p.id!, bom, balances, productById) })),
    [finished, bom, balances, productById],
  )

  const selected = finishedId ? buildability.find((b) => String(b.product.id) === finishedId) : null
  const selectedLines = useMemo(() => bom.filter((l) => String(l.finishedProductId) === finishedId), [bom, finishedId])

  async function addLine() {
    setError(null)
    const fid = Number(finishedId)
    const cid = Number(componentId)
    const q = Number(qtyPer)
    if (!fid) return setError('Pick the finished product first.')
    if (!cid) return setError('Pick a component to add.')
    if (!Number.isFinite(q) || q <= 0) return setError('Quantity per unit must be greater than zero.')
    if (selectedLines.some((l) => l.componentProductId === cid)) {
      return setError('That component is already in this recipe — edit or remove the existing line instead.')
    }
    await warehouseDb.bom.add({ finishedProductId: fid, componentProductId: cid, quantityPerUnit: q, notes: null })
    await logWarehouseAudit({ entity: 'bom', entityId: fid, action: 'Component added', newValue: { componentProductId: cid, quantityPerUnit: q } })
    setComponentId('')
    setQtyPer('1')
  }

  async function removeLine(id: number) {
    const line = bom.find((l) => l.id === id)
    await warehouseDb.bom.delete(id)
    await logWarehouseAudit({ entity: 'bom', entityId: line?.finishedProductId ?? null, action: 'Component removed', previousValue: line })
  }

  async function build() {
    setError(null)
    setResult(null)
    const fid = Number(finishedId)
    const lid = Number(locationId)
    const qty = Number(buildQty)
    if (!fid) return setError('Pick a finished product.')
    if (!lid) return setError('Pick the location you are building at.')
    if (!Number.isFinite(qty) || qty <= 0) return setError('Build quantity must be greater than zero.')

    setBusy(true)
    try {
      if (user.trim()) await setWarehouseUser(user.trim())
      const res = await produceFinishedGoods({
        finishedProductId: fid,
        quantity: qty,
        locationId: lid,
        reference: reference.trim() || null,
        user: user.trim(),
        notes: notes.trim() || null,
      })
      const consumedText = res.consumed
        .map((c) => `${formatNumber(c.quantity)} × ${productById.get(c.componentProductId)?.sku ?? '?'}`)
        .join(', ')
      setResult(`Built ${formatNumber(qty)} unit(s). Consumed ${consumedText}. All in one atomic movement group.`)
      setBuildQty('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (products.length === 0) {
    return (
      <div>
        <PageHeader title="Production" />
        <Card>
          <EmptyState message="Add your components and a finished product first, then define the recipe here." />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Production"
        description="A finished product is only as available as its scarcest component. Define the recipe, and the system tells you how many complete units you can actually build — and what is stopping you."
      />

      {buildability.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {buildability.slice(0, 4).map(({ product, calc }) => {
            const limiting = calc.limitingComponentId != null ? productById.get(calc.limitingComponentId) : null
            return (
              <StatTile
                key={product.id}
                label={`Can build — ${product.sku}`}
                value={formatNumber(calc.buildable)}
                accent={calc.buildable > 0 ? 'var(--status-good)' : 'var(--status-critical)'}
                sub={
                  calc.constraints.length === 0
                    ? 'no recipe defined yet'
                    : calc.buildable === 0 && limiting
                      ? `blocked by ${limiting.sku}`
                      : limiting
                        ? `limited by ${limiting.sku}`
                        : undefined
                }
              />
            )
          })}
        </div>
      )}

      {error && <div className="mb-3"><ErrorNote>{error}</ErrorNote></div>}
      {result && <div className="mb-3"><SuccessNote>{result}</SuccessNote></div>}

      <Card className="mb-4">
        <Field label="Finished product">
          <Select
            value={finishedId}
            onChange={setFinishedId}
            options={finished.map((p) => ({ value: String(p.id), label: `${p.sku} — ${p.name}` }))}
            placeholder={finished.length === 0 ? '— no finished products yet —' : '— select —'}
          />
        </Field>
        {finished.length === 0 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Set a product's Type to "Finished" on the Products page to make it buildable.
          </p>
        )}
      </Card>

      {finishedId && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Bill of materials" description="What one finished unit consumes.">
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Component">
                  <Select
                    value={componentId}
                    onChange={setComponentId}
                    options={componentChoices.map((p) => ({ value: String(p.id), label: `${p.sku} — ${p.name}` }))}
                  />
                </Field>
              </div>
              <Field label="Qty per unit">
                <TextInput value={qtyPer} onChange={setQtyPer} type="number" min={0} />
              </Field>
            </div>
            <button
              onClick={addLine}
              className="mb-4 rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--series-aqua)' }}
            >
              Add component
            </button>

            {selectedLines.length === 0 ? (
              <p className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No recipe yet. A finished product with no components cannot be built.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                      {['Component', 'Per unit', 'Available', 'Supports', 'Cost/unit', ''].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLines.map((line) => {
                      const c = selected?.calc.constraints.find((x) => x.componentProductId === line.componentProductId)
                      const p = productById.get(line.componentProductId)
                      const isLimiting = selected?.calc.limitingComponentId === line.componentProductId
                      return (
                        <tr key={line.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                            {p?.sku ?? '—'}
                            {isLimiting && (
                              <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: 'var(--status-critical)', background: 'color-mix(in srgb, var(--status-critical) 14%, transparent)' }}>
                                limiting
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>{formatNumber(line.quantityPerUnit)}</td>
                          <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(c?.available ?? 0)}</td>
                          <td className="px-3 py-2 text-xs tabular font-medium" style={{ color: isLimiting ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                            {formatNumber(c?.supports ?? 0)}
                          </td>
                          <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                            {p?.unitCost != null ? formatCurrency(p.unitCost * line.quantityPerUnit) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => removeLine(line.id!)} aria-label="Remove" style={{ color: 'var(--text-muted)' }}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {selected && (
                  <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Component cost of one finished unit:{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(selected.calc.unitComponentCost)}</strong>
                    {selected.product.sellingPrice != null && selected.calc.unitComponentCost > 0 && (
                      <>
                        {' '}· margin over components:{' '}
                        <strong style={{ color: 'var(--status-good)' }}>
                          {formatCurrency(selected.product.sellingPrice - selected.calc.unitComponentCost)}
                        </strong>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card title="Build" description="Consumes components and creates finished units in one transaction — it cannot half-complete.">
            {selected && (
              <div className="mb-3 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border-hairline)' }}>
                <div style={{ color: 'var(--text-secondary)' }}>
                  You can build{' '}
                  <strong style={{ color: selected.calc.buildable > 0 ? 'var(--status-good)' : 'var(--status-critical)' }}>
                    {formatNumber(selected.calc.buildable)}
                  </strong>{' '}
                  complete unit(s) right now.
                  {selected.calc.limitingComponentId != null && (
                    <> Limited by <strong>{productById.get(selected.calc.limitingComponentId)?.sku}</strong>.</>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Quantity to build">
                <TextInput value={buildQty} onChange={setBuildQty} type="number" min={0} />
              </Field>
              <Field label="At location">
                <Select value={locationId} onChange={setLocationId} options={locationOptions(locations, ['warehouse', 'shelf'])} />
              </Field>
              <Field label="Reference / batch">
                <TextInput value={reference} onChange={setReference} />
              </Field>
              <Field label="Built by">
                <TextInput value={user} onChange={setUser} placeholder="Your name" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <TextArea value={notes} onChange={setNotes} />
                </Field>
              </div>
            </div>
            <div className="mt-4">
              <SubmitButton label="Build units" onClick={build} busy={busy} disabled={selectedLines.length === 0} />
            </div>
          </Card>
        </div>
      )}

      {buildability.length > 0 && (
        <Card title="All finished products" className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['Product', 'In stock', 'Can build', 'Limited by', 'Component cost', 'Recipe lines'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildability.map(({ product, calc }) => {
                  const stock = rows.find((r) => r.product.id === product.id)?.stock
                  const limiting = calc.limitingComponentId != null ? productById.get(calc.limitingComponentId) : null
                  return (
                    <tr key={product.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                        {product.sku} — {product.name}
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(stock?.available ?? 0)}</td>
                      <td className="px-3 py-2 text-xs tabular font-semibold" style={{ color: calc.buildable > 0 ? 'var(--status-good)' : 'var(--status-critical)' }}>
                        {formatNumber(calc.buildable)}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--status-warning)' }}>{limiting?.sku ?? '—'}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(calc.unitComponentCost)}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(calc.constraints.length)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
