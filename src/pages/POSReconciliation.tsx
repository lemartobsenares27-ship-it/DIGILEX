import { useMemo } from 'react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import Card from '../components/Card'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { POSReconciliationRow } from '../lib/types'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import { allTimeDeliveryStats, monthlyRtsBreakdown } from '../lib/analytics'
import seed from '../data/posOrderReconciliation.json'

const COLUMNS: ColumnDef<POSReconciliationRow>[] = [
  { key: 'J&T Tracking Number', label: 'Tracking #', editable: true, width: '160px' },
  { key: 'Receiver (POS)', label: 'Receiver', editable: true },
  { key: 'POS Status', label: 'POS Status', type: 'badge', editable: true },
  { key: 'POS Order Price', label: 'Order Price', type: 'currency', editable: true, align: 'right' },
  { key: 'NPMCM Status', label: 'NPMCM Status', type: 'badge', editable: true },
  { key: 'NPMCM COD Amount Paid', label: 'COD Paid', type: 'currency', editable: true, align: 'right' },
  { key: 'Action Needed', label: 'Action Needed', editable: true, width: '260px' },
  { key: 'Date Created (POS)', label: 'Date Created', type: 'date', editable: true },
]

export default function POSReconciliation() {
  const rows = useLiveTable(db.posReconciliation)
  const orders = useLiveTable(db.orders)
  const allTime = useMemo(() => allTimeDeliveryStats(rows), [rows])
  const monthly = useMemo(() => monthlyRtsBreakdown(rows, orders), [rows, orders])
  const latestMonth = monthly[monthly.length - 1]?.month

  return (
    <div>
      <PageHeader title="POS Order Reconciliation" description={seed.note} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {seed.summary.slice(0, 4).map((s) => (
          <StatTile key={s.label} label={s.label} value={formatNumber(s.count)} sub={s.value ? formatCurrency(s.value) : undefined} />
        ))}
      </div>

      <Card title="Exact RTS Rate — All Time" description="Based on your POS's own status field, not NPMCM's data" className="mb-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Delivered
            </div>
            <div className="text-lg font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {formatNumber(allTime.delivered)}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Returned / RTS
            </div>
            <div className="text-lg font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {formatNumber(allTime.rts)}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              RTS Rate
            </div>
            <div className="text-lg font-semibold tabular" style={{ color: 'var(--status-critical)' }}>
              {formatPercent(allTime.rate)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="RTS Rate by Month"
        description="Grouped by the month each order SHIPPED — this is how you check any single month, like this one, instead of only the all-time number above"
        className="mb-4"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                {['Month', 'Delivered', 'RTS', 'Still in Transit', 'RTS Rate'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr
                  key={m.month}
                  className="border-t"
                  style={{
                    borderColor: 'var(--border-hairline)',
                    background: m.month === latestMonth ? 'color-mix(in srgb, var(--series-blue) 6%, transparent)' : undefined,
                  }}
                >
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {m.month}
                    {m.month === latestMonth && (
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                        (still resolving)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(m.delivered)}
                  </td>
                  <td className="px-3 py-2 tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(m.rts)}
                  </td>
                  <td className="px-3 py-2 tabular" style={{ color: 'var(--text-muted)' }}>
                    {formatNumber(m.transit)}
                  </td>
                  <td className="px-3 py-2 tabular font-semibold" style={{ color: 'var(--status-critical)' }}>
                    {formatPercent(m.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            'NPMCM Status': 'Not yet in NPMCM',
            'NPMCM COD Amount Paid': 0,
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
