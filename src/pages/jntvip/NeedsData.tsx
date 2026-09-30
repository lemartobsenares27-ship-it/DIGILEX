// The empty state, done honestly.
//
// "No SOA batches imported yet" tells you nothing you could act on. It does not
// say what this page would show, what file fills it, where that file comes from,
// or — the case that matters most here — that you may not need this page at all.
//
// Several pages in this app serve a POS-versus-statement matching workflow. If
// your orders never pass through a POS export, those pages are not broken and
// not waiting on you; they are simply not part of how you work. Saying so is
// more useful than an empty table, and much more useful than implying a missing
// step you were supposed to have done.

import { Link } from 'react-router-dom'
import { UploadCloud, Info } from 'lucide-react'
import Card from '../../components/Card'

export interface NeedsDataProps {
  /** What this page would show once it has what it needs. */
  shows: string
  /** The file that fills it, in the user's own words for it. */
  needs: string
  /** Where that file comes from. */
  where?: string
  /** Set when the page belongs to a workflow the user may simply not use. */
  optional?: string
  /** Where to go to supply it. */
  to?: string
  toLabel?: string
}

export default function NeedsData({ shows, needs, where, optional, to = '/import', toLabel = 'Go to Import' }: NeedsDataProps) {
  return (
    <Card>
      <div className="mx-auto max-w-xl py-8 text-center">
        <UploadCloud size={26} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {shows}
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          To fill it, import <strong>{needs}</strong>
          {where ? ` — ${where}` : ''}.
        </p>

        {optional && (
          <p className="mx-auto mt-4 flex max-w-lg items-start gap-1.5 rounded-lg p-3 text-left text-xs" style={{ background: 'color-mix(in srgb, var(--series-blue) 8%, transparent)', color: 'var(--text-secondary)' }}>
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>{optional}</span>
          </p>
        )}

        <Link
          to={to}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--series-orange)' }}
        >
          <UploadCloud size={14} /> {toLabel}
        </Link>
      </div>
    </Card>
  )
}
