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

export async function exportVocab(): Promise<void> {
  const words = await getAllWords()
  const json = JSON.stringify(words, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `vocab-export-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportResult = { imported: number; skipped: number }

export async function importVocab(file: File): Promise<ImportResult> {
  const text = await file.text()
  const entries: unknown[] = JSON.parse(text)
  if (!Array.isArray(entries)) throw new Error('Invalid format: expected an array')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be signed in to import')

  let imported = 0
  let skipped = 0

  for (const entry of entries) {
    if (!isValidVocabEntry(entry)) { skipped++; continue }

    // Fetch existing encounters to deduplicate
    const { data: existing } = await supabase
      .from('vocab_entries')
      .select('encounters')
      .eq('word', entry.word)
      .single()

    const existingEncounters: Encounter[] = existing?.encounters ?? []
    const existingSavedAts = new Set(existingEncounters.map(e => e.savedAt))
    const newEncounters = entry.encounters.filter(e => !existingSavedAts.has(e.savedAt))
    const mergedEncounters = [...existingEncounters, ...newEncounters]

    const { error } = await supabase
      .from('vocab_entries')
      .upsert(
        { user_id: user.id, word: entry.word, definition: entry.definition, encounters: mergedEncounters },
        { onConflict: 'user_id,word' }
      )

    if (error) { skipped++; continue }
    imported++
  }

  return { imported, skipped }
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

function isValidVocabEntry(e: unknown): e is VocabEntry {
  if (typeof e !== 'object' || e === null) return false
  const v = e as Record<string, unknown>
  return (
    typeof v.word === 'string' &&
    typeof v.definition === 'object' && v.definition !== null &&
    Array.isArray(v.encounters)
  )
}
