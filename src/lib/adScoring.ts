import type { AdLifecycle, AdPerformanceRow } from './types'

export interface AdScoringBenchmarks {
  targetCostPerResult: number
  winnerRatio: number
  loserRatio: number
  minResultsForVerdict: number
  fatigueFrequency: number
  fatigueCtrDropPct: number
}

/**
 * Calibrated to break-even economics, NOT to historical performance.
 *
 * The previous default (185) was seeded from actual May-Jun 2026 CPA - but
 * those were loss-making months, so scoring against them marked ads as
 * acceptable at costs that lose money on every order.
 *
 * The real ceiling, on the PHP 399 SKU that is 64% of all orders:
 *
 *   COD collected                              399.00
 *   - COD fee 2.75% + VAT 0.33%                -12.29
 *   - cost of goods                            -53.55
 *   - courier, insurance, fulfilment           -66.39
 *   - RTS drag at 20.8% return rate            -17.92
 *   - operating overhead at ~7% of revenue     -24.88
 *   = most that can be paid to acquire one delivered order   224.97
 *
 * Ads Manager counts orders PLACED, and 20.8% of those are returned and never
 * collected, so per order placed the ceiling is PHP 174.97 - break-even, where
 * profit is exactly zero. Targeting break-even is targeting no profit, so the
 * benchmark is the CPA that leaves a 20% margin: PHP 111.77.
 *
 * With the ratios below that puts the Loser boundary at PHP 167.66, just under
 * break-even - deliberately conservative while the business is loss-making.
 * Calibrated on the PHP 399 SKU; higher-value SKUs can carry a higher CPA, so
 * an ad pushing mostly bundles is judged slightly harshly here.
 *
 * All editable in Settings. Recompute these whenever the RTS rate, product
 * costs or courier rates move materially.
 */
export const DEFAULT_AD_BENCHMARKS: AdScoringBenchmarks = {
  targetCostPerResult: 111.77,
  winnerRatio: 0.8,
  loserRatio: 1.5,
  minResultsForVerdict: 5,
  fatigueFrequency: 2.5,
  fatigueCtrDropPct: 0.2,
}

/** Max CPA per order PLACED at which profit is exactly zero, on the PHP 399 SKU. */
export const BREAK_EVEN_COST_PER_RESULT = 174.97

export interface AdClassification {
  lifecycle: AdLifecycle
  score: number | null
}

/**
 * Classifies a single ad's latest performance snapshot against this
 * business's own real cost-per-result benchmark, using the ad's previous
 * snapshot (if any, matched by Ad Name) to catch fatigue - a ratio that was
 * fine last time but is trending toward the frequency/CTR fatigue signals.
 */
export function classifyAd(
  current: AdPerformanceRow,
  previous: AdPerformanceRow | null,
  benchmarks: AdScoringBenchmarks = DEFAULT_AD_BENCHMARKS,
): AdClassification {
  const results = current.Results ?? 0
  const cpr = current['Cost Per Result']

  if (cpr == null || cpr <= 0 || results < benchmarks.minResultsForVerdict) {
    return { lifecycle: previous ? 'Unproven' : 'New', score: null }
  }

  const ratio = cpr / benchmarks.targetCostPerResult
  let lifecycle: AdLifecycle
  if (ratio <= benchmarks.winnerRatio) lifecycle = 'Winner'
  else if (ratio <= 1.2) lifecycle = 'Potential'
  else if (ratio <= benchmarks.loserRatio) lifecycle = 'Fatigue'
  else lifecycle = 'Loser'

  // Early-warning downgrades: a still-cheap ad shown too often, or whose CTR
  // has dropped meaningfully since its last snapshot, is fatiguing even
  // before cost-per-result blows up.
  if (
    (lifecycle === 'Winner' || lifecycle === 'Potential') &&
    current.Frequency != null &&
    current.Frequency >= benchmarks.fatigueFrequency
  ) {
    lifecycle = 'Fatigue'
  }
  if (
    (lifecycle === 'Winner' || lifecycle === 'Potential') &&
    previous?.CTR &&
    current.CTR != null &&
    (previous.CTR - current.CTR) / previous.CTR >= benchmarks.fatigueCtrDropPct
  ) {
    lifecycle = 'Fatigue'
  }

  const score = Math.round(Math.min(100, Math.max(0, 100 * (2 - ratio))))
  return { lifecycle, score }
}

export const LIFECYCLE_COLOR: Record<AdLifecycle, string> = {
  Winner: 'var(--status-good)',
  Potential: 'var(--series-aqua)',
  Fatigue: 'var(--status-warning)',
  Loser: 'var(--status-critical)',
  Unproven: 'var(--text-muted)',
  New: 'var(--series-blue)',
}
