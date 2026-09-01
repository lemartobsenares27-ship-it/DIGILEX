import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart,
  Truck,
  Wallet,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  PackagePlus,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatCurrency, formatDate, formatNumber } from '../../lib/format'
import { warehouseDb } from '../../lib/warehouse/db'
import { logWarehouseAudit } from '../../lib/warehouse/inventory'
import { useInventory, type ProductRowWithStock } from './hooks'
import { Field, TextInput, TextArea, Select, SubmitButton, ErrorNote, SuccessNote, productOptions } from './FormBits'
import { CatalogueEmptyState } from './CatalogueLoader'

const STATUS_STYLE: Record<string, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  DRAFT: { label: 'Draft', color: 'var(--text-muted)', Icon: CircleDashed },
  ORDERED: { label: 'Ordered', color: 'var(--series-blue)', Icon: Truck },
  PARTIALLY_RECEIVED: { label: 'Part received', color: 'var(--status-warning-ink)', Icon: AlertTriangle },
  RECEIVED: { label: 'Received', color: 'var(--status-good-ink)', Icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'var(--text-muted)', Icon: CircleSlash },
}

const OPEN = ['ORDERED', 'PARTIALLY_RECEIVED']

interface DraftLine {
  productId: number
  quantity: number
  unitCost: number | null
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.DRAFT
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: s.color, background: `color-mix(in srgb, ${s.color} 14%, transparent)` }}
    >
      <s.Icon size={11} /> {s.label}
    </span>
  )
}

/** Received against ordered, so a part-received PO reads at a glance. */
function ReceiveProgress({ ordered, received }: { ordered: number; received: number }) {
  const pct = ordered > 0 ? Math.min(100, (received / ordered) * 100) : 0
  const color = received === 0 ? 'var(--series-blue)' : received >= ordered ? 'var(--status-good-ink)' : 'var(--status-warning-ink)'
  return (
    <div className="w-24">
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}
        title={`${formatNumber(received)} of ${formatNumber(ordered)} received`}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-1 text-[10px] tabular" style={{ color: 'var(--text-muted)' }}>
        {formatNumber(received)} / {formatNumber(ordered)}
      </div>
    </div>
  )
}

export default function Purchases() {
  const { rows, products, purchaseOrders, purchaseOrderItems } = useInventory()

  const [poNumber, setPoNumber] = useState('')
  const [supplier, setSupplier] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showClosed, setShowClosed] = useState(false)

  const productById = useMemo(() => new Map(products.filter((p) => p.id != null).map((p) => [p.id!, p])), [products])
  const rowByProduct = useMemo(() => new Map(rows.map((r) => [r.product.id!, r])), [rows])

  const toBuy = useMemo(() => rows.filter((r) => r.suggestedBuy > 0).sort((a, b) => b.suggestedBuy - a.suggestedBuy), [rows])

  const poRows = useMemo(
    () =>
      purchaseOrders
        .map((po) => {
          const items = purchaseOrderItems.filter((i) => i.poId === po.id)
          const ordered = items.reduce((s, i) => s + i.quantityOrdered, 0)
          const received = items.reduce((s, i) => s + i.quantityReceived, 0)
          const value = items.reduce((s, i) => s + i.quantityOrdered * (i.unitCost ?? 0), 0)
          const costed = items.every((i) => i.unitCost != null)
          const overdue =
            OPEN.includes(po.status) && po.expectedDate != null && po.expectedDate < new Date().toISOString().slice(0, 10)
          return { po, items, ordered, received, remaining: Math.max(0, ordered - received), value, costed, overdue }
        })
        .sort((a, b) => {
          const aOpen = OPEN.includes(a.po.status) ? 0 : 1
          const bOpen = OPEN.includes(b.po.status) ? 0 : 1
          return aOpen - bOpen || b.po.createdAt.localeCompare(a.po.createdAt)
        }),
    [purchaseOrders, purchaseOrderItems],
  )

  const visiblePos = useMemo(() => (showClosed ? poRows : poRows.filter((p) => OPEN.includes(p.po.status))), [poRows, showClosed])
  const openPos = useMemo(() => poRows.filter((p) => OPEN.includes(p.po.status)), [poRows])
  const overdueCount = openPos.filter((p) => p.overdue).length
  const totalIncoming = useMemo(() => rows.reduce((s, r) => s + r.stock.incoming, 0), [rows])
  const suggestedSpend = useMemo(
    () => toBuy.reduce((s, r) => s + r.suggestedBuy * (r.product.unitCost ?? 0), 0),
    [toBuy],
  )

  const draftValue = lines.reduce((s, l) => s + l.quantity * (l.unitCost ?? 0), 0)

  function addLine() {
    setError(null)
    setResult(null)
    const pid = Number(productId)
    const qty = Number(quantity)
    if (!pid) return setError('Pick a product for this line.')
    if (!Number.isFinite(qty) || qty <= 0) return setError('Line quantity must be greater than zero.')
    if (lines.some((l) => l.productId === pid)) return setError('That product is already on this PO — remove the line to change it.')
    const fallbackCost = productById.get(pid)?.unitCost ?? null
    setLines((ls) => [...ls, { productId: pid, quantity: qty, unitCost: unitCost.trim() === '' ? fallbackCost : Number(unitCost) }])
    setProductId('')
    setQuantity('')
    setUnitCost('')
  }

  /** Pre-fills the line form from a reorder suggestion — the whole point of the reorder list. */
  function draftFromSuggestion(r: ProductRowWithStock) {
    setError(null)
    setResult(null)
    setProductId(String(r.product.id))
    setQuantity(String(r.suggestedBuy))
    setUnitCost(r.product.unitCost != null ? String(r.product.unitCost) : '')
    if (!supplier && r.product.supplier) setSupplier(r.product.supplier)
    if (!poNumber) setPoNumber(`PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(purchaseOrders.length + 1).padStart(3, '0')}`)
  }

  async function createPo() {
    setError(null)
    setResult(null)
    if (!poNumber.trim()) return setError('PO number is required.')
    if (lines.length === 0) return setError('Add at least one line before creating the PO.')

    setBusy(true)
    try {
      const poId = await warehouseDb.purchaseOrders.add({
        poNumber: poNumber.trim(),
        supplier: supplier.trim() || null,
        status: 'ORDERED',
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDate: expectedDate || null,
        notes: notes.trim() || null,
        createdAt: new Date().toISOString(),
      })
      for (const l of lines) {
        await warehouseDb.purchaseOrderItems.add({
          poId,
          productId: l.productId,
          quantityOrdered: l.quantity,
          quantityReceived: 0,
          unitCost: l.unitCost,
        })
      }
      await logWarehouseAudit({
        entity: 'purchaseOrder',
        entityId: poId,
        action: 'Created',
        newValue: { poNumber: poNumber.trim(), lines: lines.length, units: lines.reduce((s, l) => s + l.quantity, 0) },
      })
      const units = lines.reduce((s, l) => s + l.quantity, 0)
      setResult(
        `${poNumber.trim()} created with ${formatNumber(lines.length)} line(s). Those ${formatNumber(units)} units now count as incoming, not available — receiving them is what makes them sellable.`,
      )
      setPoNumber('')
      setSupplier('')
      setExpectedDate('')
      setNotes('')
      setLines([])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(
        msg.includes('Key already exists') || msg.includes('ConstraintError')
          ? `PO number "${poNumber.trim()}" already exists.`
          : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  async function cancelPo(poId: number) {
    if (!window.confirm('Cancel this purchase order? Its outstanding units stop counting as incoming. The record is kept, not deleted.')) return
    const po = await warehouseDb.purchaseOrders.get(poId)
    await warehouseDb.purchaseOrders.update(poId, { status: 'CANCELLED' })
    await logWarehouseAudit({ entity: 'purchaseOrder', entityId: poId, action: 'Cancelled', previousValue: { status: po?.status } })
  }

  if (products.length === 0) {
    return (
      <div>
        <PageHeader title="Purchases & Reorder" description="What to buy and what is already on the way." />
        <Card>
          <CatalogueEmptyState
            heading="Nothing to purchase against yet"
            message="Reorder suggestions and purchase orders both hang off products, and there are none. Load the catalogue transcribed from your real supplier orders — it brings its open purchase orders with it — or add products by hand on the Products page."
          />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Purchases & Reorder"
        description="What to buy and what is already on the way. Suggested quantities subtract reservations and credit open POs, so a product already ordered is not ordered twice."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="SKUs to reorder"
          value={formatNumber(toBuy.length)}
          icon={<ShoppingCart size={15} />}
          accent="var(--status-warning-ink)"
          sub={suggestedSpend > 0 ? `≈ ${formatCurrency(suggestedSpend)} at recorded costs` : 'Set a target stock level to include a SKU'}
        />
        <StatTile
          label="Units incoming"
          value={formatNumber(totalIncoming)}
          icon={<Truck size={15} />}
          accent="var(--series-blue)"
          sub="On open POs — counted as incoming, never as stock"
        />
        <StatTile
          label="Open POs"
          value={formatNumber(openPos.length)}
          icon={<PackagePlus size={15} />}
          accent="var(--series-aqua)"
          sub={overdueCount > 0 ? `${formatNumber(overdueCount)} past their expected date` : 'None past their expected date'}
        />
        <StatTile
          label="Open PO value"
          value={formatCurrency(openPos.reduce((s, p) => s + p.value, 0))}
          icon={<Wallet size={15} />}
          accent="var(--series-violet)"
          sub={openPos.some((p) => !p.costed) ? 'Excludes lines with no unit cost recorded' : 'At the costs on the PO lines'}
        />
      </div>

      <Card
        title="Reorder center"
        description="Effective stock = available − reserved + incoming. Anything at or below its reorder point appears here."
        className="mb-4"
      >
        {toBuy.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 size={20} style={{ color: 'var(--status-good-ink)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Nothing needs reordering right now.
            </p>
            <p className="max-w-md text-xs" style={{ color: 'var(--text-muted)' }}>
              Products with no target stock level are skipped entirely — set a reorder point and target on the{' '}
              <Link to="/products" style={{ color: 'var(--series-aqua)' }}>
                Products
              </Link>{' '}
              page to have them watched here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
                  {['Product', 'Available', 'Reserved', 'Incoming', 'Effective', 'Reorder pt', 'Target', 'Suggested buy', 'Est. cost', 'Priority', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {toBuy.map((r) => {
                  const urgent = r.status === 'OUT_OF_STOCK'
                  const color = urgent ? 'var(--status-critical)' : 'var(--status-warning-ink)'
                  return (
                    <tr key={r.product.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="min-w-[170px] px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                        <div className="font-medium">{r.product.sku}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{r.product.name}</div>
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatNumber(r.stock.available)}
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                        {formatNumber(r.stock.reserved)}
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                        {formatNumber(r.stock.incoming)}
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>
                        {formatNumber(r.stock.available - r.stock.reserved + r.stock.incoming)}
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                        {r.product.reorderPoint ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                        {r.product.targetStockLevel ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatNumber(r.suggestedBuy)}
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>
                        {r.product.unitCost == null ? (
                          <span style={{ color: 'var(--text-muted)' }}>cost not set</span>
                        ) : (
                          formatCurrency(r.suggestedBuy * r.product.unitCost)
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
                        >
                          <AlertTriangle size={11} /> {urgent ? 'Urgent — none sellable' : 'Below reorder point'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => draftFromSuggestion(r)}
                          className="whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-medium"
                          style={{ borderColor: 'var(--border-hairline)', color: 'var(--series-aqua)' }}
                        >
                          Draft PO line
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Raise a purchase order" description="Add one line per product, then create the PO." className="lg:col-span-1">
          <div className="grid grid-cols-1 gap-3">
            <Field label="PO number">
              <TextInput value={poNumber} onChange={setPoNumber} placeholder="PO-20260901-001" />
            </Field>
            <Field label="Supplier">
              <TextInput value={supplier} onChange={setSupplier} placeholder="Shopee — VILLAS BUDGETARIAN" />
            </Field>
            <Field label="Expected date">
              <TextInput value={expectedDate} onChange={setExpectedDate} type="date" />
            </Field>
            <Field label="Notes">
              <TextArea value={notes} onChange={setNotes} />
            </Field>

            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Add a line
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Field label="Product">
                  <Select value={productId} onChange={setProductId} options={productOptions(products)} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Quantity">
                    <TextInput value={quantity} onChange={setQuantity} type="number" min={0} />
                  </Field>
                  <Field label="Unit cost (₱)" hint="Blank uses the product's cost">
                    <TextInput value={unitCost} onChange={setUnitCost} type="number" min={0} />
                  </Field>
                </div>
                <button
                  onClick={addLine}
                  className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--series-aqua)' }}
                >
                  <Plus size={12} /> Add line
                </button>
              </div>
            </div>

            {lines.length > 0 && (
              <div className="rounded-lg border" style={{ borderColor: 'var(--border-hairline)' }}>
                {lines.map((l) => {
                  const p = productById.get(l.productId)
                  return (
                    <div
                      key={l.productId}
                      className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs last:border-0"
                      style={{ borderColor: 'var(--border-hairline)' }}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                          {p?.sku ?? '?'}
                        </div>
                        <div className="truncate" style={{ color: 'var(--text-muted)' }}>
                          {formatNumber(l.quantity)} × {l.unitCost == null ? 'cost not set' : formatCurrency(l.unitCost)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular" style={{ color: 'var(--text-primary)' }}>
                          {l.unitCost == null ? '—' : formatCurrency(l.quantity * l.unitCost)}
                        </span>
                        <button
                          onClick={() => setLines((ls) => ls.filter((x) => x.productId !== l.productId))}
                          aria-label="Remove line"
                          style={{ color: 'var(--status-critical)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                <div
                  className="flex items-center justify-between px-3 py-2 text-xs font-semibold"
                  style={{ color: 'var(--text-primary)', background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}
                >
                  <span>
                    {formatNumber(lines.length)} line{lines.length === 1 ? '' : 's'} ·{' '}
                    {formatNumber(lines.reduce((s, l) => s + l.quantity, 0))} units
                  </span>
                  <span className="tabular">{formatCurrency(draftValue)}</span>
                </div>
              </div>
            )}

            {error && <ErrorNote>{error}</ErrorNote>}
            {result && <SuccessNote>{result}</SuccessNote>}
            <SubmitButton label="Create PO" onClick={createPo} busy={busy} disabled={lines.length === 0} />
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Receiving against a PO happens on the{' '}
              <Link to="/receive" style={{ color: 'var(--series-aqua)' }}>
                Receive
              </Link>{' '}
              page — that is what turns incoming into available.
            </p>
          </div>
        </Card>

        <Card
          title="Purchase orders"
          description={showClosed ? 'Every PO ever raised, open first.' : 'Open orders. Closed and cancelled ones are hidden.'}
          className="lg:col-span-2"
          actions={
            <button
              onClick={() => setShowClosed((v) => !v)}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-medium"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
            >
              {showClosed ? 'Open only' : `Show all (${formatNumber(poRows.length)})`}
            </button>
          }
        >
          {visiblePos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <PackagePlus size={20} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {poRows.length === 0 ? 'No purchase orders yet.' : 'No open purchase orders.'}
              </p>
              <p className="max-w-md text-xs" style={{ color: 'var(--text-muted)' }}>
                {poRows.length === 0
                  ? 'Raise one on the left, or start from a row in the reorder center — “Draft PO line” fills the form for you. Until a PO exists, nothing counts as incoming.'
                  : 'Everything raised so far has been received or cancelled. Use “Show all” to see the history.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
                    {['', 'PO', 'Supplier', 'Lines', 'Received', 'Remaining', 'Value', 'Expected', 'Status', ''].map((h, i) => (
                      <th
                        key={i}
                        className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visiblePos.map(({ po, items, ordered, received, remaining, value, costed, overdue }) => {
                    const open = expanded === po.id
                    return (
                      <Fragment key={po.id}>
                        <tr
                          className="cursor-pointer border-t"
                          style={{ borderColor: 'var(--border-hairline)' }}
                          onClick={() => setExpanded(open ? null : po.id!)}
                        >
                          <td className="px-2 py-2" style={{ color: 'var(--text-muted)' }}>
                            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            {po.poNumber}
                            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              ordered {formatDate(po.orderDate)}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {po.supplier ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {items.length === 1
                              ? productById.get(items[0].productId)?.sku ?? '—'
                              : `${formatNumber(items.length)} products`}
                            <div className="text-[11px] tabular" style={{ color: 'var(--text-muted)' }}>
                              {formatNumber(ordered)} units
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <ReceiveProgress ordered={ordered} received={received} />
                          </td>
                          <td className="px-3 py-2 text-xs tabular" style={{ color: remaining > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {remaining > 0 ? formatNumber(remaining) : '—'}
                          </td>
                          <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>
                            {costed ? formatCurrency(value) : <span style={{ color: 'var(--text-muted)' }}>partly costed</span>}
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-2 text-xs"
                            style={{ color: overdue ? 'var(--status-critical)' : 'var(--text-muted)' }}
                          >
                            {po.expectedDate ? formatDate(po.expectedDate) : '—'}
                            {overdue ? (
                              <div className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--status-critical)' }}>
                                <AlertTriangle size={10} /> overdue
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            <StatusPill status={po.status} />
                          </td>
                          <td className="px-3 py-2 text-right">
                            {OPEN.includes(po.status) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  cancelPo(po.id!)
                                }}
                                className="whitespace-nowrap text-xs"
                                style={{ color: 'var(--status-critical)' }}
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                        {open && (
                          <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)' }}>
                            <td colSpan={10} className="px-3 py-3">
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                                Lines
                              </div>
                              <table className="min-w-full border-collapse text-xs">
                                <thead>
                                  <tr>
                                    {['Product', 'Ordered', 'Received', 'Remaining', 'Unit cost', 'Line value', 'In stock now'].map((h) => (
                                      <th key={h} className="px-2 py-1 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((i) => {
                                    const p = productById.get(i.productId)
                                    const stockRow = rowByProduct.get(i.productId)
                                    const rem = Math.max(0, i.quantityOrdered - i.quantityReceived)
                                    return (
                                      <tr key={i.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                                        <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                                          {p?.sku ?? '—'} <span style={{ color: 'var(--text-muted)' }}>{p?.name ?? ''}</span>
                                        </td>
                                        <td className="px-2 py-1.5 tabular" style={{ color: 'var(--text-primary)' }}>
                                          {formatNumber(i.quantityOrdered)}
                                        </td>
                                        <td className="px-2 py-1.5 tabular" style={{ color: 'var(--text-secondary)' }}>
                                          {formatNumber(i.quantityReceived)}
                                        </td>
                                        <td className="px-2 py-1.5 tabular" style={{ color: rem > 0 ? 'var(--status-warning-ink)' : 'var(--text-muted)' }}>
                                          {rem > 0 ? formatNumber(rem) : '—'}
                                        </td>
                                        <td className="px-2 py-1.5 tabular" style={{ color: 'var(--text-secondary)' }}>
                                          {i.unitCost == null ? <span style={{ color: 'var(--text-muted)' }}>not set</span> : formatCurrency(i.unitCost)}
                                        </td>
                                        <td className="px-2 py-1.5 tabular" style={{ color: 'var(--text-primary)' }}>
                                          {i.unitCost == null ? '—' : formatCurrency(i.quantityOrdered * i.unitCost)}
                                        </td>
                                        <td className="px-2 py-1.5 tabular" style={{ color: 'var(--text-muted)' }}>
                                          {stockRow ? `${formatNumber(stockRow.stock.sellable)} sellable` : '—'}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                              {po.notes && (
                                <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                  {po.notes}
                                </p>
                              )}
                              {remaining > 0 && (
                                <Link
                                  to="/receive"
                                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
                                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--series-aqua)' }}
                                >
                                  <PackagePlus size={12} /> Receive against this PO
                                </Link>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
