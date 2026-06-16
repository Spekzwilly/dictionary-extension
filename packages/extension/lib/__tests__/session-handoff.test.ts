import { describe, it, expect } from 'vitest'
import {
  isTrustedSessionMessage,
  isTrustedClearMessage,
  isAllowedOrigin,
  SESSION_HANDOFF_TYPE,
  SESSION_CLEAR_TYPE,
  ALLOWED_HANDOFF_ORIGINS,
} from '@dictionary/shared'

const SELF = { id: 'page-window' } // stand-in for the page's window
const session = { access_token: 'a', refresh_token: 'r' }

function evt(over: Partial<{ origin: string; source: unknown; data: unknown }>) {
  return {
    origin: 'https://dictionary-extension.vercel.app',
    source: SELF,
    data: { type: SESSION_HANDOFF_TYPE, session },
    ...over,
  }
}

const opts = { allowedOrigins: ALLOWED_HANDOFF_ORIGINS, self: SELF }

describe('isTrustedSessionMessage — trust gate truth table', () => {
  it.each([
    { name: 'prod origin, same window, valid', over: {}, expected: true },
    { name: 'localhost any port', over: { origin: 'http://localhost:5174' }, expected: true },
    { name: 'foreign origin rejected', over: { origin: 'https://evil.com' }, expected: false },
    { name: 'different window rejected', over: { source: { id: 'other' } }, expected: false },
    { name: 'wrong type rejected', over: { data: { type: 'other', session } }, expected: false },
    { name: 'missing session rejected', over: { data: { type: SESSION_HANDOFF_TYPE } }, expected: false },
    { name: 'malformed session rejected', over: { data: { type: SESSION_HANDOFF_TYPE, session: { access_token: 1 } } }, expected: false },
  ])('$name', ({ over, expected }) => {
    expect(isTrustedSessionMessage(evt(over), opts)).toBe(expected)
  })
})

describe('isAllowedOrigin', () => {
  it('matches exact prod origin', () => {
    expect(isAllowedOrigin('https://dictionary-extension.vercel.app', ALLOWED_HANDOFF_ORIGINS)).toBe(true)
  })
  it('matches localhost on any port', () => {
    expect(isAllowedOrigin('http://localhost:5174', ALLOWED_HANDOFF_ORIGINS)).toBe(true)
    expect(isAllowedOrigin('http://localhost', ALLOWED_HANDOFF_ORIGINS)).toBe(true)
  })
  it('rejects look-alike origins', () => {
    expect(isAllowedOrigin('https://dictionary-extension.vercel.app.evil.com', ALLOWED_HANDOFF_ORIGINS)).toBe(false)
    expect(isAllowedOrigin('http://localhost.evil.com', ALLOWED_HANDOFF_ORIGINS)).toBe(false)
  })
})

describe('isTrustedClearMessage', () => {
  it('accepts a clear from an allowed origin and the page window', () => {
    expect(isTrustedClearMessage(evt({ data: { type: SESSION_CLEAR_TYPE } }), opts)).toBe(true)
  })
  it('rejects a clear from a foreign origin', () => {
    expect(isTrustedClearMessage(evt({ origin: 'https://evil.com', data: { type: SESSION_CLEAR_TYPE } }), opts)).toBe(false)
  })
})
