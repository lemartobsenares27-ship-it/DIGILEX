import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ensureSeeded } from './lib/db'

const Overview = lazy(() => import('./pages/Overview'))
const KPIScorecard = lazy(() => import('./pages/KPIScorecard'))
const IncomeTracker = lazy(() => import('./pages/IncomeTracker'))
const ExpenseTracker = lazy(() => import('./pages/ExpenseTracker'))
const CashFlow = lazy(() => import('./pages/CashFlow'))
const MonthlyPL = lazy(() => import('./pages/MonthlyPL'))
const MonthlyBookkeeping = lazy(() => import('./pages/MonthlyBookkeeping'))
const BillsReminders = lazy(() => import('./pages/BillsReminders'))
const FacebookAdsTracker = lazy(() => import('./pages/FacebookAdsTracker'))
const AdsManagement = lazy(() => import('./pages/AdsManagement'))
const CreditCardReconciliation = lazy(() => import('./pages/CreditCardReconciliation'))
const OrdersDatabase = lazy(() => import('./pages/OrdersDatabase'))
const SOAReconciliation = lazy(() => import('./pages/SOAReconciliation'))
const SOABreakdown = lazy(() => import('./pages/SOABreakdown'))
const FulfillmentVerification = lazy(() => import('./pages/FulfillmentVerification'))
const POSReconciliation = lazy(() => import('./pages/POSReconciliation'))
const Evidence = lazy(() => import('./pages/Evidence'))
const FollowUpList = lazy(() => import('./pages/FollowUpList'))
const ParcelsMonitoring = lazy(() => import('./pages/ParcelsMonitoring'))
const ImportCenter = lazy(() => import('./pages/ImportCenter'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const JntVipDashboard = lazy(() => import('./pages/jntvip/JntVipDashboard'))
const JntVipImport = lazy(() => import('./pages/jntvip/JntVipImport'))
const JntVipReconciliation = lazy(() => import('./pages/jntvip/JntVipReconciliation'))
const JntVipDiscrepancyCenter = lazy(() => import('./pages/jntvip/JntVipDiscrepancyCenter'))
const JntVipBatches = lazy(() => import('./pages/jntvip/JntVipBatches'))
const JntVipAuditLog = lazy(() => import('./pages/jntvip/JntVipAuditLog'))

function LoadingScreen({ label, error }: { label: string; error?: string | null }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--surface-page)' }}>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      {error && (
        <>
          <p className="max-w-md text-sm" style={{ color: 'var(--status-critical)' }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--series-blue)' }}
          >
            Reload
          </button>
        </>
      )}
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let settled = false
    const timeout = setTimeout(() => {
      if (!settled) {
        setError(
          'This is taking longer than expected. If this app is open in another browser tab, close that tab and reload. Otherwise, try reloading this page.',
        )
      }
    }, 12000)

    ensureSeeded()
      .then(() => {
        settled = true
        clearTimeout(timeout)
        setReady(true)
      })
      .catch((err: unknown) => {
        settled = true
        clearTimeout(timeout)
        setError(err instanceof Error ? err.message : 'Something went wrong while loading your data. Please reload.')
      })

    return () => clearTimeout(timeout)
  }, [])

  if (!ready) {
    return <LoadingScreen label="Loading Digilex Financial Control Center…" error={error} />
  }

  return (
    <Suspense fallback={<LoadingScreen label="Loading…" />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/kpi-scorecard" element={<KPIScorecard />} />
          <Route path="/income" element={<IncomeTracker />} />
          <Route path="/expenses" element={<ExpenseTracker />} />
          <Route path="/cash-flow" element={<CashFlow />} />
          <Route path="/pnl" element={<MonthlyPL />} />
          <Route path="/bookkeeping" element={<MonthlyBookkeeping />} />
          <Route path="/bills" element={<BillsReminders />} />
          <Route path="/facebook-ads" element={<FacebookAdsTracker />} />
          <Route path="/ads-management" element={<AdsManagement />} />
          <Route path="/credit-cards" element={<CreditCardReconciliation />} />
          <Route path="/orders" element={<OrdersDatabase />} />
          <Route path="/soa-reconciliation" element={<SOAReconciliation />} />
          <Route path="/soa-breakdown" element={<SOABreakdown />} />
          <Route path="/fulfillment-verification" element={<FulfillmentVerification />} />
          <Route path="/pos-reconciliation" element={<POSReconciliation />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/follow-up" element={<FollowUpList />} />
          <Route path="/parcels-monitoring" element={<ParcelsMonitoring />} />
          <Route path="/import-center" element={<ImportCenter />} />
          <Route path="/jnt-vip" element={<JntVipDashboard />} />
          <Route path="/jnt-vip/import" element={<JntVipImport />} />
          <Route path="/jnt-vip/reconciliation" element={<JntVipReconciliation />} />
          <Route path="/jnt-vip/discrepancy-center" element={<JntVipDiscrepancyCenter />} />
          <Route path="/jnt-vip/batches" element={<JntVipBatches />} />
          <Route path="/jnt-vip/audit-log" element={<JntVipAuditLog />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
