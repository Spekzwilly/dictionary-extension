import type { Encounter } from './types'

/**
 * Sentinel `url` for encounters added outside the browser (e.g. from Raycast),
 * where there is no source page. Consuming UIs render a label for these
 * instead of a source link.
 */
export const MANUAL_ENCOUNTER_URL = 'raycast://manual'

/**
 * Merge two encounter lists, deduplicating by `savedAt`. Existing encounters
 * are kept in their original order; incoming encounters whose `savedAt` is not
 * already present are appended. Inputs are never mutated.
 */
export function mergeEncounters(
  existing: Encounter[],
  incoming: Encounter[]
): Encounter[] {
  const existingSavedAts = new Set(existing.map((e) => e.savedAt))
  const newEncounters = incoming.filter((e) => !existingSavedAts.has(e.savedAt))
  return [...existing, ...newEncounters]
}
