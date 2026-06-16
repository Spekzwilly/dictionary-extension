// Contract for handing a Supabase session from the web app to the extension.
// The web app broadcasts via window.postMessage; an origin-scoped extension
// content script validates and persists it. The token never leaves the browser.

export const SESSION_HANDOFF_TYPE = 'dict-ext-session'
export const SESSION_CLEAR_TYPE = 'dict-ext-signout'

// Origins allowed to hand a session to the extension. The deployed web app and
// localhost (any port) in dev. Used by the bridge's trust gate.
export const ALLOWED_HANDOFF_ORIGINS = [
  'https://dictionary-extension.vercel.app',
  'http://localhost',
]

export type HandoffSession = {
  access_token: string
  refresh_token: string
}

export type SessionHandoffMessage = {
  type: typeof SESSION_HANDOFF_TYPE
  session: HandoffSession
}

export type SessionClearMessage = {
  type: typeof SESSION_CLEAR_TYPE
}

// A minimal view of a MessageEvent, so the trust gate stays pure and testable
// without a real DOM event.
export type TrustedMessageInput = {
  origin: string
  source: unknown
  data: unknown
}

export type TrustGateOptions = {
  allowedOrigins: string[]
  // The page's own window. A genuine same-window postMessage has source === window.
  self: unknown
}

// True when `origin` exactly matches an allowed origin or is the same host on a
// different port (covers http://localhost:<port> in dev).
export function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(allowed + ':'))
}

// The security boundary for the session handoff. A message is honored only when
// it comes from an allowed origin, from the page's own window, and matches the
// handoff message shape. Anything else (e.g. a malicious page posting an
// attacker's tokens) is rejected.
export function isTrustedSessionMessage(event: TrustedMessageInput, opts: TrustGateOptions): boolean {
  if (!isAllowedOrigin(event.origin, opts.allowedOrigins)) return false
  if (event.source !== opts.self) return false
  const data = event.data as Partial<SessionHandoffMessage> | null
  return (
    !!data &&
    typeof data === 'object' &&
    data.type === SESSION_HANDOFF_TYPE &&
    !!data.session &&
    typeof data.session.access_token === 'string' &&
    typeof data.session.refresh_token === 'string'
  )
}

// Origin/source check for the sign-out (clear) signal, which carries no payload.
export function isTrustedClearMessage(event: TrustedMessageInput, opts: TrustGateOptions): boolean {
  if (!isAllowedOrigin(event.origin, opts.allowedOrigins)) return false
  if (event.source !== opts.self) return false
  const data = event.data as Partial<SessionClearMessage> | null
  return !!data && typeof data === 'object' && data.type === SESSION_CLEAR_TYPE
}
