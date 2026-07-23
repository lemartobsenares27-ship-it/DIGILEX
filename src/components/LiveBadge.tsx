export default function LiveBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
      style={{ background: 'color-mix(in srgb, var(--status-good) 14%, transparent)', color: 'var(--status-good)' }}
    >
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ background: 'var(--status-good)' }}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--status-good)' }} />
      </span>
      Live
    </span>
  )
}
