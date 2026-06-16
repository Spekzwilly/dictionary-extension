import {
  ALLOWED_HANDOFF_ORIGINS,
  isTrustedSessionMessage,
  isTrustedClearMessage,
  type SessionHandoffMessage,
} from '@dictionary/shared'
import { supabase } from '../lib/supabase'

// Bridge between the deployed web app and the extension. Scoped to the web app
// origins only, so this handoff listener does not exist on arbitrary pages. The
// web app broadcasts its session via window.postMessage after authenticating;
// here we validate the message's origin/source/shape before persisting it into
// the extension's chrome.storage.local-backed Supabase session.
export default defineContentScript({
  matches: ['https://dictionary-extension.vercel.app/*', 'http://localhost/*'],

  main() {
    const opts = { allowedOrigins: ALLOWED_HANDOFF_ORIGINS, self: window }

    window.addEventListener('message', (event) => {
      if (isTrustedSessionMessage(event, opts)) {
        const { session } = event.data as SessionHandoffMessage
        supabase.auth
          .setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
          .catch(() => {})
      } else if (isTrustedClearMessage(event, opts)) {
        // Web-app-authoritative sign-out: clear the extension session locally.
        supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      }
    })
  },
})
