import { findColumn, findHeaderRow, gridToRecords, toNumber, type RawSheet } from './parseFile'
import type { AdPerformanceRow } from '../types'

const HEADER_VARIANTS = [
  ['Ad name', 'Ad Name', 'Ad'],
  ['Campaign name', 'Campaign Name', 'Campaign'],
  ['Ad set name', 'Ad Set Name', 'Ad Set'],
  ['Delivery', 'Delivery status', 'Ad delivery', 'Status'],
  ['Amount spent (PHP)', 'Amount spent', 'Amount Spent', 'Spend'],
  ['Results'],
  ['Result type', 'Result Type', 'Result indicator'],
  ['Cost per result', 'Cost per results'],
  ['CTR (all)', 'CTR (link click-through rate)', 'CTR'],
  ['Impressions'],
  ['Reach'],
  ['Frequency'],
  ['Hook rate', 'Hook Rate'],
  ['Hold rate', 'Hold Rate'],
]

export function parseMetaAdsPerformance(sheet: RawSheet, uploadDate: string): AdPerformanceRow[] {
  const { grid } = sheet
  const { headerRowIndex, headers } = findHeaderRow(grid, HEADER_VARIANTS)
  const records = gridToRecords(grid, headerRowIndex, headers)

  const adNameCol = findColumn(headers, HEADER_VARIANTS[0])
  const campaignCol = findColumn(headers, HEADER_VARIANTS[1])
  const adSetCol = findColumn(headers, HEADER_VARIANTS[2])
  const deliveryCol = findColumn(headers, HEADER_VARIANTS[3])
  const spendCol = findColumn(headers, HEADER_VARIANTS[4])
  const resultsCol = findColumn(headers, HEADER_VARIANTS[5])
  const resultTypeCol = findColumn(headers, HEADER_VARIANTS[6])
  const costPerResultCol = findColumn(headers, HEADER_VARIANTS[7])
  const ctrCol = findColumn(headers, HEADER_VARIANTS[8])
  const impressionsCol = findColumn(headers, HEADER_VARIANTS[9])
  const reachCol = findColumn(headers, HEADER_VARIANTS[10])
  const frequencyCol = findColumn(headers, HEADER_VARIANTS[11])
  const hookCol = findColumn(headers, HEADER_VARIANTS[12])
  const holdCol = findColumn(headers, HEADER_VARIANTS[13])

  if (!adNameCol) {
    throw new Error('Could not find an "Ad name" column in this file — please check it\'s a per-ad export from Facebook Ads Manager.')
  }

  return records
    .map((r): AdPerformanceRow | null => {
      const adName = String(r[adNameCol] ?? '').trim()
      if (!adName) return null
      const spend = spendCol ? toNumber(r[spendCol]) : 0
      const results = resultsCol ? toNumber(r[resultsCol]) : null
      const costPerResult = costPerResultCol
        ? toNumber(r[costPerResultCol])
        : results && results > 0
          ? spend / results
          : null
      return {
        'Ad Name': adName,
        'Campaign Name': campaignCol ? String(r[campaignCol] ?? '').trim() || null : null,
        'Ad Set Name': adSetCol ? String(r[adSetCol] ?? '').trim() || null : null,
        'Delivery Status': deliveryCol ? String(r[deliveryCol] ?? '').trim() || null : null,
        'Upload Date': uploadDate,
        'Amount Spent': spend,
        Results: results,
        'Result Type': resultTypeCol ? String(r[resultTypeCol] ?? '').trim() || null : null,
        'Cost Per Result': costPerResult,
        CTR: ctrCol ? toNumber(r[ctrCol]) : null,
        Impressions: impressionsCol ? toNumber(r[impressionsCol]) : null,
        Reach: reachCol ? toNumber(r[reachCol]) : null,
        Frequency: frequencyCol ? toNumber(r[frequencyCol]) : null,
        'Hook Rate': hookCol ? toNumber(r[hookCol]) : null,
        'Hold Rate': holdCol ? toNumber(r[holdCol]) : null,
        Lifecycle: null,
        Score: null,
      }
    })
    .filter((r): r is AdPerformanceRow => r !== null)
}
