import { useEffect, useMemo, useState } from 'react'
import StepHeader from '../../../components/import/StepHeader'
import UploadZone from '../../../components/import/UploadZone'
import Card from '../../../components/Card'
import NoteBanner from '../../../components/NoteBanner'
import Badge from '../../../components/Badge'
import { StatBox, NextButton, BackButton, PostButton } from '../../../components/import/WizardBits'
import { formatCurrency, formatDate } from '../../../lib/format'
import { parseSpreadsheetFile } from '../../../lib/import/parseFile'
import {
  SOA_FIELD_KEYS,
  SOA_FIELD_LABELS,
  buildJntVipSoaDrafts,
  existingJntVipShipmentKeys,
  parseJntVipSoaFile,
  saveSoaMapping,
  type SoaFieldKey,
} from '../../../lib/jntvip/soa'
import { postJntVipSoa } from '../../../lib/jntvip/post'
import type { JntVipSoaDraft } from '../../../lib/jntvip/types'
import { db } from '../../../lib/db'

interface Props {
  onBack: () => void
  onDone: (message: string) => void
}

function defaultSoaLabel(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `SOA-${y}${m}${d}`
}

export default function JntVipSoaWizard({ onBack, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [grid, setGrid] = useState<unknown[][] | null>(null)
  const [headerRowIndex, setHeaderRowIndex] = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Partial<Record<SoaFieldKey, string | null>>>({})
  const [drafts, setDrafts] = useState<JntVipSoaDraft[]>([])
  const [soaLabel, setSoaLabel] = useState(defaultSoaLabel())
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [existingBatchCount, setExistingBatchCount] = useState(0)

  useEffect(() => {
    db.jntVipImportBatches.where('kind').equals('soa').count().then(setExistingBatchCount)
  }, [])

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const sheet = await parseSpreadsheetFile(file)
      const { headerRowIndex: hr, headers: hd, columnMap: guessed } = await parseJntVipSoaFile(sheet)
      setGrid(sheet.grid)
      setFileName(file.name)
      setHeaderRowIndex(hr)
      setHeaders(hd)
      setColumnMap(guessed)
      setStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function confirmMapping() {
    if (!grid) return
    setBusy(true)
    try {
      await saveSoaMapping(columnMap as Record<SoaFieldKey, string | null>)
      const existing = await existingJntVipShipmentKeys()
      const built = buildJntVipSoaDrafts(grid, headerRowIndex, headers, columnMap, existing)
      setDrafts(built)
      const shipDates = built.map((d) => d.shipDate).filter((d): d is string => !!d).sort()
      if (shipDates.length > 0) {
        setPeriodStart(shipDates[0])
        setPeriodEnd(shipDates[shipDates.length - 1])
      }
      setStep(2)
    } finally {
      setBusy(false)
    }
  }

  const validation = useMemo(() => {
    const missing = drafts.filter((d) => d.missingRequiredFields)
    const dupes = drafts.filter((d) => d.isDuplicateInFile && !d.missingRequiredFields)
    const valid = drafts.filter((d) => !d.missingRequiredFields && !d.isDuplicateInFile)
    return { total: drafts.length, valid: valid.length, missing: missing.length, dupes: dupes.length }
  }, [drafts])

  const totals = useMemo(() => {
    const included = drafts.filter((d) => d.include && !d.missingRequiredFields)
    return {
      count: included.length,
      totalNet: included.reduce((s, d) => s + (d.netSettlement ?? d.codCollected ?? 0), 0),
    }
  }, [drafts])

  async function handlePost() {
    setBusy(true)
    try {
      const { summary } = await postJntVipSoa(drafts, fileName, soaLabel.trim() || defaultSoaLabel(), periodStart || null, periodEnd || null)
      onDone(`J&T VIP SOA import complete — ${summary.messages[0]}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <StepHeader current={step} onBack={onBack} />
      {error && <NoteBanner>{error}</NoteBanner>}

      {step === 0 && (
        <Card
          title="Import J&T VIP Statement of Account"
          description={`CSV or Excel export from J&T VIP. PDF isn't parsed automatically — export/print the SOA as CSV or Excel first, or transcribe it manually into a spreadsheet, rather than risk misreading a PDF.${existingBatchCount > 0 ? '' : ' This is your first SOA — the column mapping you confirm next is remembered for future SOAs.'}`}
        >
          <UploadZone hint="CSV or Excel — every column is mapped explicitly on the next step, nothing is assumed." onFile={handleFile} busy={busy} />
        </Card>
      )}

      {step === 1 && (
        <>
          <Card
            title="Map columns"
            description="J&T VIP's SOA layout isn't assumed — confirm what each column means. At least one of Waybill/Tracking Number or Order Reference is required. This mapping is saved and reused next time."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOA_FIELD_KEYS.map((key) => (
                <label key={key} className="flex flex-col gap-1 text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>{SOA_FIELD_LABELS[key]}</span>
                  <select
                    value={columnMap[key] ?? ''}
                    onChange={(e) => setColumnMap((prev) => ({ ...prev, [key]: e.target.value || null }))}
                    className="rounded-lg border px-2.5 py-1.5"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                  >
                    <option value="">— none —</option>
                    {headers.filter(Boolean).map((h, i) => (
                      <option key={`${h}-${i}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </Card>
          <div className="mt-4 flex justify-between">
            <BackButton onClick={() => setStep(0)} />
            <NextButton onClick={confirmMapping} disabled={busy || (!columnMap.trackingNumber && !columnMap.orderReference)} />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Total rows" value={String(validation.total)} />
            <StatBox label="Valid" value={String(validation.valid)} accent="var(--status-good)" />
            <StatBox label="Duplicates" value={String(validation.dupes)} accent="var(--status-warning)" />
            <StatBox label="Missing Waybill & Reference" value={String(validation.missing)} accent="var(--status-critical)" />
          </div>
          {validation.missing > 0 && (
            <NoteBanner>
              {`${validation.missing} row(s) have neither a Waybill/Tracking Number nor an Order Reference and cannot be matched — they'll be skipped, not silently altered.`}
            </NoteBanner>
          )}
          <Card title="Preview">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                    {['Include', 'Waybill #', 'Consignee', 'Status', 'Ship Date', 'COD Collected', 'Net Settlement', 'Flag'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drafts.slice(0, 500).map((d) => (
                    <tr key={d.key} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={d.include}
                          disabled={d.missingRequiredFields}
                          onChange={(e) => setDrafts((prev) => prev.map((p) => (p.key === d.key ? { ...p, include: e.target.checked } : p)))}
                        />
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>{d.trackingNumber ?? d.orderReference ?? '—'}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>{d.consignee ?? '—'}</td>
                      <td className="px-2 py-1.5">
                        <Badge label={d.status ?? 'Pending'} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular" style={{ color: 'var(--text-primary)' }}>{formatDate(d.shipDate)}</td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>{formatCurrency(d.codCollected)}</td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>{formatCurrency(d.netSettlement)}</td>
                      <td className="px-2 py-1.5">
                        {d.missingRequiredFields ? <Badge label="Missing IDs" /> : d.isDuplicateInFile ? <Badge label="Duplicate" /> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="mt-4 flex justify-between">
            <BackButton onClick={() => setStep(1)} />
            <NextButton onClick={() => setStep(3)} />
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card title="Batch details" className="mb-4" description="Every SOA import becomes its own reconciliation batch, shown on the Batches page.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs">
                <span style={{ color: 'var(--text-muted)' }}>SOA label</span>
                <input
                  value={soaLabel}
                  onChange={(e) => setSoaLabel(e.target.value)}
                  className="rounded-lg border px-2.5 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Period start</span>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="rounded-lg border px-2.5 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Period end</span>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="rounded-lg border px-2.5 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                />
              </label>
            </div>
          </Card>
          <Card title="Confirm & Post" className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatBox label="Shipments to import" value={String(totals.count)} accent="var(--series-blue)" />
              <StatBox label="Total net settlement" value={formatCurrency(totals.totalNet)} />
            </div>
          </Card>
          <Card title="What happens next">
            <ul className="mb-4 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>These shipments are saved as reconciliation batch "{soaLabel || defaultSoaLabel()}" (undoable from the batch history below).</li>
              <li>Reconciliation against every currently-imported J&T VIP POS order runs automatically.</li>
              <li>Your existing NPMCM SOA Reconciliation is not touched.</li>
            </ul>
            <PostButton onClick={handlePost} busy={busy} disabled={totals.count === 0} />
          </Card>
          <div className="mt-4">
            <BackButton onClick={() => setStep(2)} />
          </div>
        </>
      )}
    </div>
  )
}
