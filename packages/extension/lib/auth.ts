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

// Sign-in is performed entirely by the web app's full-page OAuth and handed
// back to the extension via the bridge content script — the extension no longer
// runs chrome.identity OAuth itself. Surfaces initiate sign-in by opening the
// web app login (see lib/web-app-url `loginUrl`).
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
