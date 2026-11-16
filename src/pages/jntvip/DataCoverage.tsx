// What is current, what is stale, and what to send next.
//
// Sits at the top of Import because that is where somebody stands when they are
// about to upload something and are not sure what. Every date is computed from
// the rows actually loaded, so it goes stale by itself rather than needing to be
// kept up to date by hand.

import { useMemo } from 'react'
import { CalendarCheck } from 'lucide-react'
import Card from '../../components/Card'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { dataCoverage, needsAttention, type CoverageLine, type Freshness } from '../../lib/jntvip/dataCoverage'
import { formatNumber } from '../../lib/format'
import type { JntVipParcelRow, JntVipSoaCheckRow, JntVipPosOrderRow } from '../../lib/jntvip/types'

const TONE: Record<Freshness, { color: string; word: (d: number | null) => string }> = {
  current: { color: 'var(--status-good-ink)', word: (d) => (d === 0 ? 'today' : `${d}d behind`) },
  behind: { color: 'var(--series-orange)', word: (d) => `${d}d behind` },
  stale: { color: 'var(--series-orange)', word: (d) => `${d}d behind` },
  missing: { color: 'var(--text-muted)', word: () => 'nothing loaded' },
}

export default function DataCoverage() {
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const soas = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const posOrders = useLiveTable(jntVipDb.posOrders) as JntVipPosOrderRow[]

  const lines = useMemo(
    () => dataCoverage(parcels, soas, posOrders, new Date().toISOString().slice(0, 10)),
    [parcels, soas, posOrders],
  )
  const chase = needsAttention(lines)

  return (
    <Card
      className="mb-6"
      title="What is current, and what to send next"
      description="Every date below is read from the rows actually loaded, so this goes stale on its own rather than being kept up to date by hand."
    >
      {chase.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--status-good-ink)' }}>
          Everything is current. Nothing to upload.
        </p>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>
            {formatNumber(chase.length)} of {formatNumber(lines.length)} sources
          </strong>{' '}
          are behind. Upload them in the order below — the top one is holding up the most.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {[...chase, ...lines.filter((l) => l.freshness === 'current')].map((l) => (
          <Line key={l.key} l={l} />
        ))}
      </div>

      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <CalendarCheck size={12} className="mr-1 inline" />
        Dates only. This says how fresh a file is, never whether its contents are right — that is what the
        reconciliation and SOA Check pages are for.
      </p>
    </Card>
  )
}

function Line({ l }: { l: CoverageLine }) {
  const tone = TONE[l.freshness]
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: l.freshness === 'stale' || l.freshness === 'missing' ? tone.color : 'var(--border-hairline)',
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {l.label}
        </p>
        <p className="text-xs font-medium tabular-nums" style={{ color: tone.color }}>
          {l.through ? `covers to ${l.through} · ${tone.word(l.daysBehind)}` : tone.word(null)}
        </p>
      </div>
      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        {l.feeds}
      </p>
      {l.freshness !== 'current' && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Send: </strong>
          {l.upload} — {l.where}.
        </p>
      )}
    </div>
  )
}
