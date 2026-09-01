import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatDate, formatDateTime, formatNumber } from '../../lib/format'
import { receiveRts, inspectRts } from '../../lib/warehouse/operations'
import { getWarehouseUser, setWarehouseUser } from '../../lib/warehouse/db'
import { useWarehouseTables } from './hooks'
import { Field, TextInput, Select, SubmitButton, ErrorNote, SuccessNote, productOptions, locationOptions } from './FormBits'
import type { RtsInspectionResult } from '../../lib/warehouse/types'

const RESULTS: { key: Exclude<RtsInspectionResult, null>; label: string; hint: string; color: string }[] = [
  { key: 'GOOD', label: 'Good', hint: '→ back to available stock', color: 'var(--status-good)' },
  { key: 'DAMAGED', label: 'Damaged', hint: '→ damaged, not sellable', color: 'var(--status-critical)' },
  { key: 'DEFECTIVE', label: 'Defective', hint: '→ defective, needs action', color: 'var(--status-critical)' },
  { key: 'MISSING_PARTS', label: 'Missing parts', hint: '→ quarantine', color: 'var(--status-warning)' },
  { key: 'UNSELLABLE', label: 'Unsellable', hint: '→ disposed, written off', color: 'var(--text-muted)' },
]

export default function Rts() {
  const { products, locations, rtsReturns } = useWarehouseTables()

  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [tracking, setTracking] = useState('')
  const [orderId, setOrderId] = useState('')
  const [customer, setCustomer] = useState('')
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [user, setUser] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const [inspectNotes, setInspectNotes] = useState<Record<number, string>>({})

  useEffect(() => {
    getWarehouseUser().then(setUser)
  }, [])

  const productById = useMemo(() => new Map(products.filter((p) => p.id != null).map((p) => [p.id!, p])), [products])
  const pending = useMemo(
    () => rtsReturns.filter((r) => r.status === 'FOR_INSPECTION').sort((a, b) => (b.returnDate ?? '').localeCompare(a.returnDate ?? '')),
    [rtsReturns],
  )
  const inspected = useMemo(
    () => rtsReturns.filter((r) => r.status === 'INSPECTED').sort((a, b) => (b.inspectionDate ?? '').localeCompare(a.inspectionDate ?? '')).slice(0, 20),
    [rtsReturns],
  )

  async function submitReturn() {
    setError(null)
    setResult(null)
    const pid = Number(productId)
    const wid = Number(warehouseId)
    const qty = Number(quantity)
    if (!pid || !wid) return setError('Pick a product and the warehouse receiving the return.')
    if (!Number.isFinite(qty) || qty <= 0) return setError('Quantity must be greater than zero.')

    setBusy(true)
    try {
      if (user.trim()) await setWarehouseUser(user.trim())
      await receiveRts({
        productId: pid,
        quantity: qty,
        warehouseLocationId: wid,
        fulfillmentLocationId: partnerId ? Number(partnerId) : null,
        trackingNumber: tracking.trim() || null,
        orderId: orderId.trim() || null,
        customer: customer.trim() || null,
        originalShipDate: null,
        returnDate: returnDate || null,
        returnReason: reason.trim() || null,
        fulfillmentPartner: partnerId ? locations.find((l) => String(l.id) === partnerId)?.name ?? null : null,
        user: user.trim(),
      })
      setResult(`Booked ${formatNumber(qty)} unit(s) as FOR INSPECTION. They are not sellable until inspected.`)
      setTracking('')
      setOrderId('')
      setCustomer('')
      setQuantity('1')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function doInspect(rtsId: number, res: Exclude<RtsInspectionResult, null>) {
    setError(null)
    setResult(null)
    try {
      await inspectRts({ rtsId, result: res, inspector: user.trim(), notes: inspectNotes[rtsId]?.trim() || null })
      setResult(`Inspection recorded as ${res}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="RTS / Returns"
        description="Returned parcels come back as FOR INSPECTION — never straight into sellable stock. Inspecting one is what decides where those units actually go."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Awaiting inspection" value={formatNumber(pending.length)} accent="var(--status-warning)" />
        <StatTile label="Units awaiting" value={formatNumber(pending.reduce((s, r) => s + r.quantity, 0))} accent="var(--status-warning)" />
        <StatTile label="Inspected (recent)" value={formatNumber(inspected.length)} accent="var(--status-good)" />
        <StatTile label="Returns logged" value={formatNumber(rtsReturns.length)} />
      </div>

      {error && <div className="mb-3"><ErrorNote>{error}</ErrorNote></div>}
      {result && <div className="mb-3"><SuccessNote>{result}</SuccessNote></div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Log a return" className="lg:col-span-1">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Product">
              <Select value={productId} onChange={setProductId} options={productOptions(products)} />
            </Field>
            <Field label="Received into">
              <Select value={warehouseId} onChange={setWarehouseId} options={locationOptions(locations, ['warehouse', 'shelf'])} />
            </Field>
            <Field label="Returned from partner" hint="Optional — deducts from that partner's holding.">
              <Select value={partnerId} onChange={setPartnerId} options={locationOptions(locations, ['fulfillment'])} placeholder="— not tracked —" />
            </Field>
            <Field label="Quantity">
              <TextInput value={quantity} onChange={setQuantity} type="number" min={1} />
            </Field>
            <Field label="Tracking number">
              <TextInput value={tracking} onChange={setTracking} />
            </Field>
            <Field label="Order ID">
              <TextInput value={orderId} onChange={setOrderId} />
            </Field>
            <Field label="Customer">
              <TextInput value={customer} onChange={setCustomer} />
            </Field>
            <Field label="Return date">
              <TextInput value={returnDate} onChange={setReturnDate} type="date" />
            </Field>
            <Field label="Return reason">
              <TextInput value={reason} onChange={setReason} placeholder="Customer refused, wrong address…" />
            </Field>
            <Field label="Received by">
              <TextInput value={user} onChange={setUser} placeholder="Your name" />
            </Field>
            <SubmitButton label="Log return" onClick={submitReturn} busy={busy} />
          </div>
        </Card>

        <Card title="Awaiting inspection" description="Each one is holding units out of sellable stock until you decide." className="lg:col-span-2">
          {pending.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Nothing waiting for inspection.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map((r) => (
                <div key={r.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {r.trackingNumber ?? r.orderId ?? `Return #${r.id}`} · {formatNumber(r.quantity)} unit(s)
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {r.productId != null ? productById.get(r.productId)?.sku ?? '—' : 'no product'} ·{' '}
                        {r.customer ?? 'no customer'} · returned {formatDate(r.returnDate)}
                        {r.returnReason ? ` · ${r.returnReason}` : ''}
                      </div>
                    </div>
                  </div>
                  <input
                    value={inspectNotes[r.id!] ?? ''}
                    onChange={(e) => setInspectNotes((prev) => ({ ...prev, [r.id!]: e.target.value }))}
                    placeholder="Inspection notes (optional)"
                    className="mb-2 w-full rounded-lg border px-2.5 py-1.5 text-xs"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {RESULTS.map((res) => (
                      <button
                        key={res.key}
                        onClick={() => doInspect(r.id!, res.key)}
                        title={res.hint}
                        className="rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                        style={{ borderColor: 'var(--border-hairline)', color: res.color }}
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {inspected.length > 0 && (
        <Card title="Recently inspected" className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['Tracking', 'Product', 'Qty', 'Result', 'Inspector', 'When', 'Notes'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspected.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{r.trackingNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{r.productId != null ? productById.get(r.productId)?.sku ?? '—' : '—'}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(r.quantity)}</td>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: r.inspectionResult === 'GOOD' ? 'var(--status-good)' : 'var(--status-critical)' }}>
                      {r.inspectionResult}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.inspector ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(r.inspectionDate)}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{r.inspectionNotes ?? '—'}</td>
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
