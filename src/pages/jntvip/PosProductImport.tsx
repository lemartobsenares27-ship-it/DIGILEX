// Pin parcels to a product from a POS export.
//
// The J&T export is one file for everything and its item text is whatever the
// shipper typed, so alias matching is a reasonable default and a poor authority.
// A POS export is the opposite: it covers exactly one product, so every tracking
// number in it is KNOWN to be that product. Importing one per product turns
// guesswork into fact.
//
// Nothing is parsed cleverly. The file is scanned for anything shaped like a
// J&T waybill, in any column, under any header — POS systems disagree about
// what to call that column and a rigid parser would reject a perfectly good
// file over a heading.

import { useRef, useState } from 'react'
import { Upload, Check, AlertTriangle } from 'lucide-react'
import Card from '../../components/Card'
import { jntVipDb } from '../../lib/jntvip/db'
import { formatNumber } from '../../lib/format'
import type { JntVipProductRow } from '../../lib/jntvip/types'

/** J&T waybills in these exports are JT followed by 13 or more digits. */
const WAYBILL = /\bJT\d{13,}\b/gi

interface Result {
  product: string
  found: number
  pinned: number
  matchedParcels: number
  unknown: number
}

export default function PosProductImport({ products, className }: { products: JntVipProductRow[]; className?: string }) {
  const [product, setProduct] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handle(file: File) {
    if (!product) {
      setError('Choose which product this file covers first.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      let text: string
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
        // Every sheet, as raw text — the waybill may not be on the first one.
        text = wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n')
      } else {
        text = await file.text()
      }

      const awbs = [...new Set((text.match(WAYBILL) ?? []).map((w) => w.toUpperCase()))]
      if (awbs.length === 0) {
        setError('No J&T waybill numbers found in that file. They look like JT0023796165969.')
        setBusy(false)
        return
      }

      const now = new Date().toISOString()
      // put() against the unique awb index, so re-importing a corrected file
      // updates the mapping rather than stacking duplicates.
      await jntVipDb.transaction('rw', jntVipDb.parcelProducts, async () => {
        for (const awb of awbs) {
          const existing = await jntVipDb.parcelProducts.where('awb').equals(awb).first()
          if (existing) await jntVipDb.parcelProducts.update(existing.id!, { product, source: 'POS', updatedAt: now })
          else await jntVipDb.parcelProducts.add({ awb, product, source: 'POS', updatedAt: now })
        }
      })

      // How many of these the parcel export actually knows about — the gap is
      // worth showing, because it usually means the exports cover different
      // date ranges rather than that anything is wrong.
      const known = await jntVipDb.parcels.where('awb').anyOf(awbs).count()
      setResult({ product, found: awbs.length, pinned: awbs.length, matchedParcels: known, unknown: awbs.length - known })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Card
      title="Pin parcels to a product from a POS export"
      description="One file per product. Every waybill in it is recorded as that product, overriding any guess from the item text."
      className={className}
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border px-2.5 py-1.5 text-sm"
          style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-page)', color: 'var(--text-primary)' }}
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        >
          <option value="">This file covers…</option>
          {products.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handle(f)
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy || !product}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--series-orange)' }}
        >
          <Upload size={14} /> {busy ? 'Reading…' : 'Choose POS file'}
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--status-critical)' }}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-lg p-3 text-xs" style={{ background: 'color-mix(in srgb, var(--status-good-ink) 10%, transparent)' }}>
          <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
            <Check size={13} style={{ color: 'var(--status-good-ink)' }} />
            {formatNumber(result.pinned)} waybills pinned to {result.product}
          </div>
          <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            {formatNumber(result.matchedParcels)} of them are in the loaded parcel export and now count
            towards {result.product}&rsquo;s figures.
            {result.unknown > 0 && (
              <>
                {' '}
                The other {formatNumber(result.unknown)} {result.unknown === 1 ? 'is' : 'are'} not in
                it yet — usually because the two exports cover different dates.{' '}
                {result.unknown === 1 ? 'It attaches' : 'They attach'} automatically when a parcel
                export that includes {result.unknown === 1 ? 'it' : 'them'} is imported.
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Accepts .xlsx, .csv or .txt. The file is scanned for anything shaped like a J&amp;T waybill
        (JT followed by 13 or more digits) in any column, so the column headings do not matter.
      </p>
    </Card>
  )
}
