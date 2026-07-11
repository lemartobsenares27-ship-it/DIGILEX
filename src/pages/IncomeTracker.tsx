import { useMemo } from 'react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { IncomeRow } from '../lib/types'
import { formatCurrency } from '../lib/format'

const COLUMNS: ColumnDef<IncomeRow>[] = [
  { key: 'Date', label: 'Date', type: 'date', editable: true, width: '100px' },
  { key: 'Source', label: 'Source', editable: true },
  { key: 'Order ID', label: 'Order ID', editable: true },
  { key: 'Product', label: 'Product', editable: true, width: '220px' },
  { key: 'Customer', label: 'Customer', editable: true },
  { key: 'Selling Price', label: 'Selling Price', type: 'currency', editable: true, align: 'right' },
  { key: 'Courier', label: 'Courier', editable: true },
  { key: 'Tracking Number', label: 'Tracking #', editable: true },
  { key: 'Status', label: 'Status', type: 'badge', editable: true, options: ['Delivered', 'Pending / Unmatched', 'Confirmed RTS', 'Cancelled'] },
  { key: 'Amount Received', label: 'Amount Received', type: 'currency', editable: true, align: 'right' },
  { key: 'Payout Date', label: 'Payout Date', type: 'date', editable: true },
  { key: 'Notes', label: 'Notes', editable: true },
]

export default function IncomeTracker() {
  const rows = useLiveTable(db.income)

  const totals = useMemo(() => {
    const now = new Date()
    const sum = (pred: (d: Date) => boolean) =>
      rows.reduce((s, r) => {
        if (!r.Date) return s
        const d = new Date(r.Date)
        if (Number.isNaN(d.getTime()) || !pred(d)) return s
        return s + (r['Selling Price'] ?? 0)
      }, 0)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    return {
      today: sum((d) => d.toDateString() === now.toDateString()),
      week: sum((d) => d >= startOfWeek),
      month: sum((d) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()),
      year: sum((d) => d.getFullYear() === now.getFullYear()),
      allTime: rows.reduce((s, r) => s + (r['Selling Price'] ?? 0), 0),
    }
  }, [rows])

  return (
    <div>
      <PageHeader
        title="Income Tracker"
        description="Every delivered order, sourced from your NPMCM fulfillment SOAs. Double-click any cell to edit; totals recalculate automatically."
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Today" value={formatCurrency(totals.today)} />
        <StatTile label="This Week" value={formatCurrency(totals.week)} />
        <StatTile label="This Month" value={formatCurrency(totals.month)} />
        <StatTile label="This Year" value={formatCurrency(totals.year)} />
        <StatTile label="All Time" value={formatCurrency(totals.allTime)} accent="var(--series-blue)" />
      </div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        getId={(r) => r.id!}
        searchKeys={['Customer', 'Product', 'Tracking Number', 'Order ID']}
        pageSize={50}
        csvName="income-tracker"
        onUpdate={(id, key, value) => db.income.update(id, { [key]: value })}
        onDelete={(id) => db.income.delete(id)}
        onAdd={() =>
          db.income.add({
            Date: new Date().toISOString().slice(0, 10),
            Source: 'NPMCM COD Sale',
            'Order ID': '',
            Product: '',
            Customer: '',
            'Selling Price': 0,
            Courier: 'J&T Express',
            'Tracking Number': '',
            'Fulfillment Company': 'NPMCM',
            Status: 'Pending / Unmatched',
            'Amount Received': null,
            'Payout Date': null,
            Notes: null,
          })
        }
      />
    </div>
  )
}
