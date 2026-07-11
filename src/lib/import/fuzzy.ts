export function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

/** Cheap token-overlap similarity score in [0, 1] — good enough for short product names. */
export function similarity(a: string, b: string): number {
  const ta = new Set(normalizeName(a).split(' ').filter(Boolean))
  const tb = new Set(normalizeName(b).split(' ').filter(Boolean))
  if (ta.size === 0 || tb.size === 0) return 0
  let overlap = 0
  for (const t of ta) if (tb.has(t)) overlap++
  return overlap / Math.max(ta.size, tb.size)
}

export interface MatchCandidate {
  key: string
  label: string
}

export function findBestMatch(rawName: string, candidates: MatchCandidate[], threshold = 0.4): MatchCandidate | null {
  let best: MatchCandidate | null = null
  let bestScore = 0
  for (const c of candidates) {
    const score = similarity(rawName, c.label)
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return bestScore >= threshold ? best : null
}
