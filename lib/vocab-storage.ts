import type { WordDefinition, VocabEntry, Encounter } from './types'

type StorageMap = Record<string, VocabEntry>

async function getAll(): Promise<StorageMap> {
  const result = await chrome.storage.local.get('vocab')
  return (result.vocab as StorageMap) ?? {}
}

async function setAll(map: StorageMap): Promise<void> {
  await chrome.storage.local.set({ vocab: map })
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
}

export async function getWord(word: string): Promise<VocabEntry | undefined> {
  const map = await getAll()
  return map[word.toLowerCase()]
}

export async function getAllWords(): Promise<VocabEntry[]> {
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
