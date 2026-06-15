# Dictionary Extension — Claude Instructions

## Monorepo Structure

npm workspaces monorepo with three packages:

| Package | Path | Purpose |
|---------|------|---------|
| `@dictionary/shared` | `packages/shared/` | Shared types (`VocabEntry`, `Encounter`, `DefinitionData`) and review session logic (`createSession`, `rateCard`, `isSessionComplete`) |
| `@dictionary/extension` | `packages/extension/` | Chrome extension (WXT + React) |
| `@dictionary/web` | `packages/web/` | PWA web app (React + Vite + Tailwind) |

## Build & Test

```bash
# From repo root — builds all three packages
npm run build

# Individual packages
npm run build --workspace=@dictionary/shared
npm run build --workspace=@dictionary/extension
npm run build --workspace=@dictionary/web

# Extension tests
npm test --workspace=@dictionary/extension

# Web app dev server
cd packages/web && npm run dev -- --port 5174
```

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

**WXT** manages the extension scaffold (Manifest V3). Three entrypoints:
- `entrypoints/content.ts` — content script, shadow DOM popup (definition + Save / sign-in)
- `entrypoints/popup/` — toolbar popup: **auth gateway** (signed out → Google sign-in) + **status** (signed in → vocab count, Open Vocab Bank, Review, Sign out). "Open Vocab Bank" / "Review" open the deployed web app (`VITE_WEB_APP_URL` + `/vocab` `/review`, via `lib/web-app-url.ts`).
- `entrypoints/background.ts` — service worker; runs OAuth on behalf of the content script (content scripts can't access `chrome.identity`)

The bank/review UI lives **only** in the web app now — the former internal `vocab-bank.html` / `review.html` pages and JSON export/import are retired.

**Auth** — `lib/auth.ts`: Google OAuth via `chrome.identity.launchWebAuthFlow()` → OIDC id_token → `supabase.auth.signInWithIdToken()`. Sign-in is reachable from the toolbar popup (direct) and the in-page popup (sends a `{ type: 'sign-in' }` message to `background.ts`, which performs the flow). `hasSession()` is a fast, network-free signed-in check (Supabase `getSession`) used by every surface. Session stored in `chrome.storage.local` via custom Supabase storage adapter in `lib/supabase.ts`. The web app keeps its own separate session.

**Storage** — `lib/vocab-storage.ts`: **saving requires being signed in** — the definition popup only offers Save when authenticated (signed-out shows a Google button instead). Saves write to `chrome.storage.local` and upsert to Supabase `vocab_entries`. Reads from Supabase when signed in, local when signed out.

**Dictionary API** — `api.dictionaryapi.dev`, no key, returns `WordDefinition | NotFound` (never throws).

### Web App (`packages/web/`)

React + Vite SPA, the canonical bank/review surface (opened from the extension popup). **Deployed:** https://dictionary-extension.vercel.app (Vercel, GitHub-connected → auto-deploy on `main`). Routes: `/login`, `/vocab`, `/review`. Route guard redirects unauthenticated users to `/login`. Auth via Supabase OAuth redirect flow (`lib/auth.tsx`). Deploy config is the repo-root `vercel.json` (build from root so the `@dictionary/shared` workspace resolves; SPA rewrite so deep links don't 404).

### Shared (`packages/shared/`)

Plain TypeScript, no build step needed — Vite in consuming packages compiles it directly. Exports via `src/index.ts`.

## Supabase

- Project: `https://abqfnjodchdjeburhqpb.supabase.co`
- Migration: `supabase/migrations/0001_vocab_entries.sql` — `vocab_entries` table with RLS (per-user isolation via `auth.uid() = user_id`)
- Google OAuth client ID (Web Application): `972529476069-g3278atkm9miijauqpv4p8a9vpuvll12.apps.googleusercontent.com`

## Key Gotchas

- `cssInjectionMode: 'ui'` is set on the content script — CSS must be manually injected into the shadow root.
- `@tailwindcss/vite` **must** be registered in `wxt.config.ts` under `vite.plugins`.
- When setting inline styles on the shadow host, **never put `all: initial` last** in an `Object.assign` — it overrides `position: fixed` and `z-index`, making the popup invisible.
- `lib/popup-styles.css` lives outside `entrypoints/` to avoid WXT treating it as a duplicate `content` entrypoint.
- `chrome.identity.getAuthToken()` returns an access token, not an OIDC id_token. Use `launchWebAuthFlow()` to get an id_token that Supabase's `signInWithIdToken` accepts.
- The Google OAuth redirect URI for the Supabase callback must be added to the Google OAuth credential: `https://abqfnjodchdjeburhqpb.supabase.co/auth/v1/callback`
- **Extension OAuth redirect URI:** `launchWebAuthFlow` redirects to `https://<EXTENSION_ID>.chromiumapp.org/` — this exact URL (get it via `chrome.identity.getRedirectURL()`) must be registered under **Authorized redirect URIs** on the Google Web client. The extension ID changes if you load-unpacked from a different path, which invalidates the registration.
- **OAuth nonce:** Supabase SHA-256-hashes the `nonce` passed to `signInWithIdToken` and compares it to the id_token's `nonce` claim. So send the **hashed** nonce (`sha256Hex`) to Google and the **raw** nonce to Supabase. Omitting the nonce on the Supabase call throws "Passed nonce and nonce in id_token should either both exist or not."
- **Vercel build + Vite 8 / Rolldown native binding:** the web build fails on Vercel's Linux with `Cannot find module '@rolldown/binding-linux-x64-gnu'` — the npm optional-deps bug (npm/cli#4828) when the lockfile was generated on macOS. Fix is in `vercel.json`: `installCommand` is `rm -f package-lock.json && npm install` so npm resolves the platform binding fresh on Linux.

## Spectra

This project uses Spectra SDD. Specs live in `openspec/specs/`, changes in `openspec/changes/`. Use `/spectra:*` skills for new features.
