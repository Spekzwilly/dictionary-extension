import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock chrome.storage.local
const store: Record<string, unknown> = {}
const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(store, obj)
      }),
    },
  },
}
vi.stubGlobal('chrome', chromeMock)

import { saveWord, getAllWords, deleteWord } from '../vocab-storage'
import type { WordDefinition } from '../types'

const DEF: WordDefinition = {
  word: 'ephemeral',
  partOfSpeech: 'adjective',
  definition: 'Lasting for a very short time.',
  example: 'Ephemeral trends come and go.',
}

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  vi.clearAllMocks()
})

describe('getAllWords', () => {
  it('returns empty array when storage is empty', async () => {
    expect(await getAllWords()).toEqual([])
  })
})

describe('saveWord', () => {
  it('creates a new entry with one encounter', async () => {
    await saveWord(DEF, { url: 'https://example.com', sentence: 'It was ephemeral.' })
    const words = await getAllWords()
    expect(words).toHaveLength(1)
    expect(words[0].word).toBe('ephemeral')
    expect(words[0].encounters).toHaveLength(1)
    expect(words[0].encounters[0].url).toBe('https://example.com')
  })

  it('appends encounter when word already exists, definition unchanged', async () => {
    await saveWord(DEF, { url: 'https://a.com', sentence: 'First encounter.' })
    await saveWord(DEF, { url: 'https://b.com', sentence: 'Second encounter.' })

    const words = await getAllWords()
    expect(words).toHaveLength(1)
    expect(words[0].encounters).toHaveLength(2)
    expect(words[0].encounters[0].url).toBe('https://a.com')
    expect(words[0].encounters[1].url).toBe('https://b.com')
    expect(words[0].definition).toEqual(DEF)
  })
})

describe('deleteWord', () => {
  it('removes the entry so getAllWords returns empty', async () => {
    await saveWord(DEF, { url: 'https://example.com', sentence: 'Test.' })
    await deleteWord('ephemeral')
    expect(await getAllWords()).toEqual([])
  })
})
