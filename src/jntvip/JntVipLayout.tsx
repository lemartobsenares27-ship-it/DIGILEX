import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { UploadCloud, AlertOctagon, Boxes, ShieldCheck, Wallet, BookOpen, Target, Coins, Boxes as BoxesIcon, Sun, Moon, Menu } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import AppSwitcher from '../components/AppSwitcher'

// Only pages that show data.
//
// Four tabs used to sit here for a POS-versus-statement matching workflow that
// these orders never pass through. Labelling them "POS matching" was an
// improvement on letting them look broken, but it was still four sidebar
// entries that could never show anything — and the ask was data, not a better
// excuse. Three are gone, and the fourth, Discrepancy Center, is rebuilt as
// Issues to fix: the same idea driven by statements and parcels, which do
// exist, instead of POS matches, which do not.
//
// Their routes stay mounted so an old bookmark still resolves.
const NAV: { heading: string; items: { to: string; label: string; icon: typeof Target }[] }[] = [
  {
    heading: 'The money',
    items: [
      { to: '/executive', label: 'Executive Dashboard', icon: Target },
      { to: '/profit', label: 'Profit & Loss', icon: Coins },
      { to: '/finance', label: 'Finance', icon: Wallet },
      { to: '/bookkeeping', label: 'Monthly Bookkeeping', icon: BookOpen },
    ],
  },
  {
    heading: 'Statements & parcels',
    items: [
      { to: '/products', label: 'Products', icon: BoxesIcon },
      { to: '/soa-check', label: 'SOA Check', icon: ShieldCheck },
      { to: '/batches', label: 'Statements', icon: Boxes },
      { to: '/issues', label: 'Issues to fix', icon: AlertOctagon },
      { to: '/import', label: 'Import', icon: UploadCloud },
    ],
  },
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

        <AppSwitcher current="jntvip" />

        <nav className="flex-1 px-3 pb-4">
          {NAV.map(({ heading, items }) => (
            <div key={heading} className="mb-3">
              <div className="px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {heading}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.map(({ to, label, icon: Icon }) => (
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
            </div>
          ))}
        </nav>
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
