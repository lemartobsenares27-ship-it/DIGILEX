import { useMemo, useState } from 'react'
import { DollarSign, TrendingDown, TrendingUp, Megaphone, Package, Truck } from 'lucide-react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import Card from '../components/Card'
import LiveBadge from '../components/LiveBadge'
import GroupedBarChart from '../components/charts/GroupedBarChart'
import HorizontalBarChart from '../components/charts/HorizontalBarChart'
import PeakAreaChart from '../components/charts/PeakAreaChart'
import RadialGauge from '../components/charts/RadialGauge'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import { allMonthSummaries, allTimeDeliveryStats, summarizeMonth } from '../lib/analytics'
import { rtsRateStatus } from '../lib/kpi'
import dashboardSeed from '../data/dashboard.json'

const GAUGE_COLOR = { good: 'var(--status-good)', warning: 'var(--status-warning)', critical: 'var(--status-critical)' } as const

export default function Overview() {
  const orders = useLiveTable(db.orders)
  const fbTxns = useLiveTable(db.fbTxns)
  const expenses = useLiveTable(db.expenses)
  const posRows = useLiveTable(db.posReconciliation)
  const monthlyPL = useLiveTable(db.monthlyPL)

  const monthSummaries = useMemo(() => allMonthSummaries(orders, fbTxns), [orders, fbTxns])
  const plRow = (lineItem: string) => monthlyPL.find((r) => r['Line Item'] === lineItem)
  const totalExpensesRow = plRow('Total Expenses (COGS+Ads+Fulfillment+Courier+OpEx)')
  const netProfitRow = plRow('NET PROFIT')

  // Default to the latest month Monthly P&L actually has a column for - the
  // literal latest month with orders is often still incomplete (ad spend/opex
  // not fully in yet), which would show a misleading PHP 0.00 by default.
  const defaultMonth = useMemo(() => {
    for (let i = monthSummaries.length - 1; i >= 0; i--) {
      const m = monthSummaries[i].month
      if (totalExpensesRow?.[m] !== undefined) return m
    }
    return monthSummaries[monthSummaries.length - 1]?.month ?? ''
  }, [monthSummaries, totalExpensesRow])

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const activeMonth = selectedMonth ?? defaultMonth
  const current = useMemo(
    () => summarizeMonth(orders, fbTxns, activeMonth),
    [orders, fbTxns, activeMonth],
  )
  const allTime = useMemo(() => allTimeDeliveryStats(posRows), [posRows])

  const monthlyExpenses = Number(totalExpensesRow?.[activeMonth] ?? 0)
  const monthlyNetProfit = Number(netProfitRow?.[activeMonth] ?? 0)

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const cat = e.Category ?? 'Uncategorized'
      map.set(cat, (map.get(cat) ?? 0) + (e.Amount ?? 0))
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).slice(0, 8)
  }, [expenses])

  const revenueRow = plRow('Revenue (Delivered COD Sales)')
  const chartData = monthSummaries.map((m) => ({
    month: m.month,
    Revenue: Number(revenueRow?.[m.month] ?? m.revenue),
    'Total Expenses': Number(totalExpensesRow?.[m.month] ?? 0),
    'Ad Spend': m.adSpend,
  }))

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        description="Digilex COD Business — Financial Control Center. Revenue, expenses and order counts are computed live from your Orders Database, Monthly P&L and Facebook Ads Tracker, so edits anywhere in the app update the dashboard instantly."
        actions={
          <div className="flex items-center gap-3">
            <LiveBadge />
            <select
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-card)' }}
            >
              {monthSummaries.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.month}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatTile label={`Revenue — ${activeMonth}`} value={formatCurrency(current.revenue)} icon={<DollarSign size={16} />} accent="var(--series-blue)" />
        <StatTile
          label="Total Expenses"
          value={formatCurrency(monthlyExpenses)}
          icon={<TrendingDown size={16} />}
          accent="var(--series-orange)"
        />
        <StatTile
          label="Net Profit"
          value={formatCurrency(monthlyNetProfit)}
          icon={<TrendingUp size={16} />}
          accent={monthlyNetProfit >= 0 ? 'var(--status-good)' : 'var(--status-critical)'}
        />
        <StatTile label="Facebook Ad Spend" value={formatCurrency(current.adSpend)} icon={<Megaphone size={16} />} accent="var(--series-violet)" />
        <StatTile label="ROAS" value={current.roas ? `${current.roas.toFixed(2)}x` : '—'} accent="var(--series-aqua)" />
        <StatTile label="Orders Shipped" value={formatNumber(current.ordersShipped)} icon={<Package size={16} />} accent="var(--series-yellow)" />
        <StatTile label="Delivered Orders" value={formatNumber(current.ordersDelivered)} icon={<Truck size={16} />} accent="var(--status-good)" />
        <StatTile label="Delivery Rate" value={formatPercent(current.deliveryRate)} accent="var(--series-magenta)" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Revenue Trend" description="Delivered COD sales by month, peak highlighted" className="lg:col-span-2">
          <PeakAreaChart data={monthSummaries.map((m) => ({ label: m.month, value: Number(revenueRow?.[m.month] ?? m.revenue) }))} />
        </Card>
        <Card title="All-Time RTS Rate" description="Per your POS, across every uploaded batch">
          <div className="flex flex-col items-center gap-4 pt-1">
            <RadialGauge
              value={allTime.rate}
              label="RTS Rate"
              sub={`${formatNumber(allTime.rts)} of ${formatNumber(allTime.delivered + allTime.rts)}`}
              color={GAUGE_COLOR[rtsRateStatus(allTime.rate)]}
              size={140}
            />
            <div className="grid w-full grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--border-hairline)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Delivered</div>
                <div className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(allTime.delivered)}
                </div>
              </div>
              <div className="rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--border-hairline)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Returned / RTS</div>
                <div className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(allTime.rts)}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Revenue, Expenses & Ad Spend by Month">
          <GroupedBarChart
            data={chartData}
            xKey="month"
            series={[
              { key: 'Revenue', label: 'Revenue', color: 'var(--series-blue)' },
              { key: 'Total Expenses', label: 'Total Expenses', color: 'var(--series-orange)' },
              { key: 'Ad Spend', label: 'Ad Spend', color: 'var(--series-violet)' },
            ]}
          />
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Expense Breakdown by Category — all time" description="Top categories from the Expense Tracker">
          <HorizontalBarChart data={expenseByCategory} />
        </Card>
      </div>

      <div className="mt-4">
        <Card title="How to use this workbook" description="Notes carried over from the original financial control center">
          <ul className="flex flex-col gap-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {dashboardSeed.notes.slice(0, 6).map((n, i) => (
              <li key={i} className="border-l-2 pl-3" style={{ borderColor: 'var(--border-strong)' }}>
                {n}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
