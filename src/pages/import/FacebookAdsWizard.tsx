import { useMemo, useState } from 'react'
import StepHeader from '../../components/import/StepHeader'
import UploadZone from '../../components/import/UploadZone'
import Card from '../../components/Card'
import NoteBanner from '../../components/NoteBanner'
import { StatBox, NextButton, BackButton, PostButton } from '../../components/import/WizardBits'
import { formatCurrency, formatDate, formatNumber } from '../../lib/format'
import { parseSpreadsheetFile } from '../../lib/import/parseFile'
import { parseFacebookAdsExport } from '../../lib/import/facebookAds'
import { postFacebookAds } from '../../lib/import/post'
import type { FBAdsRowDraft } from '../../lib/import/types'

interface Props {
  onBack: () => void
  onDone: (message: string) => void
}

function roasColor(roas: number | null): string {
  if (roas === null) return 'var(--text-muted)'
  if (roas >= 3) return 'var(--status-good)'
  if (roas >= 1.5) return 'var(--series-yellow)'
  if (roas >= 1) return 'var(--status-warning)'
  return 'var(--status-critical)'
}

export default function FacebookAdsWizard({ onBack, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [drafts, setDrafts] = useState<FBAdsRowDraft[]>([])
  const [granularity, setGranularity] = useState<'daily' | 'per-campaign'>('daily')

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const sheet = await parseSpreadsheetFile(file)
      const parsed = await parseFacebookAdsExport(sheet)
      if (parsed.length === 0) throw new Error('No ad rows were found in this file.')
      setDrafts(parsed)
      setFileName(file.name)
      setStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const totals = useMemo(() => {
    const included = drafts.filter((d) => d.include)
    const spend = included.reduce((s, d) => s + d.amountSpent, 0)
    const roasVals = included.map((d) => d.roas).filter((v): v is number => v !== null)
    const ctrVals = included.map((d) => d.ctr).filter((v): v is number => v !== null)
    return {
      count: included.length,
      duplicates: drafts.filter((d) => d.isDuplicate).length,
      spend,
      avgRoas: roasVals.length ? roasVals.reduce((a, b) => a + b, 0) / roasVals.length : null,
      avgCtr: ctrVals.length ? ctrVals.reduce((a, b) => a + b, 0) / ctrVals.length : null,
    }
  }, [drafts])

  function toggle(key: string, include: boolean) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, include } : d)))
  }

  async function handlePost() {
    setBusy(true)
    try {
      const { summary } = await postFacebookAds(drafts, fileName, granularity)
      onDone(`Import complete — ${summary.messages[0] ?? `${summary.recordsPosted} records posted`}`)
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
        <Card title="Upload Facebook Ads Manager Export">
          <UploadZone hint="Standard Ads Manager CSV export (breakdown by day/campaign)" onFile={handleFile} busy={busy} />
        </Card>
      )}

      {step === 1 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Rows found" value={formatNumber(drafts.length)} />
            <StatBox label="Total spend" value={formatCurrency(totals.spend)} accent="var(--series-violet)" />
            <StatBox label="Avg CTR" value={totals.avgCtr !== null ? `${totals.avgCtr.toFixed(2)}%` : '—'} />
            <StatBox label="Avg ROAS" value={totals.avgRoas !== null ? `${totals.avgRoas.toFixed(2)}x` : '—'} accent={roasColor(totals.avgRoas)} />
          </div>
          <Card title="Preview" description="Uncheck rows to exclude them.">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                    {['', 'Date', 'Campaign', 'Spend', 'Impressions', 'Clicks', 'CTR', 'ROAS'].map((h, i) => (
                      <th key={i} className="whitespace-nowrap px-2 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drafts.slice(0, 300).map((d) => (
                    <tr key={d.key} className="border-t" style={{ borderColor: 'var(--border-hairline)', opacity: d.include ? 1 : 0.45 }}>
                      <td className="px-2 py-1.5">
                        <input type="checkbox" checked={d.include} onChange={(e) => toggle(d.key, e.target.checked)} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(d.date)}
                      </td>
                      <td className="max-w-[220px] truncate px-2 py-1.5" style={{ color: 'var(--text-primary)' }} title={d.campaign ?? ''}>
                        {d.campaign ?? '—'}
                        {d.isDuplicate && (
                          <span className="ml-1.5 text-[11px]" style={{ color: 'var(--status-warning)' }}>
                            (already posted)
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(d.amountSpent)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {d.impressions !== null ? formatNumber(d.impressions) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {d.linkClicks !== null ? formatNumber(d.linkClicks) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {d.ctr !== null ? `${d.ctr.toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular font-medium" style={{ color: roasColor(d.roas) }}>
                        {d.roas !== null ? `${d.roas.toFixed(2)}x` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: 'var(--border-strong)' }}>
                    <td colSpan={3} className="px-2 py-2 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Totals
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(totals.spend)}
                    </td>
                    <td colSpan={2} />
                    <td className="px-2 py-2 text-right font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                      {totals.avgCtr !== null ? `${totals.avgCtr.toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular" style={{ color: roasColor(totals.avgRoas) }}>
                      {totals.avgRoas !== null ? `${totals.avgRoas.toFixed(2)}x` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
          <div className="mt-4 flex justify-end">
            <NextButton onClick={() => setStep(2)} />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Card title="How should this post to your Expense Tracker?">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <input type="radio" checked={granularity === 'daily'} onChange={() => setGranularity('daily')} />
                One consolidated entry per day (recommended)
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <input type="radio" checked={granularity === 'per-campaign'} onChange={() => setGranularity('per-campaign')} />
                One entry per campaign per day
              </label>
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
          <Card title="Confirm & Post">
            <ul className="mb-4 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <strong>{totals.count}</strong> ad rows will post to the Facebook Ads Tracker (ROAS dashboard updates immediately)
              </li>
              <li>Expense Tracker entries will be grouped {granularity === 'daily' ? 'by day' : 'by day + campaign'}</li>
              <li>
                <strong>{totals.duplicates}</strong> rows already posted for that date/campaign will be skipped
              </li>
              <li>Total spend: {formatCurrency(totals.spend)}</li>
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
