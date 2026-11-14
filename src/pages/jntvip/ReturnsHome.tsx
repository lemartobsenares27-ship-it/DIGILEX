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
import { PackageX, Home, HelpCircle, Boxes, Download } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import NeedsData from './NeedsData'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { returnsHome, proofGaps, TRANSIT_DAYS, type ReturnRow } from '../../lib/jntvip/returnsHome'
import { exportReturnsWithoutProof } from '../../lib/jntvip/exportCsv'
import { ERPOD_FORMS, ERPOD_SELLER, formsWithCountMismatch, duplicateAwbs } from '../../lib/jntvip/erpod'
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

/**
 * Where monitoring starts.
 *
 * The owner asked to start at November rather than chase a backlog from
 * September, and the courier forms only reach back to 2 November, so before
 * that there is nothing to prove an arrival with either way.
 */
const WINDOW_START = '2026-11-01'
const ALL_TIME = '0000-01-01'

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
  const [from, setFrom] = useState<string>(WINDOW_START)
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
    () => returnsHome(parcels, homecoming, productOf, today(), from),
    [parcels, homecoming, productOf, from],
  )

  // Over all time, not the monitoring window: finding missing paperwork and
  // watching this month's returns are different jobs.
  const gaps = useMemo(
    () => proofGaps(parcels, homecoming, productOf, today()),
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
          <strong style={{ color: 'var(--text-primary)' }}>The courier's E-RPOD form is the proof.</strong> It
          lists every waybill with the second it was scanned at the handover, names the driver, and is signed by
          both sides with a photograph attached. A waybill on one of those has come back, and nothing here
          outranks it. The waybill export cannot do this job: its date on a returned parcel is the day it was
          marked returned at the delivery end, not the day the box reached you.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Why it matters in money: every other page assumes a returned bottle comes home sellable, so it charges
          the return no product cost. Where that is true, the return costs freight, the RTS fee, packing and the
          advertising. Where it is not,{' '}
          <strong style={{ color: 'var(--text-primary)' }}>it costs the stock as well</strong>, and the shelf count
          is wrong by that much.
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Both <strong>RETURNED</strong> and <strong>FOR_RETURN</strong> parcels are watched — a box in either
          state is a box that should turn up, and watching only the first missed the whole queue. A parcel is in
          this window when its return was marked on or after {view.from === ALL_TIME ? 'any date' : view.from}, or a
          form proves it arrived on or after it, so a return queued in October and handed back in November still
          shows. Age alone never marks a parcel lost: booking one as missing takes stock off the shelf, so only you
          can do that.
        </p>
      </Card>

      <div className="mb-4 flex flex-wrap gap-1">
        {([[WINDOW_START, 'From 1 November'], [ALL_TIME, 'Everything on file']] as [string, string][]).map(
          ([k, text]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFrom(k)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: from === k ? 'var(--series-blue)' : 'var(--border-hairline)',
                color: from === k ? 'var(--series-blue)' : 'var(--text-secondary)',
                background: from === k ? 'color-mix(in srgb, var(--series-blue) 10%, transparent)' : 'var(--surface-card)',
              }}
            >
              {text}
            </button>
          ),
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="On their way back"
          value={formatNumber(view.total)}
          icon={<PackageX size={16} />}
          accent="var(--series-blue)"
          sub="RETURNED or queued FOR_RETURN"
        />
        <StatTile
          label="Confirmed back home"
          value={formatNumber(view.received)}
          icon={<Home size={16} />}
          accent={view.received > 0 ? 'var(--status-good-ink)' : 'var(--text-muted)'}
          sub={
            view.provenByForm > 0
              ? `${formatNumber(view.provenByForm)} proved by a courier form`
              : view.total > 0
                ? `${Math.round((view.received / view.total) * 100)}% of them`
                : '—'
          }
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

      {gaps.withoutAnyRecord > 0 && (
        <Card
          className="mt-4"
          title="Returns with no proof of handover"
          description="Over everything on file, not just the monitoring window — the forms for these either sit uncollected in the group chat, or were never issued."
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The courier issues an E-RPOD at every handover. So a return with no form behind it is a return nobody
            can show arrived.{' '}
            <strong style={{ color: 'var(--series-orange)' }}>
              {plural(gaps.withoutAnyRecord, 'parcel')} of the {formatNumber(gaps.returnStage)} returns on record
              {gaps.withoutAnyRecord === 1 ? ' has' : ' have'} no form and no record
            </strong>{' '}
            — {plural(gaps.bottles, 'bottle')}, {peso(gaps.stockValue)} of stock, and {peso(gaps.cod)} of COD that
            was never collected.
          </p>
          {gaps.span && (
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              They were marked for return between <strong>{gaps.span.from}</strong> and{' '}
              <strong>{gaps.span.to}</strong>, so the forms to look for are the handovers from roughly a week after
              each of those dates. Every form on file is from November; nothing from September or October has been
              collected yet.
            </p>
          )}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="px-2 pb-2 text-left font-medium">Week returns were marked</th>
                  <th className="px-2 pb-2 text-right font-medium">Parcels</th>
                  <th className="px-2 pb-2 text-right font-medium">Bottles</th>
                  <th className="px-2 pb-2 text-right font-medium">Stock</th>
                  <th className="px-2 pb-2 text-right font-medium">COD lost</th>
                  <th className="px-2 pb-2 text-left font-medium">A waybill to search the chat for</th>
                </tr>
              </thead>
              <tbody>
                {gaps.weeks.map((w) => (
                  <tr key={w.week} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="whitespace-nowrap px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                      {w.week}
                    </td>
                    <td
                      className="px-2 py-1.5 text-right font-medium tabular-nums"
                      style={{ color: w.parcels >= 40 ? 'var(--series-orange)' : 'var(--text-secondary)' }}
                    >
                      {formatNumber(w.parcels)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {formatNumber(w.bottles)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {peso(w.stockValue)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {peso(w.cod)}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      {w.awbs[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => exportReturnsWithoutProof(gaps.rows)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--series-blue)' }}
          >
            <Download size={14} /> Download all {formatNumber(gaps.withoutAnyRecord)} to match against the chat
          </button>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            One row per waybill, with the date its return was marked so the right form can be found, and empty
            columns for the form's date and who received it. Send the forms back and they go on the register, where
            the driver's name and the scan times are kept too.
          </p>
        </Card>
      )}

      <Card
        className="mt-4"
        title="Courier handover forms on file"
        description={`${formatNumber(ERPOD_FORMS.length)} E-RPOD forms covering ${plural(ERPOD_FORMS.reduce((t, f) => t + f.parcels.length, 0), 'parcel')}, from the seller group chat. Seller ${ERPOD_SELLER.name}, ID ${ERPOD_SELLER.id}, collected at ${ERPOD_SELLER.rpodAddress}.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="px-2 pb-2 text-left font-medium">Handed over</th>
                <th className="px-2 pb-2 text-left font-medium">Driver</th>
                <th className="px-2 pb-2 text-left font-medium">Started</th>
                <th className="px-2 pb-2 text-left font-medium">Finished</th>
                <th className="px-2 pb-2 text-right font-medium">Form says</th>
                <th className="px-2 pb-2 text-right font-medium">Waybills listed</th>
              </tr>
            </thead>
            <tbody>
              {[...ERPOD_FORMS]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((form) => {
                  const ties = form.parcels.length === form.statedCount
                  return (
                    <tr key={form.date + form.startedAt} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="whitespace-nowrap px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>{form.date}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-secondary)' }}>{form.driver}</td>
                      <td className="px-2 py-1.5 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{form.startedAt}</td>
                      <td className="px-2 py-1.5 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{form.endedAt}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{form.statedCount}</td>
                      <td
                        className="px-2 py-1.5 text-right font-medium tabular-nums"
                        style={{ color: ties ? 'var(--status-good-ink)' : 'var(--series-orange)' }}
                      >
                        {form.parcels.length}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {formsWithCountMismatch().length === 0 ? (
            <>
              Every form's own parcel count matches the waybills listed on it. That is the check worth having: a
              form that says seven and lists six means a box was handed over and not written down, and nothing in
              the export would ever show it.
            </>
          ) : (
            <strong style={{ color: 'var(--series-orange)' }}>
              {plural(formsWithCountMismatch().length, 'form')} state a parcel count that does not match the
              waybills listed. A box may have been handed over without being written down.
            </strong>
          )}
          {duplicateAwbs().length > 0 && (
            <>
              {' '}
              <strong style={{ color: 'var(--series-orange)' }}>
                {plural(duplicateAwbs().length, 'waybill')} appear on more than one form.
              </strong>
            </>
          )}
        </p>
        {view.aheadOfExport > 0 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Ahead of the export:</strong>{' '}
            {plural(view.aheadOfExport, 'parcel')} on these forms {view.aheadOfExport === 1 ? 'is' : 'are'} not in
            the waybill export at all
            {view.exportThrough ? `, which only reaches ${view.exportThrough}` : ''}. Counted as arrived anyway —
            the signed form is the better record, and dropping a proven arrival for not matching a snapshot would
            be the worst thing this page could do.
          </p>
        )}
        {view.contradicted > 0 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--series-orange)' }}>Two J&amp;T records disagree:</strong>{' '}
            {plural(view.contradicted, 'parcel')} on these forms {view.contradicted === 1 ? 'is' : 'are'} in the
            export, but still shown as out for delivery or in transit rather than returned. The driver's signed
            form says the box was handed back. The form wins here, and the rows are marked{' '}
            <em>export disagrees</em> so you can raise them. It matters beyond tidiness: a parcel the export never
            moves to returned is one whose return never reaches a statement, so the RTS fee and the lost sale go
            uncounted.
          </p>
        )}
      </Card>

      <Card className="mt-4" title="How old the unconfirmed ones are" description={`Counted from the day the return was marked, or where the export gives none, the day the parcel was dispatched. As at ${view.asOf}.`}>
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
            Boxes are plainly coming back — {plural(view.provenByForm, 'parcel')} in this window{' '}
            {view.provenByForm === 1 ? 'has a' : 'have'} signed handover{view.provenByForm === 1 ? '' : 's'}. But
            none of the {formatNumber(view.unconfirmed)} unconfirmed ones is recent enough to still be travelling:
            every one is more than {TRANSIT_DAYS} days past its date. Ask the driver whether they came on a form
            you have not seen, or whether they are still sitting at the station.
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
                  <th className="px-2 pb-2 text-left font-medium">Export says</th>
                  <th
                    className="px-2 pb-2 text-left font-medium"
                    title="The day the return clock starts: when it was marked returned, or failing that when it was dispatched"
                  >
                    Dated
                  </th>
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
      <td className="whitespace-nowrap px-2 py-1.5 text-xs">
        {r.stage === 'RETURNED' && <span style={{ color: 'var(--text-secondary)' }}>returned</span>}
        {r.stage === 'FOR_RETURN' && <span style={{ color: 'var(--text-secondary)' }}>queued to return</span>}
        {r.stage === 'STATUS_STALE' && <span style={{ color: 'var(--series-orange)' }}>export disagrees</span>}
        {r.stage === 'NOT_IN_EXPORT' && <span style={{ color: 'var(--text-muted)' }}>not in export</span>}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5" style={{ color: 'var(--text-secondary)' }}>
        {r.markedOn}
        {r.markedFrom !== 'returned' && (
          <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {r.markedFrom === 'dispatched' ? '(dispatched)' : '(handover)'}
          </span>
        )}
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
            {r.evidence === 'ERPOD' ? ` · E-RPOD${r.driver ? ` · ${r.driver}` : ''}` : r.recordedBy ? ` · ${r.recordedBy}` : ''}
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
        {!open && r.evidence !== 'ERPOD' && (
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
