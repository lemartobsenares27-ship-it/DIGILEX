import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import NoteBanner from '../components/NoteBanner'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { FulfillmentVerificationRow } from '../lib/types'
import { formatCurrency, formatNumber } from '../lib/format'
import seed from '../data/fulfillmentVerification.json'

const COLUMNS: ColumnDef<FulfillmentVerificationRow>[] = [
  { key: 'Batch Period', label: 'Batch Period', editable: true, width: '180px' },
  { key: 'Parcels Fulfilled (Digilex)', label: 'Fulfilled', type: 'number', editable: true, align: 'right' },
  { key: 'Matched to POS', label: 'Matched', type: 'number', editable: true, align: 'right' },
  { key: 'Unmatched', label: 'Unmatched', type: 'number', editable: true, align: 'right' },
  { key: 'Fee at Risk', label: 'Fee at Risk', type: 'currency', editable: true, align: 'right' },
  { key: 'Match Rate', label: 'Match Rate', type: 'percent', editable: true, align: 'right' },
  { key: 'Status', label: 'Status', type: 'badge', editable: true },
]

export default function FulfillmentVerification() {
  const rows = useLiveTable(db.fulfillmentVerification)
  return (
    <div>
      <PageHeader title="Fulfillment Verification" description={seed.note} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Total Parcels Billed a Fee" value={formatNumber(seed.summary.totalFeeParcels)} />
        <StatTile label="Matched to POS" value={formatNumber(seed.summary.matched)} accent="var(--status-good)" />
        <StatTile
          label="Unmatched Fee at Risk"
          value={formatCurrency(seed.summary.unmatchedFee)}
          sub={`${formatNumber(seed.summary.unmatchedCount)} parcels`}
          accent="var(--status-critical)"
        />
      </div>
      {seed.caveat && <NoteBanner>{seed.caveat}</NoteBanner>}
      <DataTable
        columns={COLUMNS}
        rows={rows}
        getId={(r) => r.id!}
        searchKeys={['Batch Period', 'Status']}
        csvName="fulfillment-verification"
        onUpdate={(id, key, value) => db.fulfillmentVerification.update(id, { [key]: value })}
        onDelete={(id) => db.fulfillmentVerification.delete(id)}
        onAdd={() =>
          db.fulfillmentVerification.add({
            'Batch Period': '',
            'Parcels Fulfilled (Digilex)': 0,
            'Matched to POS': 0,
            Unmatched: 0,
            'Fee at Risk': 0,
            'Match Rate': 0,
            Status: 'REVIEW',
          })
        }
      />
    </div>
  )
}
