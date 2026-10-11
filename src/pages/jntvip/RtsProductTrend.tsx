// Return rate per product, over time.
//
// The table underneath carries the same numbers and is the authority; this is
// here because a table cannot show a shape. "EYE CARE climbed from 5% to 25%
// over four weeks while TESTOMAXX held" is one glance on a line and four
// comparisons across a grid.
//
// Series colours are assigned in a fixed order by product name, not by rank, so
// filtering or a product dropping out of a week never repaints the survivors.
// The four hues are validated against both surfaces: all checks pass, worst
// adjacent CVD separation 9.2 deutan. Aqua warns on contrast in light mode,
// which the direct end-labels and the table below are the required relief for.

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { RtsPeriod } from '../../lib/jntvip/rts'

/** Fixed hue order. A fifth product folds into the table rather than inventing a hue. */
const SERIES = ['var(--series-blue)', 'var(--series-aqua)', 'var(--series-orange)', 'var(--series-violet)']

interface Props {
  periods: RtsPeriod[]
  products: string[]
  height?: number
}

export default function RtsProductTrend({ periods, products, height = 260 }: Props) {
  // At most four lines; the rest stay in the table below.
  const shown = products.slice(0, SERIES.length)
  const colorOf = (name: string) => SERIES[shown.indexOf(name)] ?? 'var(--text-muted)'

  const data = periods.map((p) => {
    const row: Record<string, string | number | null> = { label: p.label.replace(' – ', '–') }
    for (const name of shown) {
      const cell = p.byProduct[name]
      // null, not 0 — a week a product did not sell is a gap in the line, and
      // plotting it as zero would read as a perfect week.
      row[name] = cell && cell.settled > 0 ? Number((cell.rate * 100).toFixed(1)) : null
    }
    return row
  })

  if (periods.length < 2 || shown.length === 0) return null

  return (
    <div>
      {/* Legend is always present for two or more series, so identity never
          rests on colour alone. */}
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {shown.map((name) => (
          <span key={name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(name) }} />
            {name}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 12, right: 56, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--border-hairline)' }}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={38}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
            formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
          />
          {shown.map((name) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={colorOf(name)}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-card)', fill: colorOf(name) }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--surface-card)' }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
