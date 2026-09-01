import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PackageCheck, UploadCloud, Table2, AlertOctagon, Boxes, History, Sun, Moon, Menu, ExternalLink } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

const NAV = [
  { to: '/', label: 'Dashboard', icon: PackageCheck },
  { to: '/import', label: 'Import', icon: UploadCloud },
  { to: '/reconciliation', label: 'Reconciliation Table', icon: Table2 },
  { to: '/discrepancy-center', label: 'Discrepancy Center', icon: AlertOctagon },
  { to: '/batches', label: 'SOA Batches', icon: Boxes },
  { to: '/audit-log', label: 'Audit Log', icon: History },
]

export default function JntVipLayout() {
  const [theme, toggleTheme] = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--surface-page)' }}>
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col overflow-y-auto border-r transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
      >
        <div className="px-5 py-5">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--series-orange)' }}
            >
              J&T
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                J&amp;T VIP
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Fulfillment Reconciliation
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 pb-4">
          <div className="flex flex-col gap-0.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${isActive ? 'font-medium' : ''}`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'color-mix(in srgb, var(--series-orange) 14%, transparent)' : 'transparent',
                })}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="flex-1 truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t px-3 py-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <a
            href="../"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ExternalLink size={14} />
            Digilex Financial Dashboard
          </a>
        </div>
      </aside>

      {mobileOpen && (
        <button aria-label="Close menu" className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 md:px-8"
          style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-page)' }}
        >
          <button className="rounded-lg p-2 md:hidden" style={{ color: 'var(--text-secondary)' }} onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="hidden text-xs md:block" style={{ color: 'var(--text-muted)' }}>
            Separate system — this reconciles J&amp;T VIP only, and shares no data with the financial dashboard.
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
