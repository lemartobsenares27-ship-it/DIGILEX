import { Download } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatDateTime } from '../../lib/format'
import { exportAuditLog } from '../../lib/jntvip/exportCsv'
import { useJntVipTables } from './hooks'

export default function JntVipAuditLog() {
  const { auditLog } = useJntVipTables()
  const sorted = [...auditLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every manual review action — confirm, reject, duplicate, link, note — with a before/after snapshot."
        actions={
          <button
            onClick={() => exportAuditLog(sorted)}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            <Download size={12} /> Export
          </button>
        }
      />

      <Card>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No manual review actions yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['Timestamp', 'Match', 'Action', 'Reviewed By', 'Note', 'Before → After'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr key={e.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)' }}>{formatDateTime(e.timestamp)}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{e.matchId ?? '—'}</td>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{e.action}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{e.reviewedBy ?? '—'}</td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }} title={e.note ?? ''}>
                      {e.note ?? '—'}
                    </td>
                    <td className="max-w-[280px] truncate px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }} title={`${JSON.stringify(e.previousValue)} → ${JSON.stringify(e.newValue)}`}>
                      {JSON.stringify(e.previousValue)} → {JSON.stringify(e.newValue)}
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
