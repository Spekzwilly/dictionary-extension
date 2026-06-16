# Dictionary Extension — Claude Instructions

## Monorepo Structure

npm workspaces monorepo with four packages:

| Package | Path | Purpose |
|---------|------|---------|
| `@dictionary/shared` | `packages/shared/` | Shared types (`VocabEntry`, `Encounter`, `DefinitionData`), review session logic (`createSession`, `rateCard`, `isSessionComplete`), dictionary lookup (`lookupWord`), and encounter merge (`mergeEncounters`, `MANUAL_ENCOUNTER_URL`) |
| `@dictionary/extension` | `packages/extension/` | Chrome extension (WXT + React) |
| `@dictionary/web` | `packages/web/` | PWA web app (React + Vite + Tailwind) |
| `dictionary-vocab` | `packages/raycast/` | Raycast extension — **Add Vocab** command (capture words from anywhere into the same Supabase bank) |

## Build & Test

```bash
# From repo root — builds all four packages (raycast build = tsc --noEmit)
npm run build

# Individual packages
npm run build --workspace=@dictionary/shared
npm run build --workspace=@dictionary/extension
npm run build --workspace=@dictionary/web
npm run build --workspace=dictionary-vocab

# Tests
npm test --workspace=@dictionary/extension
npm test --workspace=@dictionary/shared   # lookupWord + mergeEncounters

# Web app dev server
cd packages/web && npm run dev -- --port 5174

# Raycast extension (dev) — needs Raycast app + account
cd packages/raycast && npm run dev
```

Note: the root `npm run build` runs the Raycast package's `tsc --noEmit` (not `ray build`, which needs Raycast login). Use `npm run bundle` in `packages/raycast` for an actual `ray build`.

After rebuilding extension: go to `chrome://extensions`, click the reload icon, then reload the webpage under test.

**Load unpacked from `packages/extension/.output/chrome-mv3` ONLY.** The build writes there. A stale pre-monorepo `.output/chrome-mv3` can linger at the repo root — loading that one means reloads never pick up new builds. Verify the extension card's "Loaded from" path points at the package folder, not the repo root.

## Environment Variables

Both `packages/extension/.env` and `packages/web/.env` need:
```
VITE_SUPABASE_URL=https://abqfnjodchdjeburhqpb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard → Settings → API>
```

## Architecture

### Extension (`packages/extension/`)

**WXT** manages the extension scaffold (Manifest V3). Entrypoints (no background service worker):
- `entrypoints/content.ts` — content script on `*://*/*`, shadow DOM popup (definition + Save / sign-in). Also listens to `chrome.storage.onChanged` to reveal Save the moment a session is synced in.
- `entrypoints/web-bridge.content.ts` — content script scoped **only** to the web app origins (`https://dictionary-extension.vercel.app/*`, `http://localhost/*`); receives the session handoff `postMessage` from the web app and persists it via `supabase.auth.setSession()`.
- `entrypoints/popup/` — toolbar popup: **auth gateway** (signed out → Google sign-in) + **status** (signed in → vocab count, Open Vocab Bank, Review, Sign out). "Open Vocab Bank" / "Review" open the deployed web app (`VITE_WEB_APP_URL` + `/vocab` `/review`, via `lib/web-app-url.ts`).

The bank/review UI lives **only** in the web app now — the former internal `vocab-bank.html` / `review.html` pages and JSON export/import are retired.

**Auth** — the extension no longer runs OAuth itself. Both Google buttons (toolbar popup via `chrome.tabs.create`, in-page popup via `window.open`) open the web app login at `loginUrl()` = `<VITE_WEB_APP_URL>/login?ext=1`. The web app runs full-page Google OAuth, then broadcasts its session via `window.postMessage`; the `web-bridge` content script validates origin/source/shape (`isTrustedSessionMessage` from `@dictionary/shared`) and calls `setSession()` to persist into `chrome.storage.local`. Sign-out is **web-app-authoritative**: web app `SIGNED_OUT` broadcasts a clear that the bridge applies; extension Sign-out clears only the extension. `lib/auth.ts` is now just `getUser`/`hasSession`/`signOut` (`hasSession()` is the fast, network-free `getSession` check used by every surface). The web app keeps its own separate session; the bridge syncs it into the extension at sign-in/sign-out.

**Storage** — `lib/vocab-storage.ts`: **saving requires being signed in** — the definition popup only offers Save when authenticated (signed-out shows a Google button instead). Saves write to `chrome.storage.local` and upsert to Supabase `vocab_entries`. Reads from Supabase when signed in, local when signed out.

**Dictionary API** — `api.dictionaryapi.dev`, no key, returns `WordDefinition | NotFound` (never throws).

### Web App (`packages/web/`)

React + Vite SPA, the canonical bank/review surface (opened from the extension popup) **and the single OAuth implementation** for both surfaces. **Deployed:** https://dictionary-extension.vercel.app (Vercel, GitHub-connected → auto-deploy on `main`). Routes: `/login`, `/vocab`, `/review`. Route guard redirects unauthenticated users to `/login`. Auth via Supabase OAuth redirect flow (`lib/auth.tsx`). `/login?ext=1` (opened from the extension) **auto-starts** Google OAuth and, on `SIGNED_IN`, broadcasts the session to the extension bridge (`lib/login-flow.ts`; broadcasts only on real `SIGNED_IN`/`SIGNED_OUT` events, never `INITIAL_SESSION`/`TOKEN_REFRESHED`). Deploy config is the repo-root `vercel.json` (build from root so the `@dictionary/shared` workspace resolves; SPA rewrite so deep links don't 404). **Deploy ordering:** web app changes must be live before a new extension build for the handoff to work end-to-end.

### Raycast (`packages/raycast/`)

Raycast extension (`@raycast/api` + React, package name `dictionary-vocab`) with a single **Add Vocab** view command (`src/add-vocab.tsx`) — a capture-only surface; the web app stays the canonical bank/review UI.

- **Flow:** signed-out shows an explicit "Sign in with Google" screen; signed-in is type-a-word → debounced `lookupWord` (from `@dictionary/shared`) → definition preview → **Enter** saves. "Add with sentence…" opens a `Form` for an optional example sentence; "Sign out" is an in-command action.
- **Save** (`src/lib/vocab.ts`): upserts to Supabase `vocab_entries` keyed `(user_id, word)`, appending one `MANUAL_ENCOUNTER_URL` (`raycast://manual`) encounter merged via `mergeEncounters`. Re-adding appends an encounter (no dup row, definition preserved). The web app's VocabPage renders **"Added in Raycast"** for these sentinel encounters.
- **Auth** (`src/lib/auth.ts`): self-contained Supabase Google OAuth via Raycast `OAuth.PKCEClient` → manual token exchange → `setSession`. Session persisted in Raycast `LocalStorage` via a custom Supabase storage adapter (`src/lib/supabase.ts`), auto-refresh on.
- **Config:** no `.env` — Supabase URL (defaulted) + Anon Key come from Raycast command **preferences** (`getPreferenceValues`). Build is `tsc --noEmit`; `npm run bundle` does a real `ray build`.

### Shared (`packages/shared/`)

Plain TypeScript, no build step needed — Vite in consuming packages compiles it directly. Exports via `src/index.ts`. `lookupWord` lives here (re-exported by the extension's `lib/dictionary-service.ts`) and must stay dependency-light — keep `supabase-js` out of it, which is why `mergeEncounters` is a pure helper and each surface owns its own Supabase calls.

## Supabase

- Project: `https://abqfnjodchdjeburhqpb.supabase.co`
- Migration: `supabase/migrations/0001_vocab_entries.sql` — `vocab_entries` table with RLS (per-user isolation via `auth.uid() = user_id`)
- Google OAuth client ID (Web Application): `972529476069-g3278atkm9miijauqpv4p8a9vpuvll12.apps.googleusercontent.com`

## Key Gotchas

- `cssInjectionMode: 'ui'` is set on the content script — CSS must be manually injected into the shadow root.
- `@tailwindcss/vite` **must** be registered in `wxt.config.ts` under `vite.plugins`.
- When setting inline styles on the shadow host, **never put `all: initial` last** in an `Object.assign` — it overrides `position: fixed` and `z-index`, making the popup invisible.
- `lib/popup-styles.css` lives outside `entrypoints/` to avoid WXT treating it as a duplicate `content` entrypoint.
- The Google OAuth redirect URI for the Supabase callback must be added to the Google OAuth credential: `https://abqfnjodchdjeburhqpb.supabase.co/auth/v1/callback` (used by the **web app's** OAuth redirect flow — the extension no longer runs its own OAuth).
- **Extension sign-in is web-app-delegated.** The extension has no `identity` permission, no `oauth2` manifest block, and no background worker. Sign-in opens `<VITE_WEB_APP_URL>/login?ext=1`; the session comes back via the `web-bridge` content script's `postMessage` handoff. Content scripts can't use `chrome.tabs`, so the in-page popup opens the login tab with `window.open` (the toolbar popup uses `chrome.tabs.create`).
- **Session-handoff security:** the `web-bridge` content script is scoped to the web app origins only AND re-checks `event.origin` (allowlist) + `event.source === window` + message shape before honoring a handoff — otherwise any page could `postMessage` an attacker's tokens (session fixation). Logic + allowlist live in `@dictionary/shared` (`session-handoff.ts`).
- **Raycast Supabase client needs a `WebSocket`:** Raycast's Node sandbox has no global `WebSocket`, but `createClient` eagerly builds a `RealtimeClient` that throws `Node.js 22 detected but native WebSocket not found`. Pass `ws` as `realtime.transport` in `createClient` (we never subscribe, so it never connects).
- **Raycast OAuth — don't use `authRequest.toURL()`:** it embeds Raycast's generic OAuth params (`client_id=<anon key>`, `response_type`, `redirect_uri`), which Supabase forwards to Google → Google rejects the anon key with `invalid_client`. Build the `/auth/v1/authorize` URL by hand with only `provider=google`, `redirect_to`, `code_challenge`, `code_challenge_method=s256`.
- **Raycast OAuth — manual token exchange:** Raycast owns the PKCE `code_verifier`, so Supabase's `exchangeCodeForSession` (expects a verifier it generated) can't be used. POST the code + Raycast's `codeVerifier` to `/auth/v1/token?grant_type=pkce`, then `setSession`.
- **Raycast OAuth — embed `state` in `redirect_to`:** Supabase doesn't echo a top-level `state` param, so Raycast can't correlate the callback and `authorize()` hangs with no error. Append `&state=<raycast-state>` to `redirect_to` so the final redirect carries both `state` and `code`. Requires a **wildcard** Supabase redirect allow-list entry: `https://raycast.com/redirect*` (the exact `…?packageName=Extension` won't match once `&state=` is appended).
- **Vercel build + Vite 8 / Rolldown native binding:** the web build fails on Vercel's Linux with `Cannot find module '@rolldown/binding-linux-x64-gnu'` — the npm optional-deps bug (npm/cli#4828) when the lockfile was generated on macOS. Fix is in `vercel.json`: `installCommand` is `rm -f package-lock.json && npm install` so npm resolves the platform binding fresh on Linux.

## Spectra

This project uses Spectra SDD. Specs live in `openspec/specs/`, changes in `openspec/changes/`. Use `/spectra:*` skills for new features.
