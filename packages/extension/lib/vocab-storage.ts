import type { WordDefinition, VocabEntry, Encounter } from '@dictionary/shared'
import { supabase } from './supabase'

type StorageMap = Record<string, VocabEntry>

async function getAll(): Promise<StorageMap> {
  const result = await chrome.storage.local.get('vocab')
  return (result.vocab as StorageMap) ?? {}
}

async function setAll(map: StorageMap): Promise<void> {
  await chrome.storage.local.set({ vocab: map })
}

async function isSignedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getUser()
  return !!data.user
}

export async function saveWord(
  definition: WordDefinition,
  encounter: Omit<Encounter, 'savedAt'>
): Promise<void> {
  const map = await getAll()
  const key = definition.word.toLowerCase()
  const enc: Encounter = { ...encounter, savedAt: Date.now() }

  if (map[key]) {
    map[key] = { ...map[key], encounters: [...map[key].encounters, enc] }
  } else {
    map[key] = { word: key, definition, encounters: [enc] }
  }
  await setAll(map)

  if (await isSignedIn()) {
    await upsertToSupabase(map[key])
  }
}

export async function getWord(word: string): Promise<VocabEntry | undefined> {
  const map = await getAll()
  return map[word.toLowerCase()]
}

export async function getAllWords(): Promise<VocabEntry[]> {
  if (await isSignedIn()) {
    const { data, error } = await supabase
      .from('vocab_entries')
      .select('word, definition, encounters')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as VocabEntry[]
  }

  const map = await getAll()
  return Object.values(map).sort(
    (a, b) =>
      (b.encounters[b.encounters.length - 1]?.savedAt ?? 0) -
      (a.encounters[a.encounters.length - 1]?.savedAt ?? 0)
  )
}

export async function deleteWord(word: string): Promise<void> {
  const map = await getAll()
  delete map[word.toLowerCase()]
  await setAll(map)
}

async function upsertToSupabase(entry: VocabEntry): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('vocab_entries')
    .select('encounters')
    .eq('word', entry.word)
    .single()

  const existingEncounters: Encounter[] = existing?.encounters ?? []
  const existingSavedAts = new Set(existingEncounters.map(e => e.savedAt))
  const newEncounters = entry.encounters.filter(e => !existingSavedAts.has(e.savedAt))
  const mergedEncounters = [...existingEncounters, ...newEncounters]

  await supabase
    .from('vocab_entries')
    .upsert(
      { user_id: user.id, word: entry.word, definition: entry.definition, encounters: mergedEncounters, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,word' }
    )
}
