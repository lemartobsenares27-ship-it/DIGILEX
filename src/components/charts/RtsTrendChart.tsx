import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RtsBucketRow } from '../../lib/analytics'

interface RtsTrendChartProps {
  data: RtsBucketRow[]
  /** Blended rate across settled months, drawn as the "normal" line. */
  baseline: number
  height?: number
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

function RtsTooltip({ active, payload }: { active?: boolean; payload?: { payload: RtsBucketRow }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs"
      style={{
        background: 'var(--surface-card)',
        borderColor: 'var(--border-hairline)',
        color: 'var(--text-primary)',
        boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
      }}
    >
      <div className="mb-1 font-semibold">{d.label}</div>
      {d.suspect && (
        <div className="mb-1" style={{ color: 'var(--status-warning)' }}>
          Incomplete POS data — returns missing
        </div>
      )}
      <div style={{ color: 'var(--text-secondary)' }}>
        <div>
          RTS rate <span className="font-semibold tabular" style={{ color: 'var(--text-primary)' }}>{pct(d.rate)}</span>
        </div>
        <div className="tabular">
          {d.rts} returned of {d.delivered + d.rts} resolved
        </div>
        {d.transit > 0 && (
          <div className="tabular">
            {d.transit} still in transit &middot; can end {pct(d.rateFloor)}–{pct(d.rateCeiling)}
          </div>
        )}
        <div className="mt-1 tabular" style={{ color: 'var(--text-muted)' }}>
          {d.total} parcels shipped
        </div>
      </div>
    </div>
  )
}

export default function RtsTrendChart({ data, baseline, height = 240 }: RtsTrendChartProps) {
  // A bucket with very few parcels swings wildly on one or two returns, so mark
  // those points hollow rather than letting them read as real movement.
  const LOW_VOLUME = 15

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-hairline)' }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <ReferenceLine
          y={baseline}
          stroke="var(--text-muted)"
          strokeDasharray="4 4"
          label={{
            value: `normal ${pct(baseline)}`,
            position: 'insideTopRight',
            fill: 'var(--text-muted)',
            fontSize: 11,
          }}
        />
        <Tooltip content={<RtsTooltip />} cursor={{ stroke: 'var(--border-hairline)', strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="var(--series-orange)"
          strokeWidth={2}
          dot={(props: { cx?: number; cy?: number; payload?: RtsBucketRow; index?: number }) => {
            const { cx, cy, payload, index } = props
            if (cx == null || cy == null || !payload) return <g key={index} />
            const thin = payload.total < LOW_VOLUME
            // A bucket whose returns are missing from the export is not a real
            // low - draw it in the warning colour so it never reads as good news.
            const stroke = payload.suspect ? 'var(--status-warning)' : 'var(--series-orange)'
            return (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r={payload.suspect ? 5 : 4}
                fill={thin || payload.suspect ? 'var(--surface-card)' : 'var(--series-orange)'}
                stroke={stroke}
                strokeWidth={2}
              />
            )
          }}
          activeDot={{ r: 6, fill: 'var(--series-orange)', stroke: 'var(--surface-card)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
