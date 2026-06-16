import { SESSION_HANDOFF_TYPE, SESSION_CLEAR_TYPE, type HandoffSession } from '@dictionary/shared'
import type { Session } from '@supabase/supabase-js'

// Pure decision for whether the login page should auto-start Google OAuth.
// Fire only on the outbound extension leg: opened from the extension (ext=1),
// not already signed in, and not currently returning from an OAuth redirect.
export function shouldAutoStartOAuth(input: {
  hasSession: boolean
  fromExt: boolean
  returningFromOAuth: boolean
}): boolean {
  return !input.hasSession && input.fromExt && !input.returningFromOAuth
}

// True when the current URL carries the extension marker.
export function isFromExtension(search: string): boolean {
  return new URLSearchParams(search).get('ext') === '1'
}

// True when the browser is landing back from Google's consent (PKCE code or
// implicit access_token in the URL). Used to avoid re-firing OAuth in a loop.
export function isReturningFromOAuth(search: string, hash: string): boolean {
  return search.includes('code=') || hash.includes('access_token=')
}

// Broadcast the session to the extension bridge listening on this same window.
// Same-origin postMessage — the bridge validates origin before honoring it.
export function broadcastSession(session: Session | null): void {
  if (!session) return
  const payload: HandoffSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }
  window.postMessage({ type: SESSION_HANDOFF_TYPE, session: payload }, window.location.origin)
}

// Tell the extension bridge to clear its session (web-app-authoritative sign-out).
export function broadcastSignOut(): void {
  window.postMessage({ type: SESSION_CLEAR_TYPE }, window.location.origin)
}
