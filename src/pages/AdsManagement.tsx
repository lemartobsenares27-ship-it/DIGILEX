import { useMemo, useRef, useState } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import { useMeta } from '../hooks/useMeta'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import Card from '../components/Card'
import LiveBadge from '../components/LiveBadge'
import { parseSpreadsheetFile } from '../lib/import/parseFile'
import { parseMetaAdsPerformance } from '../lib/import/metaAdsPerformance'
import { classifyAd, DEFAULT_AD_BENCHMARKS, LIFECYCLE_COLOR, type AdScoringBenchmarks } from '../lib/adScoring'
import type { AdLifecycle, AdPerformanceRow } from '../lib/types'
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../lib/format'

const LIFECYCLES: AdLifecycle[] = ['Winner', 'Potential', 'Fatigue', 'Loser', 'Unproven', 'New']

function LifecyclePill({ lifecycle }: { lifecycle: AdLifecycle }) {
  const color = LIFECYCLE_COLOR[lifecycle]
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      {lifecycle}
    </span>
  )
}

export default function AdsManagement() {
  const allRows = useLiveTable(db.adPerformance)
  const [benchmarks] = useMeta<AdScoringBenchmarks>('adScoringBenchmarks', DEFAULT_AD_BENCHMARKS)
  const [filter, setFilter] = useState<AdLifecycle | 'All'>('All')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Latest snapshot per ad (by Ad Name), sorted newest upload first per group
  const latest = useMemo(() => {
    const byAd = new Map<string, AdPerformanceRow>()
    for (const r of allRows) {
      const name = r['Ad Name'] ?? ''
      const existing = byAd.get(name)
      if (!existing || (r['Upload Date'] ?? '') > (existing['Upload Date'] ?? '')) {
        byAd.set(name, r)
      }
    }
    return [...byAd.values()].sort((a, b) => (b.Score ?? -1) - (a.Score ?? -1))
  }, [allRows])

  const counts = useMemo(() => {
    const c: Record<AdLifecycle, number> = { Winner: 0, Potential: 0, Fatigue: 0, Loser: 0, Unproven: 0, New: 0 }
    for (const r of latest) if (r.Lifecycle) c[r.Lifecycle]++
    return c
  }, [latest])

  const filtered = filter === 'All' ? latest : latest.filter((r) => r.Lifecycle === filter)
  const totalSpend = latest.reduce((s, r) => s + (r['Amount Spent'] ?? 0), 0)
  const lastUpload = allRows.reduce((max, r) => ((r['Upload Date'] ?? '') > max ? r['Upload Date'] ?? max : max), '')

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const sheet = await parseSpreadsheetFile(file)
      const uploadDate = new Date().toISOString().slice(0, 10)
      const parsed = parseMetaAdsPerformance(sheet, uploadDate)
      if (parsed.length === 0) {
        throw new Error('No ad rows found in this file — check it\'s a per-ad export, not an account/campaign summary.')
      }

      for (const row of parsed) {
        const previous = [...allRows]
          .filter((r) => r['Ad Name'] === row['Ad Name'])
          .sort((a, b) => (b['Upload Date'] ?? '').localeCompare(a['Upload Date'] ?? ''))[0]
        const { lifecycle, score } = classifyAd(row, previous ?? null, benchmarks)
        await db.adPerformance.add({ ...row, Lifecycle: lifecycle, Score: score })
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader
        title="Ads Management"
        description="Upload your per-ad export from Facebook Ads Manager and every ad gets scored against your own real cost-per-result benchmark (₱185/order) — not a guess, not someone else's formula."
        actions={
          <div className="flex items-center gap-3">
            <LiveBadge />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--series-blue)' }}
            >
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Upload Ads Export'}
            </button>
          </div>
        }
      />

      {uploadError && (
        <div
          className="mb-4 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--status-critical)', color: 'var(--status-critical)', background: 'color-mix(in srgb, var(--status-critical) 8%, transparent)' }}
        >
          {uploadError}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total Ads Tracked" value={formatNumber(latest.length)} accent="var(--series-blue)" />
        <StatTile label="Total Spend (latest)" value={formatCurrency(totalSpend)} accent="var(--series-orange)" />
        <StatTile label="Winners" value={formatNumber(counts.Winner)} accent="var(--status-good)" />
        <StatTile label="Losers" value={formatNumber(counts.Loser)} accent="var(--status-critical)" />
      </div>

      <Card
        title="Ads"
        description={lastUpload ? `Last upload: ${formatDate(lastUpload)} — scored against your real ₱${benchmarks.targetCostPerResult}/order benchmark` : 'No ads uploaded yet'}
        className="mb-4"
        actions={
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter('All')}
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                color: filter === 'All' ? '#fff' : 'var(--text-secondary)',
                background: filter === 'All' ? 'var(--series-blue)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              }}
            >
              All ({latest.length})
            </button>
            {LIFECYCLES.map((l) => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  color: filter === l ? '#fff' : LIFECYCLE_COLOR[l],
                  background: filter === l ? LIFECYCLE_COLOR[l] : `color-mix(in srgb, ${LIFECYCLE_COLOR[l]} 16%, transparent)`,
                }}
              >
                {l} ({counts[l]})
              </button>
            ))}
          </div>
        }
      >
        {latest.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No ads uploaded yet — click "Upload Ads Export" and pick a per-ad CSV/Excel export from Facebook Ads Manager.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                  {['Ad', 'Status', 'Lifecycle', 'Score', 'Spend', 'Results', 'Cost/Result', 'CTR', 'Hook', 'Hold', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2.5 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="px-2.5 py-2">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {r['Ad Name']}
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>{r['Campaign Name']}</div>
                    </td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {r['Delivery Status'] ?? '—'}
                    </td>
                    <td className="px-2.5 py-2">{r.Lifecycle && <LifecyclePill lifecycle={r.Lifecycle} />}</td>
                    <td className="px-2.5 py-2 tabular" style={{ color: 'var(--text-primary)' }}>
                      {r.Score ?? '—'}
                    </td>
                    <td className="px-2.5 py-2 tabular" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(r['Amount Spent'])}
                    </td>
                    <td className="px-2.5 py-2 tabular" style={{ color: 'var(--text-primary)' }}>
                      {formatNumber(r.Results)}
                    </td>
                    <td className="px-2.5 py-2 tabular" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(r['Cost Per Result'])}
                    </td>
                    <td className="px-2.5 py-2 tabular" style={{ color: 'var(--text-primary)' }}>
                      {r.CTR != null ? formatPercent(r.CTR / 100) : '—'}
                    </td>
                    <td className="px-2.5 py-2 tabular" style={{ color: 'var(--text-primary)' }}>
                      {r['Hook Rate'] != null ? formatPercent(r['Hook Rate'] / 100) : '—'}
                    </td>
                    <td className="px-2.5 py-2 tabular" style={{ color: 'var(--text-primary)' }}>
                      {r['Hold Rate'] != null ? formatPercent(r['Hold Rate'] / 100) : '—'}
                    </td>
                    <td className="px-2.5 py-2 text-right">
                      <button onClick={() => db.adPerformance.delete(r.id!)} style={{ color: 'var(--text-muted)' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="How Lifecycle Is Decided" description="Editable in Settings → Ad Scoring Benchmarks">
        <ul className="flex flex-col gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <li><b style={{ color: LIFECYCLE_COLOR.New }}>New</b> — first time this ad has been uploaded, not enough results yet to judge</li>
          <li><b style={{ color: LIFECYCLE_COLOR.Unproven }}>Unproven</b> — seen before, still below the minimum results needed for a verdict</li>
          <li><b style={{ color: LIFECYCLE_COLOR.Winner }}>Winner</b> — cost per result at or below 80% of your real benchmark</li>
          <li><b style={{ color: LIFECYCLE_COLOR.Potential }}>Potential</b> — cost per result within 20% of benchmark, promising but not proven</li>
          <li><b style={{ color: LIFECYCLE_COLOR.Fatigue }}>Fatigue</b> — cost creeping up, frequency too high, or CTR dropped since its last upload — an early warning</li>
          <li><b style={{ color: LIFECYCLE_COLOR.Loser }}>Loser</b> — cost per result well above benchmark with enough spend to be sure it's not just noise</li>
        </ul>
      </Card>
    </div>
  )
}
