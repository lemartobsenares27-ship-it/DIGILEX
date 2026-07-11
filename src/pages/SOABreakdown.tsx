import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import NoteBanner from '../components/NoteBanner'
import DataTable, { type ColumnDef } from '../components/DataTable'
import { formatCurrency, formatNumber } from '../lib/format'
import type { SoaBatchRow } from '../lib/db'
import seed from '../data/soaBreakdown.json'

const BATCH_COLUMNS: ColumnDef<SoaBatchRow>[] = [
  { key: 'SOA Batch', label: 'SOA Batch', editable: true, width: '220px' },
  { key: 'Period', label: 'Period', editable: true },
  { key: 'Parcels Delivered (this window)', label: 'Delivered', type: 'number', editable: true, align: 'right' },
  { key: 'Parcels Fulfilled/Dispatched (this window)', label: 'Fulfilled', type: 'number', editable: true, align: 'right' },
  { key: 'Gap (Fulfilled - Delivered)', label: 'Gap', type: 'number', editable: true, align: 'right' },
  { key: 'What the Gap Means', label: 'What the Gap Means', editable: true, width: '320px' },
]

export default function SOABreakdown() {
  const batches = useLiveTable(db.soaBatches)

  return (
    <div>
      <PageHeader
        title="SOA Breakdown & Verification"
        description="Proving Digilex remitted you the correct amount — independent recalculation of every SOA batch."
      />

      <Card
        title="Duplicate Tracking Number Check"
        description={`Duplicates found: ${formatNumber(seed.duplicateCheck.count)}`}
        className="mb-4"
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {seed.duplicateCheck.message}
        </p>
      </Card>

      <Card title={seed.explanationTitle ?? undefined} className="mb-4">
        <p className="whitespace-pre-line text-sm" style={{ color: 'var(--text-secondary)' }}>
          {seed.explanationText}
        </p>
      </Card>

      <Card title="Delivered vs Fulfilled by Batch" className="mb-4">
        <DataTable
          columns={BATCH_COLUMNS}
          rows={batches}
          getId={(r) => r.id!}
          csvName="soa-delivered-vs-fulfilled"
          onUpdate={(id, key, value) => db.soaBatches.update(id, { [key]: value })}
          onDelete={(id) => db.soaBatches.delete(id)}
          onAdd={() =>
            db.soaBatches.add({
              'SOA Batch': '',
              Period: '',
              'Parcels Delivered (this window)': 0,
              'Parcels Fulfilled/Dispatched (this window)': 0,
              'Gap (Fulfilled - Delivered)': 0,
              'What the Gap Means': '',
            })
          }
        />
      </Card>

      <Card
        title="Per-Batch SOA Arithmetic Verification"
        description="Recalculating Digilex's own math from raw figures, independent of their summary line"
        className="mb-4"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                {['SOA Batch', 'Total COD', 'Recalc COGS', 'Recalc Net COD', 'Recalc Logistics', 'Recalc Payout', 'Digilex Payout', 'Verified?'].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {seed.verificationTable.map((r, i) => (
                <tr key={i} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                    {r['SOA Batch']}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(r['Total COD Collected'])}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(r['Cost of Goods (recalc)'])}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(r['Net COD Amount (recalc)'])}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(r['Total Logistics Fee (recalc)'])}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(r['Expected Payout (recalc)'])}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(r['Expected Payout per Digilex SOA'])}
                  </td>
                  <td className="px-2 py-1.5" style={{ color: 'var(--status-good)' }}>
                    {r['Verified?']}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {seed.shortfallTable.length > 0 && (
        <Card title="Confirmed Remittance Shortfalls" description={seed.shortfallNotes.filter(Boolean).join(' ')}>
          {seed.shortfallNotes[0] && <NoteBanner>{seed.shortfallNotes[0]}</NoteBanner>}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['SOA Batch', 'Period', 'Correct Remittance', 'Remitted So Far', 'Still Outstanding'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seed.shortfallTable.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                      {r['SOA Batch']}
                    </td>
                    <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                      {r['Period']}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(r['Correct Remittance (confirmed both sides)'])}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(r['Remitted So Far (per Digilex)'])}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular font-semibold" style={{ color: 'var(--status-critical)' }}>
                      {formatCurrency(r['Still Outstanding'])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
