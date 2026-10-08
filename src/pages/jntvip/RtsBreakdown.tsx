// RTS rate over time, split by product.
//
// The headline percentage is the least useful form of this number. Returns move
// with the creative, the offer and how orders are confirmed, so what matters is
// the direction and which product is carrying it — neither of which survives
// being averaged into one figure for the month.

import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Undo2 } from 'lucide-react'
import Card from '../../components/Card'
import { formatNumber, formatPercent } from '../../lib/format'
import { rtsByPeriod, productsIn, rtsTrend, rtsBand, type ProductResolver } from '../../lib/jntvip/rts'
import type { JntVipParcelRow } from '../../lib/jntvip/types'

export default function RtsBreakdown({ parcels, productOf }: { parcels: JntVipParcelRow[]; productOf: ProductResolver }) {
  const [grain, setGrain] = useState<'week' | 'month'>('week')
  const periods = useMemo(() => rtsByPeriod(parcels, grain, productOf), [parcels, grain, productOf])
  const products = useMemo(() => productsIn(periods), [periods])
  const trend = useMemo(() => rtsTrend(periods), [periods])

  const overall = useMemo(() => {
    const d = periods.reduce((t, p) => t + p.total.delivered, 0)
    const r = periods.reduce((t, p) => t + p.total.returned, 0)
    return { delivered: d, returned: r, settled: d + r, rate: d + r > 0 ? r / (d + r) : 0 }
  }, [periods])

  if (periods.length === 0) {
    return (
      <Card title="Return rate">
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Statements carry RTS fees but never say how many parcels came back. Import a{' '}
          <strong>My Waybill</strong> export on <strong>Import</strong> and the rate appears here,
          by week and by month, split by product.
        </p>
      </Card>
    )
  }

  const band = rtsBand(overall.rate)
  const worsening = trend != null && trend.change > 0.02

  return (
    <Card
      title="Return rate"
      description="Returns as a share of parcels that settled — delivered plus returned. Parcels still moving are left out; they have not had the chance to come back yet."
    >
      <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Overall
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular" style={{ color: band.color }}>
              {formatPercent(overall.rate)}
            </span>
            <span className="text-sm font-medium" style={{ color: band.color }}>
              {band.word}
            </span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {formatNumber(overall.returned)} returned of {formatNumber(overall.settled)} settled
          </div>
        </div>

        {trend && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Latest {grain} vs the one before
            </div>
            <div
              className="mt-0.5 flex items-center gap-1.5 text-2xl font-semibold tabular"
              style={{ color: trend.change > 0 ? 'var(--status-critical)' : 'var(--status-good-ink)' }}
            >
              {trend.change > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {trend.change > 0 ? '+' : ''}
              {formatPercent(trend.change)}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {formatPercent(trend.from.total.rate)} → {formatPercent(trend.to.total.rate)}
            </div>
          </div>
        )}

        <div className="ml-auto flex gap-1.5">
          {(['week', 'month'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGrain(g)}
              className="rounded-lg border px-2.5 py-1 text-xs font-medium capitalize"
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
      </div>

      {worsening && (
        <p
          className="mb-3 rounded-lg p-2.5 text-xs"
          style={{ background: 'color-mix(in srgb, var(--status-critical) 10%, transparent)', color: 'var(--text-primary)' }}
        >
          <strong>Returns are rising.</strong> The last {grain} came in {formatPercent(trend!.change)} above the one
          before. Every return still costs the outbound shipping and the RTS fee, so this lands straight on the bottom
          line.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
              <th className="py-2 pr-4 font-semibold">{grain === 'week' ? 'Week' : 'Month'}</th>
              {products.map((name) => (
                <th key={name} className="py-2 pr-4 text-right font-semibold">
                  {name}
                </th>
              ))}
              <th className="py-2 pr-4 text-right font-semibold">All</th>
              <th className="py-2 font-semibold" style={{ minWidth: 120 }}>
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => {
              const b = rtsBand(p.total.rate)
              return (
                <tr key={p.key} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="whitespace-nowrap py-2 pr-4" style={{ color: 'var(--text-primary)' }}>
                    {p.label}
                    <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {p.key.includes('W') ? p.key.split('-')[1] : ''}
                    </span>
                  </td>
                  {products.map((name) => {
                    const c = p.byProduct[name]
                    return (
                      <td key={name} className="whitespace-nowrap py-2 pr-4 text-right tabular" style={{ color: 'var(--text-secondary)' }}>
                        {c ? (
                          <>
                            {formatPercent(c.rate)}
                            <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {c.returned}/{c.settled}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="whitespace-nowrap py-2 pr-4 text-right tabular font-medium" style={{ color: b.color }}>
                    {formatPercent(p.total.rate)}
                    <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                      {p.total.returned}/{p.total.settled}
                    </span>
                  </td>
                  <td className="py-2">
                    {/* The bar carries the same number the cell states, so identity
                        never rests on colour alone. */}
                    <div className="h-2 w-full overflow-hidden rounded-sm" style={{ background: 'var(--border-hairline)' }}>
                      <div className="h-full rounded-sm" style={{ width: `${Math.min(p.total.rate * 100 * 3, 100)}%`, background: b.color }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <Undo2 size={13} className="mt-0.5 shrink-0" />
        <span>
          A period is keyed on the day the parcel&rsquo;s fate was decided, not the day it was sent —
          keying on dispatch would push a return back into the week you are trying to judge and make
          the most recent weeks always look better than they are. Bars are scaled to 33% so the
          difference between a good week and a bad one is visible.
        </span>
      </p>
    </Card>
  )
}
