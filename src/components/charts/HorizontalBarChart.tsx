import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../lib/format'

interface HorizontalBarChartProps {
  data: { label: string; value: number }[]
  height?: number
  color?: string
}

const SHADES = [
  'var(--series-blue)',
  'color-mix(in srgb, var(--series-blue) 80%, white)',
  'color-mix(in srgb, var(--series-blue) 60%, white)',
  'color-mix(in srgb, var(--series-blue) 45%, white)',
  'color-mix(in srgb, var(--series-blue) 32%, white)',
]

export default function HorizontalBarChart({ data, height }: HorizontalBarChartProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const h = height ?? Math.max(180, sorted.length * 32)
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--border-hairline)" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={{ stroke: 'var(--border-strong)' }}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          tickFormatter={(v: number) => formatCurrency(v).replace('PHP', '₱').replace('.00', '')}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'color-mix(in srgb, var(--text-primary) 5%, transparent)' }}
          contentStyle={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-primary)',
          }}
          formatter={(value: unknown) => formatCurrency(value)}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={SHADES[i % SHADES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
