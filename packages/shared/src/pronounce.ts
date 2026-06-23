// Browser-only pronounce helper. Kept OUT of the index barrel so the
// node-side (Raycast) never pulls DOM/Audio/speechSynthesis into its bundle.
// Globals are touched only inside functions, never at module top-level.

import type { Accent, AccentAudio } from './types'

const LANG: Record<Accent, string> = { us: 'en-US', uk: 'en-GB' }

export type PronounceOutcome = 'audio' | 'tts' | 'unavailable'

type PronounceInput = {
  word: string
  audio?: AccentAudio
}

function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// True when something is playable: a human-audio URL for either accent, or TTS.
export function canPronounce(input: Pick<PronounceInput, 'audio'>): boolean {
  const hasAudio = !!(input.audio?.us || input.audio?.uk)
  return hasAudio || ttsAvailable()
}

// Plays an audio URL, resolving true once it finishes and false on any error.
function playAudio(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const el = new Audio(url)
      el.addEventListener('ended', () => resolve(true), { once: true })
      el.addEventListener('error', () => resolve(false), { once: true })
      el.play().catch(() => resolve(false))
    } catch {
      resolve(false)
    }
  })
}

function speakTts(word: string, lang: string): boolean {
  if (!ttsAvailable()) return false
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(word)
    utter.lang = lang
    window.speechSynthesis.speak(utter)
    return true
  } catch {
    return false
  }
}

// Resolution order: chosen-accent audio → other-accent audio → TTS in chosen
// language → 'unavailable'. Returns which path actually played.
export async function pronounce(
  input: PronounceInput,
  accent: Accent
): Promise<PronounceOutcome> {
  const order: Accent[] = accent === 'us' ? ['us', 'uk'] : ['uk', 'us']
  for (const a of order) {
    const url = input.audio?.[a]
    if (url && (await playAudio(url))) return 'audio'
  }
  if (speakTts(input.word, LANG[accent])) return 'tts'
  return 'unavailable'
}
