import { useMemo } from 'react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatCurrency, formatDate, formatNumber } from '../../lib/format'
import { buildReconciliationRows, computeBatchSummaries } from '../../lib/jntvip/selectors'
import { useJntVipTables } from './hooks'

export default function JntVipBatches() {
  const { posOrders, shipments, matches, batches } = useJntVipTables()
  const rows = useMemo(() => buildReconciliationRows(matches, posOrders, shipments, batches), [matches, posOrders, shipments, batches])
  const summaries = useMemo(() => computeBatchSummaries(batches, rows), [batches, rows])

  return (
    <div>
      <PageHeader
        title="SOA Batch History"
        description="Every J&T VIP SOA you've imported becomes its own reconciliation batch. Undo an import from the Import page."
      />

      <Card>
        {summaries.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No SOA batches imported yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['SOA', 'Period', 'Imported', 'Transactions', 'Matched', 'Issues', 'Difference', 'Status'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaries.map((b) => (
                  <tr key={b.batch.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{b.batch.soaLabel ?? b.batch.fileName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(b.batch.periodStart)} – {formatDate(b.batch.periodEnd)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(b.batch.importedAt)}</td>
                    <td className="px-3 py-2 tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(b.transactions)}</td>
                    <td className="px-3 py-2 tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(b.matched)}</td>
                    <td className="px-3 py-2 tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(b.issues)}</td>
                    <td className="px-3 py-2 tabular font-medium" style={{ color: Math.abs(b.difference) < 1 ? 'var(--status-good)' : 'var(--status-critical)' }}>
                      {formatCurrency(b.difference)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          color: b.status === 'Reconciled' ? 'var(--status-good)' : b.status === 'Reversed' ? 'var(--text-muted)' : 'var(--status-warning)',
                          background:
                            b.status === 'Reconciled'
                              ? 'color-mix(in srgb, var(--status-good) 14%, transparent)'
                              : b.status === 'Reversed'
                                ? 'color-mix(in srgb, var(--text-muted) 14%, transparent)'
                                : 'color-mix(in srgb, var(--status-warning) 14%, transparent)',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
