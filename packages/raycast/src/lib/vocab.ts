import type { VocabEntry, WordDefinition, Encounter } from "@dictionary/shared"
import { mergeEncounters, MANUAL_ENCOUNTER_URL } from "@dictionary/shared"
import { supabase } from "./supabase"

/**
 * Fetches the signed-in user's existing entry for a word, or null. RLS scopes
 * the query to the current user, so matching on `word` alone is sufficient.
 * Returns null (never throws) when signed out or the word is absent.
 */
export async function getEntry(word: string): Promise<VocabEntry | null> {
  const { data, error } = await supabase
    .from("vocab_entries")
    .select("word, definition, encounters")
    .eq("word", word.toLowerCase())
    .maybeSingle()
  if (error) throw error
  return (data as VocabEntry | null) ?? null
}

/**
 * Saves a word to Supabase `vocab_entries`, appending one `raycast://manual`
 * encounter. Re-adding an existing word appends a merged encounter (deduped by
 * timestamp) without duplicating the row or overwriting the existing
 * definition. Requires an authenticated session.
 */
export async function saveWord(definition: WordDefinition, sentence: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not signed in")

  const word = definition.word.toLowerCase()
  const encounter: Encounter = {
    url: MANUAL_ENCOUNTER_URL,
    sentence: sentence.trim(),
    savedAt: Date.now(),
  }

  const existing = await getEntry(word)
  const encounters = mergeEncounters(existing?.encounters ?? [], [encounter])
  const def = existing?.definition ?? definition

  const { error } = await supabase.from("vocab_entries").upsert(
    {
      user_id: user.id,
      word,
      definition: def,
      encounters,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,word" },
  )
  if (error) throw error
}
