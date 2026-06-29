import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { VocabEntry } from '@dictionary/shared'
import { MANUAL_ENCOUNTER_URL, normalizeDefinition } from '@dictionary/shared'
import { useAuth, signOut } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { PronounceButton } from '../components/PronounceButton'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function WordRow({ entry, expanded, onToggle, onDelete }: { entry: VocabEntry; expanded: boolean; onToggle: () => void; onDelete: () => void }) {
  const latest = entry.encounters[entry.encounters.length - 1]
  const def = normalizeDefinition(entry.definition)
  const multi = def.senses.length > 1
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="w-full px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
        <button className="flex-1 min-w-0 text-left cursor-pointer" onClick={onToggle}>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-gray-900">{entry.word}</span>
            <span className="text-xs text-indigo-400 font-medium uppercase tracking-wide">
              {def.partOfSpeech}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{def.senses[0].definition}</p>
        </button>
        <PronounceButton word={entry.word} />
        <button
          onClick={onDelete}
          aria-label={`Delete ${entry.word}`}
          className="flex items-center justify-center w-7 h-7 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
        >
          <TrashIcon />
        </button>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-gray-400">{entry.encounters.length}× encountered</span>
          {latest && <span className="text-xs text-gray-300">{formatDate(latest.savedAt)}</span>}
        </div>
        <button onClick={onToggle} className="cursor-pointer">
          <span className={cn('text-gray-300 text-sm mt-0.5 transition-transform duration-200 inline-block', expanded && 'rotate-180')}>
            ▾
          </span>
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-4 bg-gray-50">
          <div className="mb-4 space-y-3">
            {def.senses.map((sense, i) => (
              <div key={i}>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {multi && <span className="text-gray-400 font-medium mr-1">{i + 1}.</span>}
                  {sense.definition}
                </p>
                {sense.examples?.map((ex, j) => (
                  <p key={j} className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-3 mt-1">
                    "{ex}"
                  </p>
                ))}
              </div>
            ))}
          </div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">Saved from</p>
          <div className="space-y-2">
            {entry.encounters.map((enc, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-medium text-indigo-400 mb-1">
                  {enc.url === MANUAL_ENCOUNTER_URL
                    ? 'Added in Raycast'
                    : (() => { try { return new URL(enc.url).hostname } catch { return enc.url } })()} · {formatDate(enc.savedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export default function VocabPage() {
  const { user } = useAuth()
  const [words, setWords] = useState<VocabEntry[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  async function loadWords() {
    const { data } = await supabase
      .from('vocab_entries')
      .select('word, definition, encounters')
      .order('updated_at', { ascending: false })
    setWords((data ?? []) as VocabEntry[])
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    loadWords()
  }, [user])

  async function confirmDelete() {
    const word = pendingDelete
    if (!word) return
    setPendingDelete(null)
    setWords(prev => prev.filter(w => w.word !== word))
    const { error } = await supabase.from('vocab_entries').delete().eq('word', word)
    if (error) {
      alert(`Could not delete "${word}". Please try again.`)
      loadWords()
    }
  }

  const filtered = words.filter(w =>
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    normalizeDefinition(w.definition).senses[0].definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-10 px-4 pb-20">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Vocab Bank</h1>
            <p className="text-sm text-gray-400">{words.length} {words.length === 1 ? 'word' : 'words'} saved</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/review"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Review →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3 mb-4 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-600 truncate">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
          >
            Sign out
          </button>
        </div>

        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm select-none">⌕</span>
          <input
            type="text"
            placeholder="Search words or definitions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-5 py-16 text-center text-gray-400 text-sm">Loading…</div>
          ) : words.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-gray-400 text-sm mb-1">Your vocab bank is empty.</p>
              <p className="text-gray-300 text-xs">Save words using the Chrome extension.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-400 text-sm">
              No words matching "{search}"
            </div>
          ) : (
            filtered.map(entry => (
              <WordRow
                key={entry.word}
                entry={entry}
                expanded={expanded === entry.word}
                onToggle={() => setExpanded(prev => prev === entry.word ? null : entry.word)}
                onDelete={() => setPendingDelete(entry.word)}
              />
            ))
          )}
        </div>
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900 mb-1">Delete word?</h2>
            <p className="text-sm text-gray-500 mb-5">
              "{pendingDelete}" and all its saved encounters will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
