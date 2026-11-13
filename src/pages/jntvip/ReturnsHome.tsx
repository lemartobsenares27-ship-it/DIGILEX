// Did the returned parcels actually come back?
//
// The rest of this app treats a return as a parcel whose bottles come home
// sellable, and therefore charges it no product cost. Nothing ever checked
// that the boxes arrived. If they did not, the stock is gone as well as the
// freight, and the shelf count is wrong by exactly that much.
//
// The courier export cannot settle it — its date on a returned parcel is when
// the parcel was marked returned at the far end, not when it reached the house.
// So this page is a worklist, not a report: it lists what the courier says it
// sent back, and keeps the record of what was actually received.
//
// Nothing here changes a parcel, a statement or a profit figure.

import { useEffect, useMemo, useState } from 'react'
import { PackageX, Home, HelpCircle, Boxes } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import NeedsData from './NeedsData'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { returnsHome, TRANSIT_DAYS, type ReturnRow } from '../../lib/jntvip/returnsHome'
import { recordHomecoming, clearHomecoming, recordArrivals } from '../../lib/jntvip/returnsHomeOps'
import { getReviewerName, setReviewerName } from '../../lib/jntvip/review'
import { makeResolver } from '../../lib/jntvip/rts'
import { pinnedMap } from '../../lib/jntvip/products'
import { formatNumber } from '../../lib/format'
import type {
  JntVipParcelRow,
  JntVipProductRow,
  JntVipParcelProductRow,
  JntVipRtsHomecomingRow,
} from '../../lib/jntvip/types'

/** Centavos to pesos. formatCurrency takes pesos, so centavos must be divided. */
const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })

const today = () => new Date().toISOString().slice(0, 10)

/** "1 parcel", "2 parcels" — a count read as a sentence, not a field. */
const plural = (n: number, one: string, many = one + 's') => `${formatNumber(n)} ${n === 1 ? one : many}`

type Filter = 'open' | 'received' | 'missing' | 'all'

const FILTERS: [Filter, string][] = [
  ['open', 'Not confirmed'],
  ['received', 'Came back'],
  ['missing', 'Never came back'],
  ['all', 'All'],
]

export default function ReturnsHome() {
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const products = useLiveTable(jntVipDb.products) as JntVipProductRow[]
  const parcelProducts = useLiveTable(jntVipDb.parcelProducts) as JntVipParcelProductRow[]
  const homecoming = useLiveTable(jntVipDb.rtsHomecoming) as JntVipRtsHomecomingRow[]

  const [who, setWho] = useState('')
  const [filter, setFilter] = useState<Filter>('open')
  const [when, setWhen] = useState(today())
  const [picked, setPicked] = useState<Set<string>>(new Set())
  // A worklist of 222 rows makes a page nobody scrolls to the end of. Show a
  // screenful and let it be opened, rather than paging it — the selection and
  // the totals work on the whole filter either way, which the buttons say.
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    getReviewerName().then(setWho)
  }, [])

  const productOf = useMemo(() => makeResolver(products, pinnedMap(parcelProducts)), [products, parcelProducts])
  const view = useMemo(
    () => returnsHome(parcels, homecoming, productOf, today()),
    [parcels, homecoming, productOf],
  )

  const shown = useMemo(() => {
    if (filter === 'all') return view.rows
    if (filter === 'received') return view.rows.filter((r) => r.status === 'RECEIVED')
    if (filter === 'missing') return view.rows.filter((r) => r.status === 'MISSING')
    return view.rows.filter((r) => r.status === 'UNCONFIRMED')
  }, [view, filter])

  const CAP = 60
  const visible = showAll ? shown : shown.slice(0, CAP)
  const selectable = shown.filter((r) => r.status === 'UNCONFIRMED')
  const selected = selectable.filter((r) => picked.has(r.awb))

  const run = async (fn: () => Promise<string>) => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      await setReviewerName(who)
      setDone(await fn())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (parcels.length === 0) {
    return (
      <>
        <PageHeader title="Returns home" description="Whether the parcels the courier sent back actually arrived." />
        <NeedsData
          shows="This page lists every parcel J&T says went back to sender, and tracks which of them physically reached you."
          needs="the J&T parcel export"
          where="the waybill-level file from the J&T VIP dashboard"
        />
      </>
    )
  }

  const toggle = (awb: string) =>
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(awb)) next.delete(awb)
      else next.add(awb)
      return next
    })

  return (
    <>
      <PageHeader
        title="Returns home"
        description="Whether the parcels the courier sent back actually arrived at the house."
      />

      <Card className="mb-4">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>The export cannot answer this on its own.</strong>{' '}
          A returned parcel's date in J&amp;T's file is the day it was marked returned at the delivery end, and no
          column records the handover back to you. So the courier saying {formatNumber(view.total)} parcels went
          back is not the same as {formatNumber(view.total)} boxes arriving. This page keeps that second record,
          and it only knows what you tell it.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Why it matters in money: every other page here assumes a returned bottle comes home sellable, so it
          charges the return no product cost. Where that is true, the return costs freight, the RTS fee, packing
          and the advertising. Where it is not,{' '}
          <strong style={{ color: 'var(--text-primary)' }}>it costs the stock as well</strong>, and the shelf count
          is wrong by that much.
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Age alone never marks a parcel lost. An old unconfirmed parcel is one to ask about, not a write-off —
          booking it as missing takes the stock off the shelf, so only you can do that. The worklist is as current
          as your last export{view.latestReturn ? `, whose newest return is dated ${view.latestReturn}` : ''}.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Courier sent back"
          value={formatNumber(view.total)}
          icon={<PackageX size={16} />}
          accent="var(--series-blue)"
          sub="parcels marked RETURNED"
        />
        <StatTile
          label="Confirmed back home"
          value={formatNumber(view.received)}
          icon={<Home size={16} />}
          accent={view.received > 0 ? 'var(--status-good-ink)' : 'var(--text-muted)'}
          sub={view.total > 0 ? `${Math.round((view.received / view.total) * 100)}% of them` : '—'}
        />
        <StatTile
          label="Not confirmed"
          value={formatNumber(view.unconfirmed)}
          icon={<HelpCircle size={16} />}
          accent={view.unconfirmed > 0 ? 'var(--series-orange)' : 'var(--status-good-ink)'}
          sub={`${plural(view.unconfirmedBottles, 'bottle')} unaccounted`}
        />
        <StatTile
          label="Stock at stake"
          value={peso(view.unconfirmedValue)}
          icon={<Boxes size={16} />}
          accent="var(--series-violet)"
          sub="what those bottles cost to build"
        />
      </div>

      {view.missing > 0 && (
        <Card className="mt-4" title="Established missing">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {plural(view.missing, 'parcel')} {view.missing === 1 ? 'has' : 'have'} been chased and confirmed as
            never coming back — {plural(view.missingBottles, 'bottle')}, {peso(view.missingValue)} of stock. That is
            a real loss, on top of the freight and the RTS fee already paid on {view.missing === 1 ? 'it' : 'them'}.
          </p>
        </Card>
      )}

      <Card className="mt-4" title="How old the unconfirmed ones are" description={`Counted from the day the courier marked each one returned, as at ${view.asOf}.`}>
        <div className="grid gap-3 sm:grid-cols-3">
          {view.bands.map((b) => (
            <div key={b.key} className="rounded-lg border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {b.label}
              </p>
              <p
                className="mt-1 text-2xl font-semibold tabular-nums"
                style={{ color: b.key === 'overdue' && b.parcels > 0 ? 'var(--series-orange)' : 'var(--text-primary)' }}
              >
                {formatNumber(b.parcels)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {b.detail}
              </p>
              {b.parcels > 0 && (
                <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {plural(b.bottles, 'bottle')} · {peso(b.stockValue)}
                </p>
              )}
            </div>
          ))}
        </div>
        {view.bands[0].parcels === 0 && view.unconfirmed > 0 && (
          <p className="mt-3 text-sm" style={{ color: 'var(--series-orange)' }}>
            Not one unconfirmed parcel is recent enough to still be travelling. Every one is more than{' '}
            {TRANSIT_DAYS} days past the day it was marked returned, so if the boxes are not at the house,
            nobody is going to bring them without being asked.
          </p>
        )}
      </Card>

      <Card className="mt-4" title="Record what arrived">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="mb-1 block font-medium uppercase tracking-wide">Your name</span>
            <input
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="who checked the boxes"
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)', color: 'var(--text-primary)' }}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="mb-1 block font-medium uppercase tracking-wide">Day they arrived</span>
            <input
              type="date"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)', color: 'var(--text-primary)' }}
            />
          </label>
          <button
            type="button"
            disabled={busy || selected.length === 0}
            onClick={() =>
              run(async () => {
                const { written, skipped } = await recordArrivals(selected.map((r) => r.awb), when, who)
                setPicked(new Set())
                return skipped.length > 0
                  ? `${plural(written, 'parcel')} recorded as arrived on ${when}. ${plural(skipped.length, 'parcel')} already had a record and ${skipped.length === 1 ? 'was' : 'were'} left alone.`
                  : `${plural(written, 'parcel')} recorded as arrived on ${when}.`
              })
            }
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--status-good-ink)' }}
          >
            Mark {selected.length > 0 ? formatNumber(selected.length) : ''} selected as arrived
          </button>
          {selectable.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setPicked((s) => (s.size === selectable.length ? new Set() : new Set(selectable.map((r) => r.awb))))
              }
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
            >
              {picked.size === selectable.length
                ? 'Clear selection'
                : `Select all ${formatNumber(selectable.length)} not confirmed`}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Returns arrive in sacks, so this marks a batch at once. A waybill that already carries a record is
          skipped rather than overwritten, and the count of what was skipped is reported. Every write is logged.
        </p>
        {error && (
          <p className="mt-2 text-sm" style={{ color: 'var(--series-orange)' }}>
            {error}
          </p>
        )}
        {done && (
          <p className="mt-2 text-sm" style={{ color: 'var(--status-good-ink)' }}>
            {done}
          </p>
        )}
      </Card>

      <Card
        className="mt-4"
        title="Every parcel the courier sent back"
        description="Oldest first — the one least likely to still be moving is the one to ask about."
      >
        <div className="mb-3 flex flex-wrap gap-1">
          {FILTERS.map(([k, text]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: filter === k ? 'var(--series-blue)' : 'var(--border-hairline)',
                color: filter === k ? 'var(--series-blue)' : 'var(--text-secondary)',
                background: filter === k ? 'color-mix(in srgb, var(--series-blue) 10%, transparent)' : 'var(--surface-card)',
              }}
            >
              {text}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Nothing in this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="px-2 pb-2 text-left font-medium"> </th>
                  <th className="px-2 pb-2 text-left font-medium">Waybill</th>
                  <th className="px-2 pb-2 text-left font-medium">Returned</th>
                  <th className="px-2 pb-2 text-right font-medium">Days</th>
                  <th className="px-2 pb-2 text-left font-medium">Where from</th>
                  <th className="px-2 pb-2 text-left font-medium">Product</th>
                  <th className="px-2 pb-2 text-right font-medium">Bottles</th>
                  <th className="px-2 pb-2 text-right font-medium">Stock</th>
                  <th className="px-2 pb-2 text-left font-medium">Why</th>
                  <th className="px-2 pb-2 text-left font-medium">Arrived</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <Row
                    key={r.awb}
                    r={r}
                    checked={picked.has(r.awb)}
                    onToggle={() => toggle(r.awb)}
                    busy={busy}
                    onMissing={() =>
                      run(async () => {
                        await recordHomecoming(r.awb, 'MISSING', when, who, 'Chased and established as not coming back')
                        return `${r.awb} recorded as never arrived. Its ${plural(r.bottles, 'bottle')} ${r.bottles === 1 ? 'is' : 'are'} now a loss, not stock.`
                      })
                    }
                    onClear={() =>
                      run(async () => {
                        await clearHomecoming(r.awb, who)
                        return `${r.awb} is unconfirmed again. The earlier record stays in the log.`
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {shown.length > CAP && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 w-full rounded-lg border py-2 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            {showAll
              ? `Show the first ${formatNumber(CAP)} only`
              : `Show all ${formatNumber(shown.length)} — ${formatNumber(shown.length - CAP)} more below`}
          </button>
        )}

        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Showing {formatNumber(visible.length)} of {formatNumber(shown.length)} in this view,{' '}
          {formatNumber(view.total)} in all. Selecting and the totals above work on the whole view, not just the
          rows on screen. The warehouse app has the inspection
          side of this — receiving a return into FOR_INSPECTION before its bottles go back into sellable stock. This
          page answers the narrower question of whether the box turned up at all, so a parcel confirmed here still
          needs inspecting there.
        </p>
      </Card>
    </>
  )
}

function Row({
  r,
  checked,
  onToggle,
  busy,
  onMissing,
  onClear,
}: {
  r: ReturnRow
  checked: boolean
  onToggle: () => void
  busy: boolean
  onMissing: () => void
  onClear: () => void
}) {
  const open = r.status === 'UNCONFIRMED'
  return (
    <tr className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
      <td className="px-2 py-1.5">
        {open && <input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Select ${r.awb}`} />}
      </td>
      <td className="px-2 py-1.5 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
        {r.awb}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5" style={{ color: 'var(--text-secondary)' }}>
        {r.returnedOn}
      </td>
      <td
        className="px-2 py-1.5 text-right tabular-nums"
        style={{ color: open && r.ageDays > 21 ? 'var(--series-orange)' : 'var(--text-secondary)' }}
      >
        {r.ageDays}
      </td>
      <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {r.city}
        {r.province ? `, ${r.province}` : ''}
      </td>
      <td className="px-2 py-1.5" style={{ color: 'var(--text-secondary)' }}>
        {r.product}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {r.bottles}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {peso(r.stockValue)}
      </td>
      <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        {r.reason ?? '—'}
      </td>
      <td className="px-2 py-1.5 text-xs">
        {r.status === 'RECEIVED' && (
          <span style={{ color: 'var(--status-good-ink)' }}>
            {r.settledOn}
            {r.recordedBy ? ` · ${r.recordedBy}` : ''}
          </span>
        )}
        {r.status === 'MISSING' && <span style={{ color: 'var(--series-orange)' }}>never arrived</span>}
        {open && (
          <button
            type="button"
            disabled={busy}
            onClick={onMissing}
            className="rounded border px-2 py-0.5 text-xs disabled:opacity-40"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            never arrived
          </button>
        )}
        {!open && (
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            className="ml-2 text-xs underline disabled:opacity-40"
            style={{ color: 'var(--text-muted)' }}
          >
            undo
          </button>
        )}
      </td>
    </tr>
  )
}
