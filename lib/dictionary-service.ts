import type { WordDefinition, NotFound, LookupResult } from './types'

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'

type ApiMeaning = {
  partOfSpeech: string
  definitions: Array<{ definition: string; example?: string }>
}

type ApiEntry = {
  word: string
  meanings: ApiMeaning[]
}

export async function lookupWord(word: string): Promise<LookupResult> {
  const normalized = word.trim().toLowerCase()
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(normalized)}`)
    if (res.status === 404) return notFound(normalized)
    if (!res.ok) return notFound(normalized)

    const data: ApiEntry[] = await res.json()
    const entry = data[0]
    if (!entry?.meanings?.length) return notFound(normalized)

    const meaning = entry.meanings[0]
    const def = meaning.definitions[0]
    if (!def) return notFound(normalized)

    const result: WordDefinition = {
      word: entry.word ?? normalized,
      partOfSpeech: meaning.partOfSpeech ?? '',
      definition: def.definition,
      example: def.example,
    }
    return result
  } catch {
    return notFound(normalized)
  }
}

function notFound(word: string): NotFound {
  return { type: 'not-found', word }
}
