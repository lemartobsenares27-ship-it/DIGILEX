import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatCurrency, formatDateTime, formatNumber } from '../../lib/format'
import { receiveInventory } from '../../lib/warehouse/operations'
import { getWarehouseUser, setWarehouseUser } from '../../lib/warehouse/db'
import { useWarehouseTables } from './hooks'
import { Field, TextInput, TextArea, Select, SubmitButton, ErrorNote, SuccessNote, productOptions, locationOptions, EmptyState } from './FormBits'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export default function Receive() {
  const { products, locations, movements, purchaseOrders, purchaseOrderItems } = useWarehouseTables()

  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [poId, setPoId] = useState('')
  const [expected, setExpected] = useState('')
  const [received, setReceived] = useState('')
  const [damaged, setDamaged] = useState('0')
  const [supplier, setSupplier] = useState('')
  const [reference, setReference] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [expiry, setExpiry] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [notes, setNotes] = useState('')
  const [user, setUser] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    getWarehouseUser().then(setUser)
  }, [])

  const openPos = useMemo(
    () => purchaseOrders.filter((p) => p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED'),
    [purchaseOrders],
  )

  // Selecting a PO pre-fills what it says is still outstanding, so the
  // expected-vs-received check has something real to compare against.
  function applyPo(nextPoId: string) {
    setPoId(nextPoId)
    const po = purchaseOrders.find((p) => String(p.id) === nextPoId)
    if (!po) return
    setSupplier(po.supplier ?? '')
    setReference(po.poNumber)
    const items = purchaseOrderItems.filter((i) => i.poId === po.id)
    const first = items.find((i) => i.quantityOrdered > i.quantityReceived) ?? items[0]
    if (first) {
      setProductId(String(first.productId))
      setExpected(String(Math.max(0, first.quantityOrdered - first.quantityReceived)))
      if (first.unitCost != null) setUnitCost(String(first.unitCost))
    }
  }

  const recentReceipts = useMemo(
    () => movements.filter((m) => m.type === 'RECEIPT').sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 15),
    [movements],
  )
  const productById = useMemo(() => new Map(products.filter((p) => p.id != null).map((p) => [p.id!, p])), [products])
  const locationById = useMemo(() => new Map(locations.filter((l) => l.id != null).map((l) => [l.id!, l])), [locations])

  async function submit() {
    setError(null)
    setResult(null)
    const pid = Number(productId)
    const lid = Number(locationId)
    const qty = Number(received)
    const dmg = Number(damaged || 0)
    if (!pid || !lid) return setError('Pick a product and a destination location.')
    if (!Number.isFinite(qty) || qty <= 0) return setError('Received quantity must be greater than zero.')

    setBusy(true)
    try {
      if (user.trim()) await setWarehouseUser(user.trim())
      const res = await receiveInventory({
        productId: pid,
        locationId: lid,
        expectedQuantity: expected.trim() === '' ? null : Number(expected),
        receivedQuantity: qty,
        damagedQuantity: dmg,
        supplier: supplier.trim() || null,
        reference: reference.trim() || null,
        batchNo: batchNo.trim() || null,
        expiryDate: expiry || null,
        unitCost: unitCost.trim() === '' ? null : Number(unitCost),
        user: user.trim(),
        notes: notes.trim() || null,
        poId: poId ? Number(poId) : null,
      })
      const parts = [`Received ${formatNumber(res.goodQuantity)} into available stock.`]
      if (res.damagedQuantity > 0) parts.push(`${formatNumber(res.damagedQuantity)} booked as damaged, not sellable.`)
      if (res.discrepancy != null && res.discrepancy !== 0) {
        parts.push(`Receiving discrepancy: ${res.discrepancy > 0 ? '+' : ''}${formatNumber(res.discrepancy)} vs expected.`)
      }
      setResult(parts.join(' '))
      setReceived('')
      setDamaged('0')
      setExpected('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (products.length === 0) {
    return (
      <div>
        <PageHeader title="Receive Inventory" />
        <Card>
          <EmptyState
            message="No products yet. Add a product before receiving stock — every movement has to belong to a SKU."
            action={
              <Link to="/products" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--series-aqua)' }}>
                Add products
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Receive Inventory"
        description="Books incoming stock into the ledger. Damaged units are recorded separately so they never count as sellable, and a short delivery is flagged rather than absorbed."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Receipt" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Against purchase order (optional)">
              <Select value={poId} onChange={applyPo} options={openPos.map((p) => ({ value: String(p.id), label: `${p.poNumber} — ${p.supplier ?? 'no supplier'}` }))} placeholder="— none —" />
            </Field>
            <Field label="Product">
              <Select value={productId} onChange={setProductId} options={productOptions(products)} />
            </Field>
            <Field label="Destination location">
              <Select value={locationId} onChange={setLocationId} options={locationOptions(locations, ['warehouse', 'shelf'])} />
            </Field>
            <Field label="Supplier / source">
              <TextInput value={supplier} onChange={setSupplier} placeholder="ABC Supplier" />
            </Field>
            <Field label="Expected quantity" hint="Leave blank if there is nothing to compare against.">
              <TextInput value={expected} onChange={setExpected} type="number" min={0} />
            </Field>
            <Field label="Received quantity">
              <TextInput value={received} onChange={setReceived} type="number" min={0} />
            </Field>
            <Field label="Of which damaged" hint="Booked as DAMAGED, not available.">
              <TextInput value={damaged} onChange={setDamaged} type="number" min={0} />
            </Field>
            <Field label="Unit cost (₱)" hint="Cost, not selling price — this drives inventory value.">
              <TextInput value={unitCost} onChange={setUnitCost} type="number" min={0} />
            </Field>
            <Field label="Reference / PO number">
              <TextInput value={reference} onChange={setReference} placeholder="PO-2026-091" />
            </Field>
            <Field label="Batch number (optional)">
              <TextInput value={batchNo} onChange={setBatchNo} />
            </Field>
            <Field label="Expiry date (optional)">
              <TextInput value={expiry} onChange={setExpiry} type="date" />
            </Field>
            <Field label="Received by">
              <TextInput value={user} onChange={setUser} placeholder="Your name" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <TextArea value={notes} onChange={setNotes} />
              </Field>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {error && <ErrorNote>{error}</ErrorNote>}
            {result && <SuccessNote>{result}</SuccessNote>}
            <div>
              <SubmitButton label="Receive" onClick={submit} busy={busy} />
            </div>
          </div>
        </Card>

        <Card title="Recent receipts">
          {recentReceipts.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Nothing received yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentReceipts.map((m) => (
                <div key={m.id} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      +{formatNumber(m.quantity)} {productById.get(m.productId)?.sku ?? '—'}
                    </span>
                    <span style={{ color: m.toState === 'DAMAGED' ? 'var(--status-critical)' : 'var(--status-good)' }}>{m.toState}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(m.timestamp)} · {locationById.get(m.toLocationId ?? -1)?.name ?? '—'}
                    {m.unitCost != null && ` · ${formatCurrency(m.unitCost)}/unit`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
