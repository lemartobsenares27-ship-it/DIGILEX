// Per-product sales, costs and profit — by week or by month, on a switch.
//
// The return rate could already be seen per product per week. What a product
// EARNED in that week could not, and that is the question underneath: a SKU
// returning 15% is only a problem if it is also losing money, and one
// returning 6% can still be the one to drop.
//
// Two things are shared out rather than measured — advertising and overhead —
// because neither arrives labelled by product. They are shown in their own
// columns and called out, so a measured peso is never mistaken for a shared
// one. Everything else here is read off the parcel itself.

import { useMemo, useState } from 'react'
import { Layers, TrendingUp, Undo2, Coins } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import NeedsData from './NeedsData'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { productPnl, type ProductCell, type ProductPeriod } from '../../lib/jntvip/productPnl'
import { makeResolver } from '../../lib/jntvip/rts'
import { pinnedMap } from '../../lib/jntvip/products'
import { toOperatingExpenses } from '../../lib/jntvip/operatingCosts'
import { formatNumber, formatPercent } from '../../lib/format'
import type {
  JntVipOperatingExpenseRow,
  JntVipParcelProductRow,
  JntVipParcelRow,
  JntVipProductRow,
} from '../../lib/jntvip/types'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })

const ALL = 'All products'

export default function ProductPerformance() {
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const products = useLiveTable(jntVipDb.products) as JntVipProductRow[]
  const parcelProducts = useLiveTable(jntVipDb.parcelProducts) as JntVipParcelProductRow[]
  const expenseRows = useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]

  const [grain, setGrain] = useState<'week' | 'month'>('week')
  const [picked, setPicked] = useState<string>(ALL)

  const productOf = useMemo(() => makeResolver(products, pinnedMap(parcelProducts)), [products, parcelProducts])
  const expenses = useMemo(() => toOperatingExpenses(expenseRows), [expenseRows])
  const periods = useMemo(
    () => productPnl(parcels, grain, productOf, expenses),
    [parcels, grain, productOf, expenses],
  )

  const names = useMemo(() => {
    const seen = new Set<string>()
    for (const p of periods) for (const c of p.cells) seen.add(c.product)
    return [...seen].sort()
  }, [periods])

  const totals = useMemo(() => {
    const rows = periods.flatMap((p) => (picked === ALL ? [p.total] : p.cells.filter((c) => c.product === picked)))
    return rows.reduce(
      (t, c) => ({
        revenue: t.revenue + c.revenue,
        profit: t.profit + c.profit,
        adSpend: t.adSpend + c.adSpend,
        delivered: t.delivered + c.delivered,
        returned: t.returned + c.returned,
      }),
      { revenue: 0, profit: 0, adSpend: 0, delivered: 0, returned: 0 },
    )
  }, [periods, picked])

  if (periods.length === 0) {
    return (
      <div>
        <PageHeader title="Product performance" description="What each product sold, cost and earned — by week or by month." />
        <NeedsData
          shows="sales, costs and profit for every product, switchable between weekly and monthly"
          needs="a parcel export"
          where="My Waybill, in the J&T VIP portal"
          to="/import"
        />
      </div>
    )
  }

  const settled = totals.delivered + totals.returned

  return (
    <div>
      <PageHeader
        title="Product performance"
        description="What each product actually sold, cost and earned. Switch the grain and the product; every column moves with it."
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Switch
          label="Period"
          value={grain}
          onChange={(v) => setGrain(v as 'week' | 'month')}
          options={[
            ['week', 'Weekly'],
            ['month', 'Monthly'],
          ]}
        />
        <Switch
          label="Product"
          value={picked}
          onChange={setPicked}
          options={[[ALL, 'All'], ...names.map((n) => [n, n] as [string, string])]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Revenue collected" value={peso(totals.revenue)} icon={<Coins size={16} />} accent="var(--series-blue)" sub={picked === ALL ? 'all products' : picked} />
        <StatTile
          label="Profit"
          value={peso(totals.profit)}
          icon={<TrendingUp size={16} />}
          accent={totals.profit >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)'}
          sub={totals.revenue > 0 ? `${formatPercent(totals.profit / totals.revenue)} margin` : '—'}
        />
        <StatTile
          label="Return rate"
          value={settled > 0 ? formatPercent(totals.returned / settled) : '—'}
          icon={<Undo2 size={16} />}
          accent={settled > 0 && totals.returned / settled > 0.12 ? 'var(--series-orange)' : 'var(--status-good-ink)'}
          sub={`${formatNumber(totals.returned)} of ${formatNumber(settled)} settled`}
        />
        <StatTile
          label="ROAS"
          value={totals.adSpend > 0 ? `${(totals.revenue / totals.adSpend).toFixed(2)}x` : '—'}
          icon={<Layers size={16} />}
          accent="var(--series-violet)"
          sub={`${peso(totals.adSpend)} of ads, shared by parcel`}
        />
      </div>

      <div className="mt-4 space-y-4">
        {[...periods].reverse().map((p) => (
          <PeriodCard key={p.key} period={p} picked={picked} />
        ))}
      </div>

      <Card className="mt-4">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>How to read this.</strong> A parcel belongs to the period
          it settled in — delivered or returned — and carries its own freight, return fee and product cost into that
          same period. Revenue, freight, return fees and bottles are measured from the parcel itself.{' '}
          <strong style={{ color: 'var(--text-secondary)' }}>Advertising and operating costs are shared out</strong>,
          because neither arrives labelled by product: advertising and overhead by each product's share of parcels,
          packing by its share of bottles. A product that converts cheaply is therefore charged too much here, and one
          that converts dearly too little. Returned bottles carry no product cost — they come back sellable, and
          charging them would count the same stock as lost twice. These figures come from parcels, not statements, so
          they will not tie exactly to Profit &amp; Loss, which is statement-based and is the authority on money.
        </p>
      </Card>
    </div>
  )
}

function Switch({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map(([k, text]) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: value === k ? 'var(--series-blue)' : 'var(--border-hairline)',
              color: value === k ? 'var(--series-blue)' : 'var(--text-secondary)',
              background: value === k ? 'color-mix(in srgb, var(--series-blue) 10%, transparent)' : 'var(--surface-card)',
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function PeriodCard({ period, picked }: { period: ProductPeriod; picked: string }) {
  const rows = picked === ALL ? period.cells : period.cells.filter((c) => c.product === picked)
  if (rows.length === 0) return null
  const foot = picked === ALL ? period.total : null

  return (
    <Card
      title={period.label}
      description={`${period.days} day${period.days === 1 ? '' : 's'} · ${peso(period.adSpend)} of advertising${period.partial ? ' · PART PERIOD — a full week of fixed costs against fewer days of parcels, and its returns have not all happened yet' : ''}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="pb-2 text-left font-medium">Product</th>
              <th className="pb-2 text-right font-medium">Deliv</th>
              <th className="pb-2 text-right font-medium">Ret</th>
              <th className="pb-2 text-right font-medium">RTS</th>
              <th className="pb-2 text-right font-medium">Revenue</th>
              <th className="pb-2 text-right font-medium">Freight</th>
              <th className="pb-2 text-right font-medium">RTS fee</th>
              <th className="pb-2 text-right font-medium">COD fee</th>
              <th className="pb-2 text-right font-medium">Product</th>
              <th className="pb-2 text-right font-medium" title="Shared out by parcel share">Ads*</th>
              <th className="pb-2 text-right font-medium" title="Shared out by parcel and bottle share">Expenses*</th>
              <th className="pb-2 text-right font-medium">Profit</th>
              <th className="pb-2 text-right font-medium">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <CellRow key={c.product} c={c} />
            ))}
            {foot && (
              <tr className="border-t-2" style={{ borderColor: 'var(--border-hairline)' }}>
                <CellRow c={foot} bold />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function CellRow({ c, bold }: { c: ProductCell; bold?: boolean }) {
  const weight = bold ? 'font-semibold' : ''
  const num = (v: number, color?: string) => (
    <td className={`whitespace-nowrap py-1.5 text-right tabular-nums ${weight}`} style={{ color: color ?? 'var(--text-secondary)' }}>
      {peso(v)}
    </td>
  )
  const body = (
    <>
      <td className={`whitespace-nowrap py-1.5 ${weight}`} style={{ color: 'var(--text-primary)' }}>{c.product}</td>
      <td className={`py-1.5 text-right tabular-nums ${weight}`} style={{ color: 'var(--text-secondary)' }}>{formatNumber(c.delivered)}</td>
      <td className={`py-1.5 text-right tabular-nums ${weight}`} style={{ color: 'var(--text-secondary)' }}>{formatNumber(c.returned)}</td>
      <td
        className={`py-1.5 text-right tabular-nums ${weight}`}
        style={{ color: c.rtsRate > 0.15 ? 'var(--series-orange)' : 'var(--text-secondary)' }}
      >
        {formatPercent(c.rtsRate, 0)}
      </td>
      {num(c.revenue, 'var(--text-primary)')}
      {num(-c.freight)}
      {num(-c.rtsFee)}
      {num(-c.codFee)}
      {num(-c.cogs)}
      {num(-c.adSpend)}
      {num(-c.operating)}
      {num(c.profit, c.profit >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)')}
      <td
        className={`whitespace-nowrap py-1.5 text-right tabular-nums ${weight}`}
        style={{ color: c.profit >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)' }}
      >
        {formatPercent(c.margin, 0)}
      </td>
    </>
  )
  return bold ? body : <tr className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>{body}</tr>
}
