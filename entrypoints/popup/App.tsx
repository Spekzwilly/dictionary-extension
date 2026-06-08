import { useEffect, useState } from 'react'
import { getAllWords } from '../../lib/vocab-storage'
import { cn } from '../../lib/utils'

export default function PopupApp() {
  const [wordCount, setWordCount] = useState<number | null>(null)

  useEffect(() => {
    getAllWords().then(words => setWordCount(words.length))
  }, [])

  function openPage(page: 'vocab-bank' | 'review') {
    chrome.tabs.create({ url: chrome.runtime.getURL(`${page}.html`) })
  }

  return (
    <div className="p-4 flex flex-col gap-3">
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
        Vocab Bank
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
    </div>
  )
}
