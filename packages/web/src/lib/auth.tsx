import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { broadcastSession, broadcastSignOut } from './login-flow'

type AuthContext = {
  user: User | null
  loading: boolean
}

const Ctx = createContext<AuthContext>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // Hand the session to the extension bridge only on genuine auth
      // transitions — never on INITIAL_SESSION / TOKEN_REFRESHED, so a stale
      // tab's background refresh can't resurrect a signed-out extension.
      if (event === 'SIGNED_IN') broadcastSession(session)
      else if (event === 'SIGNED_OUT') broadcastSignOut()
    })

    return () => subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>
}

export function useAuth() {
  return useContext(Ctx)
}

export async function signInWithGoogle() {
  // Return to a clean /vocab (no ext=1) so the return leg never re-triggers the
  // login page's auto-start guard.
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/vocab` },
  })
}

export async function signOut() {
  await supabase.auth.signOut()
}
