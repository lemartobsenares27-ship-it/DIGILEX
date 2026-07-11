import { useLiveQuery } from 'dexie-react-hooks'
import type { Table } from 'dexie'

export function useLiveTable<T>(table: Table<T, number>): T[] {
  return useLiveQuery(() => table.toArray(), [table]) ?? []
}
