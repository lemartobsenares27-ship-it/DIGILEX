import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency, formatDate } from '../../lib/format'

interface LineTrendChartProps {
  data: { date: string; value: number }[]
  height?: number
  color?: string
}

export default function LineTrendChart({ data, height = 260, color = 'var(--series-blue)' }: LineTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={{ stroke: 'var(--border-strong)' }}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          tickFormatter={(v: string) => formatDate(v)}
          minTickGap={30}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          tickFormatter={(v: number) => formatCurrency(v).replace('PHP', '₱').replace('.00', '')}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-primary)',
          }}
          labelFormatter={(v: unknown) => formatDate(v)}
          formatter={(value: unknown) => formatCurrency(value)}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
