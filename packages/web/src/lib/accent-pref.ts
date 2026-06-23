import type { Accent } from '@dictionary/shared'

const KEY = 'pronounceAccent'

// Per-surface accent preference for the web app, persisted in localStorage.
// Defaults to US when unset or invalid.
export function getAccent(): Accent {
  return localStorage.getItem(KEY) === 'uk' ? 'uk' : 'us'
}

export function setAccent(accent: Accent): void {
  localStorage.setItem(KEY, accent)
}
