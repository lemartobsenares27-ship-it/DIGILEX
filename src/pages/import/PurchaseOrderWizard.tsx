import { useMemo, useState } from 'react'
import StepHeader from '../../components/import/StepHeader'
import UploadZone from '../../components/import/UploadZone'
import Card from '../../components/Card'
import NoteBanner from '../../components/NoteBanner'
import { StatBox, NextButton, BackButton, PostButton } from '../../components/import/WizardBits'
import { formatCurrency, formatDate, formatNumber } from '../../lib/format'
import { parseSpreadsheetFile } from '../../lib/import/parseFile'
import { parsePurchaseOrders } from '../../lib/import/purchaseOrders'
import { postPurchaseOrders } from '../../lib/import/post'
import type { PODraft } from '../../lib/import/types'
import { db } from '../../lib/db'

interface Props {
  onBack: () => void
  onDone: (message: string) => void
}

export default function PurchaseOrderWizard({ onBack, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [drafts, setDrafts] = useState<PODraft[]>([])
  const [products, setProducts] = useState<string[]>([])

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const sheet = await parseSpreadsheetFile(file)
      const parsed = await parsePurchaseOrders(sheet)
      if (parsed.length === 0) throw new Error('No purchase line items were found in this file.')
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

  function updateDraft(key: string, patch: Partial<PODraft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  const totals = useMemo(() => {
    const included = drafts.filter((d) => d.include)
    return {
      count: included.length,
      totalCost: included.reduce((s, d) => s + d.totalCost, 0),
      unmatched: included.filter((d) => d.productNameRaw && !d.matchedProductSku).length,
    }
  }, [drafts])

  async function handlePost() {
    setBusy(true)
    try {
      const { summary } = await postPurchaseOrders(drafts, fileName)
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
        <Card title="Upload Purchase Order / Inventory Receipt">
          <UploadZone hint="CSV or Excel from any supplier — product, quantity, cost, PO/DR number" onFile={handleFile} busy={busy} />
        </Card>
      )}

      {step === 1 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatBox label="Line items found" value={formatNumber(drafts.length)} />
            <StatBox label="Total cost" value={formatCurrency(totals.totalCost)} accent="var(--series-orange)" />
            <StatBox label="Unmatched products" value={formatNumber(totals.unmatched)} accent="var(--status-warning)" />
          </div>
          <Card title="Preview" description="Match each line to a product so stock updates correctly.">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
                    {['', 'Product (file)', 'Matched Product', 'Qty', 'Unit Cost', 'Total Cost', 'Supplier', 'PO #', 'Received'].map((h, i) => (
                      <th key={i} className="whitespace-nowrap px-2 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d) => (
                    <tr key={d.key} className="border-t" style={{ borderColor: 'var(--border-hairline)', opacity: d.include ? 1 : 0.45 }}>
                      <td className="px-2 py-1.5">
                        <input type="checkbox" checked={d.include} onChange={(e) => updateDraft(d.key, { include: e.target.checked })} />
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.productNameRaw ?? '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={d.matchedProductSku ?? ''}
                          onChange={(e) => updateDraft(d.key, { matchedProductSku: e.target.value || null })}
                          className="rounded border bg-transparent px-1.5 py-1 text-xs"
                          style={{ borderColor: d.matchedProductSku ? 'var(--border-hairline)' : 'var(--status-warning)', color: 'var(--text-primary)' }}
                        >
                          <option value="">— none —</option>
                          {products.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatNumber(d.quantityReceived)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(d.unitCost)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(d.totalCost)}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.supplierName ?? '—'}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {d.poNumber ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(d.receivedDate)}
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
          <Card title="Confirm & Post">
            <ul className="mb-4 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <strong>{totals.count}</strong> line item(s) will post to Expense Tracker (Product Cost)
              </li>
              <li>Matched products will have their on-hand quantity increased</li>
              <li>Total cost: {formatCurrency(totals.totalCost)}</li>
              {totals.unmatched > 0 && (
                <li style={{ color: 'var(--status-warning)' }}>{totals.unmatched} row(s) have no matched product — stock won't update for those</li>
              )}
            </ul>
            <PostButton onClick={handlePost} busy={busy} disabled={totals.count === 0} />
          </Card>
          <div className="mt-4">
            <BackButton onClick={() => setStep(1)} />
          </div>
        </>
      )}
    </div>
  )
}
