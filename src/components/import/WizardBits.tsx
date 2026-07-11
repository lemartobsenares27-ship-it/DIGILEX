export function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}>
      <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular" style={{ color: accent ?? 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

export function NextButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      style={{ background: 'var(--series-blue)' }}
    >
      Continue →
    </button>
  )
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border px-4 py-2 text-sm font-medium"
      style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
    >
      ← Back
    </button>
  )
}

export function PostButton({ onClick, busy, disabled }: { onClick: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      style={{ background: 'var(--series-orange)' }}
    >
      {busy ? 'Posting…' : 'Post to DIGILEX'}
    </button>
  )
}
