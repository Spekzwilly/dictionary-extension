## Context

The vocab bank is the Supabase `vocab_entries` table, keyed `(user_id, word)`, each row holding a `definition` snapshot and an `encounters[]` array (`{ url, sentence, savedAt }`). Two surfaces exist: the Chrome extension (capture + save) and the web app (canonical bank/review). Both authenticate the *same* Supabase user via Google, but the current architecture makes the **web app the single OAuth implementation** — the extension no longer runs OAuth itself; it opens `<WEB_APP_URL>/login?ext=1` and receives the session via a validated `postMessage` handoff (`session-handoff.ts` in `@dictionary/shared`).

This change adds a third surface — a Raycast extension — purely for fast *capture*. Raycast runs in its own Node process with no browser window, so it cannot receive the web app's `postMessage` handoff and must establish its own Supabase session.

## Goals / Non-Goals

**Goals:**

- Launcher-speed "Add Vocab" from anywhere, writing to the same Supabase bank.
- Reuse the dictionary lookup and encounter-merge logic the extension already uses (no behavioral drift).
- Authenticate as the same Supabase user as the other surfaces, with a session that persists and refreshes silently.
- Keep Raycast capture-only; the web app remains the canonical bank/review surface.

**Non-Goals:**

- Browsing, searching, editing, or reviewing vocab in Raycast.
- A meaning-picker / choosing among multiple dictionary senses (auto-take first).
- Manual-definition entry for words the dictionary lacks (not-found blocks the save).
- Email/password or magic-link auth — Google only.
- Publishing to the Raycast Store (would trigger extraction to a standalone repo — deferred).
- Offline/local capture queue when Supabase is unreachable (save failure surfaces a toast).
- Any change to the extension's or web app's auth mechanism.

## Decisions

### Add a `packages/raycast` workspace reusing `@dictionary/shared`

A fourth npm workspace alongside `extension`, `web`, `shared`. A Raycast extension (TypeScript + React + `@raycast/api`, `ray` CLI manifest) with one command. Depends on `@dictionary/shared` for types and shared logic so the data shape and merge rules never drift. Personal-use first; a standalone-repo extraction is deferred until Raycast Store publishing is pursued.

Alternative rejected: a separate standalone repo — cleaner for Store review but duplicates types and merge logic, which then drift.

### Authenticate via self-contained Supabase PKCE in Raycast

Drive Google OAuth through Raycast's `OAuth.PKCEClient` against Supabase's `/auth/v1/authorize` endpoint, then exchange the returned code **manually** at `/auth/v1/token?grant_type=pkce` and persist the tokens with `supabase.auth.setSession`. The session is stored via a custom Supabase storage adapter backed by Raycast's `LocalStorage`, with auto-refresh enabled. Sign-in is an explicit, visible step (a "Sign in with Google" screen when signed out); refresh failure re-triggers OAuth on next use.

Raycast is the one surface that cannot reuse the web app's `postMessage` handoff (no shared browser window), so it runs its own flow. It only requires adding Raycast's redirect URL to Supabase's Redirect URLs allow-list (no Google client redirect-URI change).

Implementation notes (hard-won during apply):

- **Build the authorize URL by hand**, not via `authRequest.toURL()`. The generated URL carries Raycast's generic OAuth params (`client_id=<anon key>`, `response_type`, `redirect_uri`), which Supabase forwards to Google — Google then rejects the anon key as an unknown client (`invalid_client`). Send only `provider`, `redirect_to`, `code_challenge`, `code_challenge_method=s256`.
- **Manual token exchange, not `exchangeCodeForSession`.** Raycast owns the PKCE `code_verifier`, so Supabase's own `exchangeCodeForSession` (which expects a verifier it generated) cannot be used; POST the code + Raycast's `codeVerifier` to the token endpoint and `setSession` the result.
- **Embed Raycast's `state` inside `redirect_to`.** Supabase does not echo a top-level `state` param, so Raycast cannot correlate the callback and `authorize()` hangs. Appending `&state=<raycast-state>` to `redirect_to` makes the final redirect carry both `state` and `code`. This requires a **wildcard** Supabase redirect allow-list entry (`https://raycast.com/redirect*`).
- **Provide a `WebSocket` to `createClient`.** Raycast's Node sandbox has no global `WebSocket`; `createClient` eagerly builds a `RealtimeClient` that throws without one. Pass `ws` as `realtime.transport` (we never subscribe, so it never connects).

### Single Add Vocab view command: lookup, preview, save

A view command (search-as-you-type). User input is debounced and passed to the shared `lookupWord`. The resolved definition (word, part of speech, definition, example) renders as a preview; the primary action (Enter) saves with no extra input. Auto-takes the first/primary meaning (consistent with the extension). Not-found blocks the save with a toast. Save failure (network/Supabase) surfaces an error toast — the word is not assumed saved.

Alternatives rejected: a no-view argument command (loses the required preview) and a classic form (heaviest, least launcher-like).

### Sentinel `raycast://manual` encounter with optional sentence

Each save writes one `Encounter` with `url: "raycast://manual"`, `sentence: ''` by default, `savedAt: Date.now()`. A secondary "Add with sentence…" action reveals an optional sentence field that, when filled, populates `sentence`. The sentinel `url` lets consuming UIs distinguish Raycast-added encounters from page-sourced ones.

### Lift `lookupWord` and add `mergeEncounters` to `@dictionary/shared`

Move `lookupWord` (pure `fetch` against `dictionaryapi.dev`, no extension deps) from the extension into `@dictionary/shared`; the extension imports it from shared afterward (behavior unchanged, existing tests move with it). Add a pure `mergeEncounters(existing, incoming)` helper encoding the dedupe-by-`savedAt` + append rule currently inlined in the extension's `upsertToSupabase`. Each surface keeps its own thin Supabase upsert call so `@dictionary/shared` stays free of a `supabase-js` dependency (it must remain plain-TS, no-build, dependency-light).

### Render "Added in Raycast" in the web app for sentinel encounters

In the web app's encounter rendering, when an encounter's `url === "raycast://manual"`, show an "Added in Raycast" label instead of a (blank) source link.

## Implementation Contract

**Behavior:**

- A Raycast command **Add Vocab** is available. Typing a word performs a debounced dictionary lookup and shows a definition preview (part of speech, definition, example when present).
- Pressing Enter on a found word writes/updates a row in Supabase `vocab_entries` for the signed-in user and confirms with a success toast. The word then appears in the web app's Vocab Bank.
- A found word already in the bank shows an "Already saved" hint; saving appends a new encounter rather than creating a duplicate row or overwriting the existing definition.
- A not-found word shows a "not found" toast and does **not** save.
- Running Add Vocab while signed out starts Google OAuth; on success the save proceeds. The session persists across launches and refreshes silently; a revoked/expired session that cannot refresh re-prompts sign-in on next use.
- A secondary "Sign out" action clears the stored session. A secondary "Add with sentence…" action lets the user attach an example sentence to the encounter.

**Interface / data shape:**

- `@dictionary/shared` exports `lookupWord(word: string): Promise<WordDefinition | NotFound>` and `mergeEncounters(existing: Encounter[], incoming: Encounter[]): Encounter[]` (dedupe by `savedAt`, append new, preserve existing order, never mutate inputs).
- Raycast-written encounter shape: `{ url: "raycast://manual", sentence: string, savedAt: number }`.
- Supabase write: upsert on `(user_id, word)` with merged `encounters` — same contract as the extension's existing upsert.
- Raycast secure storage holds the Supabase session (access + refresh token) behind a custom Supabase storage adapter.

**Failure modes:**

- Dictionary not-found / network error during lookup → `NotFound` → save blocked with toast (never throws).
- Supabase write failure → error toast; the entry is not assumed persisted.
- Token refresh failure → re-trigger OAuth on next Add Vocab.

**Acceptance criteria:**

- Unit tests: `lookupWord` (mock `fetch`: valid → `WordDefinition`; 404/malformed/network → `NotFound`) and `mergeEncounters` (pure: append-to-empty, dedupe existing `savedAt`, multi-append, order preserved, no input mutation) pass in `@dictionary/shared`.
- Extension test suite still passes after the `lookupWord` move.
- Manual verification against the real bank: add a new word from Raycast and confirm it appears in the web app; re-add it and confirm a second encounter (not a duplicate row); the web bank shows "Added in Raycast" for those encounters; sign-out then Add Vocab re-prompts sign-in.

**Scope boundaries:**

- In scope: the `packages/raycast` package + Add Vocab command + its auth, the `@dictionary/shared` `lookupWord`/`mergeEncounters` exports, the extension import swap, and the web app sentinel label.
- Out of scope: everything in Non-Goals; no changes to extension/web auth mechanisms; no Raycast bank/review UI.

## Risks / Trade-offs

- [Raycast redirect URL not in Supabase allow-list → OAuth fails] → Document the dashboard step; surface a clear auth-error toast so the cause is diagnosable.
- [`@dictionary/shared` accidentally gains a `supabase-js` dependency via the merge helper] → Keep `mergeEncounters` pure and leave all Supabase calls in each surface; enforce by review.
- [Moving `lookupWord` breaks the extension's imports] → Re-export from the extension's `dictionary-service` or update imports; rely on the existing extension test suite to catch regressions.
- [Empty-`sentence` Raycast encounters look bare in the web bank] → The `raycast://manual` sentinel label mitigates the blank-source case; an empty sentence is acceptable for quick capture.
- [Raycast secure-storage session diverges from the extension/web session] → Acceptable by design; each surface holds its own session for the same Supabase user.

## Migration Plan

- No data migration: existing rows are unaffected; new encounters simply carry the sentinel `url`.
- Deploy order: ship the `@dictionary/shared` exports + web app label first (they are backward-compatible), then build/install the Raycast extension.
- Rollback: the Raycast package is additive and can be removed without affecting the extension or web app; the web app label change is a presentational no-op for non-sentinel encounters.
