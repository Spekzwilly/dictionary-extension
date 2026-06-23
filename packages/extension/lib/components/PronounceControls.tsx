import { useEffect, useState } from 'react'
import type { Accent, WordDefinition } from '@dictionary/shared'
import { pronounce, canPronounce } from '@dictionary/shared/pronounce'
import { getAccent, setAccent } from '../accent-pref'
import { cn } from '../utils'

type Props = {
  def: WordDefinition
}

const ACCENTS: Accent[] = ['us', 'uk']

// Speaker + US|UK accent toggle + IPA for the extension popup. Audio is already
// in hand from the live lookup, so no refetch — it plays straight from `def`.
export function PronounceControls({ def }: Props) {
  const [accent, setAccentState] = useState<Accent>('us')
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    getAccent().then(setAccentState)
  }, [])

  const playable = canPronounce(def)

  function chooseAccent(next: Accent) {
    setAccentState(next)
    setAccent(next)
  }

  async function handlePlay() {
    if (playing || !playable) return
    setPlaying(true)
    await pronounce(def, accent)
    setPlaying(false)
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <button
        onClick={handlePlay}
        disabled={playing || !playable}
        aria-label="Pronounce"
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-full transition-colors',
          playable
            ? 'text-indigo-600 hover:bg-indigo-50 cursor-pointer'
            : 'text-gray-300 cursor-default',
          playing && 'opacity-50 cursor-default'
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
      {def.phonetic && (
        <span className="text-xs text-gray-400">{def.phonetic}</span>
      )}
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
