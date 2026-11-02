// Day by day — the grain you need while an experiment is running.
//
// The chart plots a SEVEN-DAY ROLLING return rate, not a daily one, and stops
// where the data stops being trustworthy rather than running to today. Both
// choices are the whole point of the page, so they are stated on it rather
// than left for someone to discover by being misled first.
//
// One series, so no legend: the title names it. The recent incomplete days
// still appear in the table underneath, marked, because hiding them entirely
// would look like missing data.

import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingDown, TrendingUp, CalendarRange, Hourglass } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import NeedsData from './NeedsData'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { summariseDaily, type DailyRow } from '../../lib/jntvip/daily'
import { formatNumber } from '../../lib/format'
import type { JntVipParcelRow } from '../../lib/jntvip/types'

const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })
const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })

export default function JntVipDaily() {
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const s = useMemo(() => summariseDaily(parcels), [parcels])

  if (s.rows.length === 0) {
    return (
      <div>
        <PageHeader title="Daily performance" description="Day by day, so a change can be seen while it is still happening." />
        <NeedsData
          shows="the return rate day by day, so you can tell within a fortnight whether a change you made is working"
          needs="a parcel export"
          where="My Waybill, in the J&T VIP portal"
          to="/import"
        />
      </div>
    )
  }

  const change =
    s.latestRolling != null && s.priorRolling != null ? s.latestRolling - s.priorRolling : null
  const better = change != null && change < 0
  const data = s.plotted.map((r) => ({
    label: dayLabel(r.day),
    rate: Number(((r.rolling ?? 0) * 100).toFixed(1)),
    dispatched: r.dispatched,
  }))
  const overall =
    s.plotted.length > 0
      ? s.plotted.reduce((t, r) => t + (r.rolling ?? 0), 0) / s.plotted.length
      : 0
  const recent = s.rows.slice(-14).reverse()

  return (
    <div>
      <PageHeader
        title="Daily performance"
        description="The monthly pages judge the business. This one tells you whether something you changed last week is working."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Return rate, last 7 days"
          value={s.latestRolling != null ? `${(s.latestRolling * 100).toFixed(1)}%` : '—'}
          icon={better ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
          accent={better ? 'var(--status-good-ink)' : 'var(--series-orange)'}
          sub={s.matureTo ? `of parcels dispatched to ${dayLabel(s.matureTo)}` : 'not enough settled parcels yet'}
        />
        <StatTile
          label="Versus the week before"
          value={change != null ? `${change > 0 ? '+' : ''}${(change * 100).toFixed(1)} pts` : '—'}
          icon={better ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
          accent={change == null ? 'var(--text-muted)' : better ? 'var(--status-good-ink)' : 'var(--series-orange)'}
          sub={
            change == null
              ? 'needs two full weeks'
              : better
                ? 'fewer coming back'
                : 'more coming back'
          }
        />
        <StatTile
          label="Days measured"
          value={formatNumber(s.plotted.length)}
          icon={<CalendarRange size={16} />}
          accent="var(--series-blue)"
          sub="days with a full, settled week behind them"
        />
        <StatTile
          label="Still settling"
          value={formatNumber(s.pending)}
          icon={<Hourglass size={16} />}
          accent="var(--series-violet)"
          sub="recent days whose returns have not all happened"
        />
      </div>

      <Card
        title="Return rate, seven-day rolling"
        description="Dated by the day a parcel was DISPATCHED, so a parcel stays with the batch it left in. The line stops where parcels stop having settled."
        className="mt-4"
      >
        {data.length < 2 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Not enough settled days to draw a trend yet.
          </p>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
                <CartesianGrid stroke="var(--border-hairline)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-hairline)' }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: 'var(--text-primary)',
                  }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  formatter={(v, _n, item) => {
                    const row = (item as { payload?: { dispatched?: number } })?.payload
                    return [
                      `${Number(v).toFixed(1)}% · ${formatNumber(row?.dispatched ?? 0)} dispatched that day`,
                      'Rolling return rate',
                    ]
                  }}
                />
                {/* The period average, so a reader can see whether the last
                    point is a move or just where the line usually sits. */}
                <ReferenceLine
                  y={Number((overall * 100).toFixed(1))}
                  stroke="var(--text-muted)"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--series-blue)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--surface-card)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Rolled over seven days on purpose. On a day with a dozen settled parcels one extra return moves the rate
          eight points, and nothing happened but chance. The dashed line is the average across the period shown.
        </p>
      </Card>

      <Card
        title="The last two weeks, as dispatched"
        description="Returns take a median five days longer to settle than deliveries, so the newest rows are still moving."
        className="mt-4"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2 text-left font-medium">Dispatched</th>
                <th className="pb-2 text-right font-medium">Parcels</th>
                <th className="pb-2 text-right font-medium">Delivered</th>
                <th className="pb-2 text-right font-medium">Returned</th>
                <th className="pb-2 text-right font-medium">Settled</th>
                <th className="pb-2 text-right font-medium">Return rate</th>
                <th className="pb-2 text-right font-medium">COD</th>
                <th className="pb-2 text-right font-medium">Ads that day</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <Row key={r.day} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Row({ r }: { r: DailyRow }) {
  const settled = r.delivered + r.returned
  const ripe = r.maturity >= 0.9
  return (
    <tr className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
      <td className="whitespace-nowrap py-1.5" style={{ color: 'var(--text-primary)' }}>
        {dayLabel(r.day)}
      </td>
      <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {formatNumber(r.dispatched)}
      </td>
      <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {formatNumber(r.delivered)}
      </td>
      <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {formatNumber(r.returned)}
      </td>
      <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {r.dispatched > 0 ? `${Math.round(r.maturity * 100)}%` : '—'}
      </td>
      <td className="whitespace-nowrap py-1.5 text-right font-medium tabular-nums">
        {r.rts != null ? (
          <span style={{ color: 'var(--text-primary)' }}>{(r.rts * 100).toFixed(1)}%</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            {ripe ? '—' : `still settling (${formatNumber(settled)} of ${formatNumber(r.dispatched)})`}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {r.cod > 0 ? peso(r.cod) : '—'}
      </td>
      <td className="whitespace-nowrap py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {r.adSpend > 0 ? peso(r.adSpend) : '—'}
      </td>
    </tr>
  )
}
