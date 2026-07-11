import { useMemo, useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Plus, Trash2, Download } from 'lucide-react'
import { formatCurrency, formatDate, formatNumber, formatPercent } from '../lib/format'
import Badge from './Badge'

export type ColumnType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'badge' | 'select'

export interface ColumnDef<T> {
  key: keyof T & string
  label: string
  type?: ColumnType
  editable?: boolean
  options?: string[]
  width?: string
  align?: 'left' | 'right'
}

interface DataTableProps<T extends object> {
  columns: ColumnDef<T>[]
  rows: T[]
  getId: (row: T) => number
  onUpdate?: (id: number, key: keyof T & string, value: unknown) => void
  onDelete?: (id: number) => void
  onAdd?: () => void
  searchKeys?: (keyof T & string)[]
  pageSize?: number
  csvName?: string
  emptyLabel?: string
}

function toCsvValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export default function DataTable<T extends object>({
  columns,
  rows,
  getId,
  onUpdate,
  onDelete,
  onAdd,
  searchKeys,
  pageSize = 25,
  csvName = 'export',
  emptyLabel = 'No rows yet.',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<(keyof T & string) | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [editingCell, setEditingCell] = useState<{ id: number; key: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    const keys = searchKeys ?? columns.map((c) => c.key)
    return rows.filter((row) => keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)))
  }, [rows, query, searchKeys, columns])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === bv) return 0
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv))
    })
    if (sortDir === 'desc') copy.reverse()
    return copy
  }, [filtered, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const clampedPage = Math.min(page, pageCount - 1)
  const paged = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize)

  function toggleSort(key: keyof T & string) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
    }
    setPage(0)
  }

  function startEdit(id: number, key: string, current: unknown) {
    if (!onUpdate) return
    setEditingCell({ id, key })
    setEditValue(current === null || current === undefined ? '' : String(current))
  }

  function commitEdit(col: ColumnDef<T>) {
    if (!editingCell || !onUpdate) return
    let value: unknown = editValue
    if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') {
      value = editValue.trim() === '' ? null : Number(editValue)
    }
    onUpdate(editingCell.id, col.key, value)
    setEditingCell(null)
  }

  function exportCsv() {
    const header = columns.map((c) => toCsvValue(c.label)).join(',')
    const lines = sorted.map((row) => columns.map((c) => toCsvValue(row[c.key])).join(','))
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${csvName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function renderDisplay(col: ColumnDef<T>, value: unknown) {
    switch (col.type) {
      case 'currency':
        return formatCurrency(value)
      case 'number':
        return formatNumber(value)
      case 'percent':
        return formatPercent(value)
      case 'date':
        return formatDate(value)
      case 'badge':
        return value ? <Badge label={String(value)} /> : '—'
      default:
        return value === null || value === undefined || value === '' ? '—' : String(value)
    }
  }

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
    >
      <div
        className="flex flex-wrap items-center gap-2 border-b p-3"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <div
          className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="Search…"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <span className="text-xs tabular" style={{ color: 'var(--text-muted)' }}>
          {formatNumber(sorted.length)} rows
        </span>
        <div className="ml-auto flex items-center gap-2">
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
            >
              <Plus size={14} /> Add row
            </button>
          )}
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-semibold"
                  style={{ color: 'var(--text-secondary)', width: col.width }}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ArrowUpDown size={11} className="opacity-30" />
                    )}
                  </span>
                </th>
              ))}
              {onDelete && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (onDelete ? 1 : 0)}
                  className="px-3 py-10 text-center text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {emptyLabel}
                </td>
              </tr>
            )}
            {paged.map((row) => {
              const id = getId(row)
              return (
                <tr
                  key={id}
                  className="border-t"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  {columns.map((col) => {
                    const value = row[col.key]
                    const isEditing = editingCell?.id === id && editingCell.key === col.key
                    const editable = col.editable && !!onUpdate
                    return (
                      <td
                        key={col.key}
                        onDoubleClick={() => editable && startEdit(id, col.key, value)}
                        className={`px-3 py-2 tabular ${col.align === 'right' ? 'text-right' : ''} ${
                          editable ? 'cursor-text' : ''
                        }`}
                        style={{ color: 'var(--text-primary)', maxWidth: col.width ?? '280px' }}
                      >
                        {isEditing ? (
                          col.type === 'select' && col.options ? (
                            <select
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(col)}
                              className="w-full rounded border px-1 py-0.5 text-sm"
                              style={{ borderColor: 'var(--border-strong)' }}
                            >
                              <option value="" />
                              {col.options.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              autoFocus
                              value={editValue}
                              type={col.type === 'number' || col.type === 'currency' || col.type === 'percent' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(col)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit(col)
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              className="w-full rounded border px-1 py-0.5 text-sm"
                              style={{ borderColor: 'var(--border-strong)' }}
                            />
                          )
                        ) : col.type === undefined || col.type === 'text' ? (
                          <span
                            className="block truncate"
                            title={value === null || value === undefined ? undefined : String(value)}
                          >
                            {renderDisplay(col, value)}
                          </span>
                        ) : (
                          renderDisplay(col, value)
                        )}
                      </td>
                    )
                  })}
                  {onDelete && (
                    <td className="px-2 text-center">
                      <button
                        onClick={() => onDelete(id)}
                        aria-label="Delete row"
                        style={{ color: 'var(--text-muted)' }}
                        className="rounded p-1 hover:text-[color:var(--status-critical)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div
          className="flex items-center justify-between border-t px-3 py-2 text-xs"
          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}
        >
          <span>
            Page {clampedPage + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <button
              disabled={clampedPage === 0}
              onClick={() => setPage(clampedPage - 1)}
              className="rounded border px-2 py-1 disabled:opacity-40"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              Prev
            </button>
            <button
              disabled={clampedPage >= pageCount - 1}
              onClick={() => setPage(clampedPage + 1)}
              className="rounded border px-2 py-1 disabled:opacity-40"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
