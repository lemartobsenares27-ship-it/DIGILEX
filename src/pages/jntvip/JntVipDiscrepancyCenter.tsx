import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatCurrency, formatNumber } from '../../lib/format'
import { buildReconciliationRows, computeDiscrepancyGroups } from '../../lib/jntvip/selectors'
import type { JntVipDiscrepancyType, JntVipReconStatus } from '../../lib/jntvip/types'
import { useJntVipTables } from './hooks'

// Each discrepancy group's "View" link opens the Reconciliation Table
// pre-filtered to the status that carries that discrepancy type.
const GROUP_STATUS: Record<JntVipDiscrepancyType, JntVipReconStatus> = {
  COD_MISMATCH: 'MISMATCH',
  SHIPPING_MISMATCH: 'MISMATCH',
  STATUS_MISMATCH: 'MISMATCH',
  MISSING_FROM_JNT: 'POS_ONLY',
  MISSING_FROM_POS: 'JNT_ONLY',
  DUPLICATE: 'DUPLICATE',
}

export default function JntVipDiscrepancyCenter() {
  const { posOrders, shipments, matches, batches } = useJntVipTables()
  const rows = useMemo(() => buildReconciliationRows(matches, posOrders, shipments, batches), [matches, posOrders, shipments, batches])
  const groups = useMemo(() => computeDiscrepancyGroups(rows), [rows])

  const totalOpenImpact = groups.reduce((s, g) => s + g.impact, 0)

  return (
    <div>
      <PageHeader
        title="Discrepancy Center"
        description="Every open issue, grouped by type and ranked by financial impact. Resolving one (Confirm / Mark as Expected Difference / Ignore) from the Reconciliation Table removes it from the open count here."
      />

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Total discrepancy impact across all open issues
          </span>
          <span className="text-xl font-semibold tabular" style={{ color: 'var(--status-critical)' }}>
            {formatCurrency(totalOpenImpact)}
          </span>
        </div>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No discrepancies found. Import POS orders and a J&T VIP SOA to start reconciling.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.type}>
              <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {g.label}
              </div>
              <div className="mb-1 text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                {formatNumber(g.count)}
              </div>
              <div className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatNumber(g.openCount)} open · {formatCurrency(g.impact)} impact
              </div>
              <Link
                to={`/jnt-vip/reconciliation?status=${GROUP_STATUS[g.type]}`}
                className="text-xs font-medium"
                style={{ color: 'var(--series-blue)' }}
              >
                View cases →
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
