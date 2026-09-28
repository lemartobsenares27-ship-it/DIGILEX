import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import JntVipLayout from './JntVipLayout'
import { jntVipDb } from '../lib/jntvip/db'
import { seedKnownStatements } from '../lib/jntvip/soaSeed'

const JntVipDashboard = lazy(() => import('../pages/jntvip/JntVipDashboard'))
const JntVipImport = lazy(() => import('../pages/jntvip/JntVipImport'))
const JntVipReconciliation = lazy(() => import('../pages/jntvip/JntVipReconciliation'))
const JntVipSoaCheck = lazy(() => import('../pages/jntvip/JntVipSoaCheck'))
const JntVipFinance = lazy(() => import('../pages/jntvip/JntVipFinance'))
const JntVipDiscrepancyCenter = lazy(() => import('../pages/jntvip/JntVipDiscrepancyCenter'))
const JntVipBatches = lazy(() => import('../pages/jntvip/JntVipBatches'))
const JntVipAuditLog = lazy(() => import('../pages/jntvip/JntVipAuditLog'))

const DB_NAME = 'jnt-vip-reconciliation'

type Phase = 'opening' | 'slow' | 'blocked' | 'ready' | 'failed'

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--surface-page)' }}>
      {children}
    </div>
  )
}

/**
 * Wipes the J&T database so a browser stuck on a bad schema can recover.
 *
 * A failed IndexedDB upgrade leaves the app unable to open its own data with
 * no way out from inside the app, which is indistinguishable from "the site is
 * broken". This is the way out. It only ever touches this app's database —
 * the financial dashboard and the warehouse keep their own.
 */
async function resetDatabase() {
  try {
    jntVipDb.close()
  } catch {
    /* already closed */
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
    setTimeout(resolve, 3000)
  })
  window.location.reload()
}

/**
 * Opens the database before rendering anything that reads it.
 *
 * This used to render immediately on the assumption that an empty database
 * needs no waiting. That hid a real failure: when an upgrade cannot be applied
 * the open never settles, every table read hangs, and the user sees a blank
 * page with no error and no recovery. Now the open is awaited, slow and
 * blocked states are named, and a failure offers the reset.
 */
export default function JntVipApp() {
  const [phase, setPhase] = useState<Phase>('opening')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let done = false
    const slow = setTimeout(() => !done && setPhase((p) => (p === 'opening' ? 'slow' : p)), 4000)
    const onBlocked = () => !done && setPhase('blocked')
    jntVipDb.on('blocked', onBlocked)

    jntVipDb
      .open()
      // Seeding must never keep the app from opening; the ledger simply stays
      // empty and the user can import by hand.
      .then(() => seedKnownStatements().catch((e) => console.warn('Statement seed skipped:', e)))
      .then(() => {
        done = true
        setPhase('ready')
      })
      .catch((e: unknown) => {
        done = true
        setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e))
        setPhase('failed')
      })

    return () => {
      clearTimeout(slow)
    }
  }, [])

  if (phase === 'failed' || phase === 'blocked') {
    return (
      <Screen>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {phase === 'blocked' ? 'Another tab is holding this app open' : 'This app could not open its stored data'}
        </h1>
        <p className="max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>
          {phase === 'blocked'
            ? 'Close any other tab showing J&T VIP Reconciliation, then reload. The database cannot upgrade while an older copy of the app is still connected.'
            : 'Its database is in a state the app cannot upgrade. Resetting clears this app only — the financial dashboard and the warehouse are separate databases and are untouched. Your statements reload automatically afterwards; imported parcel exports need importing again.'}
        </p>
        {error && (
          <p className="max-w-md text-xs" style={{ color: 'var(--status-critical)' }}>
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            Reload
          </button>
          <button
            onClick={resetDatabase}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--status-critical)' }}
          >
            Reset this app&apos;s data
          </button>
        </div>
      </Screen>
    )
  }

  if (phase !== 'ready') {
    return (
      <Screen>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading J&amp;T VIP Reconciliation…
        </div>
        {phase === 'slow' && (
          <>
            <p className="max-w-md text-xs" style={{ color: 'var(--text-muted)' }}>
              This is taking longer than it should. If another tab of this app is open, close it. If this screen stays, the stored
              data can be reset.
            </p>
            <button
              onClick={resetDatabase}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--status-critical)' }}
            >
              Reset this app&apos;s data
            </button>
          </>
        )}
      </Screen>
    )
  }

  return (
    <Suspense
      fallback={
        <Screen>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </div>
        </Screen>
      }
    >
      <Routes>
        <Route element={<JntVipLayout />}>
          <Route path="/" element={<JntVipDashboard />} />
          <Route path="/import" element={<JntVipImport />} />
          <Route path="/reconciliation" element={<JntVipReconciliation />} />
          <Route path="/soa-check" element={<JntVipSoaCheck />} />
          <Route path="/finance" element={<JntVipFinance />} />
          <Route path="/discrepancy-center" element={<JntVipDiscrepancyCenter />} />
          <Route path="/batches" element={<JntVipBatches />} />
          <Route path="/audit-log" element={<JntVipAuditLog />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
