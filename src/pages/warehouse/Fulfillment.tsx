import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatNumber } from '../../lib/format'
import { sendToFulfillment } from '../../lib/warehouse/operations'
import { balanceAt, stateTotal } from '../../lib/warehouse/inventory'
import { getWarehouseUser, setWarehouseUser } from '../../lib/warehouse/db'
import { useInventory } from './hooks'
import { Field, TextInput, TextArea, Select, SubmitButton, ErrorNote, SuccessNote, productOptions, locationOptions } from './FormBits'

export default function Fulfillment() {
  const { products, locations, balances } = useInventory()

  const [productId, setProductId] = useState('')
  const [fromLocationId, setFromLocationId] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [user, setUser] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    getWarehouseUser().then(setUser)
  }, [])

  const partners = useMemo(() => locations.filter((l) => l.kind === 'fulfillment'), [locations])

  const availableHere =
    productId && fromLocationId ? balanceAt(balances, Number(productId), Number(fromLocationId), 'AVAILABLE') : null

  // What each partner is currently holding, per product — the "where is my
  // stock" half of the question the warehouse dashboard has to answer.
  const partnerHoldings = useMemo(
    () =>
      partners.map((partner) => ({
        partner,
        lines: products
          .filter((p) => p.id != null)
          .map((p) => ({ product: p, qty: balanceAt(balances, p.id!, partner.id!, 'IN_FULFILLMENT') }))
          .filter((l) => l.qty !== 0),
      })),
    [partners, products, balances],
  )

  async function submit() {
    setError(null)
    setResult(null)
    const pid = Number(productId)
    const from = Number(fromLocationId)
    const to = Number(partnerId)
    const qty = Number(quantity)
    if (!pid || !from || !to) return setError('Pick a product, a source location and a fulfillment partner.')
    if (!Number.isFinite(qty) || qty <= 0) return setError('Quantity must be greater than zero.')

    setBusy(true)
    try {
      if (user.trim()) await setWarehouseUser(user.trim())
      await sendToFulfillment({
        productId: pid,
        quantity: qty,
        fromLocationId: from,
        fulfillmentLocationId: to,
        reference: reference.trim() || null,
        user: user.trim(),
        notes: notes.trim() || null,
      })
      setResult(`Sent ${formatNumber(qty)} units. Warehouse available went down, partner holding went up — one atomic movement.`)
      setQuantity('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Fulfillment"
        description="Moves stock from your warehouse to a fulfillment partner. It leaves AVAILABLE and becomes IN FULFILLMENT — still yours, still counted, just not in your building."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Send to fulfillment">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Product">
              <Select value={productId} onChange={setProductId} options={productOptions(products)} />
            </Field>
            <Field label="From location">
              <Select value={fromLocationId} onChange={setFromLocationId} options={locationOptions(locations, ['warehouse', 'shelf'])} />
            </Field>
            <Field label="Fulfillment partner">
              <Select value={partnerId} onChange={setPartnerId} options={locationOptions(locations, ['fulfillment'])} />
            </Field>
            <Field
              label="Quantity"
              hint={availableHere != null ? `${formatNumber(availableHere)} available at the selected location` : undefined}
            >
              <TextInput value={quantity} onChange={setQuantity} type="number" min={0} />
            </Field>
            <Field label="Reference / shipment no.">
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
          <div className="mt-4 flex flex-col gap-3">
            {error && <ErrorNote>{error}</ErrorNote>}
            {result && <SuccessNote>{result}</SuccessNote>}
            <div>
              <SubmitButton label="Send to fulfillment" onClick={submit} busy={busy} />
            </div>
          </div>
        </Card>

        <Card title="Stock held by fulfillment partners" description="Company-wide inventory includes what partners are holding for you.">
          {partnerHoldings.every((p) => p.lines.length === 0) ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No stock with any fulfillment partner yet.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {partnerHoldings
                .filter((p) => p.lines.length > 0)
                .map(({ partner, lines }) => (
                  <div key={partner.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {partner.name}
                      </span>
                      <span className="text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                        {formatNumber(lines.reduce((s, l) => s + l.qty, 0))} units
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {lines.map(({ product, qty }) => (
                        <div key={product.id} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: 'var(--border-hairline)' }}>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {product.sku} — {product.name}
                          </span>
                          <span className="tabular font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatNumber(qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Total in fulfillment across all partners:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {formatNumber(products.reduce((s, p) => s + (p.id != null ? stateTotal(balances, p.id, 'IN_FULFILLMENT') : 0), 0))}
            </strong>{' '}
            units
          </p>
        </Card>
      </div>
    </div>
  )
}
