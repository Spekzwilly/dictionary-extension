## 1. Shared package refactor

- [x] 1.1 Lift `lookupWord` and add `mergeEncounters` to `@dictionary/shared`: export `lookupWord` (moved from the extension's dictionary-service) and a pure `mergeEncounters(existing, incoming)` that dedupes by `savedAt`, appends new, preserves order, and does not mutate inputs — delivering the "Shared package exports dictionary lookup and encounter merge logic" requirement. Verified by new unit tests in `@dictionary/shared`: `mergeEncounters` dedupe/append/order/no-mutation cases and the migrated `lookupWord` fetch-mock cases (valid → `WordDefinition`; 404/malformed/network → `NotFound`).
- [x] 1.2 Update the extension to import `lookupWord` from `@dictionary/shared` so existing lookup behavior is unchanged, satisfying the "npm workspaces monorepo root" shared-consumption contract. Verified by `npm test --workspace=@dictionary/extension` still passing and the extension build producing a valid `chrome-mv3` output.

## 2. Raycast package scaffold

- [x] 2.1 Add a `packages/raycast` workspace reusing `@dictionary/shared`: a Raycast extension (`@raycast/api`, `ray` manifest) declared as the fourth workspace member, delivering the updated "npm workspaces monorepo root" four-package layout. Verified by `npm install` from root resolving the package and `tsc` passing in `packages/raycast` with `lookupWord`/`mergeEncounters` imported from `@dictionary/shared`.

## 3. Raycast authentication

- [x] 3.1 Authenticate via self-contained Supabase PKCE in Raycast: implement "Google sign-in in the Raycast extension" using `OAuth.PKCEClient` + `signInWithOAuth`/`exchangeCodeForSession`, persisting the session in Raycast secure storage via a custom Supabase storage adapter. Verified manually: a signed-out user completes Google OAuth and a saved word is written under that user's id (RLS-isolated) in `vocab_entries`.
- [x] 3.2 Implement "Raycast session persistence and refresh": reuse the stored session across launches, auto-refresh on expiry, and re-initiate sign-in when the session cannot be refreshed. Verified manually: relaunching reuses the session without re-auth; a revoked session re-prompts sign-in on the next Add Vocab use.

## 4. Add Vocab command

- [x] 4.1 Build the "Single Add Vocab view command: lookup, preview, save" delivering the "Add Vocab command looks up and previews a word" requirement: debounced lookup, auto-first-meaning, preview of part of speech/definition/example, and a not-found message that blocks the save. Verified manually: a known word shows the preview; an unknown word shows the not-found message and saves nothing.
- [x] 4.2 Implement "Add Vocab saves to the shared vocab bank" with the "Sentinel `raycast://manual` encounter with optional sentence": Enter writes a `vocab_entries` row with one `raycast://manual` encounter, the "Add with sentence…" action attaches a sentence, and Supabase write failure surfaces an error toast without reporting success. Verified manually: a new word appears in the web app bank with the sentinel encounter; saving with a sentence stores it; a forced write failure shows the error toast.
- [x] 4.3 Implement "Re-adding an existing word appends an encounter": show an "Already saved" hint in the preview and, on save, append a merged encounter (via `mergeEncounters`) with no duplicate row and the existing definition unchanged. Verified manually: re-adding a saved word yields a second encounter on the same row, not a new row.
- [x] 4.4 Implement "Implicit sign-in and in-command sign-out": running Add Vocab while signed out starts Google sign-in then proceeds, and a secondary "Sign out" action clears the session. Verified manually: first run signed-out triggers sign-in before saving; "Sign out" clears the session so the next save re-prompts.

## 5. Web app label

- [x] 5.1 Render "Added in Raycast" in the web app for sentinel encounters, delivering the "Manually-added encounters are labeled in the vocab bank" requirement: encounters with `url === "raycast://manual"` show an "Added in Raycast" label while real-URL encounters render their source link unchanged. Verified manually in `/vocab`: a Raycast-added encounter shows the label; a page-sourced encounter still shows its link.

## 6. End-to-end verification

- [x] 6.1 Confirm the full capture loop: add a word from Raycast, see it in the web app bank labeled "Added in Raycast", re-add it to get a second encounter (no duplicate row), and confirm `npm run build` and the extension test suite both pass. Verified by the root build succeeding and a manual run of the add → appear → re-add flow against the real bank.
