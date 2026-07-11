import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { CreditCardRow } from '../lib/types'
import creditCardSeed from '../data/creditCardReconciliation.json'

const COLUMNS: ColumnDef<CreditCardRow>[] = [
  { key: 'Card', label: 'Card', editable: true, width: '220px' },
  { key: 'Sale Date', label: 'Sale Date', type: 'date', editable: true },
  { key: 'Post Date', label: 'Post Date', type: 'date', editable: true },
  { key: 'Description', label: 'Description', editable: true, width: '260px' },
  { key: 'Amount', label: 'Amount', type: 'currency', editable: true, align: 'right' },
  { key: 'Matched Ad Account', label: 'Matched Ad Account', editable: true },
  {
    key: 'Review Status',
    label: 'Review Status',
    type: 'badge',
    editable: true,
    options: ['Matched (confirmed ad spend)', 'Unverifiable (outside data window)', 'Personal / non-business'],
  },
  { key: 'Notes', label: 'Notes', editable: true },
]

export default function CreditCardReconciliation() {
  const rows = useLiveTable(db.creditCard)

  return (
    <div>
      <PageHeader title="Credit Card Reconciliation" description={creditCardSeed.note} />
      <DataTable
        columns={COLUMNS}
        rows={rows}
        getId={(r) => r.id!}
        searchKeys={['Card', 'Description', 'Matched Ad Account']}
        pageSize={50}
        csvName="credit-card-reconciliation"
        onUpdate={(id, key, value) => db.creditCard.update(id, { [key]: value })}
        onDelete={(id) => db.creditCard.delete(id)}
        onAdd={() =>
          db.creditCard.add({
            Card: '',
            'Sale Date': new Date().toISOString().slice(0, 10),
            'Post Date': null,
            Description: '',
            Amount: 0,
            'Matched Ad Account': null,
            'Review Status': 'Unverifiable (outside data window)',
            Notes: null,
          })
        }
      />
    </div>
  )
}
