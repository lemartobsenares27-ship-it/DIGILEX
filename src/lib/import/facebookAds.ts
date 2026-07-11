import { findColumn, findHeaderRow, gridToRecords, toDateString, toNumber, type RawSheet } from './parseFile'
import type { FBAdsRowDraft } from './types'
import { db } from '../db'

const HEADER_VARIANTS = [
  ['Date', 'Day'],
  ['Campaign Name', 'Campaign'],
  ['Ad Set Name', 'Ad Set'],
  ['Ad Name', 'Ad'],
  ['Amount Spent (PHP)', 'Amount Spent', 'Spend'],
  ['Impressions'],
  ['Reach'],
  ['Link Clicks', 'Clicks'],
  ['CTR (Link Click-Through Rate)', 'CTR (All)', 'CTR'],
  ['CPC (Cost per Link Click)', 'CPC (All)', 'CPC'],
  ['CPM (Cost per 1,000 Impressions)', 'CPM'],
  ['Results'],
  ['Cost per Result', 'Cost per Results'],
  ['Purchase ROAS (Return on Ad Spend)', 'Purchase ROAS', 'ROAS'],
  ['Frequency'],
]

export async function parseFacebookAdsExport(sheet: RawSheet): Promise<FBAdsRowDraft[]> {
  const { grid } = sheet
  const { headerRowIndex, headers } = findHeaderRow(grid, HEADER_VARIANTS)
  const records = gridToRecords(grid, headerRowIndex, headers)

  const dateCol = findColumn(headers, HEADER_VARIANTS[0])
  const campaignCol = findColumn(headers, HEADER_VARIANTS[1])
  const adSetCol = findColumn(headers, HEADER_VARIANTS[2])
  const adNameCol = findColumn(headers, HEADER_VARIANTS[3])
  const spendCol = findColumn(headers, HEADER_VARIANTS[4])
  const impressionsCol = findColumn(headers, HEADER_VARIANTS[5])
  const reachCol = findColumn(headers, HEADER_VARIANTS[6])
  const clicksCol = findColumn(headers, HEADER_VARIANTS[7])
  const ctrCol = findColumn(headers, HEADER_VARIANTS[8])
  const cpcCol = findColumn(headers, HEADER_VARIANTS[9])
  const cpmCol = findColumn(headers, HEADER_VARIANTS[10])
  const resultsCol = findColumn(headers, HEADER_VARIANTS[11])
  const costPerResultCol = findColumn(headers, HEADER_VARIANTS[12])
  const roasCol = findColumn(headers, HEADER_VARIANTS[13])
  const frequencyCol = findColumn(headers, HEADER_VARIANTS[14])

  const existing = await db.fbTxns.toArray()
  const existingKeys = new Set(existing.map((t) => `${t.Date}|${t.Campaign ?? ''}`.toUpperCase()))

  return records.map((r, i) => {
    const date = dateCol ? toDateString(r[dateCol]) : null
    const campaign = campaignCol ? String(r[campaignCol] ?? '').trim() || null : null
    const key = `${date}|${campaign ?? ''}`.toUpperCase()
    return {
      key: `fb-${i}`,
      date,
      campaign,
      adSet: adSetCol ? String(r[adSetCol] ?? '').trim() || null : null,
      adName: adNameCol ? String(r[adNameCol] ?? '').trim() || null : null,
      amountSpent: spendCol ? toNumber(r[spendCol]) : 0,
      impressions: impressionsCol ? toNumber(r[impressionsCol]) : null,
      reach: reachCol ? toNumber(r[reachCol]) : null,
      linkClicks: clicksCol ? toNumber(r[clicksCol]) : null,
      ctr: ctrCol ? toNumber(r[ctrCol]) : null,
      cpc: cpcCol ? toNumber(r[cpcCol]) : null,
      cpm: cpmCol ? toNumber(r[cpmCol]) : null,
      results: resultsCol ? toNumber(r[resultsCol]) : null,
      costPerResult: costPerResultCol ? toNumber(r[costPerResultCol]) : null,
      roas: roasCol ? toNumber(r[roasCol]) : null,
      frequency: frequencyCol ? toNumber(r[frequencyCol]) : null,
      include: !existingKeys.has(key),
      isDuplicate: existingKeys.has(key),
    }
  })
}
