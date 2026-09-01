import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ensureSeeded, onSeedPhase, type SeedPhase } from './lib/db'

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

function LoadingScreen({
  label,
  error,
  showReload = true,
  showReset = false,
}: {
  label: string
  error?: string | null
  showReload?: boolean
  showReset?: boolean
}) {
  const [resetting, setResetting] = useState(false)

  async function handleReset() {
    if (
      !window.confirm(
        'Delete the local database and rebuild it from scratch?\n\n' +
          'Your orders, SOA and POS data all reload from the app’s data files. ' +
          'Anything that only exists in this browser — cells you edited by hand, ' +
          'batches you imported through Import Center — cannot be recovered.',
      )
    ) {
      return
    }
    setResetting(true)
    try {
      const { resetLocalDatabase } = await import('./lib/db')
      await resetLocalDatabase()
    } catch {
      // If Dexie itself can't delete it (the very case this rescues), go
      // straight to the raw IndexedDB API, which does not need an open handle.
      indexedDB.deleteDatabase('digilex-financial-control-center')
    }
    window.location.reload()
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--surface-page)' }}>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      {error && (
        <>
          <p className="max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {showReload && (
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--series-blue)' }}
              >
                Reload
              </button>
            )}
            {showReset && (
              <button
                onClick={handleReset}
                disabled={resetting}
                className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--status-critical)' }}
              >
                {resetting ? 'Resetting…' : 'Reset local data'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const PHASE_LABEL: Record<SeedPhase, string> = {
  starting: 'Loading Digilex Financial Control Center…',
  opening: 'Opening your local database…',
  stuck: 'Your local database isn’t opening',
  downloading: 'Downloading your order and financial history…',
  writing: 'Setting up your local database — this only happens once…',
  blocked: 'Waiting on another browser tab…',
  ready: 'Loading Digilex Financial Control Center…',
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slow, setSlow] = useState(false)
  const [phase, setPhase] = useState<SeedPhase>('starting')

  useEffect(() => onSeedPhase(setPhase), [])

  useEffect(() => {
    let settled = false
    // Note this only flips a "still working" flag. Seeding keeps running, and
    // the .then below still reveals the app whenever it finishes — a slow load
    // recovers on its own without the user touching anything.
    const timeout = setTimeout(() => {
      if (!settled) setSlow(true)
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
    // A blocked upgrade is the one case that genuinely needs the user to act,
    // and Dexie tells us precisely when that's happening — so only then do we
    // mention other tabs. Everything else is just slow, and says so honestly.
    const notice =
      error ??
      (phase === 'blocked'
        ? 'Another tab has this app open on an older version, which is holding the database. Close that tab — this page will continue on its own, no reload needed.'
        : phase === 'stuck'
          ? 'The browser has not opened the database, and has not reported an error either. First close any other tabs running this app and hit Reload. If that changes nothing, the local copy is likely damaged — “Reset local data” deletes it and rebuilds from the app’s data files. Anything that lives only in this browser (hand edits, imported batches) is lost in that rebuild.'
          : slow
            ? 'Still working. The first load on a new browser downloads your full order history and writes it into local storage, which can take a minute on a slow connection. This finishes on its own — you can leave this page open.'
            : null)

    return (
      <LoadingScreen
        label={PHASE_LABEL[phase]}
        error={notice}
        showReload={!!error || phase === 'stuck' || (slow && phase !== 'blocked')}
        showReset={phase === 'stuck' || !!error || (slow && phase !== 'blocked' && phase !== 'downloading' && phase !== 'writing')}
      />
    )
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
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
