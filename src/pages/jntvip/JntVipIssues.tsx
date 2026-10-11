// What to deal with first.
//
// This replaces the Discrepancy Center, which could only ever fill from a POS
// comparison that never runs here. The idea was right and the source was wrong:
// the problems worth surfacing are in the statements and parcels, which exist.
//
// Ranked by money at stake rather than by severity, because severity alone puts
// a cosmetic mismatch above a missing remittance. Issues with no peso value sit
// last rather than being given an invented one.

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatNumber } from '../../lib/format'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { findIssues, issueTotals, type IssueSeverity } from '../../lib/jntvip/issues'
import type {
  JntVipSoaCheckRow,
  JntVipParcelRow,
  JntVipProductRow,
  JntVipParcelProductRow,
} from '../../lib/jntvip/types'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Status colours are reserved, and each ships with an icon and a word so
// severity never rests on colour alone.
const LOOK: Record<IssueSeverity, { color: string; label: string; Icon: typeof AlertOctagon }> = {
  critical: { color: 'var(--status-critical)', label: 'Act now', Icon: AlertOctagon },
  warning: { color: 'var(--status-warning-ink)', label: 'Look into', Icon: AlertTriangle },
  info: { color: 'var(--series-blue)', label: 'Worth knowing', Icon: Info },
}

export default function JntVipIssues() {
  const soaRows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const products = useLiveTable(jntVipDb.products) as JntVipProductRow[]
  const parcelProducts = useLiveTable(jntVipDb.parcelProducts) as JntVipParcelProductRow[]

  const issues = useMemo(
    () => findIssues({ soaRows, parcels, products, parcelProducts }),
    [soaRows, parcels, products, parcelProducts],
  )
  const totals = useMemo(() => issueTotals(issues), [issues])

  return (
    <div>
      <PageHeader
        title="Issues to fix"
        description="Everything across your statements and parcels that needs attention, most urgent first."
      />

      {soaRows.length === 0 && parcels.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Nothing loaded yet. Once statements and a parcel export are in, anything that needs
            chasing — money that never arrived, a statement that does not add up, a missing billing
            day, parcels with no product — collects here.
          </p>
        </Card>
      ) : issues.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'var(--status-good-ink)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Nothing needs attention.
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Every statement adds up, every one has been paid in full, there are no gaps in the
              billing dates, and every parcel is attributed to a product.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Money at stake"
              value={peso(totals.atStake)}
              accent={totals.atStake > 0 ? 'var(--status-critical)' : 'var(--status-good-ink)'}
            />
            <StatTile
              label="Act now"
              value={formatNumber(totals.critical)}
              accent={totals.critical > 0 ? 'var(--status-critical)' : 'var(--status-good-ink)'}
            />
            <StatTile label="Look into" value={formatNumber(totals.warning)} accent="var(--status-warning-ink)" />
          </div>

          <div className="flex flex-col gap-3">
            {issues.map((issue) => {
              const look = LOOK[issue.severity]
              return (
                <Card key={issue.id}>
                  <div className="flex flex-wrap items-start gap-3">
                    <look.Icon size={18} className="mt-0.5 shrink-0" style={{ color: look.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span
                          className="rounded px-1.5 py-0.5 text-xs font-semibold"
                          style={{ background: `color-mix(in srgb, ${look.color} 15%, transparent)`, color: look.color }}
                        >
                          {look.label}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {issue.title}
                        </span>
                      </div>
                      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {issue.detail}
                      </p>
                      <p className="mt-1.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                        <strong>What to do:</strong> {issue.action}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {issue.amount != null && (
                        <span className="text-lg font-semibold tabular" style={{ color: look.color }}>
                          {peso(issue.amount)}
                        </span>
                      )}
                      <Link
                        to={issue.to}
                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                        style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                      >
                        {issue.toLabel} <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Act-now items come first, then look-into, and within each the largest amount leads. An
            issue with no peso value sits at the bottom of its group rather than being given an
            invented one — so a smaller urgent item can outrank a larger one that can wait.
          </p>
        </>
      )}
    </div>
  )
}
