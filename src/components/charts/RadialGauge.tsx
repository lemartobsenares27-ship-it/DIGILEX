interface RadialGaugeProps {
  value: number // 0-1
  label: string
  sub?: string
  color?: string
  size?: number
}

export default function RadialGauge({ value, label, sub, color = 'var(--series-blue)', size = 140 }: RadialGaugeProps) {
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(value, 0), 1)
  const offset = circumference * (1 - clamped)

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-hairline)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text
          x="50%"
          y={sub ? '46%' : '52%'}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fill: 'var(--text-primary)', fontSize: size * 0.2, fontWeight: 700 }}
        >
          {(clamped * 100).toFixed(1)}%
        </text>
        {sub && (
          <text
            x="50%"
            y="63%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: 'var(--text-muted)', fontSize: size * 0.075 }}
          >
            {sub}
          </text>
        )}
      </svg>
      <div className="mt-1 text-center text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  )
}
