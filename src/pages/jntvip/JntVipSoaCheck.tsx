// J&T VIP — "Is this SOA correct?"
//
// Import the My Waybill parcel export once, type in what the SOA claims, and
// every line is rebuilt from the parcels and compared. This covers all
// products and both brands: J&T bills the account, not the brand.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  UploadCloud,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import { formatNumber } from '../../lib/format'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { parseWaybillFile, importParcels, PARCEL_STATUS_LABEL, type WaybillImportResult } from '../../lib/jntvip/waybill'
import { checkSoa, rtsByWeek, rtsSummary, DEFAULT_TERMS, type SoaStated, type CheckedLine } from '../../lib/jntvip/soaCheck'
import type { JntVipParcelRow } from '../../lib/jntvip/types'

/** Centavos in, pesos out — the engine works in integers throughout. */
const peso = (centavos: number) =>
  '₱' + (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const VERDICT_STYLE = {
  MATCH: { label: 'Match', color: 'var(--status-good-ink)', Icon: CheckCircle2 },
  DIFF: { label: 'Differs', color: 'var(--status-critical)', Icon: XCircle },
  NOT_STATED: { label: 'Not entered', color: 'var(--text-muted)', Icon: MinusCircle },
} as const

const EMPTY_SOA: SoaStated = {
  soaNumber: '',
  periodFrom: '',
  periodTo: '',
  codCollected: null,
  commission: null,
  vat: null,
  codPayable: null,
  shippingFee: null,
  rtsFee: null,
  totalDeduction: null,
  adjustments: null,
  netRemittance: null,
}

function NumField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <input
        type="number"
        step="0.01"
        value={value ?? ''}
        placeholder="—"
        onChange={(e) => onChange(e.target.value.trim() === '' ? null : Number(e.target.value))}
        className="rounded-lg border px-2.5 py-1.5 text-sm tabular"
        style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
      />
      {hint && (
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </span>
      )}
    </label>
  )
}

export default function JntVipSoaCheck() {
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<WaybillImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [soa, setSoa] = useState<SoaStated>({ ...EMPTY_SOA })
  const [rtsFeeRate, setRtsFeeRate] = useState(String(DEFAULT_TERMS.rtsFeePerParcel))
  const [saved, setSaved] = useState<string | null>(null)

  const terms = useMemo(
    () => ({ ...DEFAULT_TERMS, rtsFeePerParcel: Number(rtsFeeRate) || DEFAULT_TERMS.rtsFeePerParcel }),
    [rtsFeeRate],
  )

  // Default the period to the span the imported parcels actually cover, so the
  // first check is one click rather than two date lookups.
  useEffect(() => {
    if (parcels.length === 0 || soa.periodFrom || soa.periodTo) return
    const days = parcels.map((p) => p.shipDate ?? p.podDate).filter((d): d is string => !!d).sort()
    if (days.length > 0) setSoa((s) => ({ ...s, periodFrom: days[0], periodTo: days[days.length - 1] }))
  }, [parcels, soa.periodFrom, soa.periodTo])

  const result = useMemo(
    () => (soa.periodFrom && soa.periodTo ? checkSoa(parcels, soa, terms) : null),
    [parcels, soa, terms],
  )
  const summary = useMemo(() => rtsSummary(parcels, terms), [parcels, terms])
  const weeks = useMemo(() => rtsByWeek(parcels), [parcels])

  async function onFile(file: File) {
    setImportError(null)
    setImportResult(null)
    setImporting(true)
    try {
      const parsed = await parseWaybillFile(file)
      setImportResult(await importParcels(parsed))
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function saveCheck() {
    if (!result) return
    await jntVipDb.soaChecks.add({
      soaNumber: soa.soaNumber.trim() || `${soa.periodFrom}..${soa.periodTo}`,
      periodFrom: soa.periodFrom,
      periodTo: soa.periodTo,
      checkedAt: new Date().toISOString(),
      verdict: result.verdict,
      differenceTotal: result.differenceTotal,
      stated: soa,
      computed: result.lines.map((l) => ({ key: l.key, computed: l.computed, stated: l.stated })),
      notes: null,
    })
    setSaved(`Saved. ${result.verdict === 'CLEAN' ? 'Verified clean.' : 'Recorded with its differences.'}`)
    setTimeout(() => setSaved(null), 6000)
  }

  function exportCheck() {
    if (!result) return
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        result.lines.map((l) => ({
          Line: l.label,
          'Computed from parcels': l.computed / 100,
          'SOA states': l.stated == null ? '' : l.stated / 100,
          Difference: l.stated == null ? '' : l.difference / 100,
          Verdict: VERDICT_STYLE[l.verdict].label,
          Parcels: l.parcelCount,
          Basis: l.basis,
        })),
      ),
      'SOA check',
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        result.delivered.map((p) => ({ AWB: p.awb, 'POD time': p.podAt, COD: p.cod, Province: p.province })),
      ),
      'Delivered in period',
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        result.dispatched.map((p) => ({ AWB: p.awb, Dispatched: p.shipAt, Shipping: p.shippingCost, Status: PARCEL_STATUS_LABEL[p.status] })),
      ),
      'Dispatched in period',
    )
    XLSX.writeFile(wb, `JNT_SOA_Check_${soa.soaNumber.trim() || soa.periodFrom}.xlsx`)
  }

  async function clearParcels() {
    if (!window.confirm('Remove every imported parcel? Saved SOA checks are kept. You can re-import the export at any time.')) return
    await jntVipDb.parcels.clear()
    setImportResult(null)
  }

  const set = <K extends keyof SoaStated>(k: K) => (v: SoaStated[K]) => setSoa((s) => ({ ...s, [k]: v }))

  return (
    <div>
      <PageHeader
        title="SOA Check"
        description="Rebuilds every line of a J&T statement from the parcel export and compares it to what the SOA claims. Covers all products on the account — J&T bills the account, not the brand."
        actions={
          result && (
            <button
              onClick={exportCheck}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
            >
              <Download size={12} /> Export
            </button>
          )
        }
      />

      {/* 1 — parcels */}
      <Card
        title="1. Import the parcel export"
        description="vip.jtexpress.ph → Management → My Waybill → set the date range → Export. Re-importing updates statuses instead of duplicating parcels."
        className="mb-4"
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
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--series-aqua)' }}
          >
            <UploadCloud size={13} /> {importing ? 'Reading…' : parcels.length ? 'Import a newer export' : 'Choose export file'}
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {parcels.length === 0 ? 'No parcels imported yet.' : `${formatNumber(parcels.length)} parcel(s) held.`}
          </span>
        </div>

        {importError && (
          <p className="mt-3 rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--status-critical)' }}>
            {importError}
          </p>
        )}

        {importResult && (
          <div className="mt-3 rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}>
            <div style={{ color: 'var(--text-primary)' }}>
              {formatNumber(importResult.added)} added · {formatNumber(importResult.updated)} updated ·{' '}
              {formatNumber(importResult.unchanged)} unchanged
            </div>
            {importResult.statusChanges.length > 0 && (
              <div className="mt-1">
                {formatNumber(importResult.statusChanges.length)} parcel(s) moved on since the last import —{' '}
                {importResult.statusChanges
                  .slice(0, 4)
                  .map((c) => `${c.awb} ${c.from}→${c.to}`)
                  .join(', ')}
                {importResult.statusChanges.length > 4 ? '…' : ''}
              </div>
            )}
            {importResult.skipped.length > 0 && (
              <div className="mt-1" style={{ color: 'var(--status-warning-ink)' }}>
                {formatNumber(importResult.skipped.length)} row(s) skipped: {importResult.skipped[0].reason}
                {importResult.skipped.length > 1 ? ` (+${importResult.skipped.length - 1} more)` : ''}
              </div>
            )}
          </div>
        )}
      </Card>

      {parcels.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <FileSpreadsheet size={22} style={{ color: 'var(--text-muted)' }} />
            <p className="max-w-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
              A J&T SOA is a one-page summary with no parcel list, so it cannot be verified on its own. Import the My Waybill export
              and every line becomes checkable.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* 2 — what the SOA claims */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="2. What the SOA says" description="Leave a field blank to skip checking it." className="lg:col-span-1">
              <div className="grid grid-cols-1 gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>SOA number</span>
                  <input
                    value={soa.soaNumber}
                    onChange={(e) => set('soaNumber')(e.target.value)}
                    placeholder="SOA202608280830MNL-V11913"
                    className="rounded-lg border px-2.5 py-1.5 text-sm"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['periodFrom', 'periodTo'] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-1 text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>{k === 'periodFrom' ? 'Period from' : 'Period to'}</span>
                      <input
                        type="date"
                        value={soa[k]}
                        onChange={(e) => set(k)(e.target.value)}
                        className="rounded-lg border px-2.5 py-1.5 text-sm"
                        style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                      />
                    </label>
                  ))}
                </div>
                <NumField label="COD transaction total" value={soa.codCollected} onChange={set('codCollected')} />
                <NumField label="COD commission" value={soa.commission} onChange={set('commission')} />
                <NumField label="COD commission VAT" value={soa.vat} onChange={set('vat')} />
                <NumField label="Total COD payable" value={soa.codPayable} onChange={set('codPayable')} />
                <NumField label="Shipping fee receivable" value={soa.shippingFee} onChange={set('shippingFee')} />
                <NumField label="RTS fee" value={soa.rtsFee} onChange={set('rtsFee')} />
                <NumField label="Total deduction" value={soa.totalDeduction} onChange={set('totalDeduction')} />
                <NumField label="Total adjustment" value={soa.adjustments} onChange={set('adjustments')} hint="Signed: negative reduces the remittance." />
                <NumField label="Net remittance" value={soa.netRemittance} onChange={set('netRemittance')} />
                <label className="flex flex-col gap-1 text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>RTS fee per parcel (₱)</span>
                  <input
                    type="number"
                    value={rtsFeeRate}
                    onChange={(e) => setRtsFeeRate(e.target.value)}
                    className="rounded-lg border px-2.5 py-1.5 text-sm tabular"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                  />
                </label>
              </div>
            </Card>

            {/* 3 — the verdict */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              {result && (
                <Card
                  title="3. Line-by-line check"
                  description={`Every figure rebuilt from ${formatNumber(parcels.length)} imported parcel(s), in whole centavos.`}
                  actions={
                    <button
                      onClick={saveCheck}
                      className="rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                      style={{ borderColor: 'var(--border-hairline)', color: 'var(--series-aqua)' }}
                    >
                      Save this check
                    </button>
                  }
                >
                  <div
                    className="mb-3 flex items-center gap-2 rounded-lg border p-3 text-sm font-medium"
                    style={{
                      borderColor:
                        result.verdict === 'CLEAN'
                          ? 'color-mix(in srgb, var(--status-good-ink) 35%, var(--border-hairline))'
                          : result.verdict === 'DISCREPANCY'
                            ? 'color-mix(in srgb, var(--status-critical) 35%, var(--border-hairline))'
                            : 'var(--border-hairline)',
                      background:
                        result.verdict === 'CLEAN'
                          ? 'color-mix(in srgb, var(--status-good-ink) 8%, transparent)'
                          : result.verdict === 'DISCREPANCY'
                            ? 'color-mix(in srgb, var(--status-critical) 8%, transparent)'
                            : 'transparent',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {result.verdict === 'CLEAN' ? (
                      <>
                        <CheckCircle2 size={16} style={{ color: 'var(--status-good-ink)' }} />
                        Every line you entered reconciles exactly.
                      </>
                    ) : result.verdict === 'DISCREPANCY' ? (
                      <>
                        <XCircle size={16} style={{ color: 'var(--status-critical)' }} />
                        {formatNumber(result.lines.filter((l) => l.verdict === 'DIFF').length)} line(s) differ —{' '}
                        {peso(result.differenceTotal)} in total.
                      </>
                    ) : (
                      <>
                        <MinusCircle size={16} style={{ color: 'var(--text-muted)' }} />
                        Enter at least one figure from the SOA to check it.
                      </>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
                          {['Line', 'Computed', 'SOA says', 'Difference', '', 'Parcels'].map((h) => (
                            <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.lines.map((l) => (
                          <LineRow key={l.key} line={l} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {result.warnings.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1">
                      {result.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--status-warning-ink)' }}>
                          <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  )}
                  {saved && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--status-good-ink)' }}>
                      {saved}
                    </p>
                  )}
                </Card>
              )}
            </div>
          </div>

          {/* RTS */}
          <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            RTS across everything imported
          </h2>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="RTS on settled"
              value={`${(summary.rateOnSettled * 100).toFixed(1)}%`}
              accent="var(--status-critical)"
              sub={`${formatNumber(summary.returned)} of ${formatNumber(summary.settled)} finished parcels — the honest rate`}
            />
            <StatTile
              label="Projected final"
              value={`${(summary.projectedFinalRate * 100).toFixed(1)}%`}
              accent="var(--status-warning-ink)"
              sub={`${formatNumber(summary.inFlight)} still moving, settling at today's rate`}
            />
            <StatTile
              label="COD never collected"
              value={peso(summary.codLost)}
              accent="var(--series-violet)"
              sub={`${formatNumber(summary.returned + summary.forReturn)} rejected or heading back`}
            />
            <StatTile
              label="Cash burned"
              value={peso(summary.cashBurned)}
              accent="var(--status-critical)"
              sub={`${peso(summary.shippingSunk)} shipping + ${peso(summary.rtsFees)} RTS fees`}
            />
          </div>

          <Card
            title="RTS by dispatch week"
            description="Cohorted on the week a parcel shipped, because a parcel shipped this week and rejected next week belongs to this week's batch."
          >
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}>
                    {['Week shipped', 'Delivered', 'Returned', 'Settled', 'RTS rate', 'Still moving', ''].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w) => (
                    <tr key={w.weekStart} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{w.weekLabel}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>{formatNumber(w.delivered)}</td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: w.returned > 0 ? 'var(--status-critical)' : 'var(--text-muted)' }}>
                        {formatNumber(w.returned)}
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>{formatNumber(w.settled)}</td>
                      <td className="px-3 py-2 text-xs font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                        {w.settled > 0 ? `${(w.rate * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                        {w.inFlight > 0 ? formatNumber(w.inFlight) : '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px]" style={{ color: w.mature ? 'var(--text-muted)' : 'var(--status-warning-ink)' }}>
                        {w.mature ? 'settled' : 'too fresh to trust'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              A week is only trustworthy once its parcels have finished. Rejections surface late, so the most recent week always looks
              best and is not a real improvement.
            </p>
          </Card>
        </>
      )}
    </div>
  )
}

function LineRow({ line }: { line: CheckedLine }) {
  const [open, setOpen] = useState(false)
  const v = VERDICT_STYLE[line.verdict]
  const emphasis = line.key === 'net' || line.key === 'cod'
  return (
    <>
      <tr
        className="cursor-pointer border-t"
        style={{ borderColor: 'var(--border-hairline)' }}
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)', fontWeight: emphasis ? 600 : 400 }}>
          {line.label}
        </td>
        <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-primary)', fontWeight: emphasis ? 600 : 400 }}>
          {peso(line.computed)}
        </td>
        <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-secondary)' }}>
          {line.stated == null ? <span style={{ color: 'var(--text-muted)' }}>—</span> : peso(line.stated)}
        </td>
        <td className="px-3 py-2 text-xs tabular" style={{ color: line.verdict === 'DIFF' ? 'var(--status-critical)' : 'var(--text-muted)' }}>
          {line.verdict === 'DIFF' ? (line.difference > 0 ? '+' : '') + peso(line.difference) : '—'}
        </td>
        <td className="px-3 py-2">
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ color: v.color, background: `color-mix(in srgb, ${v.color} 14%, transparent)` }}
          >
            <v.Icon size={11} /> {v.label}
          </span>
        </td>
        <td className="px-3 py-2 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
          {formatNumber(line.parcelCount)}
        </td>
      </tr>
      {open && (
        <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)' }}>
          <td colSpan={6} className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {line.basis}
          </td>
        </tr>
      )}
    </>
  )
}
