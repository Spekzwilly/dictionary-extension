import { useEffect, useState } from 'react'
import { getAllWords } from '../../lib/vocab-storage'
import { createSession, rateCard, isSessionComplete, currentCard } from '@dictionary/shared'
import type { SessionState } from '@dictionary/shared'
import type { VocabEntry } from '@dictionary/shared'
import { cn } from '../../lib/utils'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ReviewApp() {
  const [words, setWords] = useState<VocabEntry[]>([])
  const [session, setSession] = useState<SessionState | null>(null)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    getAllWords().then(ws => {
      setWords(ws)
      if (ws.length > 0) setSession(createSession(ws))
    })
  }, [])

  function handleRate(r: 'easy' | 'hard' | 'again') {
    if (!session) return
    setFlipped(false)
    setTimeout(() => setSession(s => s ? rateCard(s, r) : s), 100)
  }

  function restart() {
    setFlipped(false)
    setSession(createSession(words))
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Your vocab bank is empty.</p>
          <p className="text-gray-300 text-xs">Save some words first, then come back to review.</p>
        </div>
      </div>
    )
  }

  if (isSessionComplete(session)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Session complete!</h1>
          <p className="text-gray-500 mb-6">You reviewed {session.total} words.</p>
          <button
            onClick={restart}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
          >
            Review again
          </button>
        </div>
      </div>
    )
  }

  const card = currentCard(session)!
  const doneCount = session.done.length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-12 px-4 pb-20">
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Review Session</span>
          <span className="text-sm text-gray-500">{doneCount} / {session.total} done</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(doneCount / session.total) * 100}%` }}
          />
        </div>
        {session.again.length > 0 && (
          <p className="text-xs text-amber-600 mt-1.5">
            {session.again.length} card{session.again.length > 1 ? 's' : ''} to revisit
          </p>
        )}
      </div>

      <div className="w-full max-w-lg">
        {!flipped ? (
          <div
            className="bg-white rounded-2xl shadow-md border border-gray-100 min-h-48 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-shadow p-8"
            onClick={() => setFlipped(true)}
          >
            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">{card.word}</h2>
            <p className="text-xs text-gray-400">tap to reveal definition</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <div className="flex items-baseline gap-2 mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">{card.word}</h2>
              <span className="text-xs font-medium text-indigo-500 uppercase tracking-wider">
                {card.definition.partOfSpeech}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{card.definition.definition}</p>
            {card.definition.example && (
              <p className="text-xs text-gray-400 italic leading-relaxed border-l-2 border-gray-100 pl-3 mb-5">
                "{card.definition.example}"
              </p>
            )}
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
                Seen {card.encounters.length}× in the wild
              </p>
              <div className="space-y-2">
                {card.encounters.map((enc, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-indigo-400 mb-1">
                      {(() => { try { return new URL(enc.url).hostname } catch { return enc.url } })()} · {formatDate(enc.savedAt)}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">"{enc.sentence}"</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['again', 'hard', 'easy'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => handleRate(r)}
                  className={cn(
                    'py-2.5 rounded-lg text-sm font-medium transition-colors capitalize cursor-pointer',
                    r === 'again' && 'bg-red-50 hover:bg-red-100 text-red-600',
                    r === 'hard' && 'bg-amber-50 hover:bg-amber-100 text-amber-600',
                    r === 'easy' && 'bg-green-50 hover:bg-green-100 text-green-600',
                  )}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
