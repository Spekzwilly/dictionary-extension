import { supabase } from './supabase'

export type AuthUser = {
  email: string
  id: string
}

export async function getUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  return { email: data.user.email ?? '', id: data.user.id }
}

export async function signInWithGoogle(): Promise<void> {
  const token = await getGoogleToken(true)
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token })
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    const token = data.session.provider_token
    if (token) {
      await chrome.identity.removeCachedAuthToken({ token })
    }
  }
  await supabase.auth.signOut()
}

// Attempts to get a fresh Google token, handling expired cached tokens.
export async function getGoogleToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Failed to get auth token'))
        return
      }
      // Verify token isn't rejected by Supabase (expired but still cached)
      const testResp = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
      )
      if (!testResp.ok) {
        // Token is expired — remove and retry non-interactively
        await new Promise<void>(res => chrome.identity.removeCachedAuthToken({ token }, res))
        chrome.identity.getAuthToken({ interactive: false }, (freshToken) => {
          if (chrome.runtime.lastError || !freshToken) {
            reject(new Error('Session expired, please sign in again'))
            return
          }
          resolve(freshToken)
        })
      } else {
        resolve(token)
      }
    })
  })
}
