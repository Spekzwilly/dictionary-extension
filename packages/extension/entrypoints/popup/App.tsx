import { useEffect, useState } from 'react'
import { getAllWords } from '../../lib/vocab-storage'
import { hasSession, signInWithGoogle, signOut } from '../../lib/auth'
import { cn } from '../../lib/utils'

export default function PopupApp() {
  const [authLoading, setAuthLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState<number | null>(null)

  async function refresh() {
    const ok = await hasSession()
    setSignedIn(ok)
    setAuthLoading(false)
    if (ok) {
      const words = await getAllWords()
      setWordCount(words.length)
    } else {
      setWordCount(null)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSignIn() {
    setAuthError(null)
    setSigningIn(true)
    try {
      await signInWithGoogle()
      await refresh()
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setSigningIn(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    await refresh()
  }

  function openPage(page: 'vocab-bank' | 'review') {
    chrome.tabs.create({ url: chrome.runtime.getURL(`${page}.html`) })
  }

  if (authLoading) {
    return (
      <div className="p-6 w-60 flex items-center justify-center">
        <span className="text-xs text-gray-400">Loading…</span>
      </div>
    )
  }

  if (!signedIn) {
    return (
      <div className="p-5 w-60 flex flex-col gap-3 text-center">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Dictionary</p>
          <p className="text-sm text-gray-600">Sign in to start saving and syncing words.</p>
        </div>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className={cn(
            'w-full py-2 rounded-lg text-sm font-medium transition-colors',
            signingIn
              ? 'bg-indigo-50 text-indigo-400 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
          )}
        >
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {authError && <p className="text-xs text-red-500">{authError}</p>}
      </div>
    )
  }

  return (
    <div className="p-4 w-60 flex flex-col gap-3">
      <div className="text-center pb-2 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Vocab Bank</p>
        <p className="text-2xl font-semibold text-gray-900">
          {wordCount === null ? '—' : wordCount}
        </p>
        <p className="text-xs text-gray-400">{wordCount === 1 ? 'word saved' : 'words saved'}</p>
      </div>
      <button
        onClick={() => openPage('vocab-bank')}
        className={cn(
          'w-full py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
          'border border-gray-200 text-gray-700 hover:bg-gray-50'
        )}
      >
        Open Vocab Bank
      </button>
      <button
        onClick={() => openPage('review')}
        className={cn(
          'w-full py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
          'bg-indigo-600 hover:bg-indigo-700 text-white'
        )}
      >
        Review →
      </button>
      <button
        onClick={handleSignOut}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer pt-1"
      >
        Sign out
      </button>
    </div>
  )
}
