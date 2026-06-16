# PRD: Add Vocab via Raycast

## Problem Statement

Today the only way to add a word to my vocab bank is to be reading a webpage in Chrome, select the word, and click Save in the in-page popup. But I run into words I want to save outside the browser too — in a terminal, a chat app, a PDF, a podcast transcript, or just a word that pops into my head. In those moments there's no fast capture path. Opening Chrome, navigating to a page that contains the word, selecting it, and saving is far too much friction for "I just want this word in my bank." I want a launcher-speed way to add a word from anywhere, without leaving what I'm doing.

## Solution

A Raycast extension with a single **Add Vocab** command that writes directly to the same Supabase `vocab_entries` bank the Chrome extension and web app already share. I open Raycast, run Add Vocab, type a word; it looks the word up in the same dictionary the extension uses and shows me the definition as a preview; I press Enter and it's saved to my bank under my own account. Because it writes to the same backend, the word immediately shows up in the web app's Vocab Bank and is available for review — Raycast is purely a fast *capture* surface, not a second bank UI.

The first time I run the command while signed out, it walks me through Google sign-in (the same Google account / Supabase user as my other surfaces) so the word lands in the right bank. Manually-added words carry a sentinel context so the web bank can label them "Added in Raycast" instead of showing a blank source link, and I can optionally attach an example sentence when I have one.

## User Stories

1. As a learner, I want an "Add Vocab" command in Raycast, so that I can save a word to my bank without opening Chrome.
2. As a learner, I want to type a word into the Add Vocab command, so that I can capture whatever word I just ran into.
3. As a learner, I want the command to look the word up in a dictionary as I type, so that the saved entry has a real definition without me writing one.
4. As a learner, I want to see the word's part of speech, definition, and example sentence as a preview before I save, so that I can confirm it's the right word and meaning.
5. As a learner, I want to press Enter to save the previewed word to my bank, so that capture is a single confident keystroke.
6. As a learner, I want a confirmation (toast) after saving, so that I know the word made it into my bank.
7. As a learner, I want the saved word to appear in the same bank as words saved from the Chrome extension, so that all my vocab lives in one place.
8. As a learner, I want the saved word to be available for review in the web app, so that Raycast captures feed the same study loop.
9. As a learner, I want to be told when a word isn't found in the dictionary and have the save blocked, so that I don't create empty or junk entries.
10. As a learner, I want the dictionary to auto-pick the first/primary meaning (same as the Chrome extension), so that behavior is consistent across surfaces.
11. As a learner, I want an optional "Add with sentence…" action, so that I can attach an example sentence when I have meaningful context.
12. As a learner, I want the default save to require no extra fields, so that the common "just save this word" case stays fast.
13. As a learner, I want manually-added words to be marked as coming from Raycast, so that the web bank shows a sensible label instead of a blank source link.
14. As a learner, I want to add a word I've already saved before, so that I can record that I encountered it again — without overwriting the existing entry.
15. As a learner, I want to see an "Already saved" hint in the preview when the word is already in my bank, so that I know I'm adding another encounter rather than a new word.
16. As a learner saving an already-saved word, I want a new encounter appended (not a duplicate row), so that my encounter history stays accurate.
17. As a new user, I want the first Add Vocab run while signed out to start Google sign-in, so that I can authenticate without a separate setup step.
18. As a learner, I want to sign in with the same Google account I use in the extension and web app, so that the word saves to my own bank.
19. As a learner, I want my Raycast session to persist between launches, so that I don't have to sign in every time.
20. As a learner, I want my session to refresh silently when it expires, so that capture stays frictionless over time.
21. As a learner, I want to be re-prompted to sign in if my session is revoked or can't be refreshed, so that a stale session never silently fails my saves.
22. As a learner, I want a "Sign out" action available within the command, so that I can disconnect my account when I need to.
23. As a learner, I want sign-out to be a secondary action rather than its own command, so that the extension's surface stays focused on capture.
24. As a learner, I want a clear error if saving fails (e.g. network down), so that I don't assume a word was saved when it wasn't.

## Implementation Decisions

### New package: `@dictionary/raycast` (`packages/raycast/`)
- New npm workspace in the existing monorepo, alongside `extension`, `web`, and `shared`.
- A Raycast extension (TypeScript + React + `@raycast/api`, managed by the `ray` CLI) with a **single command: Add Vocab**, a view command (search-as-you-type list/detail).
- Depends on `@dictionary/shared` for types and shared logic. Personal-use first; extraction to a standalone repo is deferred until/unless Raycast Store publishing is pursued.

### Add Vocab command behavior
- View command. User types a word; input is debounced and passed to the shared dictionary lookup.
- Renders a preview of the resolved definition: word, part of speech, definition, example (if any).
- **Auto-takes the first/primary meaning** (consistent with the Chrome extension) — no meaning-picker in v1.
- **Not-found blocks the save** with a toast; no manual-definition entry in v1.
- Primary action (Enter) saves with no extra input. Secondary action "Add with sentence…" reveals an optional sentence field.
- Secondary action "Sign out" clears the stored session.

### Authentication (OAuth)
- Same identity model as the other surfaces: one Supabase user via Google.
- Mechanism: **Supabase PKCE flow** driven by Raycast's `OAuth.PKCEClient` — `supabase.auth.signInWithOAuth({ provider: 'google', skipBrowserRedirect: true })` to obtain the auth URL, then `exchangeCodeForSession` on the returned code. This builds on the same Supabase-OAuth foundation the web app uses; Raycast runs it self-contained rather than delegating, because (unlike the Chrome extension) it has no shared browser window to receive the web app's `postMessage` session handoff.
- Supabase session (access + refresh token) stored in Raycast secure storage; a custom Supabase storage adapter backs the client (analogous to the extension's `chrome.storage.local` adapter). Auto-refresh enabled.
- On first Add Vocab run while signed out, the OAuth flow is triggered implicitly, then the save proceeds. Refresh failure → re-trigger OAuth on next use.
- Infra: add Raycast's redirect URL to the Supabase dashboard **Redirect URLs** allow-list. The Google OAuth client is unchanged. `packages/raycast` is configured with the same `VITE_SUPABASE_URL` / anon key (via `.env` or Raycast preferences).

### Encounter representation for manual adds
- Each save writes one `Encounter` with `url: "raycast://manual"` (sentinel), `sentence: ''` by default (or the optional sentence text), `savedAt: Date.now()`.
- The sentinel lets consuming UIs distinguish Raycast-added encounters from page-sourced ones.

### Duplicate handling
- Save upserts into `vocab_entries` keyed `(user_id, word)`. If the word exists, a new encounter is appended and merged by `savedAt` (no duplicate row, no overwrite of the existing definition/encounters) — same semantics as the extension's existing upsert.

### Shared-code refactor (`@dictionary/shared`)
- **Lift `lookupWord`** out of `packages/extension/lib/dictionary-service.ts` into `@dictionary/shared` (it's a pure `fetch` against `dictionaryapi.dev` with no extension-specific deps). The extension imports it from shared afterward; behavior unchanged.
- **Add `mergeEncounters(existing, incoming)`** to `@dictionary/shared` — a pure helper encoding the dedupe-by-`savedAt` + append rule currently inlined in the extension's `upsertToSupabase`. Each surface keeps its own thin Supabase upsert call so `@dictionary/shared` stays free of a `supabase-js` dependency.

### Web app tweak
- In the encounter list, when an encounter's `url === "raycast://manual"`, render an "Added in Raycast" label instead of a (blank) source link.

### Out-of-band: extension parity
- The extension continues to work unchanged; the only extension-facing change is importing `lookupWord` from `@dictionary/shared` instead of its local module.

## Testing Decisions

Good tests verify external behavior through a module's public interface — input/output and observable effects — not internal state or which private functions ran. Mock only the single I/O boundary; keep the testable logic pure and test it directly. Prefer the highest existing seam.

**Modules to test:**

- **`lookupWord` (now in `@dictionary/shared`)** — prior art: the existing `dictionary-service.test.ts`. Mock `fetch`; verify a valid response yields the correct `WordDefinition` shape (first meaning, first definition), and that 404 / malformed / network-error all yield `NotFound` without throwing. These existing tests move with the function.
- **`mergeEncounters` (new, `@dictionary/shared`)** — prior art: the pure-logic style of `review-session.test.ts` (no mocks). Verify: a brand-new encounter appends to an empty list; an encounter with a `savedAt` already present is not duplicated; multiple new encounters all append; existing order is preserved; the existing definition is never mutated.

**Not unit-tested (deliberately):** the Raycast view command, the OAuth PKCE flow, and the live Supabase upsert — these are external I/O and Raycast-runtime concerns with no high-value pure seam. Their logic is pushed down into `lookupWord` and `mergeEncounters`, which are tested. Verified manually against the real bank.

## Out of Scope

- Browsing, searching, editing, or reviewing vocab in Raycast — the web app remains the canonical bank/review surface; Raycast is capture-only.
- A meaning-picker / choosing among multiple dictionary senses (v1 auto-takes the first).
- Manual-definition entry for words the dictionary doesn't have (not-found blocks the save in v1).
- Multi-word phrase lookup beyond what `dictionaryapi.dev` supports.
- Email/password or magic-link auth — Google OAuth only, matching existing surfaces.
- Publishing to the Raycast Store (would trigger extraction to a standalone, self-contained repo — deferred).
- Any change to the extension's or web app's auth mechanism.
- Offline capture / local queue when Supabase is unreachable — a save failure surfaces an error toast; no local fallback bank in Raycast.

## Further Notes

- The current architecture makes the **web app the single OAuth implementation**: the Chrome extension no longer runs OAuth itself — it opens `<WEB_APP_URL>/login?ext=1` and receives the session via a validated `postMessage` handoff (`session-handoff.ts` / `isTrustedSessionMessage` in `@dictionary/shared`). Raycast **cannot** reuse that handoff (no shared browser window to receive the `postMessage`), so it is the one surface that runs its own Supabase OAuth, via PKCE + `exchangeCodeForSession` — the better-trodden Supabase + Raycast path, which also avoids touching the Google client's redirect-URI registration (only Supabase's Redirect URLs allow-list).
- The extension ID / redirect URL gotchas that bite the Chrome extension don't apply here; the only redirect registration needed is adding Raycast's redirect URL to Supabase's allow-list (controlled directly in the Supabase dashboard).
- `@dictionary/shared` must remain a plain-TS, no-build, dependency-light package (it's compiled directly by consumers' Vite). Keep `supabase-js` out of it — hence `mergeEncounters` is a pure helper and each surface owns its own Supabase calls.
- Project folder: `~/dictionary-extension`. New package at `packages/raycast/`.
