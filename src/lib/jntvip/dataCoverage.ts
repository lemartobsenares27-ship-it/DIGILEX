// How current each source is, and what to upload to close the gap.
//
// "What do I need to send you?" is a question this system should be able to
// answer about itself. Every page here is only as true as the file behind it,
// and the gaps are not obvious from looking at the numbers: a profit figure
// built on a card statement that stops six weeks ago looks exactly like one
// built on a statement that arrived this morning.
//
// So each source reports the last day it covers, measured from its own rows
// rather than written down by hand. A source nobody has updated goes stale on
// its own and says so.
//
// Dates only — this says nothing about whether the contents are right. That is
// the reconciliation pages' job.

import { ERPOD_FORMS } from './erpod'
import { RCBC_COMPLETE_THROUGH, GOTYME_COMPLETE_THROUGH } from './adSpend'
import { AD_PRODUCT_WINDOW } from './adByProduct'
import type { JntVipParcelRow, JntVipSoaCheckRow, JntVipPosOrderRow } from './types'

export type Freshness = 'current' | 'behind' | 'stale' | 'missing'

export interface CoverageLine {
  key: string
  label: string
  /** What this file drives, so the cost of it being stale is visible. */
  feeds: string
  /** Last day the source covers, or null when nothing is loaded. */
  through: string | null
  daysBehind: number | null
  freshness: Freshness
  /** What to upload, in the words of the thing being uploaded. */
  upload: string
  /** Where it comes from. */
  where: string
}

/**
 * How many days behind a source may fall before it is worth saying so.
 *
 * Statements arrive on their own schedule, so a card is not "late" at three
 * days the way a daily parcel export would be. The thresholds differ by source
 * for that reason rather than applying one number to all of them.
 */
interface Thresholds {
  behind: number
  stale: number
}

function rate(through: string | null, asOf: string, t: Thresholds): { daysBehind: number | null; freshness: Freshness } {
  if (!through) return { daysBehind: null, freshness: 'missing' }
  const days = Math.max(
    0,
    Math.round((Date.parse(asOf + 'T00:00:00Z') - Date.parse(through + 'T00:00:00Z')) / 86400000),
  )
  return {
    daysBehind: days,
    freshness: days <= t.behind ? 'current' : days <= t.stale ? 'behind' : 'stale',
  }
}

const maxOf = (xs: (string | null | undefined)[]): string | null => {
  const clean = xs.filter((x): x is string => !!x).sort()
  return clean.length > 0 ? clean[clean.length - 1] : null
}

export function dataCoverage(
  parcels: JntVipParcelRow[],
  soas: JntVipSoaCheckRow[],
  posOrders: JntVipPosOrderRow[],
  asOf: string,
): CoverageLine[] {
  const lines: Omit<CoverageLine, 'daysBehind' | 'freshness'>[] = []
  const t: Record<string, Thresholds> = {
    parcels: { behind: 3, stale: 7 },
    soa: { behind: 4, stale: 10 },
    pos: { behind: 3, stale: 7 },
    erpod: { behind: 7, stale: 21 },
    card: { behind: 10, stale: 35 },
    meta: { behind: 7, stale: 21 },
  }

  const parcelThrough = maxOf(parcels.map((p) => p.podDate ?? p.shipDate))
  lines.push({
    key: 'parcels',
    label: 'J&T waybill export',
    feeds: 'Every parcel count, return rate, product P&L and the returns worklist.',
    through: parcelThrough,
    upload: 'the waybill-level export, all statuses, from the first of the month to today',
    where: 'J&T VIP dashboard → orders / waybill export',
  })

  const soaThrough = maxOf(soas.map((s) => s.periodTo))
  lines.push({
    key: 'soa',
    label: 'J&T statements of account',
    feeds: 'Revenue, freight, commission, VAT, RTS fees — everything money is judged on.',
    through: soaThrough,
    upload: 'every SOA PDF since the last one on file',
    where: 'the SOA emails from J&T',
  })

  const posThrough = maxOf(posOrders.map((o) => o.shipDate ?? o.orderDate))
  lines.push({
    key: 'pos',
    label: 'POS orders',
    feeds: 'The order side of every match, and which product each waybill carried.',
    through: posThrough,
    upload: 'the POS order export covering the same dates as the waybill file',
    where: 'your POS → orders → export',
  })

  lines.push({
    key: 'erpod',
    label: 'Courier handover forms',
    feeds: 'The only proof a returned box reached the house.',
    through: maxOf(ERPOD_FORMS.map((f) => f.date)),
    upload: 'every E-RPOD form photo not already on the register',
    where: 'the J&T seller group chat',
  })

  for (const source of ['GOTYME', 'RCBC'] as const) {
    // The statements themselves have been read, so the cut-off PROVED complete
    // is known — a stronger claim than the date of the last charge entered,
    // which only says when somebody last typed something in.
    const through = source === 'RCBC' ? RCBC_COMPLETE_THROUGH : GOTYME_COMPLETE_THROUGH
    lines.push({
      key: `card-${source}`,
      label: `${source === 'GOTYME' ? 'GoTyme' : 'RCBC'} card statement`,
      feeds: 'Advertising, which is the largest cost in the business.',
      through,
      upload: 'the next statement when it arrives, or the recent transactions screen',
      where: `the ${source === 'GOTYME' ? 'GoTyme' : 'RCBC'} app`,
    })
  }

  lines.push({
    key: 'meta',
    label: 'Meta Ads Manager export',
    feeds: 'Splitting advertising between the four products. Without it the split falls back to parcels.',
    through: AD_PRODUCT_WINDOW.to,
    upload: 'campaign-level spend and purchases for all four ad accounts',
    where: 'Ads Manager → campaigns → export',
  })

  return lines.map((l) => ({ ...l, ...rate(l.through, asOf, t[l.key] ?? t.parcels) }))
}

/** The ones worth chasing first: stale or missing, worst first. */
export function needsAttention(lines: CoverageLine[]): CoverageLine[] {
  const rank: Record<Freshness, number> = { missing: 0, stale: 1, behind: 2, current: 3 }
  return lines
    .filter((l) => l.freshness !== 'current')
    .sort((a, b) => rank[a.freshness] - rank[b.freshness] || (b.daysBehind ?? 0) - (a.daysBehind ?? 0))
}
