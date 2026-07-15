import { useMemo, useState } from 'react'
import { DollarSign, TrendingDown, TrendingUp, Megaphone, Package, Truck } from 'lucide-react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import Card from '../components/Card'
import GroupedBarChart from '../components/charts/GroupedBarChart'
import HorizontalBarChart from '../components/charts/HorizontalBarChart'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import { allMonthSummaries, allTimeDeliveryStats, summarizeMonth } from '../lib/analytics'
import dashboardSeed from '../data/dashboard.json'

export default function Overview() {
  const orders = useLiveTable(db.orders)
  const fbTxns = useLiveTable(db.fbTxns)
  const expenses = useLiveTable(db.expenses)
  const posRows = useLiveTable(db.posReconciliation)
  const monthlyPL = useLiveTable(db.monthlyPL)

  const monthSummaries = useMemo(() => allMonthSummaries(orders, fbTxns), [orders, fbTxns])
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const activeMonth = selectedMonth ?? monthSummaries[monthSummaries.length - 1]?.month ?? ''
  const current = useMemo(
    () => summarizeMonth(orders, fbTxns, activeMonth),
    [orders, fbTxns, activeMonth],
  )
  const allTime = useMemo(() => allTimeDeliveryStats(posRows), [posRows])

  const plRow = (lineItem: string) => monthlyPL.find((r) => r['Line Item'] === lineItem)
  const totalExpensesRow = plRow('Total Expenses (COGS+Ads+Fulfillment+Courier+OpEx)')
  const netProfitRow = plRow('NET PROFIT')
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
        <StatTile label="Delivered ROAS" value={current.roas ? `${current.roas.toFixed(2)}x` : '—'} accent="var(--series-aqua)" />
        <StatTile label="Orders Shipped" value={formatNumber(current.ordersShipped)} icon={<Package size={16} />} accent="var(--series-yellow)" />
        <StatTile label="Delivered Orders" value={formatNumber(current.ordersDelivered)} icon={<Truck size={16} />} accent="var(--status-good)" />
        <StatTile label="Delivery Rate" value={formatPercent(current.deliveryRate)} accent="var(--series-magenta)" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Revenue, Expenses & Ad Spend by Month" className="lg:col-span-2">
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
        <Card title="All-Time Delivery Performance" description="Per your POS, across every uploaded batch">
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Delivered (all-time)</span>
              <span className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formatNumber(allTime.delivered)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Returned / RTS (all-time)</span>
              <span className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formatNumber(allTime.rts)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Exact RTS Rate</span>
              <span className="tabular font-semibold" style={{ color: 'var(--status-critical)' }}>
                {formatPercent(allTime.rate)}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border-hairline)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${allTime.rate * 100}%`, background: 'var(--status-critical)' }}
              />
            </div>
          </div>
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
