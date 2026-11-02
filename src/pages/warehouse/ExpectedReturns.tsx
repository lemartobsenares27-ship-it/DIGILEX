// Returns the courier says came back, against what the warehouse actually has.
//
// The RTS workflow on the next tab has always worked. Nothing had ever been
// put through it, because nothing told the warehouse a return was coming. The
// courier export says 222 parcels went back to sender; the warehouse has
// received none of them. This is that list.
//
// It reads a committed parcel export at build time and nothing else — no live
// connection to the courier app, whose database stays entirely separate. So it
// is a worklist that is as current as the last export, which the page says
// rather than implying a live feed.
//
// Receiving from here goes through the same receiveRts operation as manual
// entry: the parcel lands in FOR_INSPECTION and stays there until somebody
// physically looks at it. Nothing on this page puts a bottle back into
// sellable stock, and the one-click button exists to remove the typing, not
// the inspection.

import { useEffect, useMemo, useState } from 'react'
import { PackageX, Boxes, ClipboardCheck, AlertTriangle } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatDate, formatNumber } from '../../lib/format'
import { receiveRts } from '../../lib/warehouse/operations'
import { getWarehouseUser, setWarehouseUser } from '../../lib/warehouse/db'
import { summariseReturns, type ExpectedReturn } from '../../lib/warehouse/expectedReturns'
import { useWarehouseTables } from './hooks'
import { Field, TextInput, Select, ErrorNote, SuccessNote, productOptions, locationOptions } from './FormBits'
import type { RtsReturnRow } from '../../lib/warehouse/types'

const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })
/** What one finished bottle costs, for sizing the gap. Three of four SKUs build at this. */
const UNIT_COST = 4000

type Filter = 'outstanding' | 'received' | 'all'

export default function ExpectedReturns() {
  const { products, locations, rtsReturns } = useWarehouseTables()
  const [user, setUser] = useState('')
  const [filter, setFilter] = useState<Filter>('outstanding')
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    getWarehouseUser().then(setUser)
  }, [])

  const summary = useMemo(
    () => summariseReturns(rtsReturns as RtsReturnRow[], products.map((p) => p.name), UNIT_COST),
    [rtsReturns, products],
  )

  const shown = useMemo(() => {
    const rows =
      filter === 'all'
        ? summary.rows
        : filter === 'received'
          ? summary.rows.filter((r) => r.received != null)
          : summary.rows.filter((r) => r.received == null)
    return rows.slice(0, 200)
  }, [summary, filter])

  const warehouses = locationOptions(locations, ['warehouse'])

  async function receive(row: ExpectedReturn) {
    setError(null)
    setDone(null)
    if (!productId) return setError('Choose which warehouse product these bottles are, before receiving.')
    if (!warehouseId) return setError('Choose the warehouse location the parcel came back to.')
    if (!user.trim()) return setError('Enter your name — every movement records who made it.')
    setBusy(row.awb)
    try {
      await setWarehouseUser(user.trim())
      await receiveRts({
        productId: Number(productId),
        quantity: row.bottles,
        warehouseLocationId: Number(warehouseId),
        fulfillmentLocationId: null,
        trackingNumber: row.awb,
        orderId: null,
        customer: null,
        originalShipDate: row.shippedOn,
        returnDate: row.returnedOn,
        returnReason: row.reason,
        fulfillmentPartner: 'J&T Express',
        user: user.trim(),
      })
      setDone(`${row.awb} received — ${row.bottles} bottle${row.bottles === 1 ? '' : 's'} now awaiting inspection, not in sellable stock.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not receive this return.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Returns expected from J&T"
        description="Parcels the courier marked returned to sender, against what this warehouse has actually received. A parcel coming back and a bottle going back on the shelf are two different events."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Not yet received"
          value={formatNumber(summary.outstanding)}
          icon={<PackageX size={16} />}
          accent={summary.outstanding > 0 ? 'var(--series-orange)' : 'var(--status-good-ink)'}
          sub={`of ${formatNumber(summary.expected)} the courier returned`}
        />
        <StatTile
          label="Bottles unaccounted for"
          value={formatNumber(summary.outstandingBottles)}
          icon={<Boxes size={16} />}
          accent="var(--series-orange)"
          sub={`about ${peso(summary.outstandingValue)} of stock`}
        />
        <StatTile
          label="Received here"
          value={formatNumber(summary.received)}
          icon={<ClipboardCheck size={16} />}
          accent="var(--series-blue)"
          sub={`${formatNumber(summary.inspected)} inspected`}
        />
        <StatTile
          label="Export covers to"
          value={summary.coverTo ? formatDate(summary.coverTo) : '—'}
          icon={<AlertTriangle size={16} />}
          accent="var(--series-violet)"
          sub="a worklist, not a live feed"
        />
      </div>

      {summary.unmatchedProducts.length > 0 && (
        <Card title="Products the courier ships that this warehouse does not stock" className="mt-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {summary.unmatchedProducts.join(', ')} appear on returned parcels and have no product row here. Their
            returns cannot be received against the right item until they exist in the catalogue, and until then this
            warehouse cannot say how much of them it holds.
          </p>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            They are not created automatically. A product carries a cost, a reorder point and a stock history, and
            inventing one to clear a warning would put all three in the system unverified.
          </p>
        </Card>
      )}

      <Card
        title="Receiving details"
        description="Set once, then receive from the list below. Every return posts to awaiting-inspection, never straight to sellable stock."
        className="mt-4"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Product these bottles are" hint="Chosen by you — the courier's label is not a SKU">
            <Select value={productId} onChange={setProductId} options={productOptions(products)} placeholder="Choose product" />
          </Field>
          <Field label="Warehouse they came back to">
            <Select value={warehouseId} onChange={setWarehouseId} options={warehouses} placeholder="Choose location" />
          </Field>
          <Field label="Received by" hint="Recorded against every movement">
            <TextInput value={user} onChange={setUser} placeholder="Your name" />
          </Field>
        </div>
        {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
        {done && <div className="mt-3"><SuccessNote>{done}</SuccessNote></div>}
      </Card>

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {([
            ['outstanding', `Not received (${summary.outstanding})`],
            ['received', `Received (${summary.received})`],
            ['all', `All (${summary.expected})`],
          ] as [Filter, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: filter === k ? 'var(--series-blue)' : 'var(--border-hairline)',
                color: filter === k ? 'var(--series-blue)' : 'var(--text-secondary)',
                background: 'var(--surface-card)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2 text-left font-medium">Returned</th>
                <th className="pb-2 text-left font-medium">Waybill</th>
                <th className="pb-2 text-left font-medium">Product</th>
                <th className="pb-2 text-right font-medium">Bottles</th>
                <th className="pb-2 text-left font-medium">Why</th>
                <th className="pb-2 text-left font-medium">Province</th>
                <th className="pb-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.awb} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="whitespace-nowrap py-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {r.returnedOn ? formatDate(r.returnedOn) : '—'}
                  </td>
                  <td className="whitespace-nowrap py-1.5 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                    {r.awb}
                  </td>
                  <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>{r.productName}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{r.bottles}</td>
                  <td className="py-1.5" style={{ color: 'var(--text-muted)' }}>{r.reason ?? '—'}</td>
                  <td className="py-1.5" style={{ color: 'var(--text-muted)' }}>{r.province ?? '—'}</td>
                  <td className="whitespace-nowrap py-1.5 text-right">
                    {r.received ? (
                      <span className="text-xs" style={{ color: r.received.status === 'INSPECTED' ? 'var(--status-good-ink)' : 'var(--series-blue)' }}>
                        {r.received.status === 'INSPECTED' ? `Inspected · ${r.received.inspectionResult ?? '—'}` : 'Awaiting inspection'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => receive(r)}
                        disabled={busy != null}
                        className="rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                        style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-card)' }}
                      >
                        {busy === r.awb ? 'Receiving…' : 'Receive'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Nothing in this view.
          </p>
        )}
        {shown.length === 200 && (
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing the newest 200. Narrow the filter to see the rest.
          </p>
        )}
      </Card>
    </div>
  )
}
