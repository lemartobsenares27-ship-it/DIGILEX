import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, XCircle, PackageX, ShoppingBag, Copy, Upload } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import StatTile from '../../components/StatTile'
import Card from '../../components/Card'
import { formatCurrency, formatNumber, formatDate } from '../../lib/format'
import { buildReconciliationRows, computeDashboardKpis, computeDiscrepancyGroups, computeBatchSummaries } from '../../lib/jntvip/selectors'
import { useJntVipTables } from './hooks'

export default function JntVipDashboard() {
  const { posOrders, shipments, matches, batches } = useJntVipTables()

  const rows = useMemo(() => buildReconciliationRows(matches, posOrders, shipments, batches), [matches, posOrders, shipments, batches])
  const kpis = useMemo(() => computeDashboardKpis(rows), [rows])
  const discrepancyGroups = useMemo(() => computeDiscrepancyGroups(rows).slice(0, 5), [rows])
  const batchSummaries = useMemo(() => computeBatchSummaries(batches, rows), [batches, rows])
  const latestBatch = batchSummaries.find((b) => b.status !== 'Reversed')

  const noDataYet = posOrders.length === 0 && shipments.length === 0

  if (noDataYet) {
    return (
      <div>
        <PageHeader
          title="J&T VIP Reconciliation"
          description="Compares your POS orders against J&T VIP's Statement of Account (SOA) to catch delivery, COD, and shipping-fee discrepancies. Fully independent from the NPMCM reconciliation system elsewhere in this app."
        />
        <Card title="No data yet" className="text-center">
          <div className="flex flex-col items-center gap-3 py-8">
            <Upload size={28} style={{ color: 'var(--text-muted)' }} />
            <p className="max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>
              Import your POS orders and a J&T VIP SOA export to start reconciling. Nothing here touches your existing
              NPMCM data.
            </p>
            <Link
              to="/import"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--series-blue)' }}
            >
              Go to Import
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="J&T VIP Reconciliation"
        description={
          latestBatch
            ? `Current SOA: ${latestBatch.batch.soaLabel ?? latestBatch.batch.fileName} — ${formatDate(latestBatch.batch.periodStart)} to ${formatDate(latestBatch.batch.periodEnd)}`
            : 'Compares your POS orders against J&T VIP SOA data.'
        }
        actions={
          <Link
            to="/import"
            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            Import more data
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total Transactions" value={formatNumber(kpis.total)} icon={<ShoppingBag size={16} />} />
        <StatTile label="Matched" value={formatNumber(kpis.matched)} icon={<CheckCircle2 size={16} />} accent="var(--status-good)" />
        <StatTile label="Needs Review" value={formatNumber(kpis.needsReview)} icon={<AlertTriangle size={16} />} accent="var(--status-warning)" />
        <StatTile label="Mismatched" value={formatNumber(kpis.mismatched)} icon={<XCircle size={16} />} accent="var(--status-critical)" />
        <StatTile label="J&T Only" value={formatNumber(kpis.jntOnly)} icon={<PackageX size={16} />} accent="var(--series-blue)" />
        <StatTile label="POS Only" value={formatNumber(kpis.posOnly)} icon={<Copy size={16} />} accent="var(--series-violet)" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total POS Value" value={formatCurrency(kpis.totalPosExpected)} />
        <StatTile label="Total J&T Value" value={formatCurrency(kpis.totalJntAmount)} accent="var(--series-blue)" />
        <StatTile
          label="Total Difference"
          value={formatCurrency(kpis.totalDifference)}
          accent={Math.abs(kpis.totalDifference) < 1 ? 'var(--status-good)' : 'var(--status-critical)'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Top Discrepancies"
          description="Grouped by type, ranked by financial impact. Open items only need a fix — a reviewed item stays visible but no longer counts as open."
          actions={
            <Link to="/discrepancy-center" className="text-xs font-medium" style={{ color: 'var(--series-blue)' }}>
              View All Issues →
            </Link>
          }
        >
          {discrepancyGroups.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No discrepancies — everything reconciles cleanly.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {discrepancyGroups.map((g) => (
                <div key={g.type} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {g.label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatNumber(g.count)} case(s) · {formatNumber(g.openCount)} open
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular" style={{ color: 'var(--status-critical)' }}>
                    {formatCurrency(g.impact)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="SOA Batches"
          description="Each imported SOA becomes its own reconciliation batch."
          actions={
            <Link to="/batches" className="text-xs font-medium" style={{ color: 'var(--series-blue)' }}>
              View All Batches →
            </Link>
          }
        >
          {batchSummaries.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No SOA batches imported yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                    {['SOA', 'Period', 'Txns', 'Matched', 'Issues', 'Difference', 'Status'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batchSummaries.slice(0, 6).map((b) => (
                    <tr key={b.batch.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="px-2 py-1.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {b.batch.soaLabel ?? b.batch.fileName}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(b.batch.periodStart)} – {formatDate(b.batch.periodEnd)}
                      </td>
                      <td className="px-2 py-1.5 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(b.transactions)}</td>
                      <td className="px-2 py-1.5 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(b.matched)}</td>
                      <td className="px-2 py-1.5 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatNumber(b.issues)}</td>
                      <td className="px-2 py-1.5 text-xs tabular" style={{ color: Math.abs(b.difference) < 1 ? 'var(--status-good)' : 'var(--status-critical)' }}>
                        {formatCurrency(b.difference)}
                      </td>
                      <td className="px-2 py-1.5 text-xs" style={{ color: b.status === 'Reconciled' ? 'var(--status-good)' : b.status === 'Reversed' ? 'var(--text-muted)' : 'var(--status-warning)' }}>
                        {b.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
