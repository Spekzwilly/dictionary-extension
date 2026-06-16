import { describe, it, expect, vi } from 'vitest'

// Mock the supabase client so hasSession's getSession is controllable and never
// hits the network or createClient.
const getSession = vi.fn()
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
    },
  },
}))

import { hasSession } from '../auth'

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
