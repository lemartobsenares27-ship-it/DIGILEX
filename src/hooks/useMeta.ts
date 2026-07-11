import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

export function useMeta<T>(key: string, fallback: T): [T, (value: T) => void] {
  const value = useLiveQuery(async () => {
    const row = await db.meta.get(key)
    return row?.value as T | undefined
  }, [key])
  const set = (v: T) => {
    db.meta.put({ key, value: v })
  }
  return [value ?? fallback, set]
}
