## 1. Shared auth foundation

- [x] 1.1 Implement the **Shared signed-in state check across surfaces** requirement: expose a network-free `hasSession()` on `lib/auth.ts` that returns `true` iff a Supabase session exists in `chrome.storage` (via `getSession`, no network call). Verify with a unit test in `lib/__tests__` that mocks chrome.storage: session present → `true`, absent → `false`.
- [x] 1.2 Implement the **OAuth delegation via background service worker** requirement: add a background service worker (`entrypoints/background.ts`, registered in `wxt.config.ts`) that, on receiving a `{ type: 'sign-in' }` runtime message, runs `launchWebAuthFlow` + `signInWithIdToken` and responds `{ ok: true }` on success or `{ ok: false, error }` on failure/cancel. Verify by building the extension (`npm run build --workspace=@dictionary/extension`) and confirming `background.js` is emitted and the manifest registers the service worker with no new permissions added.

## 2. Login-gated saving in the in-page popup

- [x] 2.1 Make `DefinitionPopup` render a "Sign in with Google" button in place of "Save" when signed out, and the "Save to Vocab Bank" button when signed in (loading/not-found states unchanged). Verify by visual review of the rendered states in a loaded extension: signed-out selection shows the sign-in button, signed-in shows Save.
- [x] 2.2 Satisfy the in-page surface of the **Google OAuth sign-in in Chrome extension** requirement: wire `entrypoints/content.ts` so the popup checks `hasSession()` on mount and passes signed-in state to `DefinitionPopup`; the in-page sign-in button sends the `sign-in` message to the background worker and, on success, re-checks the session and swaps to Save. Verify e2e: signed out → select word → click sign-in → complete OAuth → button becomes Save without reloading the page.
- [x] 2.3 Implement the **Save word to vocab bank** requirement's auth gate: no vocab entry is written while signed out, and the signed-in save still writes local + cloud upsert. Verify by selecting a word signed out, confirming no Save control is reachable, and confirming `chrome.storage.local` `vocab` and Supabase `vocab_entries` gain no row; then signed in, confirm one row is written.

## 3. Toolbar popup as auth gateway + status

- [x] 3.1 Implement the **Toolbar popup as auth gateway and status surface** requirement: rebuild `entrypoints/popup/App.tsx` to render a signed-out state (a "Sign in with Google" button that runs `signInWithGoogle` directly and re-renders on success) and a signed-in state (word count + "Open Vocab Bank" CTA opening the bank in a new tab + "Review" CTA + "Sign out"). Verify e2e: open popup signed out → see only the sign-in button; sign in → see count + CTAs; click "Open Vocab Bank" → bank opens in a new tab; "Sign out" → returns to signed-out state.

## 4. Vocab Bank page sign-in on direct access

- [x] 4.1 Implement the **Display auth state and sign-in/sign-out controls** requirement on the Vocab Bank page: `entrypoints/vocab-bank/App.tsx` shows its own "Sign in with Google" button (calling `signInWithGoogle` directly) when opened signed out by direct URL, and loads the Supabase word list after sign-in; the signed-in state keeps email + "Sign out". Verify e2e: open `vocab-bank.html` by URL while signed out → see the sign-in button; sign in → word list loads from Supabase.

## 5. Regression + full verification

- [x] 5.1 Confirm the storage write path is unchanged for signed-in saves (local + cloud upsert, encounter append on conflict). Verify the existing `lib/__tests__/vocab-storage.test.ts` suite still passes via `npm test --workspace=@dictionary/extension` with no modifications to its assertions.
- [x] 5.2 Run the full extension e2e per the PRD: load unpacked → sign in from popup → save a word → confirm the row in the Vocab Bank and in Supabase `vocab_entries` with the correct `user_id` → sign out → confirm the in-page popup offers sign-in (not Save). Verify by manual observation and a Supabase Table Editor check. (Verified by user: full journey works end-to-end; a minor caveat is deferred to a follow-up PR.)
