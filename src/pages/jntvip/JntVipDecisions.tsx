// The page that answers the question, instead of reporting toward it.
//
// Everything else here measures. This says what to do, ranks it by money, and
// states what each answer rests on — because the figures that move a business
// most are usually the ones with an assumption inside them, and a plan that
// cannot see which is which falls apart in week two.
//
// It does not congratulate. A profitable month with 13% of parcels coming back
// is a business that works and is leaking, and saying both is more use than
// picking whichever one reads better.

import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Target, Ruler, FlaskConical } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import NeedsData from './NeedsData'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { profitAndLoss, profitByMonth } from '../../lib/jntvip/profit'
import { cashPosition } from '../../lib/jntvip/cashflow'
import { decide, type Lever, type Verdict } from '../../lib/jntvip/decisions'
import { toOperatingExpenses } from '../../lib/jntvip/operatingCosts'
import type {
  JntVipOperatingExpenseRow,
  JntVipParcelRow,
  JntVipSoaCheckRow,
} from '../../lib/jntvip/types'

const peso = (c: number) =>
  '₱' + (Math.abs(c) / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })

const VERDICT: Record<Verdict, { icon: typeof Target; color: string; word: string }> = {
  continue: { icon: CheckCircle2, color: 'var(--status-good-ink)', word: 'Continue' },
  'fix-first': { icon: AlertTriangle, color: 'var(--series-orange)', word: 'Continue, with one fix' },
  stop: { icon: XCircle, color: 'var(--status-critical-ink, var(--series-orange))', word: 'Stop and rethink' },
}

export default function JntVipDecisions() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const expenseRows = useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]
  const expenses = useMemo(() => toOperatingExpenses(expenseRows), [expenseRows])

  const decision = useMemo(() => {
    const pnl = profitAndLoss(rows, parcels, expenses)
    const cash = cashPosition(rows, parcels, expenses)
    if (!pnl || !cash) return null
    return decide({ pnl, months: profitByMonth(rows, parcels, expenses), cash, parcels, rows })
  }, [rows, parcels, expenses])

  if (!decision) {
    return (
      <div>
        <PageHeader title="What to do next" description="The numbers, turned into a decision." />
        <NeedsData
          shows="a straight answer on whether to keep trading, and the things worth doing next ranked by what each is worth a month"
          needs="the J&T Statements of Account and a parcel export"
          where="the J&T VIP portal"
          to="/import"
        />
      </div>
    )
  }

  const v = VERDICT[decision.verdict]
  const Icon = v.icon
  const priced = decision.levers.filter((l) => l.worth != null && l.worth > 0)
  const total = priced.reduce((t, l) => t + (l.worth ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="What to do next"
        description="Every other page here measures. This one decides — and shows what each answer rests on."
      />

      <Card>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0" style={{ color: v.color }}>
            <Icon size={22} aria-hidden />
          </span>
          <div>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: v.color }}
            >
              {v.word}
            </span>
            <h2 className="mt-0.5 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {decision.headline}
            </h2>
            <ul className="mt-3 space-y-2">
              {decision.reasons.map((r) => (
                <li key={r} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span aria-hidden style={{ color: 'var(--text-muted)' }}>
                    •
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {total > 0 && (
        <Card
          title="What is on the table"
          description="These do not all land, and they are not all equally certain. Taken together they are the size of the opportunity."
          className="mt-4"
        >
          <div className="text-3xl font-semibold tabular" style={{ color: 'var(--status-good-ink)' }}>
            {peso(total)}
            <span className="ml-2 text-base font-normal" style={{ color: 'var(--text-muted)' }}>
              a month
            </span>
          </div>
          {decision.focus && (
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              If you only do one thing: <strong style={{ color: 'var(--text-primary)' }}>{decision.focus.title.toLowerCase()}</strong>
              {decision.focus.worth != null && <> — worth about {peso(decision.focus.worth)} a month on its own.</>}
            </p>
          )}
        </Card>
      )}

      <div className="mt-4 space-y-4">
        {decision.levers.map((l, i) => (
          <LeverCard key={l.id} lever={l} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}

function LeverCard({ lever, rank }: { lever: Lever; rank: number }) {
  const measured = lever.confidence === 'measured'
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{ background: 'var(--surface-sunken, rgba(127,127,127,.15))', color: 'var(--text-secondary)' }}
          >
            {rank}
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {lever.title}
            </h3>
            <span
              className="mt-1 inline-flex items-center gap-1 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {measured ? <Ruler size={12} aria-hidden /> : <FlaskConical size={12} aria-hidden />}
              {measured ? 'Measured from your own data' : 'Modelled — rests on an assumption'}
            </span>
          </div>
        </div>
        {lever.worth != null && lever.worth > 0 && (
          <span className="whitespace-nowrap text-xl font-semibold tabular" style={{ color: 'var(--status-good-ink)' }}>
            {peso(lever.worth)}
            <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              /month
            </span>
          </span>
        )}
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Where you are
          </dt>
          <dd style={{ color: 'var(--text-secondary)' }}>{lever.now}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            What to do
          </dt>
          <dd style={{ color: 'var(--text-primary)' }}>{lever.action}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            How this figure was reached
          </dt>
          <dd style={{ color: 'var(--text-muted)' }}>{lever.basis}</dd>
        </div>
      </dl>
    </Card>
  )
}
