import { useMemo } from 'react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import { formatCurrency, formatDate } from '../lib/format'
import monthlyBookkeepingSeed from '../data/monthlyBookkeeping.json'
import type { BookkeepingEntry } from '../lib/types'

const EXCLUDED = new Set(['Owner Transfer', 'Personal Expense (non-business)'])

function Row({ entry }: { entry: BookkeepingEntry }) {
  const excluded = EXCLUDED.has(entry.category ?? '')
  return (
    <div
      className="grid grid-cols-[90px_1fr_100px] items-start gap-3 border-t py-2 text-xs sm:grid-cols-[90px_120px_1fr_100px]"
      style={{ borderColor: 'var(--border-hairline)', opacity: excluded ? 0.55 : 1 }}
    >
      <span className="tabular" style={{ color: 'var(--text-muted)' }}>
        {entry.date ? formatDate(entry.date) : '—'}
      </span>
      <span className="hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
        {entry.category}
      </span>
      <span style={{ color: 'var(--text-primary)' }}>
        {entry.description}
        {excluded && <span className="ml-1 italic" style={{ color: 'var(--text-muted)' }}>(excluded from Net)</span>}
      </span>
      <span className="text-right tabular font-medium" style={{ color: 'var(--text-primary)' }}>
        {formatCurrency(entry.amount)}
      </span>
    </div>
  )
}

export default function MonthlyBookkeeping() {
  const entries = useLiveTable(db.bookkeeping)

  const months = useMemo(() => {
    const order = monthlyBookkeepingSeed.months.map((m) => m.month)
    return order
      .map((month) => {
        const income = entries.filter((e) => e.month === month && e.section === 'INCOME')
        const expenses = entries.filter((e) => e.month === month && e.section === 'EXPENSES')
        const incomeTotal = income
          .filter((e) => !EXCLUDED.has(e.category ?? ''))
          .reduce((s, e) => s + (e.amount ?? 0), 0)
        const expenseTotal = expenses
          .filter((e) => !EXCLUDED.has(e.category ?? ''))
          .reduce((s, e) => s + (e.amount ?? 0), 0)
        return { month, income, expenses, incomeTotal, expenseTotal, net: incomeTotal - expenseTotal }
      })
      .filter((m) => m.income.length || m.expenses.length)
  }, [entries])

  return (
    <div>
      <PageHeader title="Monthly Bookkeeping" description={monthlyBookkeepingSeed.note} />
      {months.map((m) => (
        <Card key={m.month} title={m.month} className="mb-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--status-good)' }}>
                Gross Revenue (before fees — see Expenses, then NET below)
              </h4>
              {m.income.map((e) => (
                <Row key={e.id} entry={e} />
              ))}
              <div className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}>
                <span>Total Gross Revenue (excl. Owner Transfer)</span>
                <span className="tabular">{formatCurrency(m.incomeTotal)}</span>
              </div>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--series-orange)' }}>
                Expenses
              </h4>
              {m.expenses.map((e) => (
                <Row key={e.id} entry={e} />
              ))}
              <div className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}>
                <span>Total Expenses (excl. Owner Transfer / Personal)</span>
                <span className="tabular">{formatCurrency(m.expenseTotal)}</span>
              </div>
            </div>
          </div>
          <div
            className="mt-3 flex justify-between rounded-lg px-3 py-2 text-sm font-semibold"
            style={{ background: 'color-mix(in srgb, var(--series-blue) 8%, transparent)', color: 'var(--text-primary)' }}
          >
            <span>NET — {m.month}</span>
            <span className="tabular">{formatCurrency(m.net)}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
