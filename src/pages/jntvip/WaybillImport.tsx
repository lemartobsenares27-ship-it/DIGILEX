// The My Waybill importer.
//
// This lived only inside SOA Check, as step one of a three-step verification
// flow, while Products, Issues and the return-rate card all told the reader to
// "import a My Waybill export on Import" — a page that imports POS orders and
// nothing else. So the instruction was impossible to follow, and every
// parcel-derived figure in the app stayed empty: return rate, per-product
// numbers, cost per delivered parcel.
//
// It is a component now so the same importer appears wherever it is needed,
// rather than being described in one place and implemented in another.

import { useRef, useState } from 'react'
import { UploadCloud, Trash2, CheckCircle2 } from 'lucide-react'
import Card from '../../components/Card'
import { formatNumber } from '../../lib/format'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { parseWaybillFile, importParcels, type WaybillImportResult } from '../../lib/jntvip/waybill'
import type { JntVipParcelRow } from '../../lib/jntvip/types'

export default function WaybillImport({
  className,
  title = 'Import the J&T parcel export',
}: {
  className?: string
  title?: string
}) {
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<WaybillImportResult | null>(null)

  async function onFile(file: File) {
    setImporting(true)
    setError(null)
    setResult(null)
    try {
      setResult(await importParcels(await parseWaybillFile(file)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function clearParcels() {
    await jntVipDb.parcels.clear()
    setResult(null)
  }

  return (
    <Card
      title={title}
      description="vip.jtexpress.ph → Management → My Waybill → set the date range → Export. Re-importing updates statuses instead of duplicating parcels."
      className={className}
      actions={
        parcels.length > 0 && (
          <button onClick={clearParcels} className="flex items-center gap-1 text-xs" style={{ color: 'var(--status-critical)' }}>
            <Trash2 size={12} /> Clear
          </button>
        )
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--series-aqua)' }}
        >
          <UploadCloud size={14} /> {importing ? 'Reading…' : parcels.length ? 'Import a newer export' : 'Choose My Waybill file'}
        </button>
        <span className="text-sm" style={{ color: parcels.length ? 'var(--text-secondary)' : 'var(--status-warning-ink)' }}>
          {parcels.length === 0
            ? 'No parcels yet — return rate and per-product figures need this file.'
            : `${formatNumber(parcels.length)} parcels held.`}
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--status-critical)' }}>
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-lg p-3 text-xs" style={{ background: 'color-mix(in srgb, var(--status-good-ink) 10%, transparent)' }}>
          <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
            <CheckCircle2 size={13} style={{ color: 'var(--status-good-ink)' }} />
            {formatNumber(result.added)} added · {formatNumber(result.updated)} updated ·{' '}
            {formatNumber(result.unchanged)} unchanged
          </div>
          {result.statusChanges.length > 0 && (
            <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>
              {formatNumber(result.statusChanges.length)} parcel(s) moved on since the last import —{' '}
              {result.statusChanges.slice(0, 4).map((c) => `${c.awb} ${c.from}→${c.to}`).join(', ')}
              {result.statusChanges.length > 4 ? '…' : ''}
            </div>
          )}
          {result.skipped.length > 0 && (
            <div className="mt-1" style={{ color: 'var(--status-warning-ink)' }}>
              {formatNumber(result.skipped.length)} row(s) skipped: {result.skipped[0].reason}
              {result.skipped.length > 1 ? ` (+${result.skipped.length - 1} more)` : ''}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
