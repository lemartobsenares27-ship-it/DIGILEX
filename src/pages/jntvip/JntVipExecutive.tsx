// J&T VIP — Executive Dashboard.
//
// Built to answer one question at a glance: is this courier better or worse
// than the last one? Everything else on the page exists to support that
// comparison or to say honestly that it cannot be made yet.

import { useMemo } from 'react'
import { Banknote, Receipt, Wallet, Clock, Package, Truck, TrendingDown, TrendingUp, Scale, AlertTriangle } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import PeakAreaChart from '../../components/charts/PeakAreaChart'
import RadialGauge from '../../components/charts/RadialGauge'
import { formatNumber, formatPercent } from '../../lib/format'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { executiveSummary, codTrend, moneySplit, NPMCM_BENCHMARK } from '../../lib/jntvip/executive'
import { profitAndLoss } from '../../lib/jntvip/profit'
import { toOperatingExpenses } from '../../lib/jntvip/operatingCosts'
import type { JntVipSoaCheckRow, JntVipParcelRow, JntVipOperatingExpenseRow } from '../../lib/jntvip/types'

const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** RTS bands, reserved status colours, each shown with a word beside it. */
function rtsBand(rate: number) {
  if (rate <= 0.08) return { color: 'var(--status-good-ink)', word: 'healthy' }
  if (rate <= 0.15) return { color: 'var(--status-warning-ink)', word: 'watch' }
  return { color: 'var(--status-critical)', word: 'too high' }
}

export default function JntVipExecutive() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]

  const expenseRows = useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]
  const expenses = useMemo(() => toOperatingExpenses(expenseRows), [expenseRows])
  const s = useMemo(() => executiveSummary(rows, parcels), [rows, parcels])
  // The bottom line does not need parcels, so the landing page should lead with
  // it rather than with the one figure that does. Cost per delivered parcel
  // answers "which courier"; this answers "is any of this working".
  const pl = useMemo(
    () => (expenses.length > 0 ? profitAndLoss(rows, parcels, expenses) : null),
    [rows, parcels, expenses],
  )
  const trend = useMemo(() => codTrend(rows), [rows])
  const split = useMemo(() => moneySplit(s), [s])
  const splitTotal = split.reduce((t, x) => t + x.amount, 0)
  const band = rtsBand(s.rtsRate)

  if (rows.length === 0) {
    return (
      <div>
        <PageHeader title="J&T Executive Dashboard" />
        <Card>
          <p className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            No statements yet. Import them on <strong>SOA Check</strong> and this fills in.
          </p>
        </Card>
      </div>
    )
  }

  const dearer = (s.vsBenchmark ?? 0) > 0

  return (
    <div>
      <PageHeader
        title="J&T Executive Dashboard"
        description={`${formatNumber(s.statements)} statements · what J&T collected, what they charged, and how that compares to your previous partner.`}
      />

      {/* The verdict first — it is the reason the page exists. */}
      {s.costPerDelivered != null ? (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <Scale size={13} /> Cost per delivered parcel
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {peso(s.costPerDelivered)}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  J&T
                </span>
              </div>
            </div>
            <div className="text-2xl" style={{ color: 'var(--text-muted)' }}>
              vs
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {NPMCM_BENCHMARK.label}
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular" style={{ color: 'var(--text-secondary)' }}>
                  {peso(NPMCM_BENCHMARK.costPerDelivered)}
                </span>
              </div>
            </div>
            <div
              className="ml-auto rounded-xl px-4 py-3"
              style={{
                background: `color-mix(in srgb, ${dearer ? 'var(--status-critical)' : 'var(--status-good-ink)'} 10%, transparent)`,
              }}
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: dearer ? 'var(--status-critical)' : 'var(--status-good-ink)' }}>
                {dearer ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {dearer ? '+' : ''}
                {peso(s.vsBenchmark ?? 0)} per parcel
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                J&T is {Math.abs((s.vsBenchmarkPct ?? 0) * 100).toFixed(0)}% {dearer ? 'dearer' : 'cheaper'} · on{' '}
                {formatNumber(NPMCM_BENCHMARK.deliveredOrders)} orders/month that is{' '}
                <strong>{peso(Math.abs((s.vsBenchmark ?? 0) * NPMCM_BENCHMARK.deliveredOrders))}</strong>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Measured per <em>delivered</em> parcel, not per parcel shipped — a parcel that comes back still costs shipping, so
            cost-per-dispatch flatters the courier. J&T's cost per dispatched parcel is {peso(s.costPerDispatched ?? 0)}.
            Benchmark source: {NPMCM_BENCHMARK.source}.
          </p>
        </Card>
      ) : pl ? (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {pl.profit > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} Operating profit · {pl.days} days
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span
                  className="text-4xl font-semibold tabular"
                  style={{ color: pl.profit > 0 ? 'var(--status-good-ink)' : 'var(--status-critical)' }}
                >
                  {peso(pl.profit)}
                </span>
                <span className="text-sm font-medium" style={{ color: pl.profit > 0 ? 'var(--status-good-ink)' : 'var(--status-critical)' }}>
                  {pl.profit > 0 ? 'profitable' : 'losing money'}
                </span>
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                after courier, product, ads and running costs · {formatPercent(pl.margin)} of {peso(pl.revenue)}
              </div>
            </div>
            <div className="h-12 w-px" style={{ background: 'var(--border-hairline)' }} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                ROAS
              </div>
              <div className="mt-1 text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                {pl.roas.toFixed(2)}x
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                break-even {pl.breakEvenRoas.toFixed(2)}x
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Ad headroom
              </div>
              <div
                className="mt-1 text-2xl font-semibold tabular"
                style={{ color: pl.adHeadroom > 0 ? 'var(--status-good-ink)' : 'var(--status-critical)' }}
              >
                {peso(pl.adHeadroom)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                before profit reaches zero
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--status-warning-ink)' }} />
            <span>
              Cost per delivered parcel — the like-for-like comparison against {NPMCM_BENCHMARK.label}&rsquo;s{' '}
              {peso(NPMCM_BENCHMARK.costPerDelivered)} — needs the parcel export, because statements give totals but not
              delivery counts. Import My Waybill on <strong>SOA Check</strong> to unlock it.
            </span>
          </p>
        </Card>
      ) : (
        <Card className="mb-4">
          <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--status-warning-ink)' }} />
            <span>
              <strong>The comparison needs parcel data.</strong> Import the My Waybill export on <strong>SOA Check</strong>.
            </span>
          </div>
        </Card>
      )}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="COD collected" value={peso(s.codCollected)} icon={<Banknote size={16} />} accent="var(--series-blue)" />
        <StatTile
          label="J&T charges"
          value={peso(s.charges)}
          icon={<Receipt size={16} />}
          accent="var(--series-orange)"
          sub={`${(s.costRatio * 100).toFixed(1)}% of collections`}
        />
        <StatTile label="Net due to you" value={peso(s.netDue)} icon={<Wallet size={16} />} accent="var(--series-aqua)" />
        <StatTile
          label="Outstanding"
          value={peso(s.outstanding)}
          icon={<Clock size={16} />}
          accent={s.outstanding > 0 ? 'var(--status-warning-ink)' : 'var(--text-muted)'}
          sub={s.received > 0 ? `${peso(s.received)} received` : 'nothing recorded as received'}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Parcels dispatched" value={formatNumber(s.dispatched)} icon={<Package size={16} />} accent="var(--series-yellow)" />
        <StatTile label="Delivered" value={formatNumber(s.delivered)} icon={<Truck size={16} />} accent="var(--status-good-ink)" />
        <StatTile
          label="Delivery rate"
          value={s.hasParcels ? formatPercent(s.deliveryRate) : '—'}
          accent="var(--series-magenta)"
          sub={s.hasParcels ? `${formatNumber(s.returned)} returned of ${formatNumber(s.delivered + s.returned)} settled` : 'needs parcel data'}
        />
        <StatTile
          label="Still moving"
          value={formatNumber(s.inFlight)}
          accent="var(--series-violet)"
          sub="not yet delivered or returned"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="COD collected by statement" description="Every statement period, oldest first" className="lg:col-span-2">
          <PeakAreaChart data={trend.map((t) => ({ label: t.label, value: t.value }))} />
        </Card>

        <Card title="RTS rate" description="Returned as a share of settled parcels">
          {s.hasParcels ? (
            <div className="flex flex-col items-center gap-4 pt-1">
              <RadialGauge
                value={s.rtsRate}
                label="RTS rate"
                sub={`${formatNumber(s.returned)} of ${formatNumber(s.delivered + s.returned)}`}
                color={band.color}
                size={140}
              />
              <div className="text-xs font-medium" style={{ color: band.color }}>
                {band.word}
              </div>
              <div className="grid w-full grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Delivered</div>
                  <div className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(s.delivered)}
                  </div>
                </div>
                <div className="rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Returned / RTS</div>
                  <div className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(s.returned)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Import the parcel export to see the rate. Statements carry RTS fees but not parcel counts.
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-4" title="Where the COD went" description="Across every statement in the ledger">
        <div className="flex h-7 w-full overflow-hidden rounded-lg">
          {split.map((seg, i) => (
            <div
              key={seg.key}
              className="flex items-center justify-center"
              style={{ width: `${(seg.amount / splitTotal) * 100}%`, background: seg.color, marginLeft: i === 0 ? 0 : 2 }}
              title={`${seg.label}: ${peso(seg.amount)}`}
            >
              {seg.amount / splitTotal > 0.09 && (
                <span className="text-[11px] font-semibold text-white">{((seg.amount / splitTotal) * 100).toFixed(0)}%</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {split.map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: seg.color }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {seg.label}
              </span>
              <span className="text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                {peso(seg.amount)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
