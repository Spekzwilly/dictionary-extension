export type AccentAudio = {
  us?: string
  uk?: string
}

export type Accent = 'us' | 'uk'

export type WordDefinition = {
  word: string
  partOfSpeech: string
  definition: string
  example?: string
  audio?: AccentAudio
  phonetic?: string
}

export type DefinitionData = WordDefinition

export type NotFound = { type: 'not-found'; word: string }
export type Loading = { type: 'loading' }

export type LookupResult = WordDefinition | NotFound

export type Encounter = {
  url: string
  sentence?: string
  savedAt: number
}

export type VocabEntry = {
  word: string
  definition: WordDefinition
  encounters: Encounter[]
}
