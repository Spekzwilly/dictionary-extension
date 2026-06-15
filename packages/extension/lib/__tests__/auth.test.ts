import { describe, it, expect, vi } from 'vitest'

// Mock the supabase client so hasSession's getSession is controllable and never
// hits the network or createClient.
const getSession = vi.fn()
const signInWithIdToken = vi.fn()
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      signInWithIdToken: (arg: unknown) => signInWithIdToken(arg),
    },
  },
}))

import { hasSession, signInWithGoogle } from '../auth'

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

describe('hasSession', () => {
  it('returns true when a session exists in storage', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'x' } } })
    expect(await hasSession()).toBe(true)
  })

  it('returns false when no session exists', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    expect(await hasSession()).toBe(false)
  })
})

describe('signInWithGoogle nonce handling', () => {
  it('sends the hashed nonce to Google and the raw nonce to Supabase', async () => {
    let authUrl = ''
    vi.stubGlobal('chrome', {
      runtime: { getManifest: () => ({ oauth2: { client_id: 'cid' } }), lastError: undefined },
      identity: {
        getRedirectURL: () => 'https://ext.chromiumapp.org/',
        launchWebAuthFlow: (opts: { url: string }, cb: (url: string) => void) => {
          authUrl = opts.url
          cb('https://ext.chromiumapp.org/#id_token=FAKE_JWT&access_token=AT')
        },
      },
    })
    signInWithIdToken.mockResolvedValue({ error: null })

    await signInWithGoogle()

    // Supabase received a raw nonce alongside the token.
    expect(signInWithIdToken).toHaveBeenCalledTimes(1)
    const arg = signInWithIdToken.mock.calls[0][0]
    expect(arg.provider).toBe('google')
    expect(arg.token).toBe('FAKE_JWT')
    expect(arg.nonce).toBeTruthy()

    // Google received the SHA-256 hex hash of that same raw nonce.
    const sentToGoogle = new URL(authUrl).searchParams.get('nonce')
    expect(sentToGoogle).toBe(await sha256Hex(arg.nonce))
  })
})
