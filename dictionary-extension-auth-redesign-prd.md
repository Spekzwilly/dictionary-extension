# PRD: Extension Auth UX Redesign — Web-App OAuth + postMessage Session Handoff

## Problem Statement

When I sign into the dictionary extension with Google, `chrome.identity.launchWebAuthFlow` opens a tiny consent window that I have to manually maximize before I can even see and click my Google account. Chrome controls that window's size — there's no API to fix it. It feels broken every single time I sign in.

On top of that, the extension and the deployed web app keep **separate** login sessions (they live on different storage origins). So even after I sign into the extension, I have to sign in *again* on the web app — and vice versa. Two sign-ins for one identity, one of which goes through a cramped, awkward popup.

## Solution

Route **all** extension sign-in through the deployed web app's full-page Google OAuth — the same clean, full-tab consent screen the web app already uses — and then hand the resulting session **back** into the extension automatically.

From my perspective:

1. I click the Google button anywhere in the extension (toolbar popup or the in-page definition popup).
2. A new tab opens and takes me **straight to Google's full-page consent screen** — no cramped popup, no intermediate page.
3. I approve, and land on my Vocab Bank in the web app.
4. **Without doing anything else**, my extension is now signed in too — the toolbar popup shows my vocab count, and the in-page Save button appears on my reading pages.

One sign-in, one clean consent screen, both surfaces logged in. As a bonus, if I ever sign into the web app directly, the extension picks that session up automatically too.

## User Stories

1. As a reader, I want clicking the Google button in the in-page definition popup to take me to a full-page Google consent screen, so that I never have to wrestle with a tiny un-resizable popup window.
2. As a reader, I want clicking "Sign in with Google" in the toolbar popup to take me to that same full-page consent screen, so that sign-in is consistent and comfortable everywhere.
3. As a user, I want the extension's Google button to open the deployed web app's login in a new tab, so that I reuse the web app's proven OAuth flow instead of a second implementation.
4. As a user, I want the web app login to go straight to Google when I arrive from the extension, so that I don't have to click a second button after the tab opens.
5. As a user, I want to land on my Vocab Bank after approving Google, so that I end up somewhere useful rather than on a blank login page.
6. As a user, I want my extension to become signed in automatically once I finish signing in on the web app, so that I don't have to sign in twice for one identity.
7. As a user, I want the toolbar popup to show my vocab count and signed-in state the next time I open it after signing in, so that I can confirm I'm logged in.
8. As a reader, I want the in-page Save button to appear on my open reading tabs once my session syncs in, so that I can save words without manually refreshing.
9. As a reader who is signed out and tries to Save a word, I want clicking the in-page Google button to open the web app login, so that I have a clear path to sign in and start saving.
10. As a reader, I accept that after signing in via the in-page button I may need to re-select the word to save it, so that the flow stays simple (sign-in is a once-ever action).
11. As a user who is already signed into the web app, I want clicking the extension's Google button to sign my extension in immediately without re-consenting to Google, so that I'm not asked to approve something I already approved.
12. As a user, I want signing out of the web app to also sign out my extension, so that "sign out" means what it says when I do it from the source of truth.
13. As a user, I want signing out of the extension to clear the extension's session, so that I can log the extension out locally.
14. As a user, I want my extension to stay logged in across browser restarts and token expiry without needing the web app open, so that I'm not silently logged out.
15. As a user, I want a stale web app tab refreshing its token in the background to NOT silently sign my extension back in after I deliberately signed the extension out, so that sign-out sticks.
16. As a security-conscious user, I want only the real deployed web app (and localhost in dev) to be able to hand a session to my extension, so that a malicious website can't log my extension into an attacker's account.
17. As a developer, I want the extension's redundant OAuth implementation (`launchWebAuthFlow`, the nonce hashing dance, `signInWithIdToken`, the `identity` permission, the `oauth2` manifest block) removed, so that the codebase stops carrying its three hardest-won OAuth gotchas.
18. As a developer, I want the extension to have no background service worker if it no longer needs one, so that there's less surface area to maintain.
19. As a developer, I want the session-transfer trust decision isolated as a pure, unit-tested function, so that the security boundary is verifiable without spinning up a browser.
20. As a user running the extension against a local dev web app, I want the handoff to work against `http://localhost`, so that I can develop and test the flow locally.
21. As a user, I want the dictionary lookup popup to keep working on every page (including the web app's own pages), so that nothing about my existing reading experience changes.

## Implementation Decisions

### Session-transfer mechanism: explicit `postMessage` handshake
- The web app broadcasts its session to the page via `window.postMessage({ type: 'dict-ext-session', session })`.
- A **dedicated bridge content script**, scoped *only* to the web app origins, listens for that message, validates it, and calls `supabase.auth.setSession()` to persist it into the extension's `chrome.storage.local`.
- Rejected alternatives: **localStorage scraping** (brittle — reverse-engineers Supabase's internal storage key) and **`externally_connectable`** (requires the extension ID hardcoded in the web app; the ID churns on every unpacked dev reload).
- The token stays in-browser the entire time — never on the network, never in a URL. (URL token-passing was previously rejected for security.)

### The end-to-end flow
```
Extension Google button (toolbar OR in-page)
  → opens a new tab at  <web app>/login?ext=1
  → /login: no session + ext=1 + not returning from OAuth → auto-fire signInWithOAuth
  → Google full-page consent → user approves
  → redirect back to a clean /vocab (no ext=1 in the URL)
  → web app fires SIGNED_IN → window.postMessage({ type:'dict-ext-session', session })
  → bridge content script validates origin + source + shape → supabase.auth.setSession()
  → session persisted to chrome.storage.local
  → chrome.storage.onChanged → in-page popup reveals Save; toolbar popup reflects it on next open
```

### Remove the extension's own OAuth path entirely
- Delete the `launchWebAuthFlow` + nonce-hashing + `signInWithIdToken` implementation from the extension's `auth` module.
- Remove the `identity` permission and the `oauth2` block from the extension manifest.
- The extension `auth` module shrinks to: `getUser`, `hasSession`, `signOut`, and a new "open web app login" trigger.
- This removes three documented gotchas: the nonce hash mismatch, the `chromiumapp.org` redirect-URI registration, and the extension-ID-changes-invalidate-redirect footgun.

### Delete the background service worker
- The background worker's only job was delegating OAuth for the in-page popup (content scripts can't call `chrome.identity`). With OAuth gone, it has no purpose.
- A content script **can** read/write `chrome.storage.local` and drive the Supabase client directly, so the bridge calls `setSession()` itself with no background round-trip.
- Result: the extension ships with **no background service worker**.

### Both Google buttons become "open the web app login tab"
- Toolbar popup "Sign in with Google" → opens a new tab at `<web app>/login?ext=1` (replacing the old `launchWebAuthFlow` call).
- In-page definition popup Google button → opens the same login tab (replacing the message to the now-deleted background worker).
- The login URL is built from `VITE_WEB_APP_URL` reusing the existing `joinWebAppUrl` helper, with an `ext=1` query param.

### Web app `/login` auto-start + guard
- On mount, `/login` decides whether to auto-fire `signInWithOAuth` based on a pure decision: auto-fire **only** when there is no existing session, the `ext=1` param is present, and the page is **not** currently returning from an OAuth redirect (no `code`/`access_token` in the URL).
- Guard against React strict-mode double-mount firing OAuth twice (a ref / sessionStorage flag).
- If a session **already exists** when arriving with `ext=1`, skip OAuth entirely: broadcast the existing session and redirect to `/vocab`.
- `signInWithOAuth`'s `redirectTo` points at a clean URL **without** `ext=1` (the Vocab Bank), so the return leg never re-enters the auto-fire branch (no redirect loop).

### Broadcast scope: real auth events only
- The web app broadcasts the session on **`SIGNED_IN`** and broadcasts a **clear** on **`SIGNED_OUT`** (via Supabase's `onAuthStateChange`), plus the one manual broadcast in the already-signed-in `/login` branch above.
- It does **not** broadcast on `INITIAL_SESSION` (passive page reload) or `TOKEN_REFRESHED`. The extension's Supabase client keeps `autoRefreshToken: true` and refreshes itself once synced — it never needs rebroadcasts to stay alive.
- This prevents a stale, still-open web app tab's background token refresh from silently re-signing-in an extension the user deliberately signed out.

### Sign-out: web-app-authoritative
- Web app sign-out fires `SIGNED_OUT` → broadcast clear → the bridge clears the extension's session. Sign-out cascades from the web app to the extension.
- Extension sign-out clears the extension's own session only (the web app is a separate tab we don't reach into). The asymmetry is acceptable: the web app is the source of truth for login now.

### Bridge security
- The bridge content script `matches` are hardcoded to `https://dictionary-extension.vercel.app/*` and `http://localhost/*` — so the handoff listener literally does not exist on arbitrary sites.
- Belt-and-suspenders: before honoring a message, the bridge checks `event.origin` against the same allowlist, checks `event.source === window`, and checks the message `type`/shape.
- This closes the login-CSRF / session-fixation hole where a malicious page could `postMessage` an attacker's tokens to log the extension into the attacker's account.

### Surfaces reactively reflect the new session
- The existing `*://*/*` content script gains a `chrome.storage.onChanged` listener on the session key; when the session syncs in, it flips the in-page popup's signed-in state so Save appears without a manual refresh.
- The toolbar popup needs no live listener — its existing mount-time `hasSession()` check already does the right thing each time it's opened.

### Unchanged
- The dictionary lookup popup continues to match all pages, including the web app's own pages (no origin exclusion). Selecting a word inside the Vocab Bank still triggers a lookup — harmless and occasionally handy.
- The extension's Supabase storage adapter (`chrome.storage.local`) and the web app's default storage adapter are unchanged; they remain separate stores, now kept in sync at sign-in/sign-out via the bridge.

## Testing Decisions

A good test here verifies **external behavior** through the highest available seam and never asserts on implementation details. Prior art: `packages/extension/lib/__tests__/web-app-url.test.ts` (pure function, plain assertions) and `auth.test.ts` (mocks `../supabase` and `vi.stubGlobal('chrome', …)`). Tests run under vitest (`npm test --workspace=@dictionary/extension`).

Modules and seams to test:

1. **Bridge trust decision (highest-value seam — the security boundary).** Extract a pure function — e.g. `isTrustedSessionMessage(event, allowedOrigins)` — that returns whether a received `message` event should be honored. Unit-test the truth table: accepted on a matching origin + `source === window` + correct `type`/shape; rejected on a foreign origin, wrong source, missing/garbled payload, wrong `type`. This is the function that defends against session-fixation, so its tests matter most. Style mirrors `web-app-url.test.ts` (pure in, boolean out).

2. **Login-URL construction (extension).** The "open web app login" trigger builds `<base>/login?ext=1` from `VITE_WEB_APP_URL` via `joinWebAppUrl`. Unit-test the resulting URL string (param present, base joined correctly), extending the existing `web-app-url` test style.

3. **`/login` auto-start guard (web app).** Extract a pure decision — e.g. `shouldAutoStartOAuth({ hasSession, fromExt, returningFromOAuth })` → boolean — and unit-test the truth table (fire only when `!hasSession && fromExt && !returningFromOAuth`; never otherwise). This requires adding a vitest setup to `@dictionary/web`, which currently has none; add it at this seam so the guard logic is verifiable in isolation.

4. **Delete the obsolete test.** Remove the `signInWithGoogle nonce handling` case in `auth.test.ts` — it covers the `launchWebAuthFlow` path being deleted. Keep the `hasSession` cases (that behavior is unchanged and still relied upon by every surface).

Explicitly **not** unit-tested (verified manually instead): the actual `postMessage` → `setSession` → `chrome.storage.onChanged` round-trip, which crosses the content-script / web-page boundary. A browser-level integration harness for this would be brittle and high-maintenance for low value. Manual verification: load unpacked from `packages/extension/.output/chrome-mv3`, sign in via both the toolbar and in-page buttons, confirm the extension reflects signed-in state, and confirm a malicious-origin `postMessage` is ignored.

## Out of Scope

- **Bidirectional sign-out.** Extension sign-out does *not* reach into open web app tabs to sign them out. Sign-out is web-app-authoritative only.
- **The "add vocab by paste" feature** (separate planned enhancement, separate PRD).
- **Any change to the dictionary lookup, Vocab Bank, or Review functionality.** This PRD is auth-flow only.
- **Migrating the two Supabase clients to a shared session store.** They stay separate, synced at auth events via the bridge — not merged.
- **Auto-saving a pending word** after the in-page sign-in round-trip. The user re-selects the word after signing in (accepted one-time friction).
- **Eliminating the extra click on direct web app sign-in.** Direct web app sign-in already works; the extension simply picks it up via the same broadcast.

## Further Notes

- This supersedes planned-enhancement item #2 (auth UX redesign) in project memory, which framed the two pains (separate sessions + cramped consent window) and left the mechanism open. This PRD resolves both with a single design.
- The design was locked via a `/grill-me` session on 2026-06-16; every decision above corresponds to a resolved branch of that interview.
- The deployed web app is `https://dictionary-extension.vercel.app` (Vercel, auto-deploy on `main`). Because the web app changes (`/login` auto-start + broadcast) must be live for the extension flow to work end-to-end, the web app side should be deployed before (or together with) shipping the new extension build.
- After this lands, the repo's CLAUDE.md "Key Gotchas" around `launchWebAuthFlow`, the nonce, and the `chromiumapp.org` redirect URI become obsolete and should be pruned in the same change.
