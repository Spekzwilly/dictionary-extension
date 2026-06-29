import type { WordDefinition, NotFound, LookupResult, AccentAudio, Sense } from './types'

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'

// Cap M-W senses shown per word — common words return dozens; the top few
// (M-W orders by frequency) are what's useful and keep the UI compact.
const MAX_SENSES = 6

export type LookupOptions = {
  mwProxyUrl?: string
  mwApiKey?: string
}

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

// Guarantees `senses` is populated. New M-W/fallback results carry senses
// directly; old stored entries have only legacy definition/example and get a
// synthesized one-element senses array. Avoids any Supabase data migration.
export function normalizeDefinition(raw: WordDefinition): WordDefinition {
  if (raw.senses?.length) return raw
  const examples = raw.example ? [raw.example] : undefined
  return { ...raw, senses: [{ definition: raw.definition ?? '', examples }] }
}

// ── Merriam-Webster Learner's parser ───────────────────────────────────────
// M-W's `def[].sseq` is a deeply nested, irregular sense-sequence tree. We target
// the common `sense.dt` shape (text + vis examples) and skip unknown node types.

type MwEntry = {
  fl?: string
  hwi?: { hw?: string }
  meta?: { id?: string; stems?: string[] }
  def?: Array<{ sseq?: unknown }>
}

// A single M-W query returns many entries: the headword itself (one per part of
// speech), plus phrases (`happy hour`), idioms, and unrelated entries where the
// word merely appears in a stem (`as happy as a clam`). Keep only entries that
// are *about* the looked-up word — its exact form/inflection — so we don't
// flatten dozens of irrelevant senses.
function entryMatchesWord(e: MwEntry, word: string): boolean {
  const stems = Array.isArray(e.meta?.stems)
    ? e.meta!.stems!.map((s) => String(s).toLowerCase())
    : []
  if (stems.includes(word)) return true
  const id = String(e.meta?.id ?? '').split(':')[0].toLowerCase()
  const hw = String(e.hwi?.hw ?? '').replace(/\*/g, '').toLowerCase()
  return id === word || hw === word
}

// M-W defining text is littered with formatting tokens: {bc} (bold colon),
// {it}..{/it}, {sx|word||}, {a_link|word}, etc. Strip them to plain text.
function stripMwTokens(s: string): string {
  return s
    .replace(/\{bc\}/g, '')
    .replace(/\{[^{}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSenseNode(node: unknown): Sense | null {
  const dt = (node as { dt?: unknown })?.dt
  if (!Array.isArray(dt)) return null

  let definition = ''
  let examples: string[] | undefined
  for (const item of dt) {
    if (!Array.isArray(item)) continue
    const [kind, payload] = item
    if (kind === 'text') {
      definition = stripMwTokens(String(payload ?? ''))
    } else if (kind === 'vis' && Array.isArray(payload)) {
      const ex = payload
        .map((v: { t?: string }) => stripMwTokens(String(v?.t ?? '')))
        .filter(Boolean)
      if (ex.length) examples = ex
    }
    // unknown dt kinds (uns, ca, snote, …) are skipped
  }
  if (!definition) return null
  return examples ? { definition, examples } : { definition }
}

function parseMwSenses(entry: MwEntry): Sense[] {
  const senses: Sense[] = []
  for (const section of entry.def ?? []) {
    const sseq = (section as { sseq?: unknown }).sseq
    if (!Array.isArray(sseq)) continue
    for (const group of sseq) {
      if (!Array.isArray(group)) continue
      for (const el of group) {
        if (!Array.isArray(el)) continue
        const [type, node] = el
        let senseObj: unknown = null
        if (type === 'sense') senseObj = node
        else if (type === 'bs') senseObj = (node as { sense?: unknown })?.sense
        else continue // skip unknown node types (pseq, sen, …)
        const s = parseSenseNode(senseObj)
        if (s) senses.push(s)
      }
    }
  }
  return senses
}

// Calls the M-W proxy (when configured) and parses the result. Returns null on
// missing config, network/HTTP error, suggestion responses (M-W not-found), or
// any payload that yields no parseable senses — every null path falls through to
// the keyless fallback. Never throws.
async function lookupViaMw(
  word: string,
  opts?: LookupOptions
): Promise<WordDefinition | null> {
  if (!opts?.mwProxyUrl) return null
  try {
    const headers: Record<string, string> = {}
    if (opts.mwApiKey) {
      headers.apikey = opts.mwApiKey
      headers.Authorization = `Bearer ${opts.mwApiKey}`
    }
    const res = await fetch(
      `${opts.mwProxyUrl}?word=${encodeURIComponent(word)}`,
      { headers }
    )
    if (!res.ok) return null

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    // M-W returns an array of suggestion strings when the word is not found.
    if (typeof data[0] === 'string') return null

    const allEntries = data.filter(
      (e): e is MwEntry => !!e && typeof e === 'object'
    )
    // Restrict to entries about the looked-up word; if none match (the word is
    // only an idiom fragment here), fall through to dictionaryapi.dev.
    const entries = allEntries.filter((e) => entryMatchesWord(e, word))
    if (entries.length === 0) return null

    // Common words (run, set) carry 30–60+ senses — cap to the most frequent
    // few (M-W orders senses by frequency) to keep every surface's UI compact.
    const senses = entries.flatMap(parseMwSenses).slice(0, MAX_SENSES)
    if (senses.length === 0) return null

    const headword = entries[0]?.hwi?.hw?.replace(/\*/g, '') || word
    const partOfSpeech = entries.find((e) => e.fl)?.fl ?? ''
    return {
      word: headword,
      partOfSpeech,
      senses,
      definition: senses[0].definition,
      example: senses[0].examples?.[0],
    }
  } catch {
    return null
  }
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

// Keyless fallback. Maps dictionaryapi.dev into the senses shape: the first
// definition becomes the primary sense; its example is backfilled from the first
// definition that has one, scanning all entries → meanings → definitions.
async function lookupViaDictionaryApi(word: string): Promise<LookupResult> {
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(word)}`)
    if (!res.ok) return notFound(word)

    const data: ApiEntry[] = await res.json()
    const entry = data[0]
    if (!entry?.meanings?.length) return notFound(word)

    const meaning = entry.meanings[0]
    const def = meaning.definitions[0]
    if (!def) return notFound(word)

    // Collect phonetics across all entries — coverage often lives on a later entry.
    const allPhonetics = data.flatMap((e) => e.phonetics ?? [])
    const { audio, phonetic } = parsePhonetics(allPhonetics)

    // dictionaryapi.dev usually leaves definitions[0].example empty — backfill from
    // the first definition that has one, scanning all entries → meanings → definitions.
    const example = data
      .flatMap((e) => e.meanings ?? [])
      .flatMap((m) => m.definitions ?? [])
      .find((d) => d.example)?.example

    const senses: Sense[] = [
      { definition: def.definition, examples: example ? [example] : undefined },
    ]

    return {
      word: entry.word ?? word,
      partOfSpeech: meaning.partOfSpeech ?? '',
      senses,
      definition: def.definition,
      example,
      audio,
      phonetic,
    }
  } catch {
    return notFound(word)
  }
}

// Tries Merriam-Webster Learner's (via proxy) first when configured, then falls
// back to the keyless dictionaryapi.dev. Returns NotFound only when both miss.
export async function lookupWord(
  word: string,
  opts?: LookupOptions
): Promise<LookupResult> {
  const normalized = word.trim().toLowerCase()
  const mw = await lookupViaMw(normalized, opts)
  if (mw) return mw
  return lookupViaDictionaryApi(normalized)
}

function notFound(word: string): NotFound {
  return { type: 'not-found', word }
}
