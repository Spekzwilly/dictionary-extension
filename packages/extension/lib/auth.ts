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

// chrome.identity.getAuthToken() returns an access token, not an OIDC ID token.
// We use launchWebAuthFlow to get a proper ID token that Supabase accepts.
export async function signInWithGoogle(): Promise<void> {
  const idToken = await getGoogleIdToken()
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  // Also clear any cached access tokens from chrome.identity
  await new Promise<void>(resolve => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, resolve)
      } else {
        resolve()
      }
    })
  })
}

// Gets an OIDC ID token (JWT) via chrome.identity.launchWebAuthFlow.
// Unlike getAuthToken(), this returns an id_token that Supabase accepts.
async function getGoogleIdToken(): Promise<string> {
  const clientId = chrome.runtime.getManifest().oauth2?.client_id
  if (!clientId) throw new Error('oauth2.client_id not set in manifest')

  const redirectUrl = chrome.identity.getRedirectURL()
  const nonce = Math.random().toString(36).slice(2)

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'id_token token')
  authUrl.searchParams.set('redirect_uri', redirectUrl)
  authUrl.searchParams.set('scope', 'openid email profile')
  authUrl.searchParams.set('nonce', nonce)

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (callbackUrl) => {
        if (chrome.runtime.lastError || !callbackUrl) {
          reject(new Error(chrome.runtime.lastError?.message ?? 'Auth cancelled'))
        } else {
          resolve(callbackUrl)
        }
      }
    )
  })

  // Parse id_token from the fragment
  const hash = new URL(responseUrl).hash.slice(1)
  const params = new URLSearchParams(hash)
  const idToken = params.get('id_token')
  if (!idToken) throw new Error('No id_token in response')
  return idToken
}
