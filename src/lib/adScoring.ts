import type { AdLifecycle, AdPerformanceRow } from './types'

export interface AdScoringBenchmarks {
  targetCostPerResult: number
  winnerRatio: number
  loserRatio: number
  minResultsForVerdict: number
  fatigueFrequency: number
  fatigueCtrDropPct: number
}

// Seeded from real historical CPA (May-Jun 2026 actuals were ~PHP 182-185/order,
// per Facebook Ads Tracker + Orders Database) - editable in Settings.
export const DEFAULT_AD_BENCHMARKS: AdScoringBenchmarks = {
  targetCostPerResult: 185,
  winnerRatio: 0.8,
  loserRatio: 1.5,
  minResultsForVerdict: 3,
  fatigueFrequency: 3.5,
  fatigueCtrDropPct: 0.2,
}

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
