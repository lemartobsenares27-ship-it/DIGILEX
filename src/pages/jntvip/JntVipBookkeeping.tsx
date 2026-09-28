// J&T VIP — Monthly Bookkeeping.
//
// The same shape as the financial dashboard's bookkeeping pages, because that
// is the format these books are already kept in: revenue on the left,
// deductions on the right, net underneath, one card per month.

import { useMemo } from 'react'
import { BookOpen, Wallet, Receipt, Clock, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatNumber } from '../../lib/format'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { buildBooks, booksTotals, type BookMonth, type BookLine } from '../../lib/jntvip/bookkeeping'
import type { JntVipSoaCheckRow } from '../../lib/jntvip/types'

const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Row({ line, negative }: { line: BookLine; negative?: boolean }) {
  return (
    <div
      className="grid grid-cols-[1fr_auto] items-start gap-3 border-t py-2 text-xs"
      style={{ borderColor: 'var(--border-hairline)' }}
    >
      <span>
        <span style={{ color: 'var(--text-primary)' }}>{line.label}</span>
        <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {line.detail}
        </span>
      </span>
      <span className="whitespace-nowrap text-right tabular font-medium" style={{ color: 'var(--text-primary)' }}>
        {negative ? '−' : ''}
        {peso(Math.abs(line.amount))}
      </span>
    </div>
  )
}

export default function JntVipBookkeeping() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const books = useMemo(() => buildBooks(rows), [rows])
  const totals = useMemo(() => booksTotals(books), [books])

  function exportBooks() {
    const wb = XLSX.utils.book_new()
    const flat = books.flatMap((b) => [
      { Month: b.monthLabel, Section: 'REVENUE', Line: 'COD collected', Detail: `${b.statements.length} statement(s)`, Amount: b.revenueTotal / 100 },
      ...b.deductions.map((d) => ({ Month: b.monthLabel, Section: 'DEDUCTIONS', Line: d.label, Detail: d.detail, Amount: -d.amount / 100 })),
      { Month: b.monthLabel, Section: 'NET', Line: 'Net remittance due', Detail: '', Amount: b.net / 100 },
      { Month: b.monthLabel, Section: 'NET', Line: 'Received', Detail: '', Amount: b.received / 100 },
      { Month: b.monthLabel, Section: 'NET', Line: 'Outstanding', Detail: '', Amount: b.outstanding / 100 },
    ])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flat), 'Monthly books')
    XLSX.writeFile(wb, `JNT_Bookkeeping_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (books.length === 0) {
    return (
      <div>
        <PageHeader title="Monthly Bookkeeping" description="J&T revenue and charges, month by month." />
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen size={22} style={{ color: 'var(--text-muted)' }} />
            <p className="max-w-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
              No statements yet. Import them on <strong>SOA Check</strong> and the books build themselves from what J&amp;T billed.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Monthly Bookkeeping"
        description="What J&T collected for you each month, what they charged for it, and what was left. Revenue is COD collected on delivered parcels; every deduction is a fee on the statement."
        actions={
          <button
            onClick={exportBooks}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            <Download size={12} /> Export
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="COD collected"
          value={peso(totals.revenue)}
          icon={<Wallet size={15} />}
          accent="var(--series-blue)"
          sub={`${formatNumber(totals.statements)} statement(s) across ${formatNumber(totals.months)} month(s)`}
        />
        <StatTile
          label="J&T charges"
          value={peso(totals.deductions)}
          icon={<Receipt size={15} />}
          accent="var(--series-orange)"
          sub={`${(totals.costRatio * 100).toFixed(1)}% of what was collected`}
        />
        <StatTile
          label="Net earned"
          value={peso(totals.net)}
          icon={<BookOpen size={15} />}
          accent="var(--series-aqua)"
          sub={`${((1 - totals.costRatio) * 100).toFixed(1)}% of COD is yours`}
        />
        <StatTile
          label="Still to receive"
          value={peso(totals.outstanding)}
          icon={<Clock size={15} />}
          accent={totals.outstanding > 0 ? 'var(--status-warning-ink)' : 'var(--text-muted)'}
          sub={totals.received > 0 ? `${peso(totals.received)} already received` : 'Nothing recorded as received yet'}
        />
      </div>

      {books.map((b) => (
        <MonthCard key={b.month} book={b} />
      ))}
    </div>
  )
}

function MonthCard({ book: b }: { book: BookMonth }) {
  return (
    <Card
      title={b.monthLabel}
      description={`${formatNumber(b.statements.length)} statement(s) · ${(b.costRatio * 100).toFixed(1)}% of collections went to J&T`}
      className="mb-4"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--status-good-ink)' }}>
            COD collected (gross, before J&amp;T charges)
          </h4>
          {b.revenue.map((l) => (
            <Row key={l.detail} line={l} />
          ))}
          <div
            className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
          >
            <span>Total collected</span>
            <span className="tabular">{peso(b.revenueTotal)}</span>
          </div>
        </div>

        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--series-orange)' }}>
            What J&amp;T charged
          </h4>
          {b.deductions.map((l) => (
            <Row key={l.label} line={l} negative />
          ))}
          <div
            className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
          >
            <span>Total charges</span>
            <span className="tabular">−{peso(b.deductionTotal)}</span>
          </div>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-3"
        style={{ borderColor: 'var(--border-hairline)', background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)' }}
      >
        <div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Net remittance due
          </div>
          <div
            className="text-lg font-semibold tabular"
            style={{ color: b.net < 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}
          >
            {peso(b.net)}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Received
          </div>
          <div className="text-lg font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
            {b.received === 0 ? '—' : peso(b.received)}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Outstanding
          </div>
          <div
            className="text-lg font-semibold tabular"
            style={{ color: b.outstanding > 0 ? 'var(--status-warning-ink)' : 'var(--status-good-ink)' }}
          >
            {peso(b.outstanding)}
          </div>
          {b.unpaidCount > 0 && (
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {formatNumber(b.unpaidCount)} statement(s) not fully paid
            </div>
          )}
        </div>
      </div>

      {b.net < 0 && (
        <p className="mt-2 text-xs" style={{ color: 'var(--status-critical)' }}>
          Net is negative this month: J&amp;T's charges exceeded what they collected, so the balance is owed to them rather than
          to you.
        </p>
      )}
    </Card>
  )
}
