// Bills and payment reminders.
//
// Card-per-bill, like the tracker this replaces, with one change that matters:
// the old one stored a fixed due date and never rolled it forward, so every
// card eventually read "Overdue 107d", "Overdue 136d" on bills that were in
// fact being paid. A badge that is always red is a badge nobody reads.
//
// Here a bill has a due DAY, the next due date is computed from today, and
// marking it paid settles it for THIS MONTH — next month it comes back.

import { useMemo } from 'react'
import { CalendarClock, Check, RotateCcw, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/Card'
import PageHeader from '../../components/PageHeader'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import type { JntVipBillRow } from '../../lib/jntvip/types'
import { billStatus, sortByUrgency, markBillPaid, unmarkBillPaid, type BillState, type BillStatus } from '../../lib/jntvip/bills'
import { AD_CARDS } from '../../lib/jntvip/adSpend'

const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATE_STYLE: Record<BillState, { label: (d: number) => string; ink: string }> = {
  OVERDUE: { label: (d) => `Overdue ${Math.abs(d)}d`, ink: 'var(--status-critical)' },
  DUE_SOON: { label: (d) => (d === 0 ? 'Due today' : `Due in ${d}d`), ink: 'var(--status-warning-ink)' },
  UPCOMING: { label: (d) => `Due in ${d}d`, ink: 'var(--status-good-ink)' },
  AUTO: { label: () => 'Auto-debited', ink: 'var(--text-secondary)' },
  NO_DATE: { label: () => 'Due day not set', ink: 'var(--text-secondary)' },
  PAID: { label: () => 'Paid', ink: 'var(--text-muted)' },
}

const DATE = (d: Date) =>
  d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })

function BillCard({ s }: { s: BillStatus }) {
  const { bill, state, daysUntil, due, period } = s
  const style = STATE_STYLE[state]
  const paid = state === 'PAID'
  const auto = state === 'AUTO'
  const noDate = state === 'NO_DATE'

  const save = (patch: Partial<JntVipBillRow>) =>
    jntVipDb.bills.update(bill.id!, { ...patch, updatedAt: new Date().toISOString() })

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: state === 'OVERDUE' ? 'color-mix(in srgb, var(--status-critical) 40%, transparent)' : 'var(--border-hairline)',
        background: 'var(--surface-raised, transparent)',
        opacity: paid ? 0.6 : 1,
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
          {bill.label}
        </h3>
        <span
          className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ color: style.ink, background: `color-mix(in srgb, ${style.ink} 14%, transparent)` }}
        >
          {style.label(daysUntil)}
        </span>
      </div>

      <dl className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: 'var(--text-secondary)' }}>Due date</dt>
          <dd className="tabular" style={{ color: noDate ? 'var(--text-muted)' : 'var(--text-primary)' }}>{noDate ? 'not known' : DATE(due)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: 'var(--text-secondary)' }}>Amount due</dt>
          <dd>
            <input
              type="number"
              inputMode="decimal"
              defaultValue={bill.amount > 0 ? (bill.amount / 100).toFixed(2) : ''}
              placeholder="not set"
              onBlur={(e) => {
                const v = e.target.value.trim()
                const next = v === '' ? 0 : Math.round(Number(v) * 100)
                if (Number.isFinite(next) && next !== bill.amount) save({ amount: next })
              }}
              className="w-28 rounded-lg border px-2 py-1 text-right text-sm tabular"
              style={{ borderColor: 'var(--border-hairline)', background: 'transparent', color: 'var(--text-primary)' }}
            />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: 'var(--text-secondary)' }}>Due day</dt>
          <dd>
            <input
              type="number"
              min={1}
              max={31}
              defaultValue={bill.dueDay > 0 ? bill.dueDay : ''}
              placeholder="set it"
              onBlur={(e) => {
                const n = Math.min(31, Math.max(1, Math.round(Number(e.target.value))))
                if (Number.isFinite(n) && n !== bill.dueDay) save({ dueDay: n })
              }}
              className="w-28 rounded-lg border px-2 py-1 text-right text-sm tabular"
              style={{ borderColor: 'var(--border-hairline)', background: 'transparent', color: 'var(--text-primary)' }}
            />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: 'var(--text-secondary)' }}>Category</dt>
          <dd className="text-right" style={{ color: 'var(--text-primary)' }}>{bill.category}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: 'var(--text-secondary)' }}>Payment account</dt>
          <dd style={{ color: bill.account ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {bill.account || '(fill in)'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: 'var(--text-secondary)' }}>Auto-debit?</dt>
          <dd style={{ color: 'var(--text-primary)' }}>{bill.autoDebit ? 'Yes' : 'No'}</dd>
        </div>
      </dl>

      {bill.outstanding != null && (
        <div className="mt-2.5 border-t pt-2.5" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Total owed on the card</span>
            <span className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
              {peso(bill.outstanding)}
            </span>
          </div>
          {bill.creditLimit != null && bill.creditLimit > 0 && (
            <>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--border-hairline)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (bill.outstanding / bill.creditLimit) * 100)}%`,
                    background:
                      bill.outstanding / bill.creditLimit >= 0.7
                        ? 'var(--status-critical)'
                        : bill.outstanding / bill.creditLimit >= 0.4
                          ? 'var(--status-warning-ink)'
                          : 'var(--status-good-ink)',
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{((bill.outstanding / bill.creditLimit) * 100).toFixed(0)}% of {peso(bill.creditLimit)}</span>
                {bill.balanceAsOf && <span>read {bill.balanceAsOf}</span>}
              </div>
            </>
          )}
        </div>
      )}

      {bill.note && (
        <p className="mt-2 text-xs italic" style={{ color: 'var(--text-muted)' }}>{bill.note}</p>
      )}

      {auto ? (
        <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Leaves the account on its own. Nothing to do — check it actually went out.
        </p>
      ) : (
      <button
        onClick={() => (paid ? unmarkBillPaid(bill.id!, bill.paidThrough) : markBillPaid(bill.id!, period))}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium"
        style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
      >
        {paid ? <><RotateCcw size={14} /> Undo paid</> : <><Check size={14} /> Mark as paid</>}
      </button>
      )}
    </div>
  )
}

export default function JntVipBills() {
  const bills = useLiveTable(jntVipDb.bills) as JntVipBillRow[]
  const statuses = useMemo(
    () => sortByUrgency(bills.filter((b) => b.active).map((b) => billStatus(b))),
    [bills],
  )

  // AUTO leaves on its own; it is not money the owner has to remember to move.
  const unpaid = statuses.filter((s) => s.state !== 'PAID' && s.state !== 'AUTO')
  const totalBusiness = unpaid.filter((s) => s.bill.scope === 'BUSINESS').reduce((t, s) => t + s.bill.amount, 0)
  const totalPersonal = unpaid.filter((s) => s.bill.scope === 'PERSONAL').reduce((t, s) => t + s.bill.amount, 0)
  const unknownAmounts = unpaid.filter((s) => s.bill.amount === 0).length
  // Card debt is not "unpaid this month" — it is what the cards carry in total,
  // and it is the number that decides whether there is room to keep advertising.
  const cards = bills.filter((b) => b.active && /card/i.test(b.category))
  const cardDebt = cards.reduce((t, b) => t + (b.outstanding ?? 0), 0)
  const cardsWithBalance = cards.filter((b) => b.outstanding != null).length
  const cardsWithoutBalance = cards.length - cardsWithBalance
  const overdue = statuses.filter((s) => s.state === 'OVERDUE')
  const undated = statuses.filter((s) => s.state === 'NO_DATE')

  // Cards that pay for advertising but are not registered as ad sources. This
  // is the gap that left November's ad spend attributed to nobody.
  const registered = useMemo(() => new Set(AD_CARDS.map((c) => c.label.toLowerCase())), [])
  const unregisteredAdCards = useMemo(
    () =>
      bills.filter(
        (b) =>
          b.active &&
          /facebook|ads/i.test(b.category) &&
          ![...registered].some((r) => r.includes(b.account.toLowerCase()) && b.account !== ''),
      ),
    [bills, registered],
  )

  return (
    <div>
      <PageHeader
        title="Bills &amp; Payment Reminders"
        description="Every recurring bill, when it next falls due, and what is still unpaid this month. Marking one paid settles it for this month only — next month it comes back."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Unpaid this month — business</div>
          <div className="mt-1 text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>{peso(totalBusiness)}</div>
          {unknownAmounts > 0 && (
            <div className="mt-1 text-xs" style={{ color: 'var(--status-warning-ink)' }}>
              {unknownAmounts} bill{unknownAmounts === 1 ? '' : 's'} with no amount set — the real figure is higher
            </div>
          )}
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Unpaid this month — personal</div>
          <div className="mt-1 text-2xl font-semibold tabular" style={{ color: 'var(--text-secondary)' }}>{peso(totalPersonal)}</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Kept apart so the business total stays honest</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Owed on cards</div>
          <div className="mt-1 text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>{peso(cardDebt)}</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {cardsWithBalance} card{cardsWithBalance === 1 ? '' : 's'} read
            {cardsWithoutBalance > 0 ? `, ${cardsWithoutBalance} not yet — the real total is higher` : ''}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Overdue</div>
          <div className="mt-1 text-2xl font-semibold tabular" style={{ color: overdue.length > 0 ? 'var(--status-critical)' : 'var(--status-good-ink)' }}>
            {overdue.length}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {overdue.length > 0 ? overdue.map((s) => s.bill.label.split(' (')[0]).join(', ') : 'Nothing past its due date'}
            {undated.length > 0 && ` · ${undated.length} with no due day set, so not counted`}
          </div>
        </Card>
      </div>

      {unregisteredAdCards.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-start gap-3">
            <CreditCard size={18} style={{ color: 'var(--status-warning-ink)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {unregisteredAdCards.length} card{unregisteredAdCards.length === 1 ? '' : 's'} here pay{unregisteredAdCards.length === 1 ? 's' : ''} for ads but {unregisteredAdCards.length === 1 ? 'is' : 'are'} not counted as ad spend
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {unregisteredAdCards.map((b) => b.label.split(' (')[0]).join(', ')} —
                tagged as Facebook Ads here, but the app only reads advertising from{' '}
                {AD_CARDS.map((c) => c.label).join(' and ')}. Any Meta charge on{' '}
                {unregisteredAdCards.length === 1 ? 'this card' : 'these cards'} is missing from
                every profit figure, which is the most likely home of the ad spend currently
                recorded against an unknown source. Send the statements and it can be counted
                properly — see <Link to="/expenses" style={{ color: 'var(--series-orange)' }}>Expenses</Link>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {bills.length === 0 ? (
        <Card>
          <p className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            No bills yet.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {statuses.map((s) => (
            <BillCard key={s.bill.key} s={s} />
          ))}
        </div>
      )}

      <Card className="mt-4">
        <div className="flex items-start gap-2.5">
          <CalendarClock size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }} />
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Why nothing here says “overdue 136 days”.</strong>{' '}
              A monthly bill does not accumulate one endless overdue date. Each card shows the
              current month only, so a red badge means you are actually late this month and is
              worth acting on. Amounts and due days are editable in place; a blank amount reads
              “not set” rather than ₱0.00, because a bill with an unknown amount is exactly the
              kind that gets missed.
            </p>
            <p className="mt-2">
              Paying a card is not a business cost — the Facebook charges on it already are. See{' '}
              <Link to="/expenses" style={{ color: 'var(--series-orange)' }}>Expenses</Link> for why
              counting both would charge the same advertising twice.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
