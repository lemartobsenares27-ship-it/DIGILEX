import { findColumn, findHeaderRow, gridToRecords, toDateString, toNumber, type RawSheet } from './parseFile'
import type { FBAdsRowDraft } from './types'
import { db } from '../db'

const HEADER_VARIANTS = [
  ['Date', 'Day', 'Reporting starts'],
  ['Campaign Name', 'Campaign', 'Campaign name'],
  ['Ad Set Name', 'Ad Set'],
  ['Ad Name', 'Ad'],
  ['Amount Spent (PHP)', 'Amount Spent', 'Spend', 'Amount spent (PHP)'],
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
  // Dedicated purchase-count and purchase-value columns, present on exports
  // that break results down by a demographic/placement dimension (Age,
  // Gender, Platform, ...). "Results" on those exports reflects whatever
  // metric each ad set/campaign optimizes for (could be a peso value for
  // value-based bidding, or a messaging-conversation count for Messenger
  // campaigns) — not reliably a purchase count. "Purchases" always is.
  ['Purchases'],
  ['Purchases conversion value', 'Purchase conversion value'],
]

// Real Ads Manager exports broken down by a dimension we don't track
// (Age, Gender, Placement, ...) repeat one row per campaign+day per
// breakdown value, most with spend but zero purchases. Importing those
// as-is would scatter one campaign-day's real spend/purchases across
// several disconnected transaction rows and corrupt any weighted-ROAS
// math downstream (e.g. averaging only the rows that happened to convert
// while ignoring the spend on rows that didn't). Collapse everything
// sharing the same Date + Campaign + Ad Set + Ad back into one row before
// handing it off, summing spend/purchases/impressions/clicks and deriving
// CTR/CPC/CPM/ROAS from those sums rather than averaging the raw per-row
// values.
interface RawAdRow {
  date: string | null
  campaign: string | null
  adSet: string | null
  adName: string | null
  amountSpent: number
  impressions: number | null
  reach: number | null
  linkClicks: number | null
  results: number | null
  purchases: number | null
  purchaseValue: number | null
  frequency: number | null
}

function aggregateByDateAndCampaign(rows: RawAdRow[]): RawAdRow[] {
  const groups = new Map<string, RawAdRow>()
  for (const r of rows) {
    const key = `${r.date ?? ''}|${r.campaign ?? ''}|${r.adSet ?? ''}|${r.adName ?? ''}`
    const g = groups.get(key)
    if (!g) {
      groups.set(key, { ...r })
      continue
    }
    g.amountSpent += r.amountSpent
    g.impressions = (g.impressions ?? 0) + (r.impressions ?? 0)
    g.reach = Math.max(g.reach ?? 0, r.reach ?? 0) // reach de-dupes across breakdowns, spend/clicks don't
    g.linkClicks = (g.linkClicks ?? 0) + (r.linkClicks ?? 0)
    g.results = r.results !== null ? (g.results ?? 0) + r.results : g.results
    g.purchases = r.purchases !== null ? (g.purchases ?? 0) + r.purchases : g.purchases
    g.purchaseValue = r.purchaseValue !== null ? (g.purchaseValue ?? 0) + r.purchaseValue : g.purchaseValue
  }
  return [...groups.values()]
}

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
  const resultsCol = findColumn(headers, HEADER_VARIANTS[11])
  const frequencyCol = findColumn(headers, HEADER_VARIANTS[14])
  const purchasesCol = findColumn(headers, HEADER_VARIANTS[15])
  const purchaseValueCol = findColumn(headers, HEADER_VARIANTS[16])

  // toNumber() maps blank/null cells to 0 — which is correct here: Meta
  // leaves a cell blank to mean "zero that day" (e.g. zero purchases), not
  // "not tracked." Only treat a value as null when the column itself is
  // absent from the file (tracked via the `xCol` presence check).
  const rawRows: RawAdRow[] = records.map((r) => ({
    date: dateCol ? toDateString(r[dateCol]) : null,
    campaign: campaignCol ? String(r[campaignCol] ?? '').trim() || null : null,
    adSet: adSetCol ? String(r[adSetCol] ?? '').trim() || null : null,
    adName: adNameCol ? String(r[adNameCol] ?? '').trim() || null : null,
    amountSpent: spendCol ? toNumber(r[spendCol]) : 0,
    impressions: impressionsCol ? toNumber(r[impressionsCol]) : null,
    reach: reachCol ? toNumber(r[reachCol]) : null,
    linkClicks: clicksCol ? toNumber(r[clicksCol]) : null,
    results: resultsCol ? toNumber(r[resultsCol]) : null,
    purchases: purchasesCol ? toNumber(r[purchasesCol]) : null,
    purchaseValue: purchaseValueCol ? toNumber(r[purchaseValueCol]) : null,
    frequency: frequencyCol ? toNumber(r[frequencyCol]) : null,
  }))

  const aggregated = aggregateByDateAndCampaign(rawRows)

  const existing = await db.fbTxns.toArray()
  const existingKeys = new Set(existing.map((t) => `${t.Date}|${t.Campaign ?? ''}`.toUpperCase()))

  return aggregated.map((g, i) => {
    const key = `${g.date}|${g.campaign ?? ''}`.toUpperCase()
    // Prefer the dedicated "Purchases" count over generic "Results" —
    // Results reflects whatever metric that ad set optimizes for, which
    // isn't always a purchase count (see comment on HEADER_VARIANTS above).
    const results = g.purchases !== null ? g.purchases : g.results
    // Blended ROAS from summed conversion value ÷ summed spend across the
    // WHOLE campaign-day (including breakdown rows with zero purchases),
    // not an average of only the rows that happened to convert.
    const roas = g.purchaseValue !== null && g.amountSpent > 0 ? g.purchaseValue / g.amountSpent : null
    const ctr = g.linkClicks !== null && g.impressions ? (g.linkClicks / g.impressions) * 100 : null
    const cpc = g.linkClicks ? g.amountSpent / g.linkClicks : null
    const cpm = g.impressions ? (g.amountSpent / g.impressions) * 1000 : null
    const costPerResult = results ? g.amountSpent / results : null
    return {
      key: `fb-${i}`,
      date: g.date,
      campaign: g.campaign,
      adSet: g.adSet,
      adName: g.adName,
      amountSpent: g.amountSpent,
      impressions: g.impressions,
      reach: g.reach,
      linkClicks: g.linkClicks,
      ctr,
      cpc,
      cpm,
      results,
      costPerResult,
      roas,
      purchaseValue: g.purchaseValue,
      frequency: g.frequency,
      include: !existingKeys.has(key),
      isDuplicate: existingKeys.has(key),
    }
  })
}
