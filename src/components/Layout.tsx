import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Megaphone,
  CreditCard,
  Waves,
  CalendarClock,
  FileBarChart,
  BookOpen,
  Database,
  ClipboardCheck,
  PackageSearch,
  ListChecks,
  FileWarning,
  Send,
  Upload,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import { useLiveTable } from '../hooks/useLiveTable'
import { db } from '../lib/db'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    title: 'Financials',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard },
      { to: '/income', label: 'Income Tracker', icon: Wallet },
      { to: '/expenses', label: 'Expense Tracker', icon: Receipt },
      { to: '/cash-flow', label: 'Cash Flow', icon: Waves },
      { to: '/pnl', label: 'Monthly P&L', icon: FileBarChart },
      { to: '/bookkeeping', label: 'Monthly Bookkeeping', icon: BookOpen },
      { to: '/bills', label: 'Bills & Reminders', icon: CalendarClock },
    ],
  },
  {
    title: 'Marketing & Cards',
    items: [
      { to: '/facebook-ads', label: 'Facebook Ads Tracker', icon: Megaphone },
      { to: '/credit-cards', label: 'Credit Card Reconciliation', icon: CreditCard },
    ],
  },
  {
    title: 'Operations & Audit',
    items: [
      { to: '/orders', label: 'Orders Database', icon: Database },
      { to: '/soa-reconciliation', label: 'Fulfillment SOA Reconciliation', icon: ClipboardCheck },
      { to: '/soa-breakdown', label: 'SOA Breakdown & Verification', icon: FileWarning },
      { to: '/fulfillment-verification', label: 'Fulfillment Verification', icon: PackageSearch },
      { to: '/pos-reconciliation', label: 'POS Order Reconciliation', icon: ListChecks },
      { to: '/evidence', label: 'Evidence - Not in SOA', icon: FileWarning },
      { to: '/follow-up', label: 'NPMCM Follow-Up List', icon: Send },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/settings', label: 'Settings', icon: SettingsIcon }],
  },
]

function todaysImportCount(batches: { importedAt: string }[]): number {
  const today = new Date().toDateString()
  return batches.filter((b) => new Date(b.importedAt).toDateString() === today).length
}

export default function Layout() {
  const [theme, toggleTheme] = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const importBatches = useLiveTable(db.importBatches)
  const importCountToday = todaysImportCount(importBatches)

  const nav: NavGroup[] = [
    ...NAV.slice(0, 3),
    {
      title: 'Data Import',
      items: [{ to: '/import-center', label: 'Import Center', icon: Upload, badge: importCountToday || undefined }],
    },
    ...NAV.slice(3),
  ]

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--surface-page)' }}>
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 shrink-0 overflow-y-auto border-r transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
      >
        <div className="px-5 py-5">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: 'var(--series-blue)' }}
            >
              D
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Digilex
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Financial Control Center
              </div>
            </div>
          </div>
        </div>
        <nav className="px-3 pb-8">
          {nav.map((group) => (
            <div key={group.title} className="mb-5">
              <div
                className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                {group.title}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ to, label, icon: Icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        isActive ? 'font-medium' : ''
                      }`
                    }
                    style={({ isActive }) => ({
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: isActive ? 'color-mix(in srgb, var(--series-blue) 12%, transparent)' : 'transparent',
                    })}
                  >
                    <Icon size={16} strokeWidth={2} />
                    <span className="flex-1 truncate">{label}</span>
                    {!!badge && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        style={{ background: 'var(--series-blue)' }}
                      >
                        {badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 md:px-8"
          style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-page)' }}
        >
          <button
            className="rounded-lg p-2 md:hidden"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden md:block" />
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
