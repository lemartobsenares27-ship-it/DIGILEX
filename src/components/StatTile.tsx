import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string
  icon?: ReactNode
  accent?: string
  sub?: string
}

export default function StatTile({ label, value, icon, accent = 'var(--series-blue)', sub }: StatTileProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {icon && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
