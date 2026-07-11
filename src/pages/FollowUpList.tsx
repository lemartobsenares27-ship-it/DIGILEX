import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { FollowUpRow } from '../lib/types'
import { formatCurrency, formatNumber } from '../lib/format'
import seed from '../data/followUpList.json'

const COLUMNS: ColumnDef<FollowUpRow>[] = [
  { key: 'Tracking Number', label: 'Tracking #', editable: true, width: '160px' },
  { key: 'Customer Name', label: 'Customer', editable: true },
  { key: 'Product', label: 'Product', editable: true },
  { key: 'Amount (PHP)', label: 'Amount', type: 'currency', editable: true, align: 'right' },
  { key: 'Date Created', label: 'Date Created', type: 'date', editable: true },
  { key: 'Reason', label: 'Reason', editable: true, width: '300px' },
  { key: 'Digilex Response / Notes', label: 'Digilex Response', editable: true, width: '260px' },
]

export default function FollowUpList() {
  const rows = useLiveTable(db.followUp)
  return (
    <div>
      <PageHeader
        title="For Digilex — Follow-Up List"
        description={seed.meta.purpose}
        actions={
          <button
            onClick={() => window.print()}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            Print / Export for Digilex
          </button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total Orders" value={formatNumber(seed.meta.totalOrders)} />
        <StatTile label="Total Value" value={formatCurrency(seed.meta.totalValue)} accent="var(--status-critical)" />
      </div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        getId={(r) => r.id!}
        searchKeys={['Tracking Number', 'Customer Name', 'Product']}
        pageSize={50}
        csvName="digilex-follow-up-list"
        onUpdate={(id, key, value) => db.followUp.update(id, { [key]: value })}
        onDelete={(id) => db.followUp.delete(id)}
        onAdd={() =>
          db.followUp.add({
            'Tracking Number': '',
            'Customer Name': '',
            Product: '',
            'Amount (PHP)': 0,
            'Date Created': new Date().toISOString().slice(0, 10),
            Reason: '',
            'Internal Note (remove before sending)': null,
            'Digilex Response / Notes': null,
          })
        }
      />
    </div>
  )
}
