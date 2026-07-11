import { useMemo } from 'react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import StatTile from '../components/StatTile'
import DataTable, { type ColumnDef } from '../components/DataTable'
import LineTrendChart from '../components/charts/LineTrendChart'
import type { CashFlowRow } from '../lib/types'
import { formatCurrency } from '../lib/format'
import cashFlowSeed from '../data/cashFlow.json'

const COLUMNS: ColumnDef<CashFlowRow>[] = [
  { key: 'Date', label: 'Date', type: 'date', editable: true },
  { key: 'Opening Balance', label: 'Opening Balance', type: 'currency', editable: true, align: 'right' },
  { key: 'Income', label: 'Income', type: 'currency', editable: true, align: 'right' },
  { key: 'Expenses', label: 'Expenses', type: 'currency', editable: true, align: 'right' },
  { key: 'Net Cash Flow', label: 'Net Cash Flow', type: 'currency', editable: true, align: 'right' },
  { key: 'Closing Balance', label: 'Closing Balance', type: 'currency', editable: true, align: 'right' },
]

export default function CashFlow() {
  const rows = useLiveTable(db.cashFlow)
  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(a.Date ?? 0).getTime() - new Date(b.Date ?? 0).getTime()),
    [rows],
  )
  const latest = sorted[sorted.length - 1]

  return (
    <div>
      <PageHeader title="Cash Flow" description={cashFlowSeed.note} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Current Balance" value={formatCurrency(latest?.['Closing Balance'])} accent="var(--series-blue)" />
        <StatTile label="Latest Daily Income" value={formatCurrency(latest?.Income)} accent="var(--status-good)" />
        <StatTile label="Latest Daily Expenses" value={formatCurrency(latest?.Expenses)} accent="var(--series-orange)" />
      </div>

      <Card title="Closing Balance Over Time" className="mb-4">
        <LineTrendChart data={sorted.map((r) => ({ date: r.Date ?? '', value: r['Closing Balance'] ?? 0 }))} />
      </Card>

      <DataTable
        columns={COLUMNS}
        rows={sorted}
        getId={(r) => r.id!}
        pageSize={50}
        csvName="cash-flow"
        onUpdate={(id, key, value) => db.cashFlow.update(id, { [key]: value })}
        onDelete={(id) => db.cashFlow.delete(id)}
        onAdd={() =>
          db.cashFlow.add({
            Date: new Date().toISOString().slice(0, 10),
            'Opening Balance': latest?.['Closing Balance'] ?? 0,
            Income: 0,
            Expenses: 0,
            'Net Cash Flow': 0,
            'Closing Balance': latest?.['Closing Balance'] ?? 0,
          })
        }
      />
    </div>
  )
}
