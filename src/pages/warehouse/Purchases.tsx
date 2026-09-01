import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatCurrency, formatDate, formatNumber } from '../../lib/format'
import { warehouseDb } from '../../lib/warehouse/db'
import { logWarehouseAudit } from '../../lib/warehouse/inventory'
import { useInventory } from './hooks'
import { Field, TextInput, Select, SubmitButton, ErrorNote, SuccessNote, productOptions } from './FormBits'

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'var(--text-muted)',
  ORDERED: 'var(--series-blue)',
  PARTIALLY_RECEIVED: 'var(--status-warning)',
  RECEIVED: 'var(--status-good)',
  CANCELLED: 'var(--text-muted)',
}

export default function Purchases() {
  const { rows, products, purchaseOrders, purchaseOrderItems } = useInventory()

  const [poNumber, setPoNumber] = useState('')
  const [supplier, setSupplier] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const toBuy = useMemo(() => rows.filter((r) => r.suggestedBuy > 0).sort((a, b) => b.suggestedBuy - a.suggestedBuy), [rows])
  const productById = useMemo(() => new Map(products.filter((p) => p.id != null).map((p) => [p.id!, p])), [products])

  const poRows = useMemo(
    () =>
      purchaseOrders
        .map((po) => {
          const items = purchaseOrderItems.filter((i) => i.poId === po.id)
          const ordered = items.reduce((s, i) => s + i.quantityOrdered, 0)
          const received = items.reduce((s, i) => s + i.quantityReceived, 0)
          const value = items.reduce((s, i) => s + i.quantityOrdered * (i.unitCost ?? 0), 0)
          return { po, items, ordered, received, remaining: Math.max(0, ordered - received), value }
        })
        .sort((a, b) => b.po.createdAt.localeCompare(a.po.createdAt)),
    [purchaseOrders, purchaseOrderItems],
  )

  const totalIncoming = useMemo(() => rows.reduce((s, r) => s + r.stock.incoming, 0), [rows])

  async function createPo() {
    setError(null)
    setResult(null)
    const pid = Number(productId)
    const qty = Number(quantity)
    if (!poNumber.trim()) return setError('PO number is required.')
    if (!pid) return setError('Pick a product.')
    if (!Number.isFinite(qty) || qty <= 0) return setError('Quantity must be greater than zero.')

    setBusy(true)
    try {
      const poId = await warehouseDb.purchaseOrders.add({
        poNumber: poNumber.trim(),
        supplier: supplier.trim() || null,
        status: 'ORDERED',
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDate: expectedDate || null,
        notes: null,
        createdAt: new Date().toISOString(),
      })
      await warehouseDb.purchaseOrderItems.add({
        poId,
        productId: pid,
        quantityOrdered: qty,
        quantityReceived: 0,
        unitCost: unitCost.trim() === '' ? null : Number(unitCost),
      })
      await logWarehouseAudit({ entity: 'purchaseOrder', entityId: poId, action: 'Created', newValue: { poNumber: poNumber.trim(), quantity: qty } })
      setResult(`${poNumber.trim()} created. Those ${formatNumber(qty)} units now count as incoming, not available.`)
      setPoNumber('')
      setQuantity('')
      setUnitCost('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('Key already exists') || msg.includes('ConstraintError') ? `PO number "${poNumber.trim()}" already exists.` : msg)
    } finally {
      setBusy(false)
    }
  }

  async function cancelPo(poId: number) {
    if (!window.confirm('Cancel this purchase order? Its outstanding units stop counting as incoming.')) return
    const po = await warehouseDb.purchaseOrders.get(poId)
    await warehouseDb.purchaseOrders.update(poId, { status: 'CANCELLED' })
    await logWarehouseAudit({ entity: 'purchaseOrder', entityId: poId, action: 'Cancelled', previousValue: { status: po?.status } })
  }

  return (
    <div>
      <PageHeader
        title="Purchases & Reorder"
        description="What to buy and what is already on the way. Suggested quantities subtract reservations and credit open POs, so a product already ordered is not ordered twice."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="SKUs to reorder" value={formatNumber(toBuy.length)} accent="var(--status-warning)" />
        <StatTile label="Units incoming" value={formatNumber(totalIncoming)} accent="var(--series-blue)" />
        <StatTile label="Open POs" value={formatNumber(poRows.filter((p) => p.po.status === 'ORDERED' || p.po.status === 'PARTIALLY_RECEIVED').length)} />
        <StatTile
          label="Open PO value"
          value={formatCurrency(poRows.filter((p) => p.po.status === 'ORDERED' || p.po.status === 'PARTIALLY_RECEIVED').reduce((s, p) => s + p.value, 0))}
        />
      </div>

      <Card title="Reorder center" description="Effective stock = available − reserved + incoming. Anything at or below its reorder point appears here." className="mb-4">
        {toBuy.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--status-good)' }}>
            Nothing needs reordering. Products without a target stock level are skipped — set one to include them.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['Product', 'Available', 'Reserved', 'Incoming', 'Effective', 'Reorder pt', 'Target', 'Suggested buy', 'Status'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {toBuy.map((r) => (
                  <tr key={r.product.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                      {r.product.sku} — {r.product.name}
                    </td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(r.stock.available)}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(r.stock.reserved)}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(r.stock.incoming)}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>
                      {formatNumber(r.stock.available - r.stock.reserved + r.stock.incoming)}
                    </td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{r.product.reorderPoint ?? '—'}</td>
                    <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{r.product.targetStockLevel ?? '—'}</td>
                    <td className="px-3 py-2 text-xs tabular font-semibold" style={{ color: 'var(--series-aqua)' }}>{formatNumber(r.suggestedBuy)}</td>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: r.status === 'OUT_OF_STOCK' ? 'var(--status-critical)' : 'var(--status-warning)' }}>
                      {r.status === 'OUT_OF_STOCK' ? 'URGENT' : 'BUY'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Raise a purchase order" className="lg:col-span-1">
          <div className="grid grid-cols-1 gap-3">
            <Field label="PO number">
              <TextInput value={poNumber} onChange={setPoNumber} placeholder="PO-2026-001" />
            </Field>
            <Field label="Supplier">
              <TextInput value={supplier} onChange={setSupplier} />
            </Field>
            <Field label="Product">
              <Select value={productId} onChange={setProductId} options={productOptions(products)} />
            </Field>
            <Field label="Quantity">
              <TextInput value={quantity} onChange={setQuantity} type="number" min={0} />
            </Field>
            <Field label="Unit cost (₱)">
              <TextInput value={unitCost} onChange={setUnitCost} type="number" min={0} />
            </Field>
            <Field label="Expected date">
              <TextInput value={expectedDate} onChange={setExpectedDate} type="date" />
            </Field>
            {error && <ErrorNote>{error}</ErrorNote>}
            {result && <SuccessNote>{result}</SuccessNote>}
            <SubmitButton label="Create PO" onClick={createPo} busy={busy} />
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Receiving against a PO happens on the Receive page — that is what turns incoming into available.
            </p>
          </div>
        </Card>

        <Card title="Purchase orders" className="lg:col-span-2">
          {poRows.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No purchase orders yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                    {['PO', 'Supplier', 'Product', 'Ordered', 'Received', 'Remaining', 'Expected', 'Status', ''].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {poRows.map(({ po, items, ordered, received, remaining }) => {
                    const overdue =
                      (po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') &&
                      po.expectedDate != null &&
                      po.expectedDate < new Date().toISOString().slice(0, 10)
                    return (
                      <tr key={po.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                        <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{po.poNumber}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{po.supplier ?? '—'}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {items.map((i) => productById.get(i.productId)?.sku ?? '—').join(', ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(ordered)}</td>
                        <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(received)}</td>
                        <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(remaining)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: overdue ? 'var(--status-critical)' : 'var(--text-muted)' }}>
                          {formatDate(po.expectedDate)}
                          {overdue ? ' (overdue)' : ''}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium" style={{ color: STATUS_COLOR[po.status] }}>
                          {po.status.replace('_', ' ')}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                            <button onClick={() => cancelPo(po.id!)} className="text-xs" style={{ color: 'var(--status-critical)' }}>
                              Cancel
                            </button>
                          )}
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
    </div>
  )
}
