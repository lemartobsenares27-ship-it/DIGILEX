import { findColumn, findHeaderRow, gridToRecords, toNumber, type RawSheet } from './parseFile'
import type { AdPerformanceRow } from '../types'

const V_AD_NAME = ['Ad name', 'Ad Name', 'Ad']
const V_CAMPAIGN = ['Campaign name', 'Campaign Name', 'Campaign']
const V_AD_ID = ['Ad ID', 'Ad Id']
const V_AD_SET = ['Ad set name', 'Ad Set Name', 'Ad Set']
const V_DELIVERY = ['Delivery', 'Delivery status', 'Ad delivery', 'Status']
const V_SPEND = ['Amount spent (PHP)', 'Amount spent', 'Amount Spent', 'Spend']
const V_RESULTS = ['Results']
const V_RESULT_TYPE = ['Result type', 'Result Type', 'Result indicator']
const V_COST_PER_RESULT = ['Cost per result', 'Cost per results']
const V_CTR = ['CTR (all)', 'CTR (link click-through rate)', 'CTR']
const V_IMPRESSIONS = ['Impressions']
const V_REACH = ['Reach']
const V_FREQUENCY = ['Frequency']
const V_HOOK = ['Hook rate', 'Hook Rate']
const V_HOLD = ['Hold rate', 'Hold Rate']

const HEADER_VARIANTS = [
  V_AD_NAME, V_CAMPAIGN, V_AD_ID, V_AD_SET, V_DELIVERY, V_SPEND, V_RESULTS,
  V_RESULT_TYPE, V_COST_PER_RESULT, V_CTR, V_IMPRESSIONS, V_REACH, V_FREQUENCY, V_HOOK, V_HOLD,
]

export function parseMetaAdsPerformance(sheet: RawSheet, uploadDate: string): AdPerformanceRow[] {
  const { grid } = sheet
  const { headerRowIndex, headers } = findHeaderRow(grid, HEADER_VARIANTS)
  const records = gridToRecords(grid, headerRowIndex, headers)

  const adNameCol = findColumn(headers, V_AD_NAME)
  const campaignCol = findColumn(headers, V_CAMPAIGN)
  const adIdCol = findColumn(headers, V_AD_ID)
  const adSetCol = findColumn(headers, V_AD_SET)
  const deliveryCol = findColumn(headers, V_DELIVERY)
  const spendCol = findColumn(headers, V_SPEND)
  const resultsCol = findColumn(headers, V_RESULTS)
  const resultTypeCol = findColumn(headers, V_RESULT_TYPE)
  const costPerResultCol = findColumn(headers, V_COST_PER_RESULT)
  const ctrCol = findColumn(headers, V_CTR)
  const impressionsCol = findColumn(headers, V_IMPRESSIONS)
  const reachCol = findColumn(headers, V_REACH)
  const frequencyCol = findColumn(headers, V_FREQUENCY)
  const hookCol = findColumn(headers, V_HOOK)
  const holdCol = findColumn(headers, V_HOLD)

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
        'Ad ID': adIdCol ? String(r[adIdCol] ?? '').trim() || null : null,
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

/** Stable identity for an ad across uploads: prefer the real Ad ID Meta assigns, since names can repeat across campaigns. */
export function adIdentityKey(row: AdPerformanceRow): string {
  return row['Ad ID'] || `${row['Campaign Name'] ?? ''}|${row['Ad Name'] ?? ''}`
}
