// The dictionary lookup lives in @dictionary/shared so the extension, web app,
// and Raycast extension share one implementation. The extension wraps it to
// inject the Merriam-Webster proxy config — the proxy URL is derived from the
// existing Supabase URL, authed with the anon key (no new env var).
import { lookupWord as sharedLookupWord, type LookupResult } from '@dictionary/shared'

const mwProxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mw-lookup`
const mwApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export function lookupWord(word: string): Promise<LookupResult> {
  return sharedLookupWord(word, { mwProxyUrl, mwApiKey })
}
