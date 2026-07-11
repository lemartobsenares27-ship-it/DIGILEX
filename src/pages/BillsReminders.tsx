import { useMemo } from 'react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import { formatCurrency } from '../lib/format'
import billsSeed from '../data/billsReminders.json'
import type { BillRow } from '../lib/types'

function daysUntil(dueDate: string | null): number | null {
  if (!dueDate) return null
  const d = new Date(dueDate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

function badgeStyle(bill: BillRow) {
  if ((bill.status ?? '').toLowerCase() === 'paid') {
    return { color: 'var(--text-muted)', bg: 'color-mix(in srgb, var(--text-muted) 14%, transparent)', label: 'Paid' }
  }
  const days = daysUntil(bill.dueDate)
  if (days === null) return { color: 'var(--text-muted)', bg: 'color-mix(in srgb, var(--text-muted) 14%, transparent)', label: bill.dueInLabel ?? '—' }
  if (days < 0) return { color: 'var(--status-critical)', bg: 'color-mix(in srgb, var(--status-critical) 14%, transparent)', label: `Overdue ${Math.abs(days)}d` }
  if (days <= 5) return { color: 'var(--status-warning)', bg: 'color-mix(in srgb, var(--status-warning) 16%, transparent)', label: `Due in ${days}d` }
  return { color: 'var(--status-good)', bg: 'color-mix(in srgb, var(--status-good) 14%, transparent)', label: `Due in ${days}d` }
}

export default function BillsReminders() {
  const bills = useLiveTable(db.bills)

  const grouped = useMemo(() => {
    const map = new Map<string, BillRow[]>()
    for (const b of bills) {
      const arr = map.get(b.month) ?? []
      arr.push(b)
      map.set(b.month, arr)
    }
    return [...map.entries()]
  }, [bills])

  const totalDue = bills
    .filter((b) => (b.status ?? '').toLowerCase() !== 'paid')
    .reduce((s, b) => s + (b.totalAmountDue ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Bills & Payment Reminders"
        description={billsSeed.note}
        actions={
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Total unpaid
            </div>
            <div className="text-lg font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalDue)}
            </div>
          </div>
        }
      />

      {grouped.map(([month, monthBills]) => (
        <div key={month} className="mb-6">
          <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {month}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {monthBills.map((bill) => {
              const badge = badgeStyle(bill)
              const paid = (bill.status ?? '').toLowerCase() === 'paid'
              return (
                <div
                  key={bill.id}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: 'var(--border-hairline)',
                    background: 'var(--surface-card)',
                    opacity: paid ? 0.55 : 1,
                  }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {bill.name}
                    </span>
                    <span
                      className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ color: badge.color, background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex justify-between">
                      <span>Due Date</span>
                      <input
                        type="date"
                        value={bill.dueDate ?? ''}
                        onChange={(e) => db.bills.update(bill.id!, { dueDate: e.target.value })}
                        className="rounded border bg-transparent px-1 py-0.5 text-xs tabular"
                        style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span>Amount Due</span>
                      <input
                        type="number"
                        value={bill.totalAmountDue ?? 0}
                        onChange={(e) => db.bills.update(bill.id!, { totalAmountDue: Number(e.target.value) })}
                        className="w-24 rounded border bg-transparent px-1 py-0.5 text-right text-xs tabular"
                        style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span>Category</span>
                      <span style={{ color: 'var(--text-primary)' }}>{bill.category ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Account</span>
                      <span style={{ color: 'var(--text-primary)' }}>{bill.paymentAccount ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto-Debit?</span>
                      <span style={{ color: 'var(--text-primary)' }}>{bill.autoDebit ?? '—'}</span>
                    </div>
                  </div>
                  {bill.notes.length > 0 && (
                    <p className="mt-2 text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
                      {bill.notes.join(' ')}
                    </p>
                  )}
                  <button
                    onClick={() => db.bills.update(bill.id!, { status: paid ? 'Unpaid' : 'Paid' })}
                    className="mt-3 w-full rounded-lg border py-1.5 text-xs font-medium"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                  >
                    Mark as {paid ? 'Unpaid' : 'Paid'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {bills.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No bills yet.
        </p>
      )}
    </div>
  )
}
