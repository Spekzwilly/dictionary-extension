// Streak math for the Progress consistency graph. Pure: takes the set of
// local-clock days (YYYY-MM-DD) that had review activity, returns current +
// longest streak. Kept dependency-light like the rest of shared.

const DAY_MS = 86_400_000

// Parse a YYYY-MM-DD as a UTC midnight so day arithmetic never drifts across
// DST or timezones — these are calendar days, not instants.
function toUtcDay(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export type Streaks = { current: number; longest: number }

/**
 * @param activeDays  local-clock days (YYYY-MM-DD) with at least one review
 * @param today       today's local-clock day (YYYY-MM-DD)
 *
 * Current streak counts consecutive review-days ending at today or yesterday
 * (it stays alive through today until a full day passes with zero reviews).
 * Longest streak is the longest consecutive run ever.
 */
export function computeStreaks(activeDays: string[], today: string): Streaks {
  const set = new Set(activeDays)
  if (set.size === 0) return { current: 0, longest: 0 }

  const sorted = [...set].map(toUtcDay).sort((a, b) => a - b)

  // Longest run of consecutive days.
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] - sorted[i - 1] === DAY_MS ? run + 1 : 1
    if (run > longest) longest = run
  }

  // Current run: walk back from today. If today is empty, start from yesterday
  // (streak is alive through today); if yesterday is also empty, current is 0.
  const todayMs = toUtcDay(today)
  let cursor = set.has(today) ? todayMs : todayMs - DAY_MS
  let current = 0
  while (set.has(dayString(cursor))) {
    current++
    cursor -= DAY_MS
  }

  return { current, longest }
}

function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}
