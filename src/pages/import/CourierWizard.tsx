import { useMemo, useState } from 'react'
import StepHeader from '../../components/import/StepHeader'
import UploadZone from '../../components/import/UploadZone'
import Card from '../../components/Card'
import NoteBanner from '../../components/NoteBanner'
import Badge from '../../components/Badge'
import { StatBox, NextButton, BackButton, PostButton } from '../../components/import/WizardBits'
import { formatCurrency, formatDate, formatNumber } from '../../lib/format'
import { parseSpreadsheetFile } from '../../lib/import/parseFile'
import {
  buildCourierDrafts,
  COURIER_FIELD_LABELS,
  COURIER_FIELD_KEYS,
  findAnyHeaderRow,
  findCourierHeaderRow,
  presetColumnMap,
  type CourierFieldKey,
} from '../../lib/import/courier'
import { existingTrackingNumbers } from '../../lib/import/dedupe'
import { postCourierFile } from '../../lib/import/post'
import type { CourierName, CourierTxnDraft } from '../../lib/import/types'
import { db } from '../../lib/db'

const COURIERS: CourierName[] = ['Ninja Van', 'J&T Express', 'Entrego', 'GogoXpress', 'LBC', 'Other']

interface Props {
  onBack: () => void
  onDone: (message: string) => void
}

export default function CourierWizard({ onBack, onDone }: Props) {
  const [courier, setCourier] = useState<CourierName>('Ninja Van')
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [grid, setGrid] = useState<unknown[][] | null>(null)
  const [headerRowIndex, setHeaderRowIndex] = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Partial<Record<CourierFieldKey, string | null>>>({})
  const [drafts, setDrafts] = useState<CourierTxnDraft[]>([])

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const sheet = await parseSpreadsheetFile(file)
      setGrid(sheet.grid)
      setFileName(file.name)

      if (courier === 'Other') {
        const saved = await db.courierColumnMappings.where('courierName').equals('Other').first()
        const guess = findAnyHeaderRow(sheet.grid)
        setHeaderRowIndex(guess.headerRowIndex)
        setHeaders(guess.headers)
        setColumnMap(saved?.mapping ?? {})
        setStep(1) // column mapping step for generic courier
      } else {
        const found = findCourierHeaderRow(sheet.grid, courier)
        const map = presetColumnMap(found.headers, courier)
        setHeaderRowIndex(found.headerRowIndex)
        setHeaders(found.headers)
        setColumnMap(map)
        const existingTracking = await existingTrackingNumbers()
        setDrafts(buildCourierDrafts(sheet.grid, found.headerRowIndex, found.headers, courier, map, existingTracking))
        setStep(2)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function confirmMapping() {
    if (!grid) return
    await db.courierColumnMappings.where('courierName').equals('Other').delete()
    await db.courierColumnMappings.add({ courierName: 'Other', mapping: columnMap as Record<string, string> })
    const existingTracking = await existingTrackingNumbers()
    setDrafts(buildCourierDrafts(grid, headerRowIndex, headers, courier, columnMap, existingTracking))
    setStep(2)
  }

  const totals = useMemo(() => {
    const included = drafts.filter((d) => d.include)
    const delivered = included.filter((d) => d.status === 'Delivered')
    const rts = included.filter((d) => d.status === 'RTS')
    return {
      count: included.length,
      delivered: delivered.length,
      rts: rts.length,
      deliveryRate: included.length ? delivered.length / included.length : 0,
      expectedCOD: delivered.reduce((s, d) => s + d.codAmount, 0),
      remitted: included.reduce((s, d) => s + (d.remittanceAmount ?? 0), 0),
      unmatched: included.filter((d) => !d.matchedOrderId).length,
    }
  }, [drafts])

  async function handlePost() {
    setBusy(true)
    try {
      const { summary } = await postCourierFile(drafts, fileName)
      onDone(`Import complete — ${summary.messages[0] ?? `${summary.recordsPosted} records posted`}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <StepHeader current={step === 1 ? 1 : step} onBack={onBack} />
      {error && <NoteBanner>{error}</NoteBanner>}

      {step === 0 && (
        <Card title="Which courier is this?">
          <div className="mb-4 flex flex-wrap gap-2">
            {COURIERS.map((c) => (
              <button
                key={c}
                onClick={() => setCourier(c)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: courier === c ? 'var(--series-blue)' : 'var(--border-hairline)',
                  background: courier === c ? 'color-mix(in srgb, var(--series-blue) 10%, transparent)' : 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <UploadZone
            hint={
              courier === 'Other'
                ? "Any courier's remittance/reconciliation export — you'll map the columns next."
                : `${courier} remittance / reconciliation report — CSV or Excel`
            }
            onFile={handleFile}
            busy={busy}
          />
        </Card>
      )}

      {step === 1 && (
        <>
          <Card title="Map columns" description="Tell us which column in your file is which. This is saved for next time.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {COURIER_FIELD_KEYS.map((key) => (
                <label key={key} className="flex flex-col gap-1 text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>{COURIER_FIELD_LABELS[key]}</span>
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
            <NextButton onClick={confirmMapping} disabled={!columnMap.trackingNumber} />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Parcels in file" value={formatNumber(drafts.length)} />
            <StatBox label="Delivered" value={formatNumber(totals.delivered)} accent="var(--status-good)" />
            <StatBox label="RTS / Returned" value={formatNumber(totals.rts)} accent="var(--status-critical)" />
            <StatBox label="No match in Orders DB" value={formatNumber(totals.unmatched)} accent="var(--status-warning)" />
          </div>
          <Card title="Preview">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                    {['Tracking #', 'Recipient', 'COD Amount', 'Status', 'Delivery Date', 'Remittance', 'Match'].map((h, i) => (
                      <th key={i} className="whitespace-nowrap px-2 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drafts.slice(0, 300).map((d) => (
                    <tr key={d.key} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.trackingNumber ?? '—'}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.recipient ?? '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(d.codAmount)}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge label={d.status ?? 'Pending'} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(d.deliveryDate)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {d.remittanceAmount !== null ? formatCurrency(d.remittanceAmount) : '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        {d.matchedOrderId ? (
                          <span style={{ color: 'var(--status-good)' }}>Matched</span>
                        ) : (
                          <span style={{ color: 'var(--status-warning)' }}>Not found</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="mt-4 flex justify-end">
            <NextButton onClick={() => setStep(3)} />
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card title="Reconciliation Summary" className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatBox label="Expected COD (delivered)" value={formatCurrency(totals.expectedCOD)} />
              <StatBox label="Actual remitted" value={formatCurrency(totals.remitted)} accent="var(--series-blue)" />
              <StatBox
                label="Difference"
                value={formatCurrency(totals.remitted - totals.expectedCOD)}
                accent={Math.abs(totals.remitted - totals.expectedCOD) < 1 ? 'var(--status-good)' : 'var(--status-critical)'}
              />
            </div>
          </Card>
          <Card title="Confirm & Post">
            <ul className="mb-4 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <strong>{totals.count - totals.unmatched}</strong> order(s) in Orders Database will be updated to Delivered/RTS
              </li>
              <li>
                <strong>{totals.unmatched}</strong> parcel(s) have no matching order and will be skipped (shown for review)
              </li>
              {totals.remitted > 0 && <li>A consolidated remittance of {formatCurrency(totals.remitted)} will be posted to Income</li>}
            </ul>
            <PostButton onClick={handlePost} busy={busy} disabled={drafts.length === 0} />
          </Card>
          <div className="mt-4">
            <BackButton onClick={() => setStep(2)} />
          </div>
        </>
      )}
    </div>
  )
}
