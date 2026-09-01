import type { ReactNode } from 'react'
import type { LocationRow, ProductRow } from '../../lib/warehouse/types'

const inputStyle = {
  borderColor: 'var(--border-hairline)',
  color: 'var(--text-primary)',
  background: 'var(--surface-page)',
} as const

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      {children}
      {hint && (
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </span>
      )}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
}: {
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  min?: number
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border px-2.5 py-1.5 text-sm"
      style={inputStyle}
    />
  )
}

export function TextArea({ value, onChange, rows = 2 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="rounded-lg border px-2.5 py-1.5 text-sm" style={inputStyle} />
  )
}

export function Select({
  value,
  onChange,
  options,
  placeholder = '— select —',
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border px-2.5 py-1.5 text-sm" style={inputStyle}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function productOptions(products: ProductRow[]) {
  return products
    .filter((p) => p.id != null && p.active)
    .map((p) => ({ value: String(p.id), label: `${p.sku} — ${p.name}${p.variant ? ` (${p.variant})` : ''}` }))
}

export function locationOptions(locations: LocationRow[], kinds?: LocationRow['kind'][]) {
  return locations
    .filter((l) => l.id != null && l.active && (!kinds || kinds.includes(l.kind)))
    .map((l) => ({ value: String(l.id), label: l.name }))
}

export function SubmitButton({ label, onClick, busy, disabled }: { label: string; onClick: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      style={{ background: 'var(--series-aqua)' }}
    >
      {busy ? 'Working…' : label}
    </button>
  )
}

export function ErrorNote({ children }: { children: string }) {
  return (
    <div
      className="rounded-lg border p-3 text-xs"
      style={{
        borderColor: 'color-mix(in srgb, var(--status-critical) 30%, var(--border-hairline))',
        background: 'color-mix(in srgb, var(--status-critical) 8%, transparent)',
        color: 'var(--status-critical)',
      }}
    >
      {children}
    </div>
  )
}

export function SuccessNote({ children }: { children: string }) {
  return (
    <div
      className="rounded-lg border p-3 text-xs"
      style={{
        borderColor: 'color-mix(in srgb, var(--status-good) 30%, var(--border-hairline))',
        background: 'color-mix(in srgb, var(--status-good) 8%, transparent)',
        color: 'var(--status-good)',
      }}
    >
      {children}
    </div>
  )
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
      {action}
    </div>
  )
}
