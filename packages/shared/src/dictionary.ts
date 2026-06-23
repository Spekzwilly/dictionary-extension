import type { WordDefinition, NotFound, LookupResult, AccentAudio } from './types'

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'

type ApiPhonetic = {
  text?: string
  audio?: string
}

type ApiMeaning = {
  partOfSpeech: string
  definitions: Array<{ definition: string; example?: string }>
}

type ApiEntry = {
  word: string
  phonetics?: ApiPhonetic[]
  meanings: ApiMeaning[]
}

// Maps a dictionaryapi.dev audio URL to an accent by its filename suffix
// (e.g. ".../hello-us.mp3" → "us"). Unsuffixed or other accents (-au) are ignored.
function accentFromUrl(url: string): 'us' | 'uk' | null {
  if (/-us\.mp3$/i.test(url)) return 'us'
  if (/-uk\.mp3$/i.test(url)) return 'uk'
  return null
}

// Parses an entry's phonetics[] into accent-keyed audio URLs and IPA text.
// Audio is keyed by URL suffix; phonetic is the first non-empty `text`.
function parsePhonetics(phonetics: ApiPhonetic[]): {
  audio?: AccentAudio
  phonetic?: string
} {
  const audio: AccentAudio = {}
  let phonetic: string | undefined

  for (const p of phonetics) {
    if (p.audio) {
      const accent = accentFromUrl(p.audio)
      if (accent && !audio[accent]) audio[accent] = p.audio
    }
    if (!phonetic && p.text) phonetic = p.text
  }

  const hasAudio = audio.us || audio.uk
  return {
    audio: hasAudio ? audio : undefined,
    phonetic,
  }
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

    // Collect phonetics across all entries — coverage often lives on a later entry.
    const allPhonetics = data.flatMap((e) => e.phonetics ?? [])
    const { audio, phonetic } = parsePhonetics(allPhonetics)

    const result: WordDefinition = {
      word: entry.word ?? normalized,
      partOfSpeech: meaning.partOfSpeech ?? '',
      definition: def.definition,
      example: def.example,
      audio,
      phonetic,
    }
    return result
  } catch {
    return notFound(normalized)
  }
}

function notFound(word: string): NotFound {
  return { type: 'not-found', word }
}
