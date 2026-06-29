import { describe, it, expect } from 'vitest'
import { createSession, rateCard, isSessionComplete, currentCard } from '@dictionary/shared'
import type { VocabEntry } from '@dictionary/shared'

function makeWords(n: number): VocabEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    word: `word${i}`,
    definition: { word: `word${i}`, partOfSpeech: 'noun', senses: [{ definition: `def${i}` }], definition: `def${i}` },
    encounters: [{ url: 'https://example.com', sentence: `sentence ${i}`, savedAt: Date.now() }],
  }))
}

describe('createSession', () => {
  it('caps session at 10 words when bank has more', () => {
    const state = createSession(makeWords(20))
    expect(state.total).toBe(10)
    expect(state.remaining).toHaveLength(10)
  })

  it('includes all words when bank has fewer than 10', () => {
    const state = createSession(makeWords(5))
    expect(state.total).toBe(5)
    expect(state.remaining).toHaveLength(5)
  })
})

describe('rate Easy', () => {
  it('moves card to done and does not reappear', () => {
    const state = createSession(makeWords(3))
    const first = currentCard(state)!
    const next = rateCard(state, 'easy')
    expect(next.done).toHaveLength(1)
    expect(next.done[0].sessionId).toBe(first.sessionId)
    expect(next.remaining.every(c => c.sessionId !== first.sessionId)).toBe(true)
  })
})

describe('rate Hard', () => {
  it('moves card to back of remaining queue', () => {
    const state = createSession(makeWords(3))
    const first = currentCard(state)!
    const next = rateCard(state, 'hard')
    expect(next.remaining[next.remaining.length - 1].sessionId).toBe(first.sessionId)
    expect(next.done).toHaveLength(0)
  })
})

describe('rate Again', () => {
  it('defers card until remaining is exhausted', () => {
    const state = createSession(makeWords(3))
    const first = currentCard(state)!
    // Rate first as again, then easy through the rest
    let s = rateCard(state, 'again')
    expect(s.again).toHaveLength(1)
    // Rate remaining as easy until they're done
    while (s.remaining.length > 0 && s.remaining[0].sessionId !== first.sessionId) {
      s = rateCard(s, 'easy')
    }
    // Now the again card should have moved to remaining
    expect(s.remaining.some(c => c.sessionId === first.sessionId)).toBe(true)
  })
})

describe('isSessionComplete', () => {
  it('returns true when all cards rated Easy', () => {
    let state = createSession(makeWords(3))
    while (!isSessionComplete(state)) {
      state = rateCard(state, 'easy')
    }
    expect(state.done).toHaveLength(3)
    expect(isSessionComplete(state)).toBe(true)
  })

  it('session with 10 words: all Easy → done.length === 10', () => {
    let state = createSession(makeWords(10))
    while (!isSessionComplete(state)) {
      state = rateCard(state, 'easy')
    }
    expect(state.done).toHaveLength(10)
  })
})
