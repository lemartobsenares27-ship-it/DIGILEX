import { useMemo, useState } from 'react'
import StepHeader from '../../../components/import/StepHeader'
import UploadZone from '../../../components/import/UploadZone'
import Card from '../../../components/Card'
import NoteBanner from '../../../components/NoteBanner'
import Badge from '../../../components/Badge'
import { StatBox, NextButton, BackButton, PostButton } from '../../../components/import/WizardBits'
import { formatCurrency, formatDate } from '../../../lib/format'
import { parseSpreadsheetFile } from '../../../lib/import/parseFile'
import {
  POS_FIELD_KEYS,
  POS_FIELD_LABELS,
  buildJntVipPosDrafts,
  existingJntVipPosKeys,
  findPosHeaderRow,
  presetPosColumnMap,
  type PosFieldKey,
} from '../../../lib/jntvip/pos'
import { postJntVipPos } from '../../../lib/jntvip/post'
import type { JntVipPosDraft } from '../../../lib/jntvip/types'

interface Props {
  onBack: () => void
  onDone: (message: string) => void
}

export default function JntVipPosWizard({ onBack, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [grid, setGrid] = useState<unknown[][] | null>(null)
  const [headerRowIndex, setHeaderRowIndex] = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Partial<Record<PosFieldKey, string | null>>>({})
  const [drafts, setDrafts] = useState<JntVipPosDraft[]>([])

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const sheet = await parseSpreadsheetFile(file)
      const found = findPosHeaderRow(sheet.grid)
      setGrid(sheet.grid)
      setFileName(file.name)
      setHeaderRowIndex(found.headerRowIndex)
      setHeaders(found.headers)
      setColumnMap(presetPosColumnMap(found.headers))
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
      const existing = await existingJntVipPosKeys()
      setDrafts(buildJntVipPosDrafts(grid, headerRowIndex, headers, columnMap, existing))
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
      totalExpected: included.reduce((s, d) => s + (d.codAmountExpected ?? 0), 0),
    }
  }, [drafts])

  async function handlePost() {
    setBusy(true)
    try {
      const { summary } = await postJntVipPos(drafts, fileName)
      onDone(`J&T VIP POS import complete — ${summary.messages[0]}`)
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
        <Card title="Import J&T VIP POS Orders" description="Your Pancake POS export, or any export with Order ID / Tracking Number, customer, and COD/shipping columns.">
          <UploadZone hint="CSV or Excel — column mapping is confirmed on the next step, nothing is guessed silently." onFile={handleFile} busy={busy} />
        </Card>
      )}

      {step === 1 && (
        <>
          <Card title="Confirm column mapping" description="We guessed these from your file's headers — check them before continuing. At least one of Order ID or Tracking Number is required.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {POS_FIELD_KEYS.map((key) => (
                <label key={key} className="flex flex-col gap-1 text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>{POS_FIELD_LABELS[key]}</span>
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
            <NextButton onClick={confirmMapping} disabled={busy || (!columnMap.orderId && !columnMap.trackingNumber)} />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Total rows" value={String(validation.total)} />
            <StatBox label="Valid" value={String(validation.valid)} accent="var(--status-good)" />
            <StatBox label="Duplicates" value={String(validation.dupes)} accent="var(--status-warning)" />
            <StatBox label="Missing Order ID & Tracking #" value={String(validation.missing)} accent="var(--status-critical)" />
          </div>
          {validation.missing > 0 && (
            <NoteBanner>
              {`${validation.missing} row(s) have neither an Order ID nor a Tracking Number and cannot be matched — they'll be skipped, not silently altered. Fix the source file and re-import if that's unexpected.`}
            </NoteBanner>
          )}
          <Card title="Preview">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                    {['Include', 'Order ID', 'Tracking #', 'Customer', 'Order Date', 'COD Expected', 'Flag'].map((h) => (
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
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>{d.orderId ?? '—'}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>{d.trackingNumber ?? '—'}</td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>{d.customerName ?? '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular" style={{ color: 'var(--text-primary)' }}>{formatDate(d.orderDate)}</td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>{formatCurrency(d.codAmountExpected)}</td>
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
          <Card title="Confirm & Post" className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatBox label="Orders to import" value={String(totals.count)} accent="var(--series-blue)" />
              <StatBox label="Total COD expected" value={formatCurrency(totals.totalExpected)} />
            </div>
          </Card>
          <Card title="What happens next">
            <ul className="mb-4 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>These orders are saved as a new J&T VIP POS import batch (undoable from the batch history below).</li>
              <li>Reconciliation against every currently-imported J&T VIP SOA shipment runs automatically.</li>
              <li>Your existing NPMCM Orders Database is not touched.</li>
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
