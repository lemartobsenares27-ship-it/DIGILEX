import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ensureSeeded } from './lib/db'

const Overview = lazy(() => import('./pages/Overview'))
const IncomeTracker = lazy(() => import('./pages/IncomeTracker'))
const ExpenseTracker = lazy(() => import('./pages/ExpenseTracker'))
const CashFlow = lazy(() => import('./pages/CashFlow'))
const MonthlyPL = lazy(() => import('./pages/MonthlyPL'))
const MonthlyBookkeeping = lazy(() => import('./pages/MonthlyBookkeeping'))
const BillsReminders = lazy(() => import('./pages/BillsReminders'))
const FacebookAdsTracker = lazy(() => import('./pages/FacebookAdsTracker'))
const CreditCardReconciliation = lazy(() => import('./pages/CreditCardReconciliation'))
const OrdersDatabase = lazy(() => import('./pages/OrdersDatabase'))
const SOAReconciliation = lazy(() => import('./pages/SOAReconciliation'))
const SOABreakdown = lazy(() => import('./pages/SOABreakdown'))
const FulfillmentVerification = lazy(() => import('./pages/FulfillmentVerification'))
const POSReconciliation = lazy(() => import('./pages/POSReconciliation'))
const Evidence = lazy(() => import('./pages/Evidence'))
const FollowUpList = lazy(() => import('./pages/FollowUpList'))
const SettingsPage = lazy(() => import('./pages/Settings'))

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--surface-page)' }}>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureSeeded().then(() => setReady(true))
  }, [])

  if (!ready) {
    return <LoadingScreen label="Loading Digilex Financial Control Center…" />
  }

  return (
    <Suspense fallback={<LoadingScreen label="Loading…" />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/income" element={<IncomeTracker />} />
          <Route path="/expenses" element={<ExpenseTracker />} />
          <Route path="/cash-flow" element={<CashFlow />} />
          <Route path="/pnl" element={<MonthlyPL />} />
          <Route path="/bookkeeping" element={<MonthlyBookkeeping />} />
          <Route path="/bills" element={<BillsReminders />} />
          <Route path="/facebook-ads" element={<FacebookAdsTracker />} />
          <Route path="/credit-cards" element={<CreditCardReconciliation />} />
          <Route path="/orders" element={<OrdersDatabase />} />
          <Route path="/soa-reconciliation" element={<SOAReconciliation />} />
          <Route path="/soa-breakdown" element={<SOABreakdown />} />
          <Route path="/fulfillment-verification" element={<FulfillmentVerification />} />
          <Route path="/pos-reconciliation" element={<POSReconciliation />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/follow-up" element={<FollowUpList />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
