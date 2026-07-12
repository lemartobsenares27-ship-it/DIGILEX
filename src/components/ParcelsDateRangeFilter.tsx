import { useMemo } from 'react'

export interface MonthOption {
  key: string
  label: string
  start: string
  end: string
}

interface Preset {
  label: string
  start: string
  end: string
}

interface ParcelsDateRangeFilterProps {
  startDate: string
  endDate: string
  minDate: string
  maxDate: string
  monthOptions: MonthOption[]
  onChange: (start: string, end: string) => void
}

function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function clamp(date: string, min: string, max: string): string {
  if (date < min) return min
  if (date > max) return max
  return date
}

export default function ParcelsDateRangeFilter({
  startDate,
  endDate,
  minDate,
  maxDate,
  monthOptions,
  onChange,
}: ParcelsDateRangeFilterProps) {
  const presets = useMemo<Preset[]>(() => {
    const list: Preset[] = [
      { label: 'Today', start: maxDate, end: maxDate },
      { label: 'Last 7 Days', start: daysBefore(maxDate, 6), end: maxDate },
      { label: 'Last 30 Days', start: daysBefore(maxDate, 29), end: maxDate },
      ...monthOptions.map((m) => ({ label: m.label, start: m.start, end: m.end })),
      { label: 'All Time', start: minDate, end: maxDate },
    ]
    return list.map((p) => ({ ...p, start: clamp(p.start, minDate, maxDate), end: clamp(p.end, minDate, maxDate) }))
  }, [minDate, maxDate, monthOptions])

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border p-3"
      style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
    >
      <div className="flex items-center gap-2 text-sm">
        <span style={{ color: 'var(--text-muted)' }}>Date range:</span>
        <input
          type="date"
          value={startDate}
          min={minDate}
          max={endDate}
          onChange={(e) => e.target.value && onChange(e.target.value, endDate)}
          className="rounded-lg border px-2 py-1 text-sm"
          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
        />
        <span style={{ color: 'var(--text-muted)' }}>→</span>
        <input
          type="date"
          value={endDate}
          min={startDate}
          max={maxDate}
          onChange={(e) => e.target.value && onChange(startDate, e.target.value)}
          className="rounded-lg border px-2 py-1 text-sm"
          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
        />
      </div>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = p.start === startDate && p.end === endDate
          return (
            <button
              key={p.label}
              onClick={() => onChange(p.start, p.end)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: active ? 'var(--series-orange)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
                border: active ? 'none' : '1px solid var(--border-hairline)',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
