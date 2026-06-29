export type AccentAudio = {
  us?: string
  uk?: string
}

export type Accent = 'us' | 'uk'

export type Sense = { definition: string; examples?: string[] }

export type WordDefinition = {
  word: string
  partOfSpeech: string
  senses: Sense[]
  definition?: string // legacy, superseded by senses — kept for back-compat
  example?: string // legacy, superseded by senses[0].examples
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
