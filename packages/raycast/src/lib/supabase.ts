import { LocalStorage, getPreferenceValues } from "@raycast/api"
import { createClient } from "@supabase/supabase-js"
import WebSocket from "ws"

interface Preferences {
  supabaseUrl: string
  supabaseAnonKey: string
}

const prefs = getPreferenceValues<Preferences>()

/**
 * Supabase session persistence backed by Raycast's encrypted LocalStorage.
 * Mirrors the extension's custom storage adapter so the session survives
 * across command launches. Each surface keeps its own session for the same
 * Supabase user.
 */
const raycastStorage = {
  getItem: (key: string) => LocalStorage.getItem<string>(key).then((v) => v ?? null),
  setItem: (key: string, value: string) => LocalStorage.setItem(key, value),
  removeItem: (key: string) => LocalStorage.removeItem(key),
}

export const supabase = createClient(prefs.supabaseUrl, prefs.supabaseAnonKey, {
  auth: {
    storage: raycastStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
  // Raycast's Node sandbox has no global WebSocket. We never use Realtime, but
  // createClient constructs a RealtimeClient that requires a WebSocket impl, so
  // hand it `ws`. It never connects because we never subscribe to a channel.
  realtime: {
    transport: WebSocket as unknown as typeof globalThis.WebSocket,
  },
})
