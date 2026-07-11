import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../../lib/format'

interface Series {
  key: string
  label: string
  color: string
}

interface GroupedBarChartProps {
  data: Record<string, unknown>[]
  xKey: string
  series: Series[]
  height?: number
}

export default function GroupedBarChart({ data, xKey, series, height = 280 }: GroupedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-strong)' }}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          tickFormatter={(v: number) => formatCurrency(v).replace('PHP', '₱').replace('.00', '')}
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
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
