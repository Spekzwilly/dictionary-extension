import { signInWithGoogle } from '../lib/auth'

// Content scripts cannot access chrome.identity, so the in-page definition
// popup delegates the Google OAuth flow to this background worker. It reuses
// signInWithGoogle (launchWebAuthFlow → signInWithIdToken) and reports the
// outcome back to the caller.
export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'sign-in') {
      signInWithGoogle()
        .then(() => sendResponse({ ok: true }))
        .catch((e) =>
          sendResponse({ ok: false, error: e instanceof Error ? e.message : 'Sign-in failed' })
        )
      return true // keep the message channel open for the async response
    }
  })
})
