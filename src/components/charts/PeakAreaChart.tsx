import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../lib/format'

interface Point {
  label: string
  value: number
}

interface PeakAreaChartProps {
  data: Point[]
  color?: string
  height?: number
}

export default function PeakAreaChart({ data, color = 'var(--series-orange)', height = 220 }: PeakAreaChartProps) {
  const peak = data.reduce((max, d) => (d.value > max.value ? d : max), data[0] ?? { label: '', value: 0 })
  const gradientId = 'peakAreaFill'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 28, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: 'var(--border-strong)' }}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-primary)',
          }}
          formatter={(value: unknown) => formatCurrency(value)}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
        {peak.label && (
          <ReferenceDot
            x={peak.label}
            y={peak.value}
            r={4}
            fill={color}
            stroke="var(--surface-card)"
            strokeWidth={2}
            label={{
              value: `Peak: ${formatCurrency(peak.value)}`,
              position: 'top',
              fill: 'var(--text-primary)',
              fontSize: 11,
              fontWeight: 600,
            }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
