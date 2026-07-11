import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { EvidenceRow } from '../lib/types'
import { formatCurrency, formatNumber } from '../lib/format'
import seed from '../data/evidenceNotInSOA.json'

const COLUMNS: ColumnDef<EvidenceRow>[] = [
  { key: 'Tracking Number', label: 'Tracking #', editable: true, width: '160px' },
  { key: 'Receiver', label: 'Receiver', editable: true },
  { key: 'Product', label: 'Product', editable: true },
  { key: 'POS Price', label: 'POS Price', type: 'currency', editable: true, align: 'right' },
  { key: 'Digilex Status', label: 'Digilex Status', type: 'badge', editable: true },
  { key: 'Digilex Batch (if any)', label: 'Digilex Batch', editable: true },
  { key: 'Likely Reason', label: 'Likely Reason', editable: true, width: '320px' },
  { key: 'Date Created (POS)', label: 'Date Created', type: 'date', editable: true },
]

export default function Evidence() {
  const rows = useLiveTable(db.evidence)
  return (
    <div>
      <PageHeader title="Evidence: Delivered but Not in Any SOA" description={seed.note} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {seed.summary.slice(0, 4).map((s) => (
          <StatTile key={s.label} label={s.label} value={formatNumber(s.count)} sub={s.value ? formatCurrency(s.value) : undefined} />
        ))}
      </div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        getId={(r) => r.id!}
        searchKeys={['Tracking Number', 'Receiver', 'Product']}
        pageSize={50}
        csvName="evidence-not-in-soa"
        onUpdate={(id, key, value) => db.evidence.update(id, { [key]: value })}
        onDelete={(id) => db.evidence.delete(id)}
      />
    </div>
  )
}
