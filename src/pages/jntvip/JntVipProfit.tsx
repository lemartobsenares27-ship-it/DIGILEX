// J&T VIP — Profit & Loss.
//
// Every other page in this app stops at the net remittance. That is the courier's
// answer, not the business's: a healthy-looking remittance can still sit on top of
// a loss once the product and the advertising that sold it are paid for. This page
// is the whole statement — COD in, four costs out, one number at the bottom — and
// the break-even it implies, so a bad month is visible before it finishes.

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Target, AlertTriangle, Undo2, Info } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatNumber, formatPercent } from '../../lib/format'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { profitAndLoss, costStack } from '../../lib/jntvip/profit'
import { AD_FAILED_TOTAL, AD_FAILED_COUNT, adChargesBetween } from '../../lib/jntvip/adSpend'
import type { JntVipSoaCheckRow, JntVipParcelRow } from '../../lib/jntvip/types'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Row({ label, amount, note, bold, negative }: { label: string; amount: number; note?: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <span className={bold ? 'text-sm font-semibold' : 'text-sm'} style={{ color: bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {label}
        </span>
        {note && (
          <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {note}
          </span>
        )}
      </div>
      <span
        className={`shrink-0 tabular ${bold ? 'text-base font-semibold' : 'text-sm'}`}
        style={{ color: bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        {negative ? peso(-amount) : peso(amount)}
      </span>
    </div>
  )
}

export default function JntVipProfit() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]

  const p = useMemo(() => profitAndLoss(rows, parcels), [rows, parcels])
  const stack = useMemo(() => (p ? costStack(p) : []), [p])
  const charges = useMemo(() => (p ? adChargesBetween(p.from, p.to) : []), [p])

  if (!p) {
    return (
      <div>
        <PageHeader title="Profit &amp; Loss" />
        <Card>
          <p className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            No statements yet. Import them on <strong>SOA Check</strong> and this fills in.
          </p>
        </Card>
      </div>
    )
  }

  const profitable = p.profit > 0
  const verdictColor = profitable ? 'var(--status-good-ink)' : 'var(--status-critical)'
  const Verdict = profitable ? TrendingUp : TrendingDown
  const stackTotal = stack.reduce((t, l) => t + l.amount, 0)

  return (
    <div>
      <PageHeader
        title="Profit &amp; Loss"
        description={`${p.from} to ${p.to} · ${p.days} days · ${formatNumber(rows.length)} statements. COD collected, less every cost, including ads.`}
      />

      {/* The verdict. This is the page's whole reason for existing. */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              <Verdict size={13} /> Operating profit · {p.days} days
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-semibold tabular" style={{ color: verdictColor }}>
                {peso(p.profit)}
              </span>
              <span className="text-sm font-medium" style={{ color: verdictColor }}>
                {profitable ? 'profitable' : 'losing money'}
              </span>
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {formatPercent(p.margin)} of the {peso(p.revenue)} your customers paid
              {p.hasParcels && ` · ${peso(p.profitPerDelivered)} per delivered parcel`}
            </div>
          </div>

          <div className="h-12 w-px" style={{ background: 'var(--border-hairline)' }} />

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              ROAS
            </div>
            <div className="mt-1 text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {p.roas.toFixed(2)}x
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              break-even is {p.breakEvenRoas.toFixed(2)}x
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Ad headroom
            </div>
            <div className="mt-1 text-2xl font-semibold tabular" style={{ color: p.adHeadroom > 0 ? 'var(--status-good-ink)' : 'var(--status-critical)' }}>
              {peso(p.adHeadroom)}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              ads could reach {peso(p.adCeiling)} before zero
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* The statement itself. */}
        <Card title="The statement">
          <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="pb-1">
              <Row label="COD collected from customers" amount={p.revenue} bold />
            </div>
            <div className="py-1">
              <Row label="Shipping" amount={p.shipping} negative />
              <Row label="COD commission 2.75%" amount={p.commission} negative />
              <Row label="VAT on commission" amount={p.vat} negative />
              <Row label="RTS fees" amount={p.rtsFee} note={p.hasParcels ? `${formatNumber(p.returned)} returns` : undefined} negative />
              <Row label="Net remitted to your bank" amount={p.netRemitted} bold />
            </div>
            <div className="py-1">
              <Row
                label="Cost of goods sold"
                amount={p.cogs}
                note={`${formatNumber(p.units)} bottles at ${peso(p.unitCost)}${p.unitsEstimated ? ', estimated' : ''}`}
                negative
              />
            </div>
            <div className="py-1">
              <Row label="Meta ad spend" amount={p.adSpend} note={`${formatNumber(charges.length)} paid receipts`} negative />
            </div>
            <div className="pt-2">
              <Row label="Operating profit" amount={p.profit} bold />
            </div>
          </div>
        </Card>

        {/* Where the money goes, largest first — the biggest lever is the top row. */}
        <Card title="Where every peso of revenue goes" description="Largest cost first. The top row is your biggest lever.">
          <div className="flex flex-col gap-3">
            {stack.map((l) => (
              <div key={l.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: l.color }} />
                    {l.label}
                  </span>
                  <span className="shrink-0 text-sm tabular" style={{ color: 'var(--text-secondary)' }}>
                    {peso(l.amount)} · {formatPercent(l.share)}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-sm" style={{ background: 'var(--border-hairline)' }}>
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${stackTotal > 0 ? (l.amount / stackTotal) * 100 : 0}%`, background: l.color }}
                  />
                </div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {l.note}
                </div>
              </div>
            ))}
            <div className="mt-1 border-t pt-2 text-sm" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}>
              Kept as profit: <strong style={{ color: verdictColor }}>{formatPercent(p.margin)}</strong>
            </div>
          </div>
        </Card>

        {/* Returns, which cost more than the fee line suggests. Needs the parcel
            export: the statements bill RTS fees but never say how many parcels
            came back, so without it the rate has no denominator. */}
        {p.hasParcels ? (
        <Card title="What returns really cost">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                RTS rate
              </div>
              <div
                className="text-2xl font-semibold tabular"
                style={{ color: p.rtsRate <= 0.08 ? 'var(--status-good-ink)' : p.rtsRate <= 0.15 ? 'var(--status-warning-ink)' : 'var(--status-critical)' }}
              >
                {formatPercent(p.rtsRate)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {formatNumber(p.returned)} of {formatNumber(p.delivered + p.returned)} settled
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                RTS fees billed
              </div>
              <div className="text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                {peso(p.rtsFee)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                50% of each parcel's freight
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                True drag
              </div>
              <div className="text-2xl font-semibold tabular" style={{ color: 'var(--status-warning-ink)' }}>
                {peso(p.returnDrag)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                fees plus wasted outbound shipping
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Undo2 size={13} className="mt-0.5 shrink-0" />
            The bottles come back and go on the shelf, so a return costs you no product — but you
            already paid to ship it out and collected nothing. That is why the drag is larger than
            the fee line.
          </p>
        </Card>
        ) : (
        <Card title="What returns really cost">
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            J&amp;T billed {peso(p.rtsFee)} of RTS fees this period, but the statements never say how
            many parcels came back. Import a <strong>My Waybill</strong> export on{' '}
            <strong>Import</strong> and the return rate, its true drag and the per-parcel figures
            appear here.
          </p>
        </Card>
        )}

        {/* The line that decides whether to keep scaling. */}
        {p.hasParcels && (
        <Card title="The line you must not cross">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Ad cost per delivered parcel
              </div>
              <div className="text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                {peso(p.adPerDelivered)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Break-even per delivered parcel
              </div>
              <div className="text-2xl font-semibold tabular" style={{ color: 'var(--status-warning-ink)' }}>
                {peso(p.delivered > 0 ? Math.round(p.adCeiling / p.delivered) : 0)}
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Target size={13} className="mt-0.5 shrink-0" />
            Scale while your ad cost per delivered parcel stays under the break-even figure. When
            the two meet, every extra peso of ad spend buys revenue that exactly pays for itself and
            nothing more.
          </p>
        </Card>
        )}
      </div>

      {/* How the ad number was arrived at. It is the one input not from a statement. */}
      <Card title="How the ad figure was built" className="mt-4">
        <p className="mb-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
          Only receipts marked <strong>Paid</strong> are counted. Meta marks a receipt{' '}
          <strong>Failed</strong> when the card declined — no money moved — then retries, usually
          splitting the amount, and each retry is its own receipt.{' '}
          {formatNumber(AD_FAILED_COUNT)} failed receipts totalling {peso(AD_FAILED_TOTAL)} sit in
          the same export; adding them would overstate ad spend by about a third. Each receipt is
          attributed to the day the card was charged, because the billing windows printed on them
          overlap and cannot be spread across days and re-summed.
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
                <th className="py-2 pr-4 font-semibold">Charged</th>
                <th className="py-2 pr-4 font-semibold">Billing window from</th>
                <th className="py-2 pr-4 text-right font-semibold">Amount</th>
                <th className="py-2 font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.receipt} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="py-1.5 pr-4 tabular" style={{ color: 'var(--text-primary)' }}>{c.chargedOn}</td>
                  <td className="py-1.5 pr-4 tabular" style={{ color: 'var(--text-secondary)' }}>{c.coversFrom}</td>
                  <td className="py-1.5 pr-4 text-right tabular" style={{ color: 'var(--text-primary)' }}>{peso(c.amount)}</td>
                  <td className="py-1.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{c.receipt}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-2 text-sm font-semibold" colSpan={2} style={{ color: 'var(--text-primary)' }}>
                  In this period
                </td>
                <td className="py-2 pr-4 text-right text-sm font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {peso(p.adSpend)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {p.unitsEstimated && (
        <p className="mt-4 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--status-warning-ink)' }} />
          <span>
            <strong>Bottle count is an estimate.</strong> Your parcel export covers slightly fewer
            parcels than the statements bill for, because parcels dispatched before the export starts
            were still delivered inside these periods. The bottle count was scaled up in proportion
            to revenue so the product cost matches the revenue it is charged against. Re-export My
            Waybill from an earlier start date to replace the estimate with a count.
          </span>
        </p>
      )}
    </div>
  )
}
