import { useState } from 'react'
import type { Accent, WordDefinition } from '@dictionary/shared'
import { lookupWord } from '@dictionary/shared'
import { pronounce } from '@dictionary/shared/pronounce'
import { getAccent, setAccent } from '../lib/accent-pref'
import { cn } from '../lib/utils'

type Props = {
  word: string
}

const ACCENTS: Accent[] = ['us', 'uk']

// Speaker + US|UK accent toggle + IPA for the web app. The web app stores no
// audio, so it fetches pronunciation via lookupWord on click, then plays via the
// shared helper. IPA is shown once a lookup has resolved it.
export function PronounceButton({ word }: Props) {
  const [accent, setAccentState] = useState<Accent>(() => getAccent())
  const [busy, setBusy] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [phonetic, setPhonetic] = useState<string | undefined>()

  function chooseAccent(next: Accent) {
    setAccentState(next)
    setAccent(next)
  }

  async function handlePlay() {
    if (busy) return
    setBusy(true)
    setUnavailable(false)
    const result = await lookupWord(word)
    if ('type' in result) {
      setUnavailable(true)
      setBusy(false)
      return
    }
    const def = result as WordDefinition
    setPhonetic(def.phonetic)
    const outcome = await pronounce(def, accent)
    if (outcome === 'unavailable') setUnavailable(true)
    setBusy(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePlay}
        disabled={busy || unavailable}
        aria-label="Pronounce"
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-full transition-colors',
          unavailable
            ? 'text-gray-300 cursor-default'
            : 'text-indigo-600 hover:bg-indigo-50 cursor-pointer',
          busy && 'opacity-50 cursor-default'
        )}
      >
        <SpeakerIcon />
      </button>
      <div className="flex items-center rounded-md border border-gray-200 overflow-hidden">
        {ACCENTS.map((a) => (
          <button
            key={a}
            onClick={() => chooseAccent(a)}
            className={cn(
              'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
              accent === a
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-400 hover:text-gray-600'
            )}
          >
            {a}
          </button>
        ))}
      </div>
      {phonetic && <span className="text-xs text-gray-400">{phonetic}</span>}
    </div>
  )
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}
