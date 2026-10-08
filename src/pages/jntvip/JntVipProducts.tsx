// Per-product performance — the page that answers "which SKU is bleeding".
//
// J&T sends one export for everything, so every number here depends on getting
// each parcel attributed to the right product. That attribution is shown, not
// hidden: the catalogue is editable, unmatched item texts are listed with a
// one-click way to turn them into an alias, and anything still unattributed is
// counted as Unclassified rather than folded into whichever product sorts first.
//
// Statements are deliberately not used. They give period totals and never say
// which product earned them, so the only honest per-product view comes from
// parcels.

import { useMemo, useState } from 'react'
import { Boxes, Plus, Check, X, Pencil, Archive, RotateCcw, AlertTriangle, Upload } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatNumber, formatPercent } from '../../lib/format'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { makeResolver, rtsByPeriod, productsIn, rtsBand } from '../../lib/jntvip/rts'
import { pinnedMap, unmatchedSamples, UNCLASSIFIED } from '../../lib/jntvip/products'
import { productStats } from '../../lib/jntvip/productStats'
import PosProductImport from './PosProductImport'
import type { JntVipParcelRow, JntVipProductRow, JntVipParcelProductRow } from '../../lib/jntvip/types'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Draft {
  name: string
  aliases: string
  price: string
  unitCost: string
}
const EMPTY: Draft = { name: '', aliases: '', price: '', unitCost: '' }

export default function JntVipProducts() {
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const products = useLiveTable(jntVipDb.products) as JntVipProductRow[]
  const parcelProducts = useLiveTable(jntVipDb.parcelProducts) as JntVipParcelProductRow[]

  const [grain, setGrain] = useState<'week' | 'month'>('week')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [editing, setEditing] = useState<number | null>(null)

  const pinned = useMemo(() => pinnedMap(parcelProducts), [parcelProducts])
  const productOf = useMemo(() => makeResolver(products, pinned), [products, pinned])
  const stats = useMemo(() => productStats(parcels, productOf), [parcels, productOf])
  const periods = useMemo(() => rtsByPeriod(parcels, grain, productOf), [parcels, grain, productOf])
  const columns = useMemo(() => productsIn(periods), [periods])
  const unmatched = useMemo(() => unmatchedSamples(parcels, products, pinned), [parcels, products, pinned])

  const cents = (s: string) => Math.round(parseFloat(s.replace(/[^\d.]/g, '')) * 100)

  async function save(id?: number) {
    const name = draft.name.trim().toUpperCase()
    if (!name) return
    const row = {
      name,
      aliases: draft.aliases
        .split(',')
        .map((a) => a.trim().toUpperCase())
        .filter(Boolean),
      price: Number.isFinite(cents(draft.price)) ? cents(draft.price) : 0,
      unitCost: Number.isFinite(cents(draft.unitCost)) ? cents(draft.unitCost) : 0,
      active: true,
      updatedAt: new Date().toISOString(),
    }
    // A product with no alias would match nothing, so default to its own name.
    if (row.aliases.length === 0) row.aliases = [name]
    if (id != null) await jntVipDb.products.update(id, row)
    else await jntVipDb.products.add(row)
    setDraft(EMPTY)
    setAdding(false)
    setEditing(null)
  }

  /** Adds an unmatched phrase as an alias of a product, fixing every parcel using it. */
  async function adoptAlias(text: string, productId: number) {
    const prod = products.find((p) => p.id === productId)
    if (!prod) return
    await jntVipDb.products.update(productId, {
      aliases: [...prod.aliases, text.toUpperCase()],
      updatedAt: new Date().toISOString(),
    })
  }

  const field = 'rounded-lg border px-2.5 py-1.5 text-sm'
  const fieldStyle = { borderColor: 'var(--border-hairline)', background: 'var(--surface-page)', color: 'var(--text-primary)' }
  const live = products.filter((p) => p.active)
  const retired = products.filter((p) => !p.active)
  const unclassified = stats.find((s) => s.name === UNCLASSIFIED)

  function Form({ id }: { id?: number }) {
    return (
      <div className="flex flex-wrap items-center gap-2 py-2">
        <input className={field} style={{ ...fieldStyle, minWidth: 150 }} placeholder="Product name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input className={field} style={{ ...fieldStyle, flex: 1, minWidth: 200 }} placeholder="Also written as (comma separated), e.g. TSTMX" value={draft.aliases} onChange={(e) => setDraft({ ...draft, aliases: e.target.value })} />
        <input className={`${field} tabular`} style={{ ...fieldStyle, width: 100 }} placeholder="Price" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        <input className={`${field} tabular`} style={{ ...fieldStyle, width: 100 }} placeholder="Cost" inputMode="decimal" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })} />
        <button onClick={() => save(id)} className="rounded-lg px-3 py-1.5 text-white" style={{ background: 'var(--series-aqua)' }}><Check size={14} /></button>
        <button onClick={() => { setDraft(EMPTY); setAdding(false); setEditing(null) }} className="rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}><X size={14} /></button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Return rate, revenue and cost for each product you sell — attributed from the single J&T export."
      />

      {parcels.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <Boxes size={26} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="mx-auto max-w-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
              No parcels loaded. Everything on this page is derived from the J&amp;T parcel export —
              statements give period totals and never say which product earned them. Import a{' '}
              <strong>My Waybill</strong> export on <strong>Import</strong> and each product&rsquo;s
              return rate appears here.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* One card per product. The return rate leads because it is the figure
              that differs most between SKUs and costs the most to ignore. */}
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stats
              .filter((s) => s.name !== UNCLASSIFIED)
              .map((s) => {
                const band = rtsBand(s.rtsRate)
                return (
                  <Card key={s.name}>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {s.name}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-semibold tabular" style={{ color: band.color }}>
                        {s.settled > 0 ? formatPercent(s.rtsRate) : '—'}
                      </span>
                      <span className="text-xs font-medium" style={{ color: band.color }}>
                        {s.settled > 0 ? band.word : 'no settled parcels'}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatNumber(s.returned)} returned of {formatNumber(s.settled)} settled
                    </div>
                    <div className="mt-3 space-y-1 border-t pt-2 text-xs" style={{ borderColor: 'var(--border-hairline)' }}>
                      {[
                        ['Delivered', formatNumber(s.delivered)],
                        ['Still moving', formatNumber(s.inFlight)],
                        ['COD collected', peso(s.revenue)],
                        ['Average order', peso(s.avgOrderValue)],
                        ['RTS fees', peso(s.rtsFeeEstimate)],
                        ['Shipping wasted on returns', peso(s.wastedShipping)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                          <span className="tabular" style={{ color: 'var(--text-primary)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })}
          </div>

          {/* Unattributed parcels are shown, never absorbed. */}
          {unclassified && unclassified.dispatched > 0 && (
            <Card className="mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--status-warning-ink)' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(unclassified.dispatched)} parcels could not be matched to a product
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Their rates are excluded from the cards above rather than guessed at. Each phrase
                    below is how J&amp;T recorded the item — add it to a product and every parcel using
                    it is fixed at once.
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {unmatched.map((u) => (
                      <div key={u.text} className="flex flex-wrap items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: 'color-mix(in srgb, var(--text-primary) 6%, transparent)', color: 'var(--text-primary)' }}>
                          {u.text}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatNumber(u.count)} parcel{u.count === 1 ? '' : 's'}
                        </span>
                        {live.length > 0 && (
                          <select
                            className="rounded-lg border px-1.5 py-0.5 text-xs"
                            style={fieldStyle}
                            value=""
                            onChange={(e) => e.target.value && adoptAlias(u.text, Number(e.target.value))}
                          >
                            <option value="">Assign to…</option>
                            {live.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* The same week/month breakdown as the Executive page, but every
              product gets its own column rather than being summed away. */}
          <Card
            title="Return rate per product, over time"
            description="Returns as a share of settled parcels. A month-level figure hides a week that doubled."
            className="mb-4"
          >
            <div className="mb-3 flex justify-end gap-1.5">
              {(['week', 'month'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGrain(g)}
                  className="rounded-lg border px-2.5 py-1 text-xs font-medium"
                  style={{
                    borderColor: grain === g ? 'var(--series-orange)' : 'var(--border-hairline)',
                    color: grain === g ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: grain === g ? 'color-mix(in srgb, var(--series-orange) 12%, transparent)' : 'transparent',
                  }}
                >
                  By {g}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
                    <th className="py-2 pr-4 font-semibold">{grain === 'week' ? 'Week' : 'Month'}</th>
                    {columns.map((c) => (
                      <th key={c} className="py-2 pr-4 text-right font-semibold">{c}</th>
                    ))}
                    <th className="py-2 text-right font-semibold">All</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.key} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="whitespace-nowrap py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{p.label}</td>
                      {columns.map((c) => {
                        const cell = p.byProduct[c]
                        return (
                          <td key={c} className="whitespace-nowrap py-2 pr-4 text-right tabular" style={{ color: cell ? rtsBand(cell.rate).color : 'var(--text-muted)' }}>
                            {cell ? (
                              <>
                                {formatPercent(cell.rate)}
                                <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>{cell.returned}/{cell.settled}</span>
                              </>
                            ) : '—'}
                          </td>
                        )
                      })}
                      <td className="whitespace-nowrap py-2 text-right tabular font-medium" style={{ color: rtsBand(p.total.rate).color }}>
                        {formatPercent(p.total.rate)}
                        <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{p.total.returned}/{p.total.settled}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Pinning parcels from a per-product POS export — the authoritative path. */}
      <PosProductImport products={live} className="mb-4" />

      <Card title="Your products" description="How each one is recognised on a J&T parcel.">
        <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
          {live.map((p) =>
            editing === p.id ? (
              <Form key={p.id} id={p.id} />
            ) : (
              <div key={p.id} className="flex items-baseline justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    {p.price > 0 && (
                      <span className="text-xs tabular" style={{ color: 'var(--text-secondary)' }}>
                        {peso(p.price)}{p.unitCost > 0 ? ` · costs ${peso(p.unitCost)}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Recognised as: {p.aliases.join(', ')}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    aria-label={`Edit ${p.name}`}
                    onClick={() => { setEditing(p.id!); setDraft({ name: p.name, aliases: p.aliases.join(', '), price: p.price ? (p.price / 100).toFixed(2) : '', unitCost: p.unitCost ? (p.unitCost / 100).toFixed(2) : '' }) }}
                    className="rounded-lg border p-1.5" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                  ><Pencil size={13} /></button>
                  <button
                    aria-label={`Retire ${p.name}`}
                    onClick={() => jntVipDb.products.update(p.id!, { active: false, updatedAt: new Date().toISOString() })}
                    className="rounded-lg border p-1.5" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                  ><Archive size={13} /></button>
                </div>
              </div>
            ),
          )}
          {adding ? <Form /> : (
            <div className="pt-2">
              <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}>
                <Plus size={14} /> Add a product
              </button>
            </div>
          )}
        </div>

        {retired.length > 0 && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Retired — past parcels keep their attribution
            </div>
            {retired.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                <button onClick={() => jntVipDb.products.update(p.id!, { active: true, updatedAt: new Date().toISOString() })} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}>
                  <RotateCcw size={12} /> Restore
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Upload size={13} className="mt-0.5 shrink-0" />
          <span>
            Aliases are matched longest-first, so a specific name is never shadowed by a shorter one
            it contains. A POS export pinned to a product always wins over an alias match — that is
            the reliable route when two products share wording.
          </span>
        </p>
      </Card>
    </div>
  )
}
