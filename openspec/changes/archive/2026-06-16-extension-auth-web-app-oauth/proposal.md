## Why

Extension Google sign-in goes through `chrome.identity.launchWebAuthFlow`, which opens a tiny, un-resizable consent window the user must manually maximize before they can even click their account — Chrome controls that window's size and there is no API to fix it. Worse, the extension and the deployed web app keep separate login sessions on separate storage origins, so the user must sign in twice for one identity. Routing all extension sign-in through the web app's existing full-page OAuth — and handing the session back to the extension — fixes both pains at once and lets us delete a whole redundant OAuth implementation.

## What Changes

- Both extension Google buttons (toolbar popup + in-page definition popup) stop running OAuth themselves and instead open a new tab at `<web app>/login?ext=1`.
- The web app `/login` auto-starts the full-page Google OAuth when arrived-at from the extension (`ext=1`, no existing session, not mid-redirect), and lands the user on `/vocab`.
- After authentication, the web app broadcasts its session via `window.postMessage`; a new, origin-scoped bridge content script in the extension validates and persists it via `supabase.auth.setSession()`, signing the extension in automatically.
- The extension's in-page popup reveals Save reactively via `chrome.storage.onChanged` once the session syncs in.
- Sign-out is web-app-authoritative: web app sign-out broadcasts `SIGNED_OUT` and clears the extension; extension sign-out clears only the extension.
- **BREAKING (internal):** the extension's own OAuth path is removed entirely — `launchWebAuthFlow`, the nonce-hashing dance, `signInWithIdToken`, the `identity` manifest permission, the `oauth2` manifest block, and the background service worker are all deleted.

## Non-Goals (optional)

<!-- Recorded in design.md Goals/Non-Goals. -->

## Capabilities

### New Capabilities

(none — the session handoff is an extension of existing `cloud-sync` auth behavior)

### Modified Capabilities

- `cloud-sync`: extension authentication mechanism changes from in-extension `launchWebAuthFlow`/`signInWithIdToken` to web-app-delegated OAuth with a `postMessage` session handoff; token lifecycle, broadcast-on-auth-event rules, and web-app-authoritative sign-out are specified.
- `web-app`: the login page gains `?ext=1`-triggered auto-start OAuth, an already-signed-in fast path, and session broadcasting to the extension bridge on `SIGNED_IN`/`SIGNED_OUT`.

## Impact

- **Affected specs:** `cloud-sync`, `web-app`
- **Affected code (extension):** `lib/auth.ts` (shrinks to `getUser`/`hasSession`/`signOut` + open-login trigger), `lib/supabase.ts` (unchanged adapter, retained), `entrypoints/background.ts` (deleted), `entrypoints/content.ts` (adds `chrome.storage.onChanged` listener), new `entrypoints/web-bridge.ts` (origin-scoped bridge content script), `entrypoints/popup/App.tsx` and the in-page popup (Google buttons open the login tab), `wxt.config.ts` manifest (`identity` permission + `oauth2` block removed), `lib/__tests__/auth.test.ts` (obsolete nonce test removed).
- **Affected code (web):** `pages` login route (auto-start + already-signed-in guard), `lib/auth.tsx` (broadcast on `SIGNED_IN`/`SIGNED_OUT`), new vitest setup for `@dictionary/web`.
- **Docs:** repo `CLAUDE.md` "Key Gotchas" entries for `launchWebAuthFlow`, the OAuth nonce, and the `chromiumapp.org` redirect URI become obsolete and should be pruned.
- **Deploy ordering:** the web app changes must be live on `https://dictionary-extension.vercel.app` before (or with) the new extension build for the flow to work end-to-end.
