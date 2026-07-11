import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import GroupedBarChart from '../components/charts/GroupedBarChart'
import { formatCurrency, formatPercent } from '../lib/format'
import monthlyPLSeed from '../data/monthlyPL.json'

const BOLD_ROWS = new Set(['GROSS PROFIT', 'NET PROFIT', 'Total Expenses (COGS+Ads+Fulfillment+Courier+OpEx)'])

export default function MonthlyPL() {
  const rows = useLiveTable(db.monthlyPL)
  const months = monthlyPLSeed.columns.filter((c) => c !== 'Line Item' && c !== 'Total')

  const revenueRow = rows.find((r) => r['Line Item'] === 'Revenue (Delivered COD Sales)')
  const expenseRow = rows.find((r) => r['Line Item']?.toString().startsWith('Total Expenses'))
  const profitRow = rows.find((r) => r['Line Item'] === 'NET PROFIT')

  const chartData = months.map((m) => ({
    month: m,
    Revenue: (revenueRow?.[m] as number) ?? 0,
    Expenses: (expenseRow?.[m] as number) ?? 0,
    'Net Profit': (profitRow?.[m] as number) ?? 0,
  }))

  return (
    <div>
      <PageHeader title="Monthly Income Statement (P&L)" description={monthlyPLSeed.note} />

      <Card title="Revenue, Expenses & Net Profit" className="mb-4">
        <GroupedBarChart
          data={chartData}
          xKey="month"
          series={[
            { key: 'Revenue', label: 'Revenue', color: 'var(--series-blue)' },
            { key: 'Expenses', label: 'Total Expenses', color: 'var(--series-orange)' },
            { key: 'Net Profit', label: 'Net Profit', color: 'var(--status-good)' },
          ]}
        />
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Line Item
                </th>
                {monthlyPLSeed.columns.slice(1).map((c) => (
                  <th key={c} className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const label = String(row['Line Item'] ?? '')
                const bold = BOLD_ROWS.has(label)
                const isMargin = label === 'Profit Margin %'
                return (
                  <tr
                    key={row.id}
                    className="border-t"
                    style={{
                      borderColor: 'var(--border-hairline)',
                      background: bold ? 'color-mix(in srgb, var(--series-blue) 5%, transparent)' : undefined,
                    }}
                  >
                    <td
                      className="px-3 py-2"
                      style={{ color: 'var(--text-primary)', fontWeight: bold ? 600 : 400 }}
                    >
                      {label}
                    </td>
                    {monthlyPLSeed.columns.slice(1).map((c) => (
                      <td
                        key={c}
                        className="px-3 py-2 text-right tabular"
                        style={{ color: 'var(--text-primary)', fontWeight: bold ? 600 : 400 }}
                      >
                        {isMargin ? formatPercent(row[c]) : formatCurrency(row[c])}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
