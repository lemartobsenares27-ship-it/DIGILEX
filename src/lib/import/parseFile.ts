import * as XLSX from 'xlsx'

export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export interface RawSheet {
  fileName: string
  grid: unknown[][]
}

const SUPPORTED_EXTENSIONS = ['csv', 'xlsx', 'xls']

export async function parseSpreadsheetFile(file: File): Promise<RawSheet> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error(
      `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB, over the 10MB limit — please split it into smaller batches.`,
    )
  }

  if (ext === 'pdf') {
    throw new Error(
      `PDF import isn't supported yet, since bank/courier PDFs vary too much to parse reliably. Please re-export "${file.name}" as CSV or Excel and upload that instead.`,
    )
  }

  if (!ext || !SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type ".${ext ?? ''}". Please upload a CSV or Excel (.xlsx/.xls) file.`)
  }

  let workbook: XLSX.WorkBook
  if (ext === 'csv') {
    const text = await file.text()
    workbook = XLSX.read(text, { type: 'string' })
  } else {
    const buf = await file.arrayBuffer()
    workbook = XLSX.read(buf, { type: 'array', cellDates: true })
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error(`No sheets found in "${file.name}".`)
  }
  const sheet = workbook.Sheets[sheetName]
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true })

  return { fileName: file.name, grid }
}

export interface HeaderMatch {
  headerRowIndex: number
  headers: string[]
}

/**
 * Real-world bank/courier exports often have a few metadata rows (account
 * number, report title, blank rows) before the actual column header row.
 * Scan the first N rows and pick whichever one best matches the expected
 * column-name variants for this import type.
 */
export function findHeaderRow(grid: unknown[][], expectedHeaderVariants: string[][], scanRows = 20): HeaderMatch {
  let best: HeaderMatch | null = null
  let bestScore = 0

  for (let r = 0; r < Math.min(scanRows, grid.length); r++) {
    const row = grid[r] ?? []
    const cells = row.map((c) => String(c ?? '').trim().toUpperCase())
    let score = 0
    for (const variants of expectedHeaderVariants) {
      if (variants.some((v) => cells.some((c) => c === v.toUpperCase()))) score++
    }
    if (score > bestScore) {
      bestScore = score
      best = {
        headerRowIndex: r,
        headers: row.map((c) => String(c ?? '').trim()),
      }
    }
  }

  if (!best || bestScore < 2) {
    throw new Error(
      'Could not find a recognizable header row in this file. Please check that it matches the expected export format, or use the generic column mapper.',
    )
  }
  return best
}

export function gridToRecords(grid: unknown[][], headerRowIndex: number, headers: string[]): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = []
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r]
    if (!row || row.every((c) => c === null || c === undefined || c === '')) continue
    const record: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      if (h) record[h] = row[i] ?? null
    })
    records.push(record)
  }
  return records
}

export function findColumn(headers: string[], variants: string[]): string | null {
  const upperVariants = variants.map((v) => v.toUpperCase())
  for (const h of headers) {
    if (upperVariants.includes(h.trim().toUpperCase())) return h
  }
  // fall back to partial/contains match
  for (const h of headers) {
    const upper = h.trim().toUpperCase()
    if (upperVariants.some((v) => upper.includes(v))) return h
  }
  return null
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[₱,\s]/g, '').replace(/^\((.*)\)$/, '-$1')
  const n = Number(cleaned)
  return Number.isNaN(n) ? 0 : n
}

export function toDateString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const mm = String(parsed.m).padStart(2, '0')
      const dd = String(parsed.d).padStart(2, '0')
      return `${parsed.y}-${mm}-${dd}`
    }
  }
  const dt = new Date(String(value))
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
  return null
}
