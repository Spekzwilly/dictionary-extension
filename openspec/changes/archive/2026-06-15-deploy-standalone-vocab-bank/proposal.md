## Why

The vocab bank web app only runs on `localhost`, so there's no URL to open on a phone — the whole point of a standalone, installable review surface. Meanwhile the extension ships its own internal `vocab-bank.html` and `review.html` that duplicate the web app, and the popup's "Open Vocab Bank" opens that internal page instead of the real standalone site. We want one canonical, publicly-reachable bank/review surface that the extension links to.

## What Changes

- Deploy `packages/web` to **Vercel** via GitHub integration (auto-deploy on `main`, PR previews). Root Directory `packages/web`, build `npm run build`, output `dist`, with an SPA rewrite so `/vocab` and `/review` survive direct open/refresh.
- Configure the deployed app: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Vercel, and add the production origin to Supabase Auth URL configuration so the Google OAuth redirect returns to the deployed app. (No Google Cloud change — the Supabase callback is already registered.)
- The extension toolbar popup's **"Open Vocab Bank"** opens the deployed `/vocab`, and **"Review →"** opens the deployed `/review`, both in a new tab — composed from a new `VITE_WEB_APP_URL` env var in the extension package.
- **BREAKING:** Retire the extension's internal `vocab-bank` and `review` entrypoints entirely, and with them the JSON **export/import** feature (which lived only on the internal bank page). The web app becomes the single bank/review UI.
- Unchanged: the in-page lookup/save popup, the background OAuth worker, the toolbar popup's auth + word-count behavior, the Supabase schema/RLS, and the web app's existing `/vocab` and `/review` pages and review behavior.

## Non-Goals

- "Add vocab by paste" — a separate follow-up change.
- Re-introducing export/import anywhere — it is retired permanently here.
- Sharing the login session between the extension and the web app (token-passing) — rejected; a separate one-time web sign-in is accepted.
- Migrating pre-existing local-only words to the cloud (current words already live in Supabase).
- Offline support / a service worker for the web app (stays installable-but-online).
- A custom domain — the default Vercel URL suffices.
- Schema, RLS, or OAuth-mechanism changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `web-app`: add public deployment (Vercel, public URL, auto-deploy on `main`), SPA deep-link routing on the host, and production OAuth redirect configuration.
- `vocab-bank`: retire the extension's internal Vocab Bank page (list, expand, search, delete, navigate-to-review, page auth strip) and the extension export/import requirements; the toolbar popup's "Open Vocab Bank" and "Review →" now open the deployed web app URLs instead of internal extension pages.

## Impact

- Affected specs: `web-app`, `vocab-bank`
- Affected code:
  - `packages/web/vercel.json` — **new**, SPA rewrite
  - Vercel project settings + Supabase Auth URL configuration (external config, not in repo)
  - `packages/extension/.env` + env typing — new `VITE_WEB_APP_URL`
  - `packages/extension/entrypoints/popup/App.tsx` — open deployed `/vocab` and `/review`
  - `packages/extension/lib/` — small web-app URL-resolution helper (unit-tested)
  - **Removed:** `packages/extension/entrypoints/vocab-bank/`, `packages/extension/entrypoints/review/`
- `review-session` capability is unaffected — its behavior is still fulfilled by the web app's `/review`.
- No schema or RLS changes.
