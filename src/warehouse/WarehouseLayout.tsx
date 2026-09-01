import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Boxes,
  PackagePlus,
  Undo2,
  Truck,
  ArrowLeftRight,
  ClipboardList,
  Hammer,
  ShoppingCart,
  AlertTriangle,
  Tags,
  ScrollText,
  Sun,
  Moon,
  Menu,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import AppSwitcher from '../components/AppSwitcher'

const NAV: { title: string; items: { to: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    title: 'Movements',
    items: [
      { to: '/receive', label: 'Receive', icon: PackagePlus },
      { to: '/fulfillment', label: 'Fulfillment', icon: Truck },
      { to: '/rts', label: 'RTS / Returns', icon: Undo2 },
      { to: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
      { to: '/stock-count', label: 'Stock Count', icon: ClipboardList },
    ],
  },
  {
    title: 'Production',
    items: [{ to: '/production', label: 'Build / BOM', icon: Hammer }],
  },
  {
    title: 'Planning',
    items: [
      { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
      { to: '/discrepancies', label: 'Discrepancies', icon: AlertTriangle },
    ],
  },
  {
    title: 'Master data',
    items: [
      { to: '/products', label: 'Products', icon: Tags },
      { to: '/activity', label: 'Activity', icon: ScrollText },
    ],
  },
]

export default function WarehouseLayout() {
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
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={{ background: 'var(--series-aqua)' }}
            >
              <Boxes size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Warehouse
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Inventory Control Center
              </div>
            </div>
          </div>
        </div>

        <AppSwitcher current="warehouse" />

        <nav className="flex-1 px-3 pb-8">
          {NAV.map((group) => (
            <div key={group.title} className="mb-5">
              <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {group.title}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
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
                      background: isActive ? 'color-mix(in srgb, var(--series-aqua) 16%, transparent)' : 'transparent',
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
            Every balance here is computed from the movement ledger — no stored stock numbers.
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
