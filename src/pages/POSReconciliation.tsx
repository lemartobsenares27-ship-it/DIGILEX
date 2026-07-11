import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import Card from '../components/Card'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { POSReconciliationRow } from '../lib/types'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import seed from '../data/posOrderReconciliation.json'

const COLUMNS: ColumnDef<POSReconciliationRow>[] = [
  { key: 'J&T Tracking Number', label: 'Tracking #', editable: true, width: '160px' },
  { key: 'Receiver (POS)', label: 'Receiver', editable: true },
  { key: 'POS Status', label: 'POS Status', type: 'badge', editable: true },
  { key: 'POS Order Price', label: 'Order Price', type: 'currency', editable: true, align: 'right' },
  { key: 'Digilex Status', label: 'Digilex Status', type: 'badge', editable: true },
  { key: 'Digilex COD Amount Paid', label: 'COD Paid', type: 'currency', editable: true, align: 'right' },
  { key: 'Action Needed', label: 'Action Needed', editable: true, width: '260px' },
  { key: 'Date Created (POS)', label: 'Date Created', type: 'date', editable: true },
]

export default function POSReconciliation() {
  const rows = useLiveTable(db.posReconciliation)
  return (
    <div>
      <PageHeader title="POS Order Reconciliation" description={seed.note} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {seed.summary.slice(0, 4).map((s) => (
          <StatTile key={s.label} label={s.label} value={formatNumber(s.count)} sub={s.value ? formatCurrency(s.value) : undefined} />
        ))}
      </div>

      <Card title="Exact RTS Rate" description="Based on your POS's own status field, not Digilex's data" className="mb-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Delivered
            </div>
            <div className="text-lg font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {formatNumber(seed.rts.delivered)}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Returned / RTS
            </div>
            <div className="text-lg font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {formatNumber(seed.rts.rts)}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              RTS Rate
            </div>
            <div className="text-lg font-semibold tabular" style={{ color: 'var(--status-critical)' }}>
              {formatPercent(seed.rts.rate)}
            </div>
          </div>
        </div>
      </Card>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        getId={(r) => r.id!}
        searchKeys={['J&T Tracking Number', 'Receiver (POS)']}
        pageSize={50}
        csvName="pos-order-reconciliation"
        onUpdate={(id, key, value) => db.posReconciliation.update(id, { [key]: value })}
        onDelete={(id) => db.posReconciliation.delete(id)}
        onAdd={() =>
          db.posReconciliation.add({
            'J&T Tracking Number': '',
            'Receiver (POS)': '',
            'POS Status': 'Delivered',
            'POS Order Price': 0,
            'Digilex Status': 'Not yet in Digilex',
            'Digilex COD Amount Paid': 0,
            'Action Needed': '',
            'RTS-Eligible Source (Y=full-status export)': 'Y',
            'Pre-Apr-10 Order? (status may be unreliable)': null,
            'Date Created (POS)': new Date().toISOString().slice(0, 10),
          })
        }
      />
    </div>
  )
}
