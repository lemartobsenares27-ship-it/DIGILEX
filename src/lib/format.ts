export function formatCurrency(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatNumber(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US').format(n)
}

export function formatPercent(value: unknown, digits = 1): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

export function formatDate(value: unknown): string {
  if (!value) return '—'
  const s = String(value)
  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return s
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value: unknown): string {
  if (!value) return '—'
  const s = String(value)
  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return s
  return dt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function monthKey(value: unknown): string {
  if (!value) return ''
  const dt = new Date(String(value))
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}
