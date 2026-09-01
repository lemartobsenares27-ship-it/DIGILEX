import { Landmark, PackageCheck, Warehouse } from 'lucide-react'

export type AppKey = 'digilex' | 'jntvip' | 'warehouse'

// Each app is a separate build with its own database, so switching between
// them is a plain page load, not client-side routing. Paths are relative to
// the current app's directory: the two sub-apps sit one level below the root.
const APPS: { key: AppKey; label: string; icon: typeof Landmark; hrefFromRoot: string; hrefFromSubApp: string; accent: string }[] = [
  { key: 'digilex', label: 'Financial', icon: Landmark, hrefFromRoot: './', hrefFromSubApp: '../', accent: 'var(--series-blue)' },
  { key: 'jntvip', label: 'J&T VIP', icon: PackageCheck, hrefFromRoot: './jnt-vip/', hrefFromSubApp: '../jnt-vip/', accent: 'var(--series-orange)' },
  { key: 'warehouse', label: 'Warehouse', icon: Warehouse, hrefFromRoot: './warehouse/', hrefFromSubApp: '../warehouse/', accent: 'var(--series-aqua)' },
]

/**
 * Tabs for moving between the three independent systems. `current` is the app
 * doing the rendering, which also tells us how deep in the URL tree we are.
 */
export default function AppSwitcher({ current }: { current: AppKey }) {
  const atRoot = current === 'digilex'

  return (
    <div className="px-3 pb-3">
      <div
        className="flex gap-0.5 rounded-lg p-0.5"
        style={{ background: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
      >
        {APPS.map(({ key, label, icon: Icon, hrefFromRoot, hrefFromSubApp, accent }) => {
          const active = key === current
          const href = atRoot ? hrefFromRoot : hrefFromSubApp
          const content = (
            <>
              <Icon size={13} strokeWidth={2.25} />
              <span className="truncate">{label}</span>
            </>
          )
          return active ? (
            <span
              key={key}
              aria-current="page"
              className="flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] font-semibold"
              style={{ background: 'var(--surface-card)', color: accent, boxShadow: '0 1px 2px rgb(0 0 0 / 0.06)' }}
            >
              {content}
            </span>
          ) : (
            <a
              key={key}
              href={href}
              className="flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {content}
            </a>
          )
        })}
      </div>
    </div>
  )
}
