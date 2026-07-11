interface BadgeProps {
  label: string
}

function statusColor(label: string): string {
  const l = label.toLowerCase()
  if (
    l.includes('delivered') ||
    l.includes('confirmed') ||
    l.includes('verified') ||
    l.includes('clean') ||
    l.includes('matched') ||
    (l.includes('paid') && !l.includes('unpaid'))
  ) {
    return 'var(--status-good)'
  }
  if (
    l.includes('rts') ||
    l.includes('returned') ||
    l.includes('critical') ||
    l.includes('unpaid') ||
    l.includes('cancelled') ||
    l.includes('overdue')
  ) {
    return 'var(--status-critical)'
  }
  if (l.includes('review') || l.includes('unverifiable') || l.includes('pending') || l.includes('assumed') || l.includes('due in')) {
    return 'var(--status-warning)'
  }
  if (l.includes('personal') || l.includes('unmatched') || l.includes('not yet') || l.includes('not found')) {
    return 'var(--status-serious)'
  }
  return 'var(--text-muted)'
}

export default function Badge({ label }: BadgeProps) {
  const color = statusColor(label)
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
