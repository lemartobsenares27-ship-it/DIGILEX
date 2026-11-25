// Balance sheet and receivables.
//
// The P&L answers "did we make money". This answers "where is it", which in a
// COD business is a different question with a different answer: a month can
// close profitable with most of that profit still in the courier's account.
//
// Nothing here guesses. Cash and warehouse stock are not recorded anywhere, so
// they show as unknown with what to go and get, and the totals say they only
// add up the lines that are known.

import { useMemo } from 'react'
import { Scale, Landmark, TruckIcon, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/Card'
import PageHeader from '../../components/PageHeader'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import type { JntVipSoaCheckRow, JntVipParcelRow, JntVipBillRow, JntVipOperatingExpenseRow } from '../../lib/jntvip/types'
import { receivables } from '../../lib/jntvip/receivables'
import { balanceSheet, type BalanceLine } from '../../lib/jntvip/balanceSheet'
import { profitByPeriod, bottlesIn, PRUDENT_UNIT_COST } from '../../lib/jntvip/profit'
import { toOperatingExpenses } from '../../lib/jntvip/operatingCosts'
import { billStatus } from '../../lib/jntvip/bills'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Lines({ lines }: { lines: BalanceLine[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {lines.map((l) => (
          <tr key={l.label} className="border-b last:border-0 align-top" style={{ borderColor: 'var(--border-hairline)' }}>
            <td className="py-2.5 pr-4">
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {l.label}
                {l.state === 'UNKNOWN' && (
                  <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--status-critical)' }}>not known</span>
                )}
                {l.state === 'PARTIAL' && (
                  <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--status-warning-ink)' }}>partial</span>
                )}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{l.note}</div>
            </td>
            <td className="whitespace-nowrap py-2.5 text-right tabular font-medium" style={{ color: l.amount == null ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              {l.amount == null ? '—' : peso(l.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function JntVipBalanceSheet() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const bills = useLiveTable(jntVipDb.bills) as JntVipBillRow[]
  const expenseRows = useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]
  const expenses = useMemo(() => toOperatingExpenses(expenseRows), [expenseRows])

  const ar = useMemo(() => receivables(rows, parcels), [rows, parcels])

  const months = useMemo(
    () => (expenses.length > 0 && rows.length > 0 ? profitByPeriod(rows, parcels, expenses, 'month') : []),
    [rows, parcels, expenses],
  )
  const weeks = useMemo(
    () => (expenses.length > 0 && rows.length > 0 ? profitByPeriod(rows, parcels, expenses, 'week') : []),
    [rows, parcels, expenses],
  )
  const accumulated = months.reduce((t, m) => t + m.profit, 0)

  const stockInTransit = useMemo(() => {
    const inFlight = parcels.filter((p) => p.status === 'IN_TRANSIT' || p.status === 'DELIVERING' || p.status === 'FOR_RETURN')
    return inFlight.reduce((t, p) => t + bottlesIn(p), 0) * PRUDENT_UNIT_COST
  }, [parcels])

  const cards = bills.filter((b) => b.active && /card/i.test(b.category))
  const cardDebtKnown = cards.reduce((t, b) => t + (b.outstanding ?? 0), 0)
  const cardsRead = cards.filter((b) => b.outstanding != null).length
  const billsDue = bills
    .filter((b) => b.active)
    .map((b) => billStatus(b))
    .filter((s) => s.state === 'OVERDUE' || s.state === 'DUE_SOON' || s.state === 'UPCOMING')
    .reduce((t, s) => t + s.bill.amount, 0)

  const bs = useMemo(
    () =>
      balanceSheet({
        asOf: new Date().toISOString().slice(0, 10),
        dueFromCourier: ar.total,
        stockInTransit,
        cardDebtKnown,
        cardsRead,
        cardsTotal: cards.length,
        billsDue,
        accumulatedResult: accumulated,
      }),
    [ar.total, stockInTransit, cardDebtKnown, cardsRead, cards.length, billsDue, accumulated],
  )

  if (rows.length === 0) {
    return (
      <div>
        <PageHeader title="Balance Sheet" />
        <Card>
          <p className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            No statements yet. Import them on <strong>Import</strong> and this fills in.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Balance Sheet &amp; Receivables"
        description={`As at ${bs.asOf}. Profit & Loss says whether you made money. This says where it is — which in COD is a different question.`}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Owed to you by J&amp;T</div>
          <div className="mt-1 text-2xl font-semibold tabular" style={{ color: 'var(--status-good-ink)' }}>{peso(ar.total)}</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Collected at the door, not yet in your bank</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Still in flight</div>
          <div className="mt-1 text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>{peso(ar.inFlightDeclared)}</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {ar.inFlightParcels} parcels · about {peso(ar.inFlightExpected)} should land at a {(ar.rtsRate * 100).toFixed(1)}% return rate
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Known assets less known debts</div>
          <div className="mt-1 text-2xl font-semibold tabular" style={{ color: bs.knownNet >= 0 ? 'var(--status-good-ink)' : 'var(--status-critical)' }}>
            {peso(bs.knownNet)}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--status-warning-ink)' }}>
            Cash and warehouse stock are not in this. Not a net worth.
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <div className="mb-3 flex items-start gap-3">
          <AlertTriangle size={18} style={{ color: 'var(--status-warning-ink)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            <strong>This is not a finished balance sheet, and it says so on every line.</strong> The
            two biggest assets a business like yours holds — cash and the bottles in the warehouse —
            have never been recorded here. Treating them as zero would produce a confident bottom
            line that is wrong by most of what you own. So they appear as <em>not known</em>, with
            what to go and get, and the totals below add up only the lines that are real.
          </p>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <Landmark size={16} style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>What the business owns</h2>
          </div>
          <Lines lines={bs.assets} />
          <div className="mt-3 flex items-baseline justify-between border-t pt-3" style={{ borderColor: 'var(--border-hairline)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Total of the known lines</span>
            <span className="text-base font-semibold tabular" style={{ color: 'var(--text-primary)' }}>{peso(bs.knownAssets)}</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--status-warning-ink)' }}>
            {bs.unknownAssetLines} asset line{bs.unknownAssetLines === 1 ? '' : 's'} missing — the real figure is higher
          </p>
        </Card>

        <Card>
          <div className="mb-2 flex items-center gap-2">
            <Scale size={16} style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>What the business owes</h2>
          </div>
          <Lines lines={bs.liabilities} />
          <div className="mt-3 flex items-baseline justify-between border-t pt-3" style={{ borderColor: 'var(--border-hairline)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Total of the known lines</span>
            <span className="text-base font-semibold tabular" style={{ color: 'var(--text-primary)' }}>{peso(bs.knownLiabilities)}</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--status-warning-ink)' }}>
            {bs.unknownLiabilityLines} line{bs.unknownLiabilityLines === 1 ? '' : 's'} partial or missing — the real figure is higher
          </p>
        </Card>
      </div>

      <Card className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <TruckIcon size={16} style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>What J&amp;T owes you, in detail</h2>
        </div>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Statements cover you to <strong>{ar.billedThrough ?? '—'}</strong>. Everything delivered
          after that is money J&amp;T is holding.
        </p>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>
                Statements issued and unpaid
                <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{ar.unpaidStatements.length} of {rows.length}</span>
              </td>
              <td className="py-2 text-right tabular" style={{ color: 'var(--text-primary)' }}>{peso(ar.unpaidStatementsTotal)}</td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>
                COD on {ar.unbilledParcels} parcels delivered since then
              </td>
              <td className="py-2 text-right tabular" style={{ color: 'var(--text-primary)' }}>{peso(ar.unbilledCod)}</td>
            </tr>
            {[
              ['less shipping they will deduct', ar.unbilledShipping],
              ['less COD commission 2.75%', ar.unbilledCommission],
              ['less VAT on commission', ar.unbilledVat],
              ['less RTS fees on returns since then', ar.unbilledRtsFee],
            ].map(([label, amt]) => (
              <tr key={label as string} className="border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                <td className="py-2 pr-4 pl-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</td>
                <td className="py-2 text-right tabular text-xs" style={{ color: 'var(--text-secondary)' }}>{peso(-(amt as number))}</td>
              </tr>
            ))}
            <tr className="border-t-2" style={{ borderColor: 'var(--border-hairline)' }}>
              <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Total J&amp;T owes you</td>
              <td className="py-2 text-right tabular font-semibold" style={{ color: 'var(--status-good-ink)' }}>{peso(ar.total)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          On this account J&amp;T has paid every statement, usually the day after the period closed.
          This is a timing gap, not a debt in doubt.
        </p>
      </Card>

      <Card className="mb-4" title="Profit, and where it went" description="The same figures as Profit & Loss, read as cash rather than as performance.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
                <th className="py-2 pr-4 font-semibold">Month</th>
                <th className="py-2 pr-4 text-right font-semibold">Profit</th>
                <th className="py-2 text-right font-semibold">Running total</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const run = months.slice(0, i + 1).reduce((t, x) => t + x.profit, 0)
                return (
                  <tr key={m.key} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{m.label}</td>
                    <td className="py-2 pr-4 text-right tabular" style={{ color: m.profit > 0 ? 'var(--status-good-ink)' : 'var(--status-critical)' }}>{peso(m.profit)}</td>
                    <td className="py-2 text-right tabular font-medium" style={{ color: run > 0 ? 'var(--status-good-ink)' : 'var(--status-critical)' }}>{peso(run)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          The running total is {peso(accumulated)}. Until it crosses zero every peso of profit
          repays earlier losses before it can become a bank balance — which is the honest answer to
          “we made money, so why is the account not growing”. Week by week is on{' '}
          <Link to="/profit" style={{ color: 'var(--series-orange)' }}>Profit &amp; Loss</Link>
          {weeks.length > 0 && <> — latest week {peso(weeks[weeks.length - 1].profit)}</>}.
        </p>
      </Card>

      <Card title="To finish this page">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Seven account balances.</strong> MariBank,
            GoTyme, RCBC, PNB, Maya, UnionBank, Metrobank. Ten minutes once, then every Monday.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>A stock count.</strong> Bottles on hand
            per product. It is an asset you have paid for and it appears nowhere.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>The UnionBank loan balance.</strong> What
            is left of the PHP150,000, which the loan screen will show.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>The remaining card balances</strong> —{' '}
            see <Link to="/bills" style={{ color: 'var(--series-orange)' }}>Bills &amp; Reminders</Link>.
          </li>
        </ol>
      </Card>
    </div>
  )
}
