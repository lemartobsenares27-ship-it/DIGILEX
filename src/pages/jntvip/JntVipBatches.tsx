// Everything the system holds, in one list.
//
// This page used to show import batches, and it was always empty: a batch row
// is only written when a POS export is imported through the wizard, and the
// statements here arrive as PDFs or as seeded data. So the page reported "no
// SOA batches imported yet" while sitting on twenty verified statements, which
// reads as a broken app rather than as a page asking a different question.
//
// It now answers the question the sidebar actually implies: what is loaded,
// where did it come from, is it verified, has it been paid, and what is missing.
// Coverage gaps get their own block because a statement that never arrived is
// invisible unless something goes looking for the hole it left.

import { useMemo, useState } from 'react'
import { ShieldCheck, AlertTriangle, CalendarX2, FileText, Package } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatNumber } from '../../lib/format'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { toStatementRows, findPeriodGaps, PAYMENT_LABEL } from '../../lib/jntvip/finance'
import type { JntVipSoaCheckRow, JntVipParcelRow } from '../../lib/jntvip/types'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PAY_COLOR: Record<string, string> = {
  PAID: 'var(--status-good-ink)',
  UNPAID: 'var(--status-warning-ink)',
  PARTIAL: 'var(--status-warning-ink)',
  OVERPAID: 'var(--series-violet)',
}

type Filter = 'ALL' | 'UNPAID' | 'UNVERIFIED'

export default function JntVipBatches() {
  const soaRows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const [filter, setFilter] = useState<Filter>('ALL')

  const statements = useMemo(() => toStatementRows(soaRows), [soaRows])
  const gaps = useMemo(() => findPeriodGaps(statements), [statements])

  const shown = useMemo(
    () =>
      statements.filter((s) =>
        filter === 'UNPAID' ? s.paymentStatus !== 'PAID' : filter === 'UNVERIFIED' ? s.soa.verdict !== 'CLEAN' : true,
      ),
    [statements, filter],
  )

  const verified = statements.filter((s) => s.soa.verdict === 'CLEAN').length
  const unpaid = statements.filter((s) => s.paymentStatus !== 'PAID').length
  const coverage = statements.length > 0 ? { from: statements[statements.length - 1].soa.periodFrom, to: statements[0].soa.periodTo } : null

  if (statements.length === 0) {
    return (
      <div>
        <PageHeader title="Statements" description="Every J&T statement the system holds." />
        <Card>
          <div className="py-10 text-center">
            <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No statements loaded yet. Drop your SOA PDFs on <strong>SOA Check</strong> — several at
              once is fine — and each one appears here with its figures, its verification and whether
              the money arrived.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Statements"
        description={`Every J&T statement the system holds${coverage ? `, covering ${coverage.from} to ${coverage.to}` : ''}.`}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Statements" value={formatNumber(statements.length)} />
        <StatTile
          label="Verified to the centavo"
          value={`${formatNumber(verified)} of ${formatNumber(statements.length)}`}
          accent={verified === statements.length ? 'var(--status-good-ink)' : 'var(--status-warning-ink)'}
        />
        <StatTile label="Awaiting payment" value={formatNumber(unpaid)} accent={unpaid === 0 ? 'var(--status-good-ink)' : 'var(--status-warning-ink)'} />
        <StatTile label="Days with no statement" value={formatNumber(gaps.length)} accent={gaps.length === 0 ? 'var(--status-good-ink)' : 'var(--status-warning-ink)'} />
      </div>

      {/* A missing statement is invisible unless something looks for the hole. */}
      {gaps.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-start gap-2">
            <CalendarX2 size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--status-warning-ink)' }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formatNumber(gaps.length)} gap{gaps.length === 1 ? '' : 's'} in the run of statements
              </div>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                J&amp;T billed either side of these dates but not for them. Either nothing shipped, or a
                statement never reached you — worth checking, because an unbilled day is also an
                unremitted one.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {gaps.map((g) => (
                  <span
                    key={g.from}
                    className="rounded px-2 py-0.5 text-xs tabular"
                    style={{ background: 'color-mix(in srgb, var(--status-warning-ink) 14%, transparent)', color: 'var(--text-primary)' }}
                  >
                    {g.from === g.to ? g.from : `${g.from} → ${g.to}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {([
            ['ALL', `All ${statements.length}`],
            ['UNPAID', `Awaiting payment ${unpaid}`],
            ['UNVERIFIED', `Not verified ${statements.length - verified}`],
          ] as [Filter, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="rounded-lg border px-2.5 py-1 text-xs font-medium"
              style={{
                borderColor: filter === k ? 'var(--series-orange)' : 'var(--border-hairline)',
                color: filter === k ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: filter === k ? 'color-mix(in srgb, var(--series-orange) 12%, transparent)' : 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
                <th className="py-2 pr-3 font-semibold">Period</th>
                <th className="py-2 pr-3 font-semibold">SOA number</th>
                <th className="py-2 pr-3 text-right font-semibold">COD</th>
                <th className="py-2 pr-3 text-right font-semibold">Charges</th>
                <th className="py-2 pr-3 text-right font-semibold">Net</th>
                <th className="py-2 pr-3 font-semibold">Checked</th>
                <th className="py-2 font-semibold">Money</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.soa.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="whitespace-nowrap py-2 pr-3 tabular" style={{ color: 'var(--text-primary)' }}>
                    {s.soa.periodFrom === s.soa.periodTo ? s.soa.periodFrom : `${s.soa.periodFrom} → ${s.soa.periodTo}`}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {s.soa.soaNumber.replace('MNL-V11913', '')}
                  </td>
                  <td className="py-2 pr-3 text-right tabular" style={{ color: 'var(--text-secondary)' }}>{peso(s.cod)}</td>
                  <td className="py-2 pr-3 text-right tabular" style={{ color: 'var(--text-secondary)' }}>{peso(s.shipping + s.serviceFees)}</td>
                  <td className="py-2 pr-3 text-right tabular font-medium" style={{ color: s.netDue < 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                    {peso(s.netDue)}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3">
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: s.soa.verdict === 'CLEAN' ? 'var(--status-good-ink)' : 'var(--status-warning-ink)' }}>
                      {s.soa.verdict === 'CLEAN' ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                      {s.soa.verdict === 'CLEAN' ? 'Adds up' : 'Check it'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2">
                    <span className="text-xs font-medium" style={{ color: PAY_COLOR[s.paymentStatus] ?? 'var(--text-secondary)' }}>
                      {PAYMENT_LABEL[s.paymentStatus]}
                    </span>
                    {s.soa.receivedDate && (
                      <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {s.soa.receivedDate}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <Package size={13} className="mt-0.5 shrink-0" />
        <span>
          {parcels.length > 0
            ? `${formatNumber(parcels.length)} parcels are loaded, so each statement can be rebuilt line by line on SOA Check.`
            : 'No parcel export is loaded. The statements above are checked against their own arithmetic; importing a My Waybill export lets SOA Check rebuild each one parcel by parcel and catch a wrong figure that still adds up.'}
        </span>
      </p>
    </div>
  )
}
