import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import NoteBanner from '../components/NoteBanner'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { SOAReconciliationRow } from '../lib/types'
import seed from '../data/fulfillmentSOAReconciliation.json'

const COLUMNS: ColumnDef<SOAReconciliationRow>[] = [
  { key: 'SOA Batch File', label: 'SOA Batch', editable: true, width: '220px' },
  { key: 'Period Start', label: 'Period Start', type: 'date', editable: true },
  { key: 'Period End', label: 'Period End', type: 'date', editable: true },
  { key: 'Parcels Delivered', label: 'Delivered', type: 'number', editable: true, align: 'right' },
  { key: 'Parcels Fulfilled (dispatched)', label: 'Fulfilled', type: 'number', editable: true, align: 'right' },
  { key: 'Total COD Collected', label: 'Total COD', type: 'currency', editable: true, align: 'right' },
  { key: 'Total Cost of Goods', label: 'COGS', type: 'currency', editable: true, align: 'right' },
  { key: 'Total Logistics Fee', label: 'Logistics Fee', type: 'currency', editable: true, align: 'right' },
  { key: 'Expected Payout (For Remittance)', label: 'Expected Payout', type: 'currency', editable: true, align: 'right' },
  { key: 'Amount Actually Received', label: 'Actually Received', type: 'currency', editable: true, align: 'right' },
  { key: 'Date Received', label: 'Date Received', type: 'date', editable: true },
  { key: 'Difference', label: 'Difference', type: 'currency', editable: true, align: 'right' },
  { key: 'Status', label: 'Status', type: 'badge', editable: true },
]

export default function SOAReconciliation() {
  const rows = useLiveTable(db.soaReconciliation)
  return (
    <div>
      <PageHeader title="Fulfillment SOA Reconciliation" description="Each row = one Statement of Account (SOA) batch Digilex sent you." />
      {seed.warning && <NoteBanner>{seed.warning}</NoteBanner>}
      <DataTable
        columns={COLUMNS}
        rows={rows}
        getId={(r) => r.id!}
        searchKeys={['SOA Batch File', 'Status']}
        csvName="fulfillment-soa-reconciliation"
        onUpdate={(id, key, value) => db.soaReconciliation.update(id, { [key]: value })}
        onDelete={(id) => db.soaReconciliation.delete(id)}
        onAdd={() =>
          db.soaReconciliation.add({
            'SOA Batch File': '',
            'Period Start': null,
            'Period End': null,
            'Parcels Delivered': 0,
            'Parcels Fulfilled (dispatched)': 0,
            'Total COD Collected': 0,
            'COD Fee': 0,
            VAT: 0,
            'Total Cost of Goods': 0,
            'Net COD Amount': 0,
            'Total Logistics Fee': 0,
            'Expected Payout (For Remittance)': 0,
            'Amount Actually Received': 0,
            'Date Received': null,
            Difference: 0,
            Status: 'Awaiting payout',
          })
        }
      />
    </div>
  )
}
