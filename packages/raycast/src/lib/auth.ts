import { OAuth, getPreferenceValues } from "@raycast/api"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./supabase"

interface Preferences {
  supabaseUrl: string
  supabaseAnonKey: string
}

const { supabaseUrl, supabaseAnonKey } = getPreferenceValues<Preferences>()

// NOTE: `authRequest.redirectURI` below is Raycast's Web redirect URL
// (https://raycast.com/redirect?packageName=Extension). This exact URL must be
// added to the Supabase dashboard's Auth → URL Configuration → Redirect URLs
// allow-list, otherwise Supabase rejects `redirect_to`.

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Google",
  providerIcon: "extension-icon.png",
  description: "Sign in to your vocab bank with Google.",
})

/**
 * Returns the current Supabase session, transparently refreshing it via the
 * client's auto-refresh. Returns null when no session exists or it cannot be
 * refreshed (revoked / expired beyond refresh).
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

/**
 * Drives Google sign-in through Raycast's PKCE client against Supabase's
 * `/auth/v1/authorize` endpoint. Raycast owns the PKCE verifier and OAuth
 * state, so the authorization code is exchanged manually at the token endpoint
 * (Supabase's own `exchangeCodeForSession` can't use a verifier it didn't
 * generate). The resulting tokens are persisted via `setSession`.
 */
export async function signIn(): Promise<void> {
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${supabaseUrl}/auth/v1/authorize`,
    clientId: supabaseAnonKey,
    scope: "email profile",
    extraParameters: { provider: "google" },
  })

  // Build a clean Supabase authorize URL ourselves rather than using
  // authRequest.toURL(). The generated URL carries Raycast's generic OAuth
  // params (client_id=<anon key>, response_type, redirect_uri), which Supabase
  // forwards to Google — making Google reject the anon key as an unknown
  // client. Supabase only needs provider + redirect_to + the PKCE challenge;
  // it then uses its own configured Google client to reach Google.
  //
  // Supabase does NOT echo a top-level `state` param back to redirect_to, so
  // Raycast can't correlate the callback. We embed Raycast's `state` INTO
  // redirect_to: Supabase appends `&code=...` to it, so the final redirect to
  // raycast.com carries both `state` and `code`, which Raycast matches on.
  const redirectTo = `${authRequest.redirectURI}&state=${encodeURIComponent(authRequest.state)}`
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectTo,
    code_challenge: authRequest.codeChallenge,
    code_challenge_method: "s256",
  })
  const authUrl = `${supabaseUrl}/auth/v1/authorize?${params.toString()}`

  const { authorizationCode } = await oauthClient.authorize({ url: authUrl })

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      auth_code: authorizationCode,
      code_verifier: authRequest.codeVerifier,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${detail}`)
  }

  const tokens = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    error_description?: string
  }
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error(tokens.error_description ?? "Token exchange returned no session")
  }

  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  if (error) throw error
}

/**
 * Ensures a valid session exists, initiating Google sign-in when signed out or
 * when the stored session cannot be refreshed. Returns the active session.
 */
export async function ensureSignedIn(): Promise<Session> {
  const existing = await getSession()
  if (existing) return existing

  await signIn()
  const session = await getSession()
  if (!session) throw new Error("Sign-in did not establish a session")
  return session
}

/** Clears the stored session so subsequent saves require signing in again. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  await oauthClient.removeTokens()
}
