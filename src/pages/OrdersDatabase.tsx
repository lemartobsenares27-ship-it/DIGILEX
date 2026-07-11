import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { OrderRow } from '../lib/types'
import { formatCurrency, formatNumber } from '../lib/format'

const COLUMNS: ColumnDef<OrderRow>[] = [
  { key: 'Order / Tracking #', label: 'Tracking #', editable: true, width: '160px' },
  { key: 'Date Ordered (Shipped)', label: 'Shipped', type: 'date', editable: true },
  { key: 'Product', label: 'Product', editable: true, width: '220px' },
  { key: 'Selling Price (COD)', label: 'Selling Price', type: 'currency', editable: true, align: 'right' },
  { key: 'Customer', label: 'Customer', editable: true },
  { key: 'City', label: 'City', editable: true },
  { key: 'Courier', label: 'Courier', editable: true },
  {
    key: 'Status',
    label: 'Status',
    type: 'badge',
    editable: true,
    options: ['Delivered', 'Pending / Unmatched', 'Confirmed RTS', 'Cancelled'],
  },
  { key: 'Delivered Date', label: 'Delivered', type: 'date', editable: true },
  { key: 'Cost of Goods', label: 'COGS', type: 'currency', editable: true, align: 'right' },
  { key: 'Logistics Fee', label: 'Logistics Fee', type: 'currency', editable: true, align: 'right' },
  { key: 'Net Order Profit', label: 'Net Profit', type: 'currency', editable: true, align: 'right' },
  { key: 'Payout Batch', label: 'Payout Batch', editable: true },
]

export default function OrdersDatabase() {
  const rows = useLiveTable(db.orders)
  const delivered = rows.filter((r) => (r.Status ?? '').toLowerCase() === 'delivered').length
  const pending = rows.filter((r) => (r.Status ?? '').toLowerCase().includes('pending')).length
  const totalRevenue = rows.reduce((s, r) => s + (r['Selling Price (COD)'] ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Orders Database"
        description="Source: Digilex fulfillment SOAs. Status 'Delivered' means a matching COD collection record was found anywhere across all uploaded SOAs, by tracking number."
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total Orders" value={formatNumber(rows.length)} />
        <StatTile label="Delivered" value={formatNumber(delivered)} accent="var(--status-good)" />
        <StatTile label="Pending / Unmatched" value={formatNumber(pending)} accent="var(--status-warning)" />
        <StatTile label="Total Order Value" value={formatCurrency(totalRevenue)} accent="var(--series-blue)" />
      </div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        getId={(r) => r.id!}
        searchKeys={['Order / Tracking #', 'Customer', 'Product', 'City']}
        pageSize={50}
        csvName="orders-database"
        onUpdate={(id, key, value) => db.orders.update(id, { [key]: value })}
        onDelete={(id) => db.orders.delete(id)}
        onAdd={() =>
          db.orders.add({
            'Order / Tracking #': '',
            'Date Ordered (Shipped)': new Date().toISOString().slice(0, 10),
            Product: '',
            'Selling Price (COD)': 0,
            Customer: '',
            Phone: null,
            City: null,
            Province: null,
            Courier: 'J&T Express',
            Status: 'Pending / Unmatched',
            'Delivered Date': null,
            'RTS Date': null,
            'Cost of Goods': 0,
            'Logistics Fee': 0,
            'Net Order Profit': 0,
            'Payout Batch': null,
            'Courier Fee (SF+Insurance)': 0,
            'Fulfillment Fee': 0,
            'Duplicate Check': null,
          })
        }
      />
    </div>
  )
}
