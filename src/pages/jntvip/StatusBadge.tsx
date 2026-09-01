import type { JntVipMatchConfidence, JntVipReconStatus } from '../../lib/jntvip/types'

const STATUS_COLOR: Record<JntVipReconStatus, string> = {
  MATCHED: 'var(--status-good)',
  NEEDS_REVIEW: 'var(--status-warning)',
  MISMATCH: 'var(--status-critical)',
  JNT_ONLY: 'var(--series-blue)',
  POS_ONLY: 'var(--series-violet)',
  DUPLICATE: 'var(--series-orange)',
}

const STATUS_LABEL: Record<JntVipReconStatus, string> = {
  MATCHED: 'Matched',
  NEEDS_REVIEW: 'Needs Review',
  MISMATCH: 'Mismatch',
  JNT_ONLY: 'J&T Only',
  POS_ONLY: 'POS Only',
  DUPLICATE: 'Duplicate',
}

export function ReconStatusBadge({ status }: { status: JntVipReconStatus }) {
  const color = STATUS_COLOR[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

const CONFIDENCE_COLOR: Record<JntVipMatchConfidence, string> = {
  HIGH: 'var(--status-good)',
  MEDIUM: 'var(--status-warning)',
  LOW: 'var(--status-critical)',
}

export function ConfidenceBadge({ confidence }: { confidence: JntVipMatchConfidence | null }) {
  if (!confidence) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  return (
    <span className="text-xs font-semibold" style={{ color: CONFIDENCE_COLOR[confidence] }}>
      {confidence}
    </span>
  )
}
