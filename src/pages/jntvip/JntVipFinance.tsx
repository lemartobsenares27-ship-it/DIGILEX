// J&T VIP — Finance.
//
// Every statement ever issued, what it promised, and whether the money
// actually landed. The SOA Check page answers "is this correct"; this answers
// "was I paid", which is the question that decides whether to chase J&T.

import { useMemo, useState } from 'react'
import {
  Wallet,
  Banknote,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CircleDashed,
  CircleDollarSign,
  XCircle,
  Download,
  ChevronDown,
  ChevronRight,
  CalendarX,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatNumber } from '../../lib/format'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import {
  toStatementRows,
  financeTotals,
  findPeriodGaps,
  paymentStatusOf,
  PAYMENT_LABEL,
  type StatementRow,
  type PaymentStatus,
} from '../../lib/jntvip/finance'
import type { JntVipSoaCheckRow } from '../../lib/jntvip/types'

const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/**
 * Where the COD went. Three buckets, because five slices of a bar is noise and
 * because a four-hue set could not separate blue from violet under
 * protanopia in dark mode — cutting series beats forcing a palette.
 * Validated light and dark with scripts/validate_palette.js.
 */
const MONEY_SERIES = [
  { key: 'net', label: 'Remitted to you', color: 'var(--series-aqua)' },
  { key: 'shipping', label: 'Shipping', color: 'var(--series-blue)' },
  { key: 'fees', label: 'COD service fees', color: 'var(--series-orange)' },
] as const

/** Status colours are reserved, and each ships with an icon and a word. */
const PAY_STYLE: Record<PaymentStatus, { color: string; Icon: typeof CheckCircle2 }> = {
  PAID: { color: 'var(--status-good-ink)', Icon: CheckCircle2 },
  PARTIAL: { color: 'var(--status-warning-ink)', Icon: CircleDashed },
  UNPAID: { color: 'var(--status-critical)', Icon: XCircle },
  OVERPAID: { color: 'var(--series-blue)', Icon: CircleDollarSign },
}

export default function JntVipFinance() {
  const soaRows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL')
  const [expanded, setExpanded] = useState<number | null>(null)

  const all = useMemo(() => toStatementRows(soaRows), [soaRows])
  const rows = useMemo(
    () => (statusFilter === 'ALL' ? all : all.filter((r) => r.paymentStatus === statusFilter)),
    [all, statusFilter],
  )
  const totals = useMemo(() => financeTotals(all), [all])
  const gaps = useMemo(() => findPeriodGaps(all), [all])

  function exportLedger() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        all.map((r) => ({
          SOA: r.soa.soaNumber,
          'Period from': r.soa.periodFrom,
          'Period to': r.soa.periodTo,
          'COD collected': r.cod / 100,
          Shipping: r.shipping / 100,
          'Service fees': r.serviceFees / 100,
          'Net due': r.netDue / 100,
          Received: r.soa.receivedAmount == null ? '' : r.received / 100,
          'Received on': r.soa.receivedDate ?? '',
          Reference: r.soa.receivedReference ?? '',
          Variance: r.soa.receivedAmount == null ? '' : r.variance / 100,
          Payment: PAYMENT_LABEL[r.paymentStatus],
          'Arithmetic check': r.soa.verdict,
          'Days since period end': r.ageDays,
          Delivered: r.soa.deliveredParcels,
          Returned: r.soa.returnedParcels,
        })),
      ),
      'Remittance ledger',
    )
    XLSX.writeFile(wb, `JNT_Remittance_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (soaRows.length === 0) {
    return (
      <div>
        <PageHeader title="Finance" description="Every J&T statement and whether the money actually arrived." />
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Wallet size={22} style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              No statements in the ledger yet
            </h3>
            <p className="max-w-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
              Statements arrive here from <strong>SOA Check</strong> — verify one, press “Save this check”, and it lands here as
              unpaid. Then record the remittance when it hits your account, and this page tracks what is still owed.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const barTotal = totals.netDue + totals.shipping + totals.serviceFees

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Every statement, what it promised, and whether the money landed. A correct SOA and a paid SOA are different facts — both are tracked here."
        actions={
          <button
            onClick={exportLedger}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            <Download size={12} /> Export
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="COD collected"
          value={peso(totals.codCollected)}
          icon={<Banknote size={15} />}
          accent="var(--series-blue)"
          sub={`Across ${formatNumber(totals.statements)} statement(s)`}
        />
        <StatTile
          label="Remitted to you"
          value={peso(totals.received)}
          icon={<Wallet size={15} />}
          accent="var(--series-aqua)"
          sub={`of ${peso(totals.netDue)} due — ${(totals.keptShare * 100).toFixed(1)}% of COD was yours to keep`}
        />
        <StatTile
          label="Still outstanding"
          value={peso(totals.outstanding)}
          icon={<Clock size={15} />}
          accent={totals.outstanding > 0 ? 'var(--status-warning-ink)' : 'var(--text-muted)'}
          sub={
            totals.unpaidCount > 0
              ? `${formatNumber(totals.unpaidCount)} statement(s) unpaid or part paid`
              : 'Every statement settled'
          }
        />
        <StatTile
          label="Needs attention"
          value={formatNumber(totals.overdueCount + totals.varianceCount + totals.discrepancyCount)}
          icon={<AlertTriangle size={15} />}
          accent={
            totals.overdueCount + totals.varianceCount + totals.discrepancyCount > 0
              ? 'var(--status-critical)'
              : 'var(--text-muted)'
          }
          sub={`${formatNumber(totals.overdueCount)} overdue · ${formatNumber(totals.varianceCount)} paid wrong · ${formatNumber(totals.discrepancyCount)} failed check`}
        />
      </div>

      {(totals.overdueCount > 0 || totals.varianceCount > 0 || gaps.length > 0) && (
        <Card className="mb-4" title="What to chase">
          <div className="flex flex-col gap-2 text-xs">
            {totals.overdueCount > 0 && (
              <div className="flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                <Clock size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--status-warning-ink)' }} />
                <span>
                  <strong>{peso(totals.overdueAmount)}</strong> owed on {formatNumber(totals.overdueCount)} statement(s) whose period
                  closed more than 14 days ago.
                </span>
              </div>
            )}
            {totals.varianceCount > 0 && (
              <div className="flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--status-critical)' }} />
                <span>
                  {formatNumber(totals.varianceCount)} statement(s) were paid an amount that differs from what they promised —{' '}
                  <strong>{peso(totals.varianceTotal)}</strong> net.
                </span>
              </div>
            )}
            {gaps.map((g) => (
              <div key={g.from} className="flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                <CalendarX size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--status-critical)' }} />
                <span>
                  <strong>
                    {g.days} day(s) with no statement: {g.from} to {g.to}
                  </strong>{' '}
                  (after {g.afterSoa}). A statement that never arrived is invisible unless you look for the gap — COD delivered in
                  those days may be un-remitted.
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Where the COD went — one bar, direct-labelled, with the table below as the relief the contrast warning requires. */}
      {barTotal > 0 && (
        <Card
          className="mb-4"
          title="Where the COD went"
          description="Across every statement in the ledger. Service fees are the COD commission, its VAT and RTS charges."
        >
          <div className="flex h-7 w-full overflow-hidden rounded-lg" role="img" aria-label="Share of COD by destination">
            {[
              { ...MONEY_SERIES[0], value: totals.netDue },
              { ...MONEY_SERIES[1], value: totals.shipping },
              { ...MONEY_SERIES[2], value: totals.serviceFees },
            ].map((seg, i) => (
              <div
                key={seg.key}
                className="flex items-center justify-center"
                style={{
                  width: `${(seg.value / barTotal) * 100}%`,
                  background: seg.color,
                  marginLeft: i === 0 ? 0 : 2,
                }}
                title={`${seg.label}: ${peso(seg.value)}`}
              >
                {seg.value / barTotal > 0.09 && (
                  <span className="text-[11px] font-semibold text-white">{((seg.value / barTotal) * 100).toFixed(0)}%</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {[
              { ...MONEY_SERIES[0], value: totals.netDue },
              { ...MONEY_SERIES[1], value: totals.shipping },
              { ...MONEY_SERIES[2], value: totals.serviceFees },
            ].map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: seg.color }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {seg.label}
                </span>
                <span className="text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {peso(seg.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        title="Remittance ledger"
        description="Click a row for the full breakdown and to record a payment."
        actions={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | PaymentStatus)}
            className="rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          >
            <option value="ALL">All statements</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Part paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERPAID">Overpaid</option>
          </select>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
                {['', 'SOA', 'Period', 'COD', 'Net due', 'Received', 'Variance', 'Payment', 'Check'].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <LedgerRow key={r.soa.id} row={r} open={expanded === r.soa.id} onToggle={() => setExpanded(expanded === r.soa.id ? null : r.soa.id!)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2" style={{ borderColor: 'var(--border-hairline)', background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(rows.length)} statement(s)
                </td>
                <td className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {peso(rows.reduce((s, r) => s + r.cod, 0))}
                </td>
                <td className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {peso(rows.reduce((s, r) => s + r.netDue, 0))}
                </td>
                <td className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {peso(rows.reduce((s, r) => s + r.received, 0))}
                </td>
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--status-warning-ink)' }}>
                  {peso(rows.reduce((s, r) => s + (r.netDue - r.received), 0))} outstanding
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No statement matches that filter.
          </p>
        )}
      </Card>
    </div>
  )
}

function LedgerRow({ row, open, onToggle }: { row: StatementRow; open: boolean; onToggle: () => void }) {
  const { soa } = row
  const pay = PAY_STYLE[row.paymentStatus]
  const [amount, setAmount] = useState(soa.receivedAmount != null ? String(soa.receivedAmount / 100) : '')
  const [date, setDate] = useState(soa.receivedDate ?? new Date().toISOString().slice(0, 10))
  const [ref, setRef] = useState(soa.receivedReference ?? '')
  const [busy, setBusy] = useState(false)

  async function record() {
    setBusy(true)
    const received = amount.trim() === '' ? null : Math.round(Number(amount) * 100)
    await jntVipDb.soaChecks.update(soa.id!, {
      receivedAmount: received,
      receivedDate: received == null ? null : date,
      receivedReference: ref.trim() || null,
      paymentStatus: paymentStatusOf(row.netDue, received),
    })
    setBusy(false)
  }

  /** Fill in exactly what was promised — the common case, one click. */
  function matchNetDue() {
    setAmount(String(row.netDue / 100))
  }

  return (
    <>
      <tr className="cursor-pointer border-t" style={{ borderColor: 'var(--border-hairline)' }} onClick={onToggle}>
        <td className="px-2 py-2" style={{ color: 'var(--text-muted)' }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {soa.soaNumber}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {soa.periodFrom} → {soa.periodTo}
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {formatNumber(soa.deliveredParcels)} delivered · {row.ageDays}d ago
          </div>
        </td>
        <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>{peso(row.cod)}</td>
        <td className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>{peso(row.netDue)}</td>
        <td className="px-3 py-2 text-xs tabular" style={{ color: soa.receivedAmount == null ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          {soa.receivedAmount == null ? '—' : peso(row.received)}
        </td>
        <td className="px-3 py-2 text-xs tabular" style={{ color: row.variance === 0 ? 'var(--text-muted)' : 'var(--status-critical)' }}>
          {soa.receivedAmount == null || row.variance === 0 ? '—' : (row.variance > 0 ? '+' : '') + peso(row.variance)}
        </td>
        <td className="px-3 py-2">
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ color: pay.color, background: `color-mix(in srgb, ${pay.color} 14%, transparent)` }}
          >
            <pay.Icon size={11} /> {PAYMENT_LABEL[row.paymentStatus]}
          </span>
        </td>
        <td className="px-3 py-2">
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium"
            style={{ color: soa.verdict === 'CLEAN' ? 'var(--status-good-ink)' : soa.verdict === 'DISCREPANCY' ? 'var(--status-critical)' : 'var(--text-muted)' }}
          >
            {soa.verdict === 'CLEAN' ? <CheckCircle2 size={11} /> : soa.verdict === 'DISCREPANCY' ? <XCircle size={11} /> : <CircleDashed size={11} />}
            {soa.verdict === 'CLEAN' ? 'Verified' : soa.verdict === 'DISCREPANCY' ? peso(soa.differenceTotal) + ' off' : 'Partial'}
          </span>
        </td>
      </tr>

      {open && (
        <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)' }}>
          <td colSpan={9} className="px-3 py-3">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  How the net was reached
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ['COD collected', row.cod, false],
                      ['less shipping', -row.shipping, false],
                      ['less COD service fees', -row.serviceFees, false],
                      ['Net remittance due', row.netDue, true],
                    ].map(([label, value, strong]) => (
                      <tr key={label as string} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                        <td className="py-1.5" style={{ color: strong ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: strong ? 600 : 400 }}>
                          {label as string}
                        </td>
                        <td className="py-1.5 text-right tabular" style={{ color: 'var(--text-primary)', fontWeight: strong ? 600 : 400 }}>
                          {peso(value as number)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {formatNumber(soa.deliveredParcels)} delivered · {formatNumber(soa.dispatchedParcels)} dispatched ·{' '}
                  {formatNumber(soa.returnedParcels)} returned. Checked {new Date(soa.checkedAt).toLocaleDateString()}.
                </p>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Record the remittance
                </div>
                <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                  <label className="flex flex-col gap-1 text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>Amount received (₱)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="rounded-lg border px-2.5 py-1.5 text-sm tabular"
                      style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>Date received</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="rounded-lg border px-2.5 py-1.5 text-sm"
                      style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                    />
                  </label>
                  <label className="col-span-2 flex flex-col gap-1 text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>Bank reference</span>
                    <input
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                      placeholder="BDO transfer ref"
                      className="rounded-lg border px-2.5 py-1.5 text-sm"
                      style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                    />
                  </label>
                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      onClick={record}
                      disabled={busy}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: 'var(--series-aqua)' }}
                    >
                      {busy ? 'Saving…' : 'Record payment'}
                    </button>
                    <button
                      onClick={matchNetDue}
                      className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
                      style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                    >
                      Paid in full ({peso(row.netDue)})
                    </button>
                  </div>
                  <p className="col-span-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Enter what actually hit the bank, not what the SOA promised. A gap between the two is the finding.
                  </p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
