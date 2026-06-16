import { describe, it, expect } from 'vitest'
import { shouldAutoStartOAuth, isFromExtension, isReturningFromOAuth } from '../login-flow'

describe('shouldAutoStartOAuth', () => {
  // Truth table from the web-app spec: fire only on the outbound extension leg.
  const cases: Array<{ hasSession: boolean; fromExt: boolean; returningFromOAuth: boolean; expected: boolean }> = [
    { hasSession: false, fromExt: true, returningFromOAuth: false, expected: true },
    { hasSession: true, fromExt: true, returningFromOAuth: false, expected: false },
    { hasSession: false, fromExt: false, returningFromOAuth: false, expected: false },
    { hasSession: false, fromExt: true, returningFromOAuth: true, expected: false },
  ]

  it.each(cases)('hasSession=$hasSession fromExt=$fromExt returning=$returningFromOAuth → $expected', (c) => {
    expect(shouldAutoStartOAuth(c)).toBe(c.expected)
  })
})

describe('isFromExtension', () => {
  it('detects the ext=1 marker', () => {
    expect(isFromExtension('?ext=1')).toBe(true)
  })
  it('is false without the marker', () => {
    expect(isFromExtension('')).toBe(false)
    expect(isFromExtension('?foo=bar')).toBe(false)
  })
})

describe('isReturningFromOAuth', () => {
  it('detects a PKCE code in the query', () => {
    expect(isReturningFromOAuth('?code=abc123', '')).toBe(true)
  })
  it('detects an implicit access_token in the hash', () => {
    expect(isReturningFromOAuth('', '#access_token=xyz')).toBe(true)
  })
  it('is false on a clean URL', () => {
    expect(isReturningFromOAuth('?ext=1', '')).toBe(false)
  })
})
