import { db } from '../db'
import type { CategorizationRuleRow } from '../db'

export interface CategoryMatch {
  category: string
  department: string
  matchedRule: boolean
}

const FALLBACK: CategoryMatch = { category: 'Miscellaneous', department: 'Admin', matchedRule: false }

export function applyRules(description: string | null, rules: CategorizationRuleRow[]): CategoryMatch {
  const upper = (description ?? '').toUpperCase()
  if (!upper) return FALLBACK
  for (const rule of rules) {
    if (rule.keywords.some((k) => k && upper.includes(k.toUpperCase()))) {
      return { category: rule.category, department: rule.department, matchedRule: true }
    }
  }
  return FALLBACK
}

export async function loadCategorizationRules(): Promise<CategorizationRuleRow[]> {
  return db.categorizationRules.toArray()
}
