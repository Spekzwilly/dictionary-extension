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

// Fast, network-free signed-in check. Reads the session from the chrome.storage
// adapter via getSession (no network request), so every surface can use it to
// decide whether to render its signed-in or signed-out state.
export async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

// chrome.identity.getAuthToken() returns an access token, not an OIDC ID token.
// We use launchWebAuthFlow to get a proper ID token that Supabase accepts.
export async function signInWithGoogle(): Promise<void> {
  const { idToken, nonce } = await getGoogleIdToken()
  // Supabase SHA-256-hashes this nonce and compares it to the id_token's nonce
  // claim, so it must receive the RAW nonce (Google got the hashed one).
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce })
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
async function getGoogleIdToken(): Promise<{ idToken: string; nonce: string }> {
  const clientId = chrome.runtime.getManifest().oauth2?.client_id
  if (!clientId) throw new Error('oauth2.client_id not set in manifest')

  const redirectUrl = chrome.identity.getRedirectURL()
  // Google receives the SHA-256 (hex) hash of the nonce; Supabase receives the
  // raw nonce and hashes it the same way to match the id_token's nonce claim.
  const nonce = crypto.randomUUID()
  const hashedNonce = await sha256Hex(nonce)

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'id_token token')
  authUrl.searchParams.set('redirect_uri', redirectUrl)
  authUrl.searchParams.set('scope', 'openid email profile')
  authUrl.searchParams.set('nonce', hashedNonce)

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
  return { idToken, nonce }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}
