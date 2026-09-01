import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import WarehouseLayout from './WarehouseLayout'
import { ensureWarehouseSeeded } from '../lib/warehouse/db'

const WarehouseDashboard = lazy(() => import('../pages/warehouse/WarehouseDashboard'))
const Inventory = lazy(() => import('../pages/warehouse/Inventory'))
const Receive = lazy(() => import('../pages/warehouse/Receive'))
const Fulfillment = lazy(() => import('../pages/warehouse/Fulfillment'))
const Rts = lazy(() => import('../pages/warehouse/Rts'))
const Transfers = lazy(() => import('../pages/warehouse/Transfers'))
const StockCount = lazy(() => import('../pages/warehouse/StockCount'))
const Purchases = lazy(() => import('../pages/warehouse/Purchases'))
const Discrepancies = lazy(() => import('../pages/warehouse/Discrepancies'))
const Products = lazy(() => import('../pages/warehouse/Products'))
const Activity = lazy(() => import('../pages/warehouse/Activity'))

function Loading({ label = 'Loading Warehouse Control Center…' }: { label?: string }) {
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--surface-page)' }}>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

/**
 * Seeding here only creates default locations — never stock — so there is no
 * large data load to wait on and nothing that could invent inventory.
 */
export default function WarehouseApp() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureWarehouseSeeded()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--surface-page)' }}>
        <p className="max-w-md text-sm" style={{ color: 'var(--status-critical)' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--series-aqua)' }}>
          Reload
        </button>
      </div>
    )
  }
  if (!ready) return <Loading />

  return (
    <Suspense fallback={<Loading label="Loading…" />}>
      <Routes>
        <Route element={<WarehouseLayout />}>
          <Route path="/" element={<WarehouseDashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/receive" element={<Receive />} />
          <Route path="/fulfillment" element={<Fulfillment />} />
          <Route path="/rts" element={<Rts />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/stock-count" element={<StockCount />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/discrepancies" element={<Discrepancies />} />
          <Route path="/products" element={<Products />} />
          <Route path="/activity" element={<Activity />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
