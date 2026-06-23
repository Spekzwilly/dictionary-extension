import type { Accent } from '@dictionary/shared'

const KEY = 'pronounceAccent'

// Per-surface accent preference for the extension, persisted in chrome.storage.local.
// Defaults to US when unset or invalid.
export async function getAccent(): Promise<Accent> {
  const result = await chrome.storage.local.get(KEY)
  return result[KEY] === 'uk' ? 'uk' : 'us'
}

export async function setAccent(accent: Accent): Promise<void> {
  await chrome.storage.local.set({ [KEY]: accent })
}
