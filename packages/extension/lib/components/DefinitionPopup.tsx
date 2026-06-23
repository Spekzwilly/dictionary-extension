import type { WordDefinition, NotFound, Loading } from '@dictionary/shared'
import { cn } from '../utils'
import { PronounceControls } from './PronounceControls'

type Props = {
  state: WordDefinition | NotFound | Loading
  onSave: () => void
  saved: boolean
  signedIn: boolean
  onSignIn: () => void
  signingIn: boolean
}

export function DefinitionPopup({ state, onSave, saved, signedIn, onSignIn, signingIn }: Props) {
  if ('type' in state && state.type === 'loading') {
    return (
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-5 w-72">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="animate-spin">⟳</span>
          Looking up…
        </div>
      </div>
    )
  }

  if ('type' in state && state.type === 'not-found') {
    return (
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-5 w-72">
        <p className="text-sm text-gray-400">No definition found for <span className="font-medium text-gray-600">"{state.word}"</span></p>
      </div>
    )
  }

  const def = state as WordDefinition
  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-5 w-72">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight leading-none">{def.word}</h2>
          <span className="text-xs font-medium text-indigo-500 uppercase tracking-wider">{def.partOfSpeech}</span>
        </div>
      </div>
      <PronounceControls def={def} />
      <p className="text-sm text-gray-700 leading-relaxed mb-3 mt-2">{def.definition}</p>
      {def.example && (
        <p className="text-xs text-gray-400 italic leading-relaxed border-l-2 border-gray-100 pl-3 mb-4">
          "{def.example}"
        </p>
      )}
      {signedIn ? (
        <button
          onClick={onSave}
          disabled={saved}
          className={cn(
            'w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors',
            saved
              ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
          )}
        >
          {saved ? '✓ Saved to Vocab Bank' : 'Save to Vocab Bank'}
        </button>
      ) : (
        <button
          onClick={onSignIn}
          disabled={signingIn}
          className={cn(
            'w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors',
            signingIn
              ? 'bg-indigo-50 text-indigo-400 border border-indigo-100 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
          )}
        >
          {signingIn ? 'Signing in…' : 'Sign in with Google to save'}
        </button>
      )}
    </div>
  )
}
