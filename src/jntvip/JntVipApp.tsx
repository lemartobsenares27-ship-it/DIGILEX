import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import JntVipLayout from './JntVipLayout'

const JntVipDashboard = lazy(() => import('../pages/jntvip/JntVipDashboard'))
const JntVipImport = lazy(() => import('../pages/jntvip/JntVipImport'))
const JntVipReconciliation = lazy(() => import('../pages/jntvip/JntVipReconciliation'))
const JntVipDiscrepancyCenter = lazy(() => import('../pages/jntvip/JntVipDiscrepancyCenter'))
const JntVipBatches = lazy(() => import('../pages/jntvip/JntVipBatches'))
const JntVipAuditLog = lazy(() => import('../pages/jntvip/JntVipAuditLog'))

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--surface-page)' }}>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Loading J&amp;T VIP Reconciliation…
      </div>
    </div>
  )
}

/**
 * The standalone J&T VIP app. Unlike the financial dashboard there is no
 * seeding step to wait on — this system's database starts empty and fills up
 * only from the POS and SOA files you import, so it renders immediately.
 */
export default function JntVipApp() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<JntVipLayout />}>
          <Route path="/" element={<JntVipDashboard />} />
          <Route path="/import" element={<JntVipImport />} />
          <Route path="/reconciliation" element={<JntVipReconciliation />} />
          <Route path="/discrepancy-center" element={<JntVipDiscrepancyCenter />} />
          <Route path="/batches" element={<JntVipBatches />} />
          <Route path="/audit-log" element={<JntVipAuditLog />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
