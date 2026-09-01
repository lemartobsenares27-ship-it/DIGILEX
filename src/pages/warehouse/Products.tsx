import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatCurrency, formatNumber } from '../../lib/format'
import { warehouseDb } from '../../lib/warehouse/db'
import { logWarehouseAudit } from '../../lib/warehouse/inventory'
import { useInventory } from './hooks'
import { Field, TextInput, TextArea, Select, SubmitButton, ErrorNote, SuccessNote, locationOptions } from './FormBits'
import type { ProductRow } from '../../lib/warehouse/types'
import { loadStarterData } from '../../lib/warehouse/starterData'
import { getWarehouseUser } from '../../lib/warehouse/db'
import { useEffect } from 'react'

const KINDS = [
  { value: 'COMPONENT', label: 'Component — consumed to build something' },
  { value: 'FINISHED', label: 'Finished — assembled from components' },
  { value: 'SIMPLE', label: 'Simple — bought and sold as-is' },
  { value: 'CONSUMABLE', label: 'Consumable — used up, not part of a unit' },
]

const EMPTY = {
  kind: 'COMPONENT',
  sku: '',
  name: '',
  variant: '',
  category: '',
  brand: '',
  supplier: '',
  unitCost: '',
  sellingPrice: '',
  unit: 'pc',
  unitsPerPack: '',
  barcode: '',
  reorderPoint: '',
  targetStockLevel: '',
  minStockLevel: '',
  defaultLocationId: '',
  tracksExpiry: false,
  notes: '',
}

export default function Products() {
  const { rows, locations } = useInventory()
  const [form, setForm] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [loadingStarter, setLoadingStarter] = useState(false)
  const [user, setUser] = useState('')

  useEffect(() => {
    getWarehouseUser().then(setUser)
  }, [])

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Seeds the catalogue transcribed from the real supplier orders. Idempotent:
  // known SKUs, PO numbers and delivery references are skipped, so a second
  // press cannot double-count stock.
  async function loadReal() {
    setError(null)
    setResult(null)
    const warehouse = locations.find((l) => l.kind === 'warehouse')
    if (!warehouse?.id) return setError('No warehouse location found to receive stock into.')
    setLoadingStarter(true)
    try {
      const r = await loadStarterData(warehouse.id, user.trim() || 'Lemart')
      setResult(
        `Loaded ${r.productsAdded} product(s), ${r.bomLinesAdded} recipe line(s), ${r.receiptsPosted} delivery receipt(s) and ${r.posCreated} open purchase order(s).` +
          (r.skipped.length ? ` Skipped ${r.skipped.length} item(s) already present.` : ''),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingStarter(false)
    }
  }

  function startEdit(id: number) {
    const row = rows.find((r) => r.product.id === id)
    if (!row) return
    const p = row.product
    setEditingId(id)
    setForm({
      kind: p.kind ?? 'COMPONENT',
      sku: p.sku,
      name: p.name,
      variant: p.variant ?? '',
      category: p.category ?? '',
      brand: p.brand ?? '',
      supplier: p.supplier ?? '',
      unitCost: p.unitCost != null ? String(p.unitCost) : '',
      sellingPrice: p.sellingPrice != null ? String(p.sellingPrice) : '',
      unit: p.unit ?? 'pc',
      unitsPerPack: p.unitsPerPack != null ? String(p.unitsPerPack) : '',
      barcode: p.barcode ?? '',
      reorderPoint: p.reorderPoint != null ? String(p.reorderPoint) : '',
      targetStockLevel: p.targetStockLevel != null ? String(p.targetStockLevel) : '',
      minStockLevel: p.minStockLevel != null ? String(p.minStockLevel) : '',
      defaultLocationId: p.defaultLocationId != null ? String(p.defaultLocationId) : '',
      tracksExpiry: p.tracksExpiry,
      notes: p.notes ?? '',
    })
  }

  async function save() {
    setError(null)
    setResult(null)
    if (!form.sku.trim()) return setError('SKU is required — it is the key every movement hangs off.')
    if (!form.name.trim()) return setError('Product name is required.')

    const num = (v: string) => (v.trim() === '' ? null : Number(v))
    const payload = {
      kind: form.kind as ProductRow['kind'],
      sku: form.sku.trim(),
      name: form.name.trim(),
      variant: form.variant.trim() || null,
      category: form.category.trim() || null,
      brand: form.brand.trim() || null,
      supplier: form.supplier.trim() || null,
      unitCost: num(form.unitCost),
      sellingPrice: num(form.sellingPrice),
      unit: form.unit.trim() || null,
      unitsPerPack: num(form.unitsPerPack),
      barcode: form.barcode.trim() || null,
      minStockLevel: num(form.minStockLevel),
      reorderPoint: num(form.reorderPoint),
      targetStockLevel: num(form.targetStockLevel),
      defaultLocationId: form.defaultLocationId ? Number(form.defaultLocationId) : null,
      tracksExpiry: form.tracksExpiry,
      active: true,
      notes: form.notes.trim() || null,
    }

    setBusy(true)
    try {
      if (editingId != null) {
        const previous = rows.find((r) => r.product.id === editingId)?.product
        await warehouseDb.products.update(editingId, payload)
        await logWarehouseAudit({ entity: 'product', entityId: editingId, action: 'Updated', previousValue: previous, newValue: payload })
        setResult(`Updated ${payload.sku}.`)
      } else {
        const id = await warehouseDb.products.add(payload)
        await logWarehouseAudit({ entity: 'product', entityId: id, action: 'Created', newValue: payload })
        setResult(`Added ${payload.sku}. Receive stock against it to start its ledger.`)
      }
      setForm({ ...EMPTY })
      setEditingId(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('Key already exists') || msg.includes('ConstraintError') ? `SKU "${payload.sku}" already exists — SKUs must be unique so one product has one ledger.` : msg)
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(id: number, active: boolean) {
    await warehouseDb.products.update(id, { active: !active })
    await logWarehouseAudit({ entity: 'product', entityId: id, action: active ? 'Deactivated' : 'Reactivated' })
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="The product master. Deactivating a product hides it from pickers but keeps its history intact — nothing is ever deleted out from under the ledger."
        actions={
          <button
            onClick={loadReal}
            disabled={loadingStarter}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--series-aqua)' }}
            title="Seeds the catalogue transcribed from your real supplier orders. Running it twice is safe."
          >
            {loadingStarter ? 'Loading…' : 'Load my real catalogue'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={editingId != null ? 'Edit product' : 'Add product'} className="lg:col-span-1">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Type" hint="Decides whether it can be built, or used to build.">
              <Select value={form.kind} onChange={set('kind')} options={KINDS} placeholder="" />
            </Field>
            <Field label="SKU">
              <TextInput value={form.sku} onChange={set('sku')} placeholder="BOTTLE-100ML" />
            </Field>
            <Field label="Product name">
              <TextInput value={form.name} onChange={set('name')} placeholder="Bellevine Fish Oil" />
            </Field>
            <Field label="Variant" hint="Each variant is its own SKU with its own stock.">
              <TextInput value={form.variant} onChange={set('variant')} placeholder="500mg / 60 capsules" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Category">
                <TextInput value={form.category} onChange={set('category')} />
              </Field>
              <Field label="Brand">
                <TextInput value={form.brand} onChange={set('brand')} />
              </Field>
            </div>
            <Field label="Supplier">
              <TextInput value={form.supplier} onChange={set('supplier')} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Unit cost (₱)" hint="Drives inventory value.">
                <TextInput value={form.unitCost} onChange={set('unitCost')} type="number" min={0} />
              </Field>
              <Field label="Selling price (₱)" hint="Never used for valuation.">
                <TextInput value={form.sellingPrice} onChange={set('sellingPrice')} type="number" min={0} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Min level">
                <TextInput value={form.minStockLevel} onChange={set('minStockLevel')} type="number" min={0} />
              </Field>
              <Field label="Reorder pt">
                <TextInput value={form.reorderPoint} onChange={set('reorderPoint')} type="number" min={0} />
              </Field>
              <Field label="Target">
                <TextInput value={form.targetStockLevel} onChange={set('targetStockLevel')} type="number" min={0} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Unit">
                <TextInput value={form.unit} onChange={set('unit')} placeholder="pc, box, bottle" />
              </Field>
              <Field label="Pieces per pack" hint="You buy packs; stock counts pieces.">
                <TextInput value={form.unitsPerPack} onChange={set('unitsPerPack')} type="number" min={1} />
              </Field>
            </div>
            <Field label="Default location">
              <Select value={form.defaultLocationId} onChange={set('defaultLocationId')} options={locationOptions(locations, ['warehouse', 'shelf'])} placeholder="— none —" />
            </Field>
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.tracksExpiry} onChange={(e) => setForm((f) => ({ ...f, tracksExpiry: e.target.checked }))} />
              Track expiry dates for this product
            </label>
            <Field label="Notes">
              <TextArea value={form.notes} onChange={set('notes')} />
            </Field>

            {error && <ErrorNote>{error}</ErrorNote>}
            {result && <SuccessNote>{result}</SuccessNote>}
            <div className="flex gap-2">
              <SubmitButton label={editingId != null ? 'Save changes' : 'Add product'} onClick={save} busy={busy} />
              {editingId != null && (
                <button
                  onClick={() => {
                    setEditingId(null)
                    setForm({ ...EMPTY })
                  }}
                  className="rounded-lg border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </Card>

        <Card title={`Product master (${formatNumber(rows.length)})`} className="lg:col-span-2">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No products yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                    {['SKU', 'Name', 'Type', 'Cost', 'Pack', 'Sellable', 'Status', ''].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.product.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.product.sku}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{r.product.name}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{r.product.kind ?? '—'}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>{r.product.unitCost != null ? formatCurrency(r.product.unitCost) : '—'}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{r.product.unitsPerPack ?? '—'}</td>
                      <td className="px-3 py-2 text-xs tabular font-semibold" style={{ color: 'var(--text-primary)' }}>{formatNumber(r.stock.sellable)}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: r.product.active ? 'var(--status-good)' : 'var(--text-muted)' }}>
                        {r.product.active ? 'Active' : 'Inactive'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <button onClick={() => startEdit(r.product.id!)} className="mr-2 text-xs font-medium" style={{ color: 'var(--series-aqua)' }}>
                          Edit
                        </button>
                        <button onClick={() => toggleActive(r.product.id!, r.product.active)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {r.product.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
