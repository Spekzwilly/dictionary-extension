import type { VocabEntry } from './types'

const SESSION_SIZE = 10

export type SessionCard = VocabEntry & { sessionId: number }
export type Rating = 'easy' | 'hard' | 'again'

export type SessionState = {
  remaining: SessionCard[]
  again: SessionCard[]
  done: SessionCard[]
  total: number
}

export function createSession(words: VocabEntry[]): SessionState {
  const shuffled = [...words].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, SESSION_SIZE)
  const cards: SessionCard[] = selected.map((w, i) => ({ ...w, sessionId: i }))
  return { remaining: cards, again: [], done: [], total: cards.length }
}

export function rateCard(state: SessionState, rating: Rating): SessionState {
  const [card, ...restRemaining] = state.remaining

  if (rating === 'easy') {
    const done = [...state.done, card]
    if (restRemaining.length > 0) {
      return { ...state, remaining: restRemaining, done }
    }
    if (state.again.length > 0) {
      return { ...state, remaining: state.again, again: [], done }
    }
    return { ...state, remaining: [], done }
  }

  if (rating === 'hard') {
    const remaining = [...restRemaining, card]
    if (remaining.length > 0) return { ...state, remaining }
    if (state.again.length > 0) {
      return { ...state, remaining: state.again, again: [] }
    }
    return { ...state, remaining: [] }
  }

  // again
  const again = [...state.again, card]
  if (restRemaining.length > 0) {
    return { ...state, remaining: restRemaining, again }
  }
  return { ...state, remaining: again, again: [] }
}

export function isSessionComplete(state: SessionState): boolean {
  return state.remaining.length === 0 && state.again.length === 0
}

export function currentCard(state: SessionState): SessionCard | undefined {
  return state.remaining[0]
}
