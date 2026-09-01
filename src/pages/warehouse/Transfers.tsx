import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatDateTime, formatNumber } from '../../lib/format'
import { sendTransfer, receiveTransfer } from '../../lib/warehouse/operations'
import { balanceAt } from '../../lib/warehouse/inventory'
import { getWarehouseUser, setWarehouseUser } from '../../lib/warehouse/db'
import { useInventory } from './hooks'
import { Field, TextInput, TextArea, Select, SubmitButton, ErrorNote, SuccessNote, productOptions, locationOptions } from './FormBits'

export default function Transfers() {
  const { products, locations, movements, balances } = useInventory()

  const [productId, setProductId] = useState('')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [user, setUser] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const [recvQty, setRecvQty] = useState<Record<string, string>>({})

  useEffect(() => {
    getWarehouseUser().then(setUser)
  }, [])

  const productById = useMemo(() => new Map(products.filter((p) => p.id != null).map((p) => [p.id!, p])), [products])
  const locationById = useMemo(() => new Map(locations.filter((l) => l.id != null).map((l) => [l.id!, l])), [locations])

  const availableAtSource = productId && fromId ? balanceAt(balances, Number(productId), Number(fromId), 'AVAILABLE') : null

  // Anything sitting in IN_TRANSIT at a destination is a transfer that was
  // sent but never booked in — exactly what must not silently vanish.
  const inTransit = useMemo(() => {
    const out: { productId: number; locationId: number; qty: number }[] = []
    for (const p of products) {
      if (p.id == null) continue
      for (const l of locations) {
        if (l.id == null) continue
        const qty = balanceAt(balances, p.id, l.id, 'IN_TRANSIT')
        if (qty > 0) out.push({ productId: p.id, locationId: l.id, qty })
      }
    }
    return out
  }, [products, locations, balances])

  const recentTransfers = useMemo(
    () => movements.filter((m) => m.type === 'TRANSFER_OUT' || m.type === 'TRANSFER_IN').sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 15),
    [movements],
  )

  async function submitSend() {
    setError(null)
    setResult(null)
    const pid = Number(productId)
    const from = Number(fromId)
    const to = Number(toId)
    const qty = Number(quantity)
    if (!pid || !from || !to) return setError('Pick a product, a source and a destination.')
    if (from === to) return setError('Source and destination must be different locations.')
    if (!Number.isFinite(qty) || qty <= 0) return setError('Quantity must be greater than zero.')

    setBusy(true)
    try {
      if (user.trim()) await setWarehouseUser(user.trim())
      await sendTransfer({
        productId: pid,
        quantity: qty,
        fromLocationId: from,
        toLocationId: to,
        reference: reference.trim() || null,
        user: user.trim(),
        notes: notes.trim() || null,
      })
      setResult(`${formatNumber(qty)} units are now IN TRANSIT. They will not count at the destination until received.`)
      setQuantity('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function submitReceive(pid: number, lid: number, sent: number) {
    setError(null)
    setResult(null)
    const key = `${pid}|${lid}`
    const received = Number(recvQty[key] ?? sent)
    if (!Number.isFinite(received) || received < 0) return setError('Received quantity must be zero or more.')
    if (received > sent) return setError(`Cannot receive more than the ${formatNumber(sent)} units in transit.`)

    try {
      const res = await receiveTransfer({
        productId: pid,
        sentQuantity: sent,
        receivedQuantity: received,
        toLocationId: lid,
        reference: null,
        user: user.trim(),
        notes: null,
      })
      setResult(
        res.missing > 0
          ? `Received ${formatNumber(received)}. Transfer discrepancy: ${formatNumber(res.missing)} unit(s) recorded as MISSING for investigation.`
          : `Received ${formatNumber(received)} units into available stock.`,
      )
      setRecvQty((prev) => ({ ...prev, [key]: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="Transfers"
        description="Stock moved between locations sits in IN TRANSIT until someone receives it, so it is never counted in two places — and a shortfall on arrival becomes a recorded discrepancy."
      />

      {error && <div className="mb-3"><ErrorNote>{error}</ErrorNote></div>}
      {result && <div className="mb-3"><SuccessNote>{result}</SuccessNote></div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Send a transfer">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Product">
              <Select value={productId} onChange={setProductId} options={productOptions(products)} />
            </Field>
            <Field label="From">
              <Select value={fromId} onChange={setFromId} options={locationOptions(locations, ['warehouse', 'shelf'])} />
            </Field>
            <Field label="To">
              <Select value={toId} onChange={setToId} options={locationOptions(locations, ['warehouse', 'shelf'])} />
            </Field>
            <Field label="Quantity" hint={availableAtSource != null ? `${formatNumber(availableAtSource)} available at source` : undefined}>
              <TextInput value={quantity} onChange={setQuantity} type="number" min={0} />
            </Field>
            <Field label="Reference">
              <TextInput value={reference} onChange={setReference} />
            </Field>
            <Field label="Sent by">
              <TextInput value={user} onChange={setUser} placeholder="Your name" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <TextArea value={notes} onChange={setNotes} />
              </Field>
            </div>
          </div>
          <div className="mt-4">
            <SubmitButton label="Send transfer" onClick={submitSend} busy={busy} />
          </div>
        </Card>

        <Card title="In transit — awaiting receipt">
          {inTransit.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Nothing in transit.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {inTransit.map(({ productId: pid, locationId: lid, qty }) => {
                const key = `${pid}|${lid}`
                return (
                  <div key={key} className="rounded-lg border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
                    <div className="mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <strong>{formatNumber(qty)}</strong> × {productById.get(pid)?.sku ?? '—'} → {locationById.get(lid)?.name ?? '—'}
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Field label="Actually received">
                          <TextInput
                            value={recvQty[key] ?? String(qty)}
                            onChange={(v) => setRecvQty((prev) => ({ ...prev, [key]: v }))}
                            type="number"
                            min={0}
                          />
                        </Field>
                      </div>
                      <button
                        onClick={() => submitReceive(pid, lid, qty)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: 'var(--series-aqua)' }}
                      >
                        Receive
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Card title="Recent transfer movements" className="mt-4">
        {recentTransfers.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No transfers yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['When', 'Product', 'Qty', 'From', 'To', 'State'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTransfers.map((m) => (
                  <tr key={m.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDateTime(m.timestamp)}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{productById.get(m.productId)?.sku ?? '—'}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(m.quantity)}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {m.fromLocationId != null ? `${locationById.get(m.fromLocationId)?.name ?? '—'} / ${m.fromState}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {m.toLocationId != null ? locationById.get(m.toLocationId)?.name ?? '—' : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: m.toState === 'MISSING' ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                      {m.toState}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
