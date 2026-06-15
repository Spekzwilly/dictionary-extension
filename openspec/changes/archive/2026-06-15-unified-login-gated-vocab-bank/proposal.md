## Why

The toolbar popup — the first thing a user opens — has no way to sign in, so the install → sign in → save flow is undiscoverable, and the only Google sign-in button is buried on a separate full-page tab. The extension also lets users save words while signed out into local-only storage that never syncs, producing two disconnected "vocab banks." We want one coherent path where signing in is reachable from wherever the user hits a signed-out wall, and saving always syncs.

## What Changes

- The **toolbar popup** becomes the primary auth gateway + status surface: when signed out it shows a "Sign in with Google" button (OAuth runs in the popup); when signed in it shows the vocab-bank word count, a CTA to open the Vocab Bank page in a new tab, a Review CTA, and Sign out.
- The **in-page definition popup** (content script) shows its own "Sign in with Google" button in place of Save when signed out; after sign-in it swaps to the Save button. Because content scripts lack `chrome.identity`, this button delegates OAuth to a background worker.
- A small **background service worker** is (re)introduced solely to run `launchWebAuthFlow` + `signInWithIdToken` on behalf of the content script, responding with success/failure. The toolbar popup and Vocab Bank page sign in directly (they are extension pages).
- The **Vocab Bank page** keeps its own "Sign in with Google" button for the signed-out / direct-URL case.
- **BREAKING (behavior):** Saving a word now **requires** being signed in. The signed-out path no longer writes a local-only entry; instead it surfaces sign-in. A shared, network-free session check (`getSession`) drives every surface's signed-in/out rendering.
- Definition lookup, the storage write path internals (`saveWord` still writes local + cloud upsert), the `vocab_entries` schema, and Review remain unchanged.

## Non-Goals

- The PWA web app (`packages/web`) — extension only.
- Spaced-repetition scheduling; Review stays a random 10-word session.
- Changing the OAuth mechanism, Supabase schema, or `vocab_entries` RLS policy.
- Programmatically opening the toolbar popup from a page (unsupported by Chrome); the in-page popup signs in via its own button delegating to the background worker.
- Migrating pre-existing local-only saved words into the cloud on first sign-in.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cloud-sync`: sign-in becomes reachable from all three surfaces (toolbar popup, in-page definition popup, Vocab Bank page); the in-page popup's sign-in delegates OAuth to a background service worker; a shared network-free session check determines signed-in state across surfaces.
- `vocab-bank`: the toolbar popup gains signed-out (Google sign-in) and signed-in (word count + Open Vocab Bank + Review + Sign out) states; the Vocab Bank page renders its own Google sign-in button when signed out.
- `vocab-storage`: saving a word requires authentication — when signed out, the definition popup surfaces sign-in instead of writing a local-only entry.

## Impact

- Affected specs: `cloud-sync`, `vocab-bank`, `vocab-storage`
- Affected code (extension package):
  - `entrypoints/popup/App.tsx` — auth gateway + status states
  - `entrypoints/content.ts` + `lib/components/DefinitionPopup.tsx` — signed-in state, in-page Google button delegating to background
  - `entrypoints/background.ts` — **new** service worker handling the `sign-in` message
  - `entrypoints/vocab-bank/App.tsx` — own Google sign-in button when signed out
  - `lib/auth.ts` — shared network-free `hasSession()` helper (and background OAuth entry)
  - `lib/vocab-storage.ts` — saving gated on auth (no local-only save when signed out)
  - `wxt.config.ts` — register the background entrypoint (no new permissions; `identity` already granted)
- No schema or RLS changes.
