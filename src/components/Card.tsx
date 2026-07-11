import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}

export default function Card({ title, description, children, className = '', actions }: CardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${className}`}
      style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
    >
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
