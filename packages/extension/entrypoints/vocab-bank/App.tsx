import { useEffect, useState } from 'react'
import { getAllWords, deleteWord, exportVocab, importVocab } from '../../lib/vocab-storage'
import { signInWithGoogle, signOut, getUser } from '../../lib/auth'
import type { VocabEntry } from '@dictionary/shared'
import type { AuthUser } from '../../lib/auth'
import { cn } from '../../lib/utils'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function WordRow({
  entry,
  expanded,
  onToggle,
  onDelete,
}: {
  entry: VocabEntry
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const latest = entry.encounters[entry.encounters.length - 1]
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-gray-900">{entry.word}</span>
            <span className="text-xs text-indigo-400 font-medium uppercase tracking-wide">
              {entry.definition.partOfSpeech}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{entry.definition.definition}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-gray-400">{entry.encounters.length}× encountered</span>
          <span className="text-xs text-gray-300">{formatDate(latest.savedAt)}</span>
        </div>
        <span className={cn('text-gray-300 text-sm mt-0.5 transition-transform duration-200', expanded && 'rotate-180')}>
          ▾
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 bg-gray-50">
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{entry.definition.definition}</p>
          {entry.definition.example && (
            <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-3 mb-4">
              "{entry.definition.example}"
            </p>
          )}
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">Saved from</p>
          <div className="space-y-2 mb-4">
            {entry.encounters.map((enc, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-medium text-indigo-400 mb-1">
                  {new URL(enc.url).hostname} · {formatDate(enc.savedAt)}
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">"{enc.sentence}"</p>
              </div>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer"
          >
            Remove from bank
          </button>
        </div>
      )}
    </div>
  )
}

export default function VocabBankApp() {
  const [words, setWords] = useState<VocabEntry[]>([])
  const [search, setSearch] = useState('')
  const [expandedWord, setExpandedWord] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  async function loadWords() {
    const ws = await getAllWords()
    setWords(ws)
  }

  useEffect(() => {
    getUser().then(u => {
      setUser(u)
      setAuthLoading(false)
    })
    loadWords()
  }, [])

  async function handleSignIn() {
    setAuthError(null)
    try {
      await signInWithGoogle()
      const u = await getUser()
      setUser(u)
      await loadWords()
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Sign-in failed')
    }
  }

  async function handleSignOut() {
    await signOut()
    setUser(null)
    await loadWords()
  }

  function handleDelete(word: string) {
    deleteWord(word).then(() => {
      setWords(prev => prev.filter(w => w.word !== word))
      setExpandedWord(null)
    })
  }

  async function handleExport() {
    await exportVocab()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user) {
      setImportMsg('Sign in with Google before importing.')
      return
    }
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await importVocab(file)
      setImportMsg(`Imported ${result.imported} word${result.imported !== 1 ? 's' : ''}${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}.`)
      await loadWords()
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Import failed')
    }
    e.target.value = ''
  }

  function openReview() {
    chrome.tabs.create({ url: chrome.runtime.getURL('review.html') })
  }

  const filtered = words.filter(w =>
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    w.definition.definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-10 px-4 pb-20">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Vocab Bank</h1>
            <p className="text-sm text-gray-400">{words.length} {words.length === 1 ? 'word' : 'words'} saved</p>
          </div>
          <button
            onClick={openReview}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Review →
          </button>
        </div>

        {/* Auth strip */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3 mb-4 flex items-center justify-between gap-3">
          {authLoading ? (
            <span className="text-xs text-gray-400">Loading…</span>
          ) : user ? (
            <>
              <span className="text-xs text-gray-600 truncate">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-400">Sign in to load and sync your vocab bank</span>
              <button
                onClick={handleSignIn}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Sign in with Google
              </button>
            </>
          )}
        </div>

        {authError && (
          <p className="text-xs text-red-500 mb-3">{authError}</p>
        )}

        {/* Export / Import */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleExport}
            className="flex-1 text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Export JSON
          </button>
          <label className="flex-1 text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 py-2 rounded-lg transition-colors cursor-pointer text-center">
            Import JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>

        {importMsg && (
          <p className="text-xs text-gray-500 mb-3">{importMsg}</p>
        )}

        {/* Search */}
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

        {/* Word list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {words.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-gray-400 text-sm mb-1">Your vocab bank is empty.</p>
              <p className="text-gray-300 text-xs">Select a word on any webpage to look it up and save it.</p>
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
                expanded={expandedWord === entry.word}
                onToggle={() => setExpandedWord(prev => prev === entry.word ? null : entry.word)}
                onDelete={() => handleDelete(entry.word)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
