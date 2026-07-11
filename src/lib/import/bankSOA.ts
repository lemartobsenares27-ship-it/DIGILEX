import { findColumn, findHeaderRow, gridToRecords, toDateString, toNumber, type RawSheet } from './parseFile'
import { applyRules, loadCategorizationRules } from './categorize'
import { existingReferenceNumbers } from './dedupe'
import type { BankTxnDraft } from './types'

const HEADER_VARIANTS = [
  ['Transaction Date', 'Trans Date', 'Txn Date'],
  ['Value Date'],
  ['Reference Number', 'Reference No', 'Ref No', 'Reference'],
  ['Description', 'Narration', 'Particulars'],
  ['Debit', 'Debit Amount', 'Withdrawal'],
  ['Credit', 'Credit Amount', 'Deposit'],
  ['Running Balance', 'Balance'],
]

export type UBAccount = 'UB Corporate' | 'UB Purchaser Fund' | 'Unconfirmed'

export function detectAccountNumber(grid: unknown[][]): string | null {
  for (let r = 0; r < Math.min(15, grid.length); r++) {
    const row = grid[r] ?? []
    for (const cell of row) {
      const s = String(cell ?? '')
      if (/account/i.test(s)) {
        const match = s.match(/(\d{6,})/)
        if (match) return match[1]
      }
    }
  }
  return null
}

export interface ParsedBankSOA {
  drafts: BankTxnDraft[]
  detectedAccountNumber: string | null
}

export async function parseBankSOA(sheet: RawSheet): Promise<ParsedBankSOA> {
  const { grid } = sheet
  const { headerRowIndex, headers } = findHeaderRow(grid, HEADER_VARIANTS)
  const records = gridToRecords(grid, headerRowIndex, headers)

  const dateCol = findColumn(headers, HEADER_VARIANTS[0])
  const valueDateCol = findColumn(headers, HEADER_VARIANTS[1])
  const refCol = findColumn(headers, HEADER_VARIANTS[2])
  const descCol = findColumn(headers, HEADER_VARIANTS[3])
  const debitCol = findColumn(headers, HEADER_VARIANTS[4])
  const creditCol = findColumn(headers, HEADER_VARIANTS[5])
  const balCol = findColumn(headers, HEADER_VARIANTS[6])

  const rules = await loadCategorizationRules()
  const existingRefs = await existingReferenceNumbers()

  const drafts: BankTxnDraft[] = records.map((r, i) => {
    const description = descCol ? String(r[descCol] ?? '').trim() : null
    const { category, department } = applyRules(description, rules)
    const referenceNumber = refCol ? String(r[refCol] ?? '').trim() || null : null
    const isDuplicate = !!referenceNumber && existingRefs.has(referenceNumber.toUpperCase())
    return {
      key: `bank-${i}`,
      date: dateCol ? toDateString(r[dateCol]) : null,
      valueDate: valueDateCol ? toDateString(r[valueDateCol]) : null,
      referenceNumber,
      description,
      debit: debitCol ? toNumber(r[debitCol]) : 0,
      credit: creditCol ? toNumber(r[creditCol]) : 0,
      runningBalance: balCol ? toNumber(r[balCol]) : null,
      category,
      department,
      include: !isDuplicate,
      isDuplicate,
    }
  })

  return { drafts, detectedAccountNumber: detectAccountNumber(grid) }
}
