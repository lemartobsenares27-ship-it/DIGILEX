import { useMemo, useState } from 'react'
import StepHeader from '../../components/import/StepHeader'
import UploadZone from '../../components/import/UploadZone'
import Card from '../../components/Card'
import NoteBanner from '../../components/NoteBanner'
import { StatBox, NextButton, BackButton, PostButton } from '../../components/import/WizardBits'
import { formatCurrency, formatDate, formatNumber } from '../../lib/format'
import { parseSpreadsheetFile } from '../../lib/import/parseFile'
import { parsePancakePOS } from '../../lib/import/pancakePOS'
import { postPancakePOS } from '../../lib/import/post'
import type { POSSaleDraft } from '../../lib/import/types'
import { db } from '../../lib/db'

interface Props {
  onBack: () => void
  onDone: (message: string) => void
}

export default function PancakePOSWizard({ onBack, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [drafts, setDrafts] = useState<POSSaleDraft[]>([])
  const [products, setProducts] = useState<string[]>([])

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const sheet = await parseSpreadsheetFile(file)
      const parsed = await parsePancakePOS(sheet)
      if (parsed.length === 0) throw new Error('No orders were found in this file.')
      const allProducts = await db.products.toArray()
      setProducts(allProducts.map((p) => p['Product / SKU']).filter((s): s is string => !!s))
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
    return {
      count: included.length,
      revenue: included.reduce((s, d) => s + (d.netAmount || d.totalAmount), 0),
      cod: included.filter((d) => (d.paymentMethod ?? '').toUpperCase() === 'COD').length,
      cancelled: drafts.filter((d) => (d.status ?? '').toUpperCase().includes('CANCEL')).length,
      unmatchedProducts: included.filter((d) => d.productNameRaw && !d.matchedProductSku).length,
      duplicates: drafts.filter((d) => d.isDuplicate).length,
    }
  }, [drafts])

  function updateDraft(key: string, patch: Partial<POSSaleDraft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  async function assignProduct(key: string, sku: string) {
    updateDraft(key, { matchedProductSku: sku || null })
    const draft = drafts.find((d) => d.key === key)
    if (draft?.productNameRaw && sku) {
      await db.productNameMappings.where('rawName').equals(draft.productNameRaw.toUpperCase()).delete()
      await db.productNameMappings.add({ rawName: draft.productNameRaw.toUpperCase(), mappedSku: sku })
    }
  }

  async function handlePost() {
    setBusy(true)
    try {
      const { summary } = await postPancakePOS(drafts, fileName)
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
        <Card title="Upload Pancake POS Export">
          <UploadZone hint="Order export (CSV or Excel) from Pancake POS" onFile={handleFile} busy={busy} />
        </Card>
      )}

      {step === 1 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Orders found" value={formatNumber(drafts.length)} />
            <StatBox label="Total revenue" value={formatCurrency(totals.revenue)} accent="var(--status-good)" />
            <StatBox label="COD orders" value={formatNumber(totals.cod)} />
            <StatBox label="Cancelled (skipped)" value={formatNumber(totals.cancelled)} accent="var(--status-warning)" />
          </div>
          <Card title="Preview" description="Uncheck rows to exclude them from posting.">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                    {['', 'Date', 'Order ID', 'Customer', 'Product', 'Net Amount', 'Payment', 'Status'].map((h, i) => (
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
                        <input
                          type="checkbox"
                          checked={d.include}
                          onChange={(e) => updateDraft(d.key, { include: e.target.checked })}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(d.date)}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.orderId ?? '—'}
                        {d.isDuplicate && (
                          <span className="ml-1.5 text-[11px]" style={{ color: 'var(--status-warning)' }}>
                            (dup)
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.customerName ?? '—'}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.productNameRaw ?? '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(d.netAmount || d.totalAmount)}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.paymentMethod ?? '—'}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.status ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
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
          <Card
            title="Product matching"
            description={
              totals.unmatchedProducts > 0
                ? `${totals.unmatchedProducts} row(s) couldn't be auto-matched to a product in Settings — pick the right one below.`
                : 'Every product matched automatically.'
            }
          >
            {drafts
              .filter((d) => d.include && d.productNameRaw && !d.matchedProductSku)
              .map((d) => (
                <div key={d.key} className="flex items-center justify-between gap-3 border-b py-2 text-sm" style={{ borderColor: 'var(--border-hairline)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{d.productNameRaw}</span>
                  <select
                    value={d.matchedProductSku ?? ''}
                    onChange={(e) => assignProduct(d.key, e.target.value)}
                    className="rounded-lg border px-2.5 py-1.5 text-xs"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
                  >
                    <option value="">— choose product —</option>
                    {products.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            {totals.unmatchedProducts === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nothing to review here.
              </p>
            )}
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
                <strong>{totals.count}</strong> orders will post to Income Tracker and Orders Database
              </li>
              <li>Inventory will be reduced for every matched product</li>
              <li>
                <strong>{totals.cancelled}</strong> cancelled and <strong>{totals.duplicates}</strong> duplicate order(s) will be skipped
              </li>
              <li>Total revenue: {formatCurrency(totals.revenue)}</li>
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
