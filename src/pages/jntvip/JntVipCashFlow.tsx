// "I made money this month. Why is there less in the bank?"
//
// That question was asked after a month that cleared PHP95,977, and it is a
// fair one: the bank balance ended lower than it started. Nothing was wrong
// with either number. They measure different things, and nowhere in the app
// said so, which left the profit figure looking like a lie.
//
// So this page leads with the cumulative total rather than the month. A single
// month's profit says how the business is trading; the cumulative total says
// where it stands, and while that is negative, a good month is repaying a debt
// rather than building a balance. Everything else here is secondary to that
// one line.

import { useMemo } from 'react'
import { Wallet, TrendingUp, Clock, Banknote } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import NeedsData from './NeedsData'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { cashPosition, profitBridge } from '../../lib/jntvip/cashflow'
import { toOperatingExpenses } from '../../lib/jntvip/operatingCosts'
import { formatDate, formatNumber } from '../../lib/format'
import type {
  JntVipOperatingExpenseRow,
  JntVipParcelRow,
  JntVipSoaCheckRow,
} from '../../lib/jntvip/types'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function JntVipCashFlow() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const expenseRows = useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]
  const expenses = useMemo(() => toOperatingExpenses(expenseRows), [expenseRows])
  const pos = useMemo(() => cashPosition(rows, parcels, expenses), [rows, parcels, expenses])
  const bridge = useMemo(() => (pos ? profitBridge(pos) : []), [pos])

  if (!pos || !pos.latest) {
    return (
      <div>
        <PageHeader title="Cash position" description="Where the business actually stands, as opposed to how it traded last month." />
        <NeedsData
          shows="where the business stands overall — cumulative profit, what J&T still owes you, and when the start-up losses are repaid"
          needs="the J&T Statements of Account"
          where="the J&T VIP portal, as PDFs"
          to="/import"
        />
      </div>
    )
  }

  const behind = pos.cumulative < 0
  const m = pos.latest
  const worst = pos.months.reduce((a, b) => (b.cumulative < a.cumulative ? b : a), pos.months[0])

  return (
    <div>
      <PageHeader
        title="Cash position"
        description="A profitable month and a growing bank balance are not the same thing. This page is the difference between them."
      />

      {/* The headline is the cumulative total, not the month. Leading with the
          month is what made the bank balance confusing in the first place. */}
      <Card
        title={behind ? 'You are still behind overall' : 'You are ahead overall'}
        description={
          behind
            ? 'Every peso of profit is repaying earlier losses before it can become a bank balance. This is the answer to "why is my account going down".'
            : 'Earlier losses are repaid. Profit from here builds the balance.'
        }
      >
        <div
          className="text-4xl font-semibold tabular"
          style={{ color: behind ? 'var(--series-orange)' : 'var(--status-good-ink)' }}
        >
          {peso(pos.cumulative)}
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {behind ? (
            <>
              The business lost {peso(-worst.cumulative)} at its worst point, in {worst.label}. {m.label} made{' '}
              {peso(m.profit)} — a good month, and still {peso(-pos.cumulative)} short of where it started.
            </>
          ) : (
            <>Cumulative profit across {formatNumber(pos.months.length)} months of trading.</>
          )}
        </p>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`${m.label} profit`}
          value={peso(m.profit)}
          icon={<TrendingUp size={16} />}
          accent={m.profit >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)'}
          sub={`${(m.margin * 100).toFixed(1)}% margin · ${m.roas.toFixed(2)}x ROAS`}
        />
        <StatTile
          label="Cumulative position"
          value={peso(pos.cumulative)}
          icon={<Wallet size={16} />}
          accent={behind ? 'var(--series-orange)' : 'var(--status-good-ink)'}
          sub={behind ? 'still repaying the start-up losses' : 'past break-even'}
        />
        <StatTile
          label="Owed to you by J&T"
          value={peso(pos.outstanding)}
          icon={<Banknote size={16} />}
          accent="var(--series-blue)"
          sub="earned, counted as revenue, not yet remitted"
        />
        <StatTile
          label="Break-even on"
          value={pos.breakEvenOn ? formatDate(pos.breakEvenOn) : behind ? '—' : 'reached'}
          icon={<Clock size={16} />}
          accent="var(--series-violet)"
          sub={
            pos.daysToBreakEven != null
              ? `${formatNumber(pos.daysToBreakEven)} more days at ${m.label}'s rate`
              : behind
                ? 'needs a profitable month to project from'
                : 'already there'
          }
        />
      </div>

      {pos.adsOutsidePeriods > 0 && (
        <Card
          title="Advertising that no month counts"
          description="Honest gap, not an error — but it makes the position above look better than it is."
          className="mt-4"
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The monthly P&amp;L prices advertising between a month's first and last statement dates. That is right
            for judging how a month traded, and it means spend outside those windows lands in no month at all.
          </p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {pos.adsBefore > 0 && (
                <tr className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="py-2 pr-3">
                    <span style={{ color: 'var(--text-primary)' }}>Launch campaign, before the first statement</span>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Spent in the launch month before {pos.firstPeriod ? formatDate(pos.firstPeriod) : 'the first statement'}, when
                      advertising was running but nothing had shipped yet. This is real money spent on this business.
                    </p>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right align-top font-medium tabular-nums" style={{ color: 'var(--series-orange)' }}>
                    {peso(pos.adsBefore)}
                  </td>
                </tr>
              )}
              {pos.adsAfter > 0 && (
                <tr className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="py-2 pr-3">
                    <span style={{ color: 'var(--text-primary)' }}>Already spent on the next month</span>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Charged after {pos.lastPeriod ? formatDate(pos.lastPeriod) : 'the last statement'}. It will be counted once
                      the statements covering it arrive.
                    </p>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right align-top font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {peso(pos.adsAfter)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Position including the launch campaign
              </span>
              <span className="text-lg font-semibold tabular" style={{ color: 'var(--series-orange)' }}>
                {peso(pos.cumulative - pos.adsBefore)}
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              The headline figure above excludes it. Which is the truer number depends on whether launch spend counts
              against this business — it is shown both ways rather than decided here.
            </p>
          </div>
          {pos.adsPriorProduct > 0 && (
            <p className="mt-3 border-t pt-3 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
              A further {peso(pos.adsPriorProduct)} was spent in earlier months on the product that ran before this one. It is
              excluded from every figure on this page, and named here only so it is not mistaken for missing data.
            </p>
          )}
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Month by month, and the running total" description="The right-hand column is the one that decides whether the bank balance grows.">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2 text-left font-medium">Month</th>
                <th className="pb-2 text-right font-medium">Profit</th>
                <th className="pb-2 text-right font-medium">Running total</th>
              </tr>
            </thead>
            <tbody>
              {pos.months.map((mo) => (
                <tr key={mo.key} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="py-1.5" style={{ color: 'var(--text-primary)' }}>
                    {mo.label}
                    {mo.crossesZero && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--status-good-ink)' }}>
                        break-even
                      </span>
                    )}
                  </td>
                  <td
                    className="whitespace-nowrap py-1.5 text-right tabular-nums"
                    style={{ color: mo.profit >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)' }}
                  >
                    {peso(mo.profit)}
                  </td>
                  <td
                    className="whitespace-nowrap py-1.5 text-right font-medium tabular-nums"
                    style={{ color: mo.cumulative >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)' }}
                  >
                    {peso(mo.cumulative)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card
          title={`Where ${m.label}'s profit went`}
          description="Profit is not cash in hand. These are the calls on it before any of it reaches the bank."
        >
          <table className="w-full text-sm">
            <tbody>
              {bridge.map((l) => (
                <tr key={l.label} className="border-t first:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="py-2 pr-3">
                    <span style={{ color: 'var(--text-primary)' }}>{l.label}</span>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {l.detail}
                    </p>
                  </td>
                  <td
                    className="whitespace-nowrap py-2 text-right align-top font-medium tabular-nums"
                    style={{ color: l.kind === 'earned' ? 'var(--status-good-ink)' : 'var(--series-orange)' }}
                  >
                    {peso(l.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Deliberately not totalled. The page can see the operating money and
              cannot see card instalments, personal transfers or cash withdrawals,
              so a total here would be wrong in a way that looks authoritative. */}
          <p className="mt-3 border-t pt-3 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
            These are not totalled on purpose. Money also leaves the same account for things no statement here
            can see — card instalments, transfers to family, cash withdrawals — so a total would look complete
            when it is not. What this does show is that a profitable month can still end with less in the bank,
            without anything being wrong.
          </p>
        </Card>
      </div>
    </div>
  )
}
