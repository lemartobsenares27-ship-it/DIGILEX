// Every peso that leaves the business, in one place.
//
// This page exists because the owner could not answer "what am I actually
// paying for?" without opening five other pages and scrolling past a profit
// chart. The expense editor and the coverage note were real, but they lived at
// the bottom of Profit & Loss, below everything else on a long page, so in
// practice they did not exist at all.
//
// It also answers a question no other page could. A cost row added by hand in
// the editor looks identical to a seeded one once it is in the database, so a
// figure that did not match the model had no explanation anywhere in the app.
// "Not in the model" below names those rows outright.

import { useMemo } from 'react'
import { Receipt, AlertTriangle, Ban, CreditCard, PencilLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/Card'
import PageHeader from '../../components/PageHeader'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import type { JntVipOperatingExpenseRow, JntVipSoaCheckRow, JntVipParcelRow } from '../../lib/jntvip/types'
import { OPERATING_EXPENSES, toOperatingExpenses } from '../../lib/jntvip/operatingCosts'
import { profitAndLoss } from '../../lib/jntvip/profit'
import { AD_CARDS, AD_COMPLETE_THROUGH, adSpendBySource, accruedBetween } from '../../lib/jntvip/adSpend'
import OperatingExpenseEditor from './OperatingExpenseEditor'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const pct = (n: number) => (n * 100).toFixed(1) + '%'

/** Outflows seen in the bank and deliberately NOT charged to the business. */
const EXCLUDED: { label: string; why: string }[] = [
  {
    label: 'Transfers between your own accounts',
    why: 'Moving your own money, not spending it. Much of it funds the ad card, and the card’s charges ARE counted — so counting the transfer too would charge the same advertising twice.',
  },
  {
    label: 'Credit card bill payments',
    why: 'Paying the card whose Facebook charges are already in the ad figure. The charge is the cost; the repayment is settling it.',
  },
  {
    label: 'Stock purchases (Majestic Line, Germike Packaging, Villas Budgetarian Store)',
    why: 'Already counted per bottle as product cost. Charging the purchase as well would double-count every capsule.',
  },
  {
    label: 'Wages paid through GCash',
    why: 'Counted as payroll at a daily rate. The GCash transfer is how it was paid, not a second cost.',
  },
  {
    label: 'Personal spending (SKINTIFIC, KCREN, food, load, family transfers)',
    why: 'Yours, not the business’s. Charging it here would understate profit and hide what the business really earns.',
  },
]

export default function JntVipExpenses() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const expenseRows = useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]
  const expenses = useMemo(() => toOperatingExpenses(expenseRows), [expenseRows])

  const p = useMemo(
    () => (expenses.length > 0 && rows.length > 0 ? profitAndLoss(rows, parcels, expenses) : null),
    [rows, parcels, expenses],
  )

  // A stored row whose key the code does not know was typed in by hand. That is
  // legitimate — the editor exists for exactly that — but it is the one class of
  // cost nobody can explain from the source, so it gets named rather than buried.
  const seededKeys = useMemo(() => new Set(OPERATING_EXPENSES.map((e) => e.key)), [])
  const handAdded = useMemo(
    () => expenseRows.filter((r) => r.active && !seededKeys.has(r.key)),
    [expenseRows, seededKeys],
  )

  const adBySource = useMemo(() => (p ? adSpendBySource(p.from, p.to) : null), [p])
  const accrued = useMemo(() => (p ? accruedBetween(p.from, p.to) : 0), [p])

  if (!p) {
    return (
      <div>
        <PageHeader title="Expenses" />
        <Card>
          <p className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            No statements yet. Import them on <strong>Import</strong> and every cost appears here.
          </p>
        </Card>
      </div>
    )
  }

  const rev = p.revenue
  const share = (amount: number) => (rev > 0 ? amount / rev : 0)

  // The whole cost base, largest first, each one traceable to where it came from.
  const lines: { label: string; amount: number; source: string }[] = [
    { label: 'Facebook advertising', amount: p.adSpend, source: 'Charges read off your card statements, plus any spend not yet billed' },
    { label: 'Shipping', amount: p.shipping, source: 'J&T statements — billed on dispatch, whether the parcel lands or not' },
    { label: 'Product (bottles)', amount: p.cogs, source: `${p.units.toLocaleString('en-PH')} bottles at your capsule and packaging prices` },
    { label: 'Running the business', amount: p.operatingTotal, source: 'The rates below — payroll, food, fulfilment, utilities' },
    { label: 'COD commission 2.75%', amount: p.commission, source: 'J&T statements, charged per parcel' },
    { label: 'RTS fees', amount: p.rtsFee, source: `${p.returned.toLocaleString('en-PH')} returns at 50% of the receivable freight` },
    { label: 'VAT on commission 12%', amount: p.vat, source: 'J&T statements' },
  ].sort((a, b) => b.amount - a.amount)

  const totalCost = lines.reduce((t, l) => t + l.amount, 0)

  return (
    <div>
      <PageHeader
        title="Expenses"
        description={`${p.from} to ${p.to} · ${p.days} days. Every peso that left the business, where it came from, and what nobody has told the app about.`}
      />

      {/* The one thing no other page could answer. Above everything, because an
          unexplained cost makes every figure below it untrustworthy. */}
      {handAdded.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} style={{ color: 'var(--status-warning-ink)', flexShrink: 0, marginTop: 2 }} />
            <div className="min-w-0">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {handAdded.length === 1 ? 'One cost row was added by hand' : `${handAdded.length} cost rows were added by hand`}
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                These are charged to every period they cover, exactly like the rest. They are listed
                separately only because nothing in the code explains where they came from — so if one
                was entered by mistake, this is the only place it shows up as unusual.
              </p>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {handAdded.map((r) => (
                    <tr key={r.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{r.label}</td>
                      <td className="py-2 pr-4 tabular" style={{ color: 'var(--text-secondary)' }}>
                        {peso(r.rate)} {r.basis === 'PER_DAY' ? 'a day' : r.basis === 'PER_BOTTLE' ? 'a bottle' : 'a month'}
                        {r.daysPerWeek != null && r.daysPerWeek < 7 ? `, ${r.daysPerWeek} days a week` : ''}
                      </td>
                      <td className="py-2 text-right text-xs" style={{ color: 'var(--text-muted)' }}>{r.detail || 'no note'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      <Card
        title="Where the money went"
        description="Largest first. Together these are every cost the app charges against revenue."
        className="mb-4"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
                <th className="py-2 pr-4 font-semibold">Cost</th>
                <th className="py-2 pr-4 text-right font-semibold">Amount</th>
                <th className="py-2 pr-4 text-right font-semibold">Of revenue</th>
                <th className="py-2 font-semibold">Where it comes from</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.label} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="whitespace-nowrap py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{l.label}</td>
                  <td className="py-2 pr-4 text-right tabular" style={{ color: 'var(--text-primary)' }}>{peso(l.amount)}</td>
                  <td className="py-2 pr-4 text-right tabular" style={{ color: 'var(--text-secondary)' }}>{pct(share(l.amount))}</td>
                  <td className="py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{l.source}</td>
                </tr>
              ))}
              <tr className="border-t-2" style={{ borderColor: 'var(--border-hairline)' }}>
                <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Total cost</td>
                <td className="py-2 pr-4 text-right tabular font-semibold" style={{ color: 'var(--text-primary)' }}>{peso(totalCost)}</td>
                <td className="py-2 pr-4 text-right tabular font-semibold" style={{ color: 'var(--text-secondary)' }}>{pct(share(totalCost))}</td>
                <td className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Against {peso(rev)} collected, leaving {peso(p.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Advertising is the largest cost and the only one whose completeness is
          in doubt, so it gets its own section rather than a line in a table. */}
      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <CreditCard size={16} style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Advertising, by card</h2>
        </div>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Ad spend is counted from the <strong>card statements</strong>, not from Meta. Meta’s own
          receipts once understated a month by ₱137,060, so the card is treated as the truth.
        </p>
        <table className="w-full text-sm">
          <tbody>
            {AD_CARDS.map((c) => (
              <tr key={c.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{c.label}</td>
                <td className="py-2 pr-4 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                  {adBySource ? peso(adBySource[c.id] ?? 0) : '—'}
                </td>
                <td className="py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  read through {c.completeThrough}
                </td>
              </tr>
            ))}
            {accrued > 0 && (
              <tr style={{ background: 'color-mix(in srgb, var(--status-warning-ink) 10%, transparent)' }}>
                <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                  Spent, not yet billed
                </td>
                <td className="py-2 pr-4 text-right tabular font-semibold" style={{ color: 'var(--text-primary)' }}>{peso(accrued)}</td>
                <td className="py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  No card statement covers this. Source unknown.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 rounded-lg p-3 text-sm" style={{ background: 'color-mix(in srgb, var(--status-warning-ink) 10%, transparent)', color: 'var(--text-primary)' }}>
          <strong>Ad spend is only fully read to {AD_COMPLETE_THROUGH}.</strong> That is the earliest
          date any one card runs out, and a total is only as complete as its least-read card. Anything
          after it is an estimate, so every profit figure covering those days is a best case, not a
          fact. Upload the missing statements and this line disappears.
        </p>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <Receipt size={16} style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Running costs, line by line</h2>
        </div>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          What each one charged over these {p.days} days. A rate that changed is two rows, not one
          edited row — so a month that already closed keeps the rate that was actually paid.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
                <th className="py-2 pr-4 font-semibold">Cost</th>
                <th className="py-2 pr-4 font-semibold">Rate</th>
                <th className="py-2 pr-4 font-semibold">Charged on</th>
                <th className="py-2 text-right font-semibold">This period</th>
              </tr>
            </thead>
            <tbody>
              {p.operating
                .slice()
                .sort((a, b) => b.amount - a.amount)
                .map((c) => (
                  <tr key={c.key} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {c.label}
                      {c.assumed && (
                        <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--status-warning-ink)' }}>assumed</span>
                      )}
                      {!seededKeys.has(c.key) && (
                        <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--status-warning-ink)' }}>added by hand</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 tabular" style={{ color: 'var(--text-secondary)' }}>
                      {peso(c.rate)} {c.basis === 'PER_DAY' ? 'a day' : c.basis === 'PER_BOTTLE' ? 'a bottle' : 'a month'}
                    </td>
                    <td className="py-2 pr-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{c.quantityLabel}</td>
                    <td className="py-2 text-right tabular" style={{ color: 'var(--text-primary)' }}>{peso(c.amount)}</td>
                  </tr>
                ))}
              <tr className="border-t-2" style={{ borderColor: 'var(--border-hairline)' }}>
                <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Total</td>
                <td colSpan={2} />
                <td className="py-2 text-right tabular font-semibold" style={{ color: 'var(--text-primary)' }}>{peso(p.operatingTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {p.fulfilmentUnderstated && (
          <p className="mt-3 text-xs" style={{ color: 'var(--status-warning-ink)' }}>
            Returns could not be counted for part of this period, so fulfilment is understated — a
            parcel that comes back was still picked and packed.
          </p>
        )}
      </Card>

      <Card
        title="Deliberately not charged"
        description="Money that left your accounts and is not a business cost. Each one would double-count something already counted, or is personal."
        className="mb-4"
      >
        <div className="space-y-3">
          {EXCLUDED.map((e) => (
            <div key={e.label} className="flex items-start gap-2.5">
              <Ban size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 3 }} />
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{e.why}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          If something here should be charged after all, add it below — it will be charged to every
          period it covers, including months already closed.
        </p>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <PencilLine size={16} style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Add or change a cost</h2>
        </div>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          A cost that needs a developer is a cost that quietly stays out of the P&amp;L and makes the
          business look better than it is. Retiring a cost keeps the row — a period already costed
          with it was costed correctly at the time.
        </p>
        <OperatingExpenseEditor charges={p.operating} />
      </Card>

      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Revenue, margins and the week-by-week view live on{' '}
        <Link to="/profit" style={{ color: 'var(--series-orange)' }}>Profit &amp; Loss</Link>. Bottle
        costs are on <Link to="/products" style={{ color: 'var(--series-orange)' }}>Products</Link>.
      </p>
    </div>
  )
}
