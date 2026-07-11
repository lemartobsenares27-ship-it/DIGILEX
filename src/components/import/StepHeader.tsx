const STEPS = ['Upload', 'Preview & Validate', 'Map & Categorize', 'Confirm & Post']

interface StepHeaderProps {
  current: number
  onBack?: () => void
}

export default function StepHeader({ current, onBack }: StepHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {onBack && (
        <button
          onClick={onBack}
          className="mr-2 rounded-lg border px-2.5 py-1 text-xs font-medium"
          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
        >
          ← Change import type
        </button>
      )}
      {STEPS.map((s, i) => {
        const active = i === current
        const done = i < current
        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                color: active ? 'white' : done ? 'var(--status-good)' : 'var(--text-muted)',
                background: active
                  ? 'var(--series-blue)'
                  : done
                    ? 'color-mix(in srgb, var(--status-good) 14%, transparent)'
                    : 'color-mix(in srgb, var(--text-primary) 5%, transparent)',
              }}
            >
              <span>{i + 1}</span>
              <span>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span style={{ color: 'var(--border-strong)' }}>—</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
