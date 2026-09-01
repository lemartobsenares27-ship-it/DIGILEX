// One shared entry point for loading the real catalogue.
//
// It used to live as a small text button buried in the Products page header,
// which meant Inventory and Purchases looked permanently empty with no way
// forward. Every empty state now offers it.

import { useCallback, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useLiveTable } from '../../hooks/useLiveTable'
import { warehouseDb, getWarehouseUser } from '../../lib/warehouse/db'
import { loadStarterData } from '../../lib/warehouse/starterData'
import { formatNumber } from '../../lib/format'

export function useCatalogueLoader() {
  const locations = useLiveTable(warehouseDb.locations)
  const [user, setUser] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getWarehouseUser().then(setUser)
  }, [])

  // Idempotent: known SKUs, PO numbers and delivery references are skipped, so
  // pressing this twice cannot double-count stock.
  const load = useCallback(async () => {
    setError(null)
    setMessage(null)
    const warehouse = locations.find((l) => l.kind === 'warehouse')
    if (!warehouse?.id) {
      setError('No warehouse location found to receive stock into.')
      return
    }
    setBusy(true)
    try {
      const r = await loadStarterData(warehouse.id, user.trim() || 'Lemart')
      const added =
        `Loaded ${formatNumber(r.productsAdded)} product(s), ${formatNumber(r.bomLinesAdded)} recipe line(s), ` +
        `${formatNumber(r.receiptsPosted)} delivery receipt(s) and ${formatNumber(r.posCreated)} open purchase order(s).`
      setMessage(r.skipped.length ? `${added} Skipped ${formatNumber(r.skipped.length)} item(s) already present.` : added)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [locations, user])

  return { load, busy, message, error, ready: locations.length > 0 }
}

export function LoadCatalogueButton({
  load,
  busy,
  ready,
  variant = 'primary',
}: {
  load: () => void
  busy: boolean
  ready: boolean
  variant?: 'primary' | 'quiet'
}) {
  const primary = variant === 'primary'
  return (
    <button
      onClick={load}
      disabled={busy || !ready}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${primary ? 'text-white' : 'border'}`}
      style={
        primary
          ? { background: 'var(--series-aqua)' }
          : { borderColor: 'var(--border-hairline)', color: 'var(--series-aqua)' }
      }
    >
      <Sparkles size={13} />
      {busy ? 'Loading…' : 'Load my real catalogue'}
    </button>
  )
}

/**
 * The empty state every warehouse page shares: says what is missing, why, and
 * gives the one button that fixes it.
 */
export function CatalogueEmptyState({ heading, message }: { heading: string; message: string }) {
  const { load, busy, message: result, error, ready } = useCatalogueLoader()
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: 'color-mix(in srgb, var(--series-aqua) 14%, transparent)', color: 'var(--series-aqua)' }}
      >
        <Sparkles size={20} />
      </div>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {heading}
      </h3>
      <p className="max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <LoadCatalogueButton load={load} busy={busy} ready={ready} />
      <p className="max-w-md text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Loads the products, recipe, delivered receipts and open purchase orders transcribed from your real supplier
        orders. Safe to press twice — anything already present is skipped, never duplicated.
      </p>
      {result && (
        <p className="text-xs" style={{ color: 'var(--status-good)' }}>
          {result}
        </p>
      )}
      {error && (
        <p className="text-xs" style={{ color: 'var(--status-critical)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
