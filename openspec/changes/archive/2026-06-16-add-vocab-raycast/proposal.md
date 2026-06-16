## Why

Today the only way to add a word to the vocab bank is to select it on a webpage in Chrome and click Save in the in-page popup. Words encountered outside the browser — in a terminal, chat app, PDF, or just in my head — have no fast capture path. A Raycast command gives a launcher-speed way to add a word from anywhere, writing to the same Supabase bank the extension and web app already share.

## What Changes

- Add a new `packages/raycast/` npm workspace: a Raycast extension (TypeScript + React + `@raycast/api`) with a single **Add Vocab** view command.
- Add Vocab: type a word → debounced lookup against `dictionaryapi.dev` → preview definition (part of speech, definition, example) → Enter saves to Supabase `vocab_entries`. Auto-takes the first/primary meaning; not-found blocks the save with a toast.
- Manual saves write an encounter with a `raycast://manual` sentinel `url` and an optional example sentence (default save requires no extra fields; an "Add with sentence…" action reveals the field).
- Saving an already-saved word appends a new encounter and merges by `savedAt` (no duplicate row, no overwrite) — same semantics as the extension's upsert.
- Authenticate the same Supabase user via Google, using a self-contained Supabase **PKCE** flow driven by Raycast's `OAuth.PKCEClient` (`signInWithOAuth` → `exchangeCodeForSession`). Session stored in Raycast secure storage with auto-refresh; first Add Vocab run while signed out triggers sign-in implicitly; refresh failure re-prompts. Sign-out is a secondary in-command action.
- Lift `lookupWord` from `packages/extension/lib/dictionary-service.ts` into `@dictionary/shared`, and add a pure `mergeEncounters(existing, incoming)` helper there; the extension imports both from shared afterward (behavior unchanged).
- Web app: render an "Added in Raycast" label for encounters whose `url === "raycast://manual"` instead of a blank source link.

## Capabilities

### New Capabilities

- `raycast-add-vocab`: The Raycast Add Vocab command — lookup, preview, save (including duplicate/encounter semantics and the `raycast://manual` sentinel), and the implicit sign-in / sign-out interaction within the command.

### Modified Capabilities

- `monorepo-structure`: Adds `packages/raycast` as a fourth workspace package and expands the `@dictionary/shared` exported surface with `lookupWord` and `mergeEncounters`.
- `cloud-sync`: Adds a Raycast authentication surface — Supabase Google OAuth via PKCE (`OAuth.PKCEClient` + `exchangeCodeForSession`), session persistence in Raycast secure storage, auto-refresh, and re-auth on refresh failure.
- `web-app`: Renders an "Added in Raycast" label for encounters carrying the `raycast://manual` sentinel `url`.

## Impact

- New: `packages/raycast/` (Raycast extension package, `@raycast/api`, `ray` CLI manifest, Supabase client + OAuth, Add Vocab command).
- Modified: `packages/shared/src/` (new `lookupWord` + `mergeEncounters` exports), `packages/extension/lib/dictionary-service.ts` (re-export/import from shared), web app encounter rendering.
- Infra: add Raycast's redirect URL to the Supabase dashboard Redirect URLs allow-list; `packages/raycast` configured with the same `VITE_SUPABASE_URL` / anon key (`.env` or Raycast preferences). Google OAuth client unchanged.
