import { db } from '../db'

export async function existingReferenceNumbers(): Promise<Set<string>> {
  const [expenses, income] = await Promise.all([db.expenses.toArray(), db.income.toArray()])
  const set = new Set<string>()
  for (const e of expenses) {
    if (e['Reference Number']) set.add(String(e['Reference Number']).trim().toUpperCase())
  }
  for (const i of income) {
    if (i['Order ID']) set.add(String(i['Order ID']).trim().toUpperCase())
  }
  return set
}

export async function existingTrackingNumbers(): Promise<Map<string, number>> {
  const orders = await db.orders.toArray()
  const map = new Map<string, number>()
  for (const o of orders) {
    const tn = o['Order / Tracking #']
    if (tn && o.id) map.set(String(tn).trim().toUpperCase(), o.id)
  }
  return map
}

export async function existingOrderIds(): Promise<Set<string>> {
  const income = await db.income.toArray()
  const set = new Set<string>()
  for (const i of income) {
    if (i['Order ID']) set.add(String(i['Order ID']).trim().toUpperCase())
  }
  return set
}
