// Everything that needs attention, in one ranked list.
//
// The problems this app can find are scattered across four pages: a statement
// whose arithmetic is off is on SOA Check, money that never arrived is on
// Finance, a missing statement is on Statements, parcels with no product are on
// Products. Each page is right to show its own, and none of them answers the
// question you actually have on a Monday — what should I deal with first.
//
// So this collects them and orders them by urgency first, then by money within
// each level. Pure money ordering would put a large but harmless gap above a
// remittance that is genuinely missing; pure severity would bury the biggest
// number under a cosmetic flag. Where an issue has no peso value it sorts last
// inside its own group rather than being handed an invented one.

import type { JntVipSoaCheckRow, JntVipParcelRow, JntVipProductRow, JntVipParcelProductRow } from './types'
import { toStatementRows, findPeriodGaps } from './finance'
import { resolveProduct, pinnedMap, UNCLASSIFIED } from './products'
import { rtsByPeriod, rtsTrend, makeResolver } from './rts'

export type IssueSeverity = 'critical' | 'warning' | 'info'

export interface Issue {
  id: string
  severity: IssueSeverity
  title: string
  detail: string
  /** Pesos at stake, in centavos. Null where the issue has no direct value. */
  amount: number | null
  /** What to do about it. */
  action: string
  /** Where in the app to go. */
  to: string
  toLabel: string
}

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export interface IssueInput {
  soaRows: JntVipSoaCheckRow[]
  parcels: JntVipParcelRow[]
  products: JntVipProductRow[]
  parcelProducts: JntVipParcelProductRow[]
  /** Statements older than this with no payment are treated as overdue. */
  overdueAfterDays?: number
}

export function findIssues({
  soaRows,
  parcels,
  products,
  parcelProducts,
  overdueAfterDays = 7,
}: IssueInput): Issue[] {
  const issues: Issue[] = []
  const statements = toStatementRows(soaRows)

  // 1. Money J&T owes that has not arrived. The statement period has closed and
  //    their own figure says what they owe, so an unpaid one past the usual
  //    settlement window is a collection matter, not a bookkeeping nicety.
  const unpaid = statements.filter((s) => s.paymentStatus === 'UNPAID' && s.netDue > 0)
  for (const s of unpaid) {
    const overdue = s.ageDays > overdueAfterDays
    issues.push({
      id: `unpaid-${s.soa.soaNumber}`,
      severity: overdue ? 'critical' : 'warning',
      title: `${peso(s.netDue)} not yet received`,
      detail: `Statement for ${s.soa.periodFrom}${s.soa.periodTo !== s.soa.periodFrom ? ` to ${s.soa.periodTo}` : ''} closed ${s.ageDays} days ago. Every other statement settled 1–3 days after its period closed.`,
      amount: s.netDue,
      action: overdue
        ? 'Chase J&T — this is well past the pattern every other statement followed.'
        : 'Watch it; payment normally lands within three days.',
      to: '/finance',
      toLabel: 'Open Finance',
    })
  }

  // 2. Short payments. A statement marked PARTIAL was paid, just not in full,
  //    and the shortfall is easy to lose because the row no longer reads unpaid.
  for (const s of statements.filter((x) => x.paymentStatus === 'PARTIAL')) {
    issues.push({
      id: `short-${s.soa.soaNumber}`,
      severity: 'critical',
      title: `${peso(Math.abs(s.variance))} short on ${s.soa.periodTo}`,
      detail: `J&T remitted ${peso(s.received)} against ${peso(s.netDue)} due. The row no longer reads unpaid, so the gap is easy to miss.`,
      amount: Math.abs(s.variance),
      action: 'Query the shortfall with J&T, quoting the SOA number.',
      to: '/finance',
      toLabel: 'Open Finance',
    })
  }

  // 3. Statements whose own figures do not reconcile.
  for (const s of statements.filter((x) => x.soa.verdict !== 'CLEAN')) {
    issues.push({
      id: `verdict-${s.soa.soaNumber}`,
      severity: 'warning',
      title: `Statement for ${s.soa.periodTo} does not add up`,
      detail:
        s.soa.differenceTotal !== 0
          ? `Rebuilt from the parcel export it differs by ${peso(Math.abs(s.soa.differenceTotal))}.`
          : 'The check flagged it but found no peso difference — worth reopening.',
      amount: Math.abs(s.soa.differenceTotal) || null,
      action: 'Reopen it on SOA Check and compare line by line against the parcels.',
      to: '/soa-check',
      toLabel: 'Open SOA Check',
    })
  }

  // 4. Days nobody billed for. A statement that never arrived leaves no trace
  //    except the hole between two that did.
  const gaps = findPeriodGaps(statements)
  if (gaps.length > 0) {
    issues.push({
      id: 'gaps',
      severity: 'warning',
      title: `${gaps.length} gap${gaps.length === 1 ? '' : 's'} in the run of statements`,
      detail: `J&T billed either side of ${gaps.map((g) => (g.from === g.to ? g.from : `${g.from}–${g.to}`)).join(', ')} but not for ${gaps.length === 1 ? 'it' : 'them'}.`,
      amount: null,
      action: 'Either nothing shipped on those days, or a statement never reached you. An unbilled day is also an unremitted one.',
      to: '/batches',
      toLabel: 'Open Statements',
    })
  }

  // 5. Parcels with no product. These are excluded from every per-product rate
  //    rather than guessed at, so they quietly shrink the numbers they are
  //    missing from.
  if (parcels.length > 0) {
    const pinned = pinnedMap(parcelProducts)
    const unclassified = parcels.filter((p) => resolveProduct(p, products, pinned) === UNCLASSIFIED)
    if (unclassified.length > 0) {
      const revenue = unclassified.filter((p) => p.status === 'DELIVERED').reduce((t, p) => t + p.cod, 0)
      issues.push({
        id: 'unclassified',
        severity: 'warning',
        title: `${unclassified.length} parcels are not attributed to any product`,
        detail: `${peso(revenue)} of collected COD sits outside every per-product figure. Rates are computed without them rather than guessing, so each product's numbers are incomplete by this much.`,
        amount: revenue || null,
        action: 'On Products, assign the unmatched item texts to a product, or pin them with a POS export.',
        to: '/products',
        toLabel: 'Open Products',
      })
    }

    // 6. A return rate that is climbing. Worth surfacing on its own because the
    //    cost is spread across shipping and RTS fees rather than appearing as
    //    one line anybody looks at.
    const productOf = makeResolver(products, pinned)
    const weeks = rtsByPeriod(parcels, 'week', productOf)
    const trend = rtsTrend(weeks)
    if (trend && trend.change > 0.03) {
      issues.push({
        id: 'rts-rising',
        severity: trend.to.total.rate > 0.15 ? 'critical' : 'warning',
        title: `Return rate rose to ${(trend.to.total.rate * 100).toFixed(1)}%`,
        detail: `Up from ${(trend.from.total.rate * 100).toFixed(1)}% the week before. Every return costs the outbound shipping and an RTS fee, and earns nothing.`,
        amount: trend.to.byProduct
          ? Object.values(trend.to.byProduct).reduce((t, c) => t + c.returned, 0) * 9000
          : null,
        action: 'Check what changed that week — creative, targeting, or how orders are confirmed.',
        to: '/executive',
        toLabel: 'Open Executive Dashboard',
      })
    }
  }

  // 7. No parcel export at all. Not a fault, but it is the single thing holding
  //    back the most figures, so it belongs on the list.
  if (parcels.length === 0 && soaRows.length > 0) {
    issues.push({
      id: 'no-parcels',
      severity: 'info',
      title: 'No parcel export loaded',
      detail:
        'Statements give period totals but never delivery counts, so return rate, per-product figures and cost per delivered parcel cannot be computed.',
      amount: null,
      action: 'Import a My Waybill export covering the statement dates.',
      to: '/import',
      toLabel: 'Open Import',
    })
  }

  const rank: Record<IssueSeverity, number> = { critical: 0, warning: 1, info: 2 }
  return issues.sort((a, b) => {
    if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity]
    // Within a severity, money first; issues with no value sort last rather
    // than being handed a made-up one.
    if (a.amount == null && b.amount == null) return 0
    if (a.amount == null) return 1
    if (b.amount == null) return -1
    return b.amount - a.amount
  })
}

export function issueTotals(issues: Issue[]) {
  return {
    total: issues.length,
    critical: issues.filter((i) => i.severity === 'critical').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
    atStake: issues.reduce((t, i) => t + (i.amount ?? 0), 0),
  }
}
