## Context

The Chrome extension authenticates with Google via `chrome.identity.launchWebAuthFlow`, which opens a small consent window Chrome won't let us resize. The deployed web app (`https://dictionary-extension.vercel.app`) already runs a clean full-page Supabase OAuth redirect flow. The two surfaces keep **separate** Supabase sessions on separate storage origins: the extension persists to `chrome.storage.local` via a custom storage adapter; the web app uses the default `localStorage` adapter on its own origin. So a user signs in twice for one identity, and one of those sign-ins is through the awkward popup.

A key enabling fact: the extension's content script already injects on `*://*/*`, which **includes the web app's own origin**. So when the user lands back on the web app after OAuth, the extension's own code is already running on that page — giving us an in-browser bridge that needs no URL token-passing (previously rejected for security).

This change was fully grilled to a locked conclusion on 2026-06-16; the PRD at `dictionary-extension-auth-redesign-prd.md` is the source of truth.

## Goals / Non-Goals

**Goals:**

- Replace the cramped extension OAuth popup with the web app's full-page Google consent.
- Sign the extension in automatically once the user authenticates on the web app — one sign-in, both surfaces.
- Delete the extension's redundant OAuth implementation and its three hardest gotchas (nonce mismatch, `chromiumapp.org` redirect URI, extension-ID-invalidates-redirect).
- Keep the session token in-browser the entire time — never on the network, never in a URL.
- Defend the handoff against a malicious page injecting an attacker's session (login-CSRF / session fixation).

**Non-Goals:**

- Bidirectional sign-out — extension sign-out does NOT reach into web app tabs. Sign-out is web-app-authoritative only.
- Merging the two Supabase clients into one shared session store — they stay separate, synced at auth events.
- Auto-saving a pending word after the in-page sign-in round-trip — the user re-selects (accepted one-time friction).
- Any change to dictionary lookup, Vocab Bank, or Review functionality.
- The separate "add vocab by paste" enhancement.

## Decisions

### Delegate extension sign-in to the web app's full-page OAuth

Both extension Google buttons (toolbar popup + in-page definition popup) open a new tab at `<VITE_WEB_APP_URL>/login?ext=1` instead of running OAuth. The login URL reuses the existing `joinWebAppUrl` helper. The web app owns the only OAuth implementation.

_Alternatives considered:_ Keep `launchWebAuthFlow` as a fallback — rejected; carrying two OAuth paths is exactly the maintenance burden (and gotcha surface) we want gone.

### Transfer the session via an explicit postMessage handshake

After authenticating, the web app calls `window.postMessage({ type: 'dict-ext-session', session })`. A dedicated bridge content script scoped to the web app origins receives it and persists it.

_Alternatives considered:_ (a) **localStorage scraping** — the bridge reads Supabase's `sb-<ref>-auth-token` key directly; rejected as brittle (reverse-engineers Supabase internals). (b) **`externally_connectable` + `chrome.runtime.sendMessage(EXTENSION_ID, …)`** — the "official" channel; rejected because the extension ID must be hardcoded in the web app and churns on every unpacked dev reload. The explicit postMessage contract is owned on both sides, survives Supabase upgrades, and needs no extension ID.

### Dedicated origin-scoped bridge content script, no background worker

A new content script matches **only** `https://dictionary-extension.vercel.app/*` and `http://localhost/*` (both hardcoded). It validates inbound messages, then calls `supabase.auth.setSession()` directly — content scripts can use `chrome.storage.local`, so no background round-trip is needed. The extension's background service worker (whose only job was OAuth delegation) is **deleted entirely**.

_Alternatives considered:_ Put the listener in the existing `*://*/*` content script and filter by origin — rejected; scoping the script to the web app origins means the handoff listener doesn't even exist on arbitrary sites, shrinking attack surface.

### Auto-start OAuth on `/login`, guarded against loops

`/login` auto-fires `signInWithOAuth` only when: no existing session AND `ext=1` present AND not currently returning from an OAuth redirect (no `code`/`access_token` in the URL). A ref/sessionStorage flag prevents React strict-mode double-mount from double-firing. If a session already exists, `/login` skips OAuth, broadcasts the existing session, and redirects to `/vocab`. `signInWithOAuth`'s `redirectTo` is a clean `/vocab` (no `ext=1`) so the return leg never re-enters the auto-fire branch.

### Broadcast only on real auth events; web-app-authoritative sign-out

The web app broadcasts the session on `SIGNED_IN` and broadcasts a clear on `SIGNED_OUT` (plus the manual broadcast in the already-signed-in `/login` branch). It does NOT broadcast on `INITIAL_SESSION` or `TOKEN_REFRESHED`. The extension's client keeps `autoRefreshToken: true` and refreshes itself once synced. This prevents a stale, still-open web app tab's background token refresh from silently re-signing-in an extension the user deliberately signed out. Sign-out cascades web → extension via `SIGNED_OUT`; extension sign-out clears only the extension.

### Surfaces reflect the new session reactively

The existing `*://*/*` content script gains a `chrome.storage.onChanged` listener on the session key and flips the in-page popup's signed-in state so Save appears without a manual refresh. The toolbar popup needs no listener — its mount-time `hasSession()` already re-checks on each open.

### Remove the extension's own OAuth path

Delete `launchWebAuthFlow` + the nonce-hashing dance + `signInWithIdToken` from the extension auth module, plus the `identity` permission and `oauth2` block from the manifest. The auth module shrinks to `getUser`, `hasSession`, `signOut`, and an open-web-app-login trigger.

## Implementation Contract

**Behavior:**
- Clicking the Google button in the toolbar popup OR the in-page definition popup opens a new browser tab at `<web app>/login?ext=1` and runs no in-extension OAuth.
- Arriving at `/login?ext=1` while signed out sends the user straight to Google's full-page consent (no intermediate click); approving lands them on `/vocab`.
- Arriving at `/login?ext=1` while already signed into the web app skips Google entirely and lands on `/vocab`.
- Within seconds of authenticating, the extension is signed in: the toolbar popup shows the vocab count on next open, and the in-page Save button appears on already-open reading tabs without a manual refresh.
- Signing out of the web app signs the extension out too. Signing out of the extension clears only the extension.
- A `postMessage` of shape `{ type: 'dict-ext-session', session }` from any origin other than the two allowlisted ones, or with `event.source !== window`, is ignored.

**Interface / data shape:**
- Handoff message: `{ type: 'dict-ext-session', session: Session }` (Supabase `Session` with `access_token` + `refresh_token`), delivered via `window.postMessage`.
- Clear message on sign-out: a `SIGNED_OUT` signal that causes the bridge to clear the extension session.
- Login trigger URL: `<VITE_WEB_APP_URL>/login?ext=1`.
- Allowed bridge origins (hardcoded): `https://dictionary-extension.vercel.app`, `http://localhost` (any port).
- Pure decisions to extract and unit-test: `isTrustedSessionMessage(event, allowedOrigins) -> boolean`; `shouldAutoStartOAuth({ hasSession, fromExt, returningFromOAuth }) -> boolean`; the login-URL builder (`…/login?ext=1`).

**Failure modes:**
- Web app unreachable / OAuth fails: the extension simply stays signed out; the error surfaces in the web app tab, not the extension. No partial session is written.
- Untrusted `postMessage`: silently ignored (no session written, no user-facing error).
- Double-mount of `/login`: guarded so OAuth fires at most once.

**Acceptance criteria:**
- `npm test --workspace=@dictionary/extension` passes, including the new `isTrustedSessionMessage` truth-table test and the login-URL test; the obsolete `signInWithGoogle nonce handling` test is removed.
- A vitest suite for `@dictionary/web` covers the `shouldAutoStartOAuth` truth table.
- `npm run build` succeeds for all three packages; the built extension manifest contains neither `identity` nor `oauth2`, and ships no background worker.
- Manual: load unpacked from `packages/extension/.output/chrome-mv3`; sign in via both buttons; confirm the extension reflects signed-in state; confirm web app sign-out clears the extension; confirm a foreign-origin `postMessage` is ignored.

**Scope boundaries:**
- In scope: the two specs (`cloud-sync`, `web-app`) and the extension/web code listed in the proposal Impact, plus pruning the now-obsolete `CLAUDE.md` gotchas.
- Out of scope: everything in Non-Goals above.

## Risks / Trade-offs

- **Extension now fully depends on the deployed web app being reachable for sign-in.** → Acceptable: the bank/review UI already lives only in the web app, so the extension is already a web-app consumer.
- **Web app changes must be live before the new extension ships, or the handoff breaks.** → Mitigation: deploy the web app (`/login` auto-start + broadcast) first or together; documented in the migration plan.
- **Malicious page forging a session handoff.** → Mitigation: bridge content script scoped to the two origins only, plus `event.origin` allowlist + `event.source === window` + message-shape checks. `event.origin` is browser-set and unforgeable.
- **Asymmetric sign-out could surprise a user who signs out of the extension and finds the web app still logged in.** → Accepted trade-off for simplicity; the web app is the source of truth for login.
- **Supabase changing `onAuthStateChange` event semantics could affect broadcast timing.** → Low risk; we depend only on `SIGNED_IN`/`SIGNED_OUT`, the most stable events, and the contract is owned on both sides.

## Migration Plan

1. Land and deploy the **web app** changes (`/login` auto-start + already-signed-in guard + broadcast on `SIGNED_IN`/`SIGNED_OUT`) to `https://dictionary-extension.vercel.app`.
2. Build and load the new **extension** (OAuth path + background worker removed, bridge content script added).
3. Verify the end-to-end flow manually per the acceptance criteria.
4. Prune the obsolete `launchWebAuthFlow` / OAuth-nonce / `chromiumapp.org` gotchas from repo `CLAUDE.md`.
5. Rollback: revert the extension build (re-introduces the old `launchWebAuthFlow` path); the web app additions are backward-compatible (an old extension simply ignores the broadcast), so the web app need not be rolled back.
