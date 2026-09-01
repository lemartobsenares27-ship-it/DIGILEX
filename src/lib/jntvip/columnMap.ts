// Generic, reusable column-mapping helpers for the J&T VIP importers.
//
// Both the POS importer and the SOA importer let the user confirm/adjust
// which file column feeds which internal field, and remember that mapping
// in jntVipDb.meta for next time. We never silently invent a mapping for a field
// the file doesn't clearly have — an unresolved field is left "— none —"
// and the user must either map it or accept it's absent.

import { jntVipDb } from './db'
import { findColumn, type HeaderMatch } from '../import/parseFile'

export function guessHeaderRow(grid: unknown[][]): HeaderMatch {
  for (let r = 0; r < Math.min(20, grid.length); r++) {
    const row = grid[r] ?? []
    const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '')
    if (nonEmpty.length >= 3) {
      return { headerRowIndex: r, headers: row.map((c) => String(c ?? '').trim()) }
    }
  }
  return { headerRowIndex: 0, headers: (grid[0] ?? []).map((c) => String(c ?? '').trim()) }
}

export function guessColumnMap<K extends string>(
  headers: string[],
  fieldVariants: Record<K, string[]>,
): Record<K, string | null> {
  const out = {} as Record<K, string | null>
  for (const key of Object.keys(fieldVariants) as K[]) {
    out[key] = findColumn(headers, fieldVariants[key])
  }
  return out
}

export async function loadSavedMapping(metaKey: string): Promise<Record<string, string | null> | null> {
  const row = await jntVipDb.meta.get(metaKey)
  return (row?.value as Record<string, string | null> | undefined) ?? null
}

export async function saveMapping(metaKey: string, mapping: Record<string, string | null>): Promise<void> {
  await jntVipDb.meta.put({ key: metaKey, value: mapping })
}
