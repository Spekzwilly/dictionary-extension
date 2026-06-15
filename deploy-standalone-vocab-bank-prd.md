# PRD: Deploy Standalone Vocab Bank + Open It From the Extension

## Problem Statement

I want to review my vocab bank on my phone, but the web app (`packages/web`) only runs on `localhost` — there's no live URL I can open on a phone. Meanwhile the Chrome extension has its *own* internal vocab bank and review pages (`vocab-bank.html`, `review.html`) that duplicate the web app, so I'm maintaining two near-identical UIs. When I click "Open Vocab Bank" in the extension it opens the internal `chrome-extension://…/vocab-bank.html`, not the real standalone site I'd use on my phone.

## Solution

Deploy the web app to a public URL and make the extension point at it:

1. The web app is deployed to Vercel, giving a real URL I can open on my phone (it's already installable to the home screen via its web manifest).
2. In the extension's toolbar popup, **"Open Vocab Bank"** opens the deployed web `/vocab` page in a new tab, and **"Review →"** opens the deployed web `/review` page — the same standalone site, not an extension-internal page.
3. The extension's internal `vocab-bank.html` and `review.html` pages are removed entirely, along with the JSON export/import that lived on the internal bank page. The web app becomes the single canonical bank/review surface.

The extension keeps its core job — looking up and saving words while reading, and showing the saved-word count in the popup — but hands off browsing/reviewing to the deployed standalone app.

## User Stories

1. As a learner, I want the vocab bank web app available at a public URL, so that I can open it on my phone.
2. As a learner, I want the web app installable to my phone's home screen, so that it feels like a standalone app.
3. As a learner, I want to sign in with Google on the web app, so that I see my own synced words.
4. As a learner, I want the web app to show the same words as the extension (same Supabase backend), so that my bank is consistent across devices.
5. As a reader, I want the extension popup's "Open Vocab Bank" to open the deployed standalone site in a new tab, so that I use one canonical bank UI.
6. As a reader, I want the extension popup's "Review →" to open the deployed standalone review page, so that I review in the same place.
7. As a reader, I want the toolbar popup to keep showing my saved-word count and sign-in state, so that I still get quick status from the extension.
8. As a developer, I want the extension to read the web app's address from configuration, so that I can point it at localhost during development and the live URL in production without code changes.
9. As a learner, I want deep links like `/vocab` and `/review` to work when opened directly or refreshed on the deployed site, so that the extension's links and page reloads don't 404.
10. As a learner, I want a one-time Google sign-in on the web app (separate from the extension), so that opening the standalone page is straightforward even though it doesn't share the extension's session.
11. As a maintainer, I want only one vocab-bank/review UI (the web app), so that I stop maintaining duplicate pages in the extension.
12. As a maintainer, I want the extension's now-unused internal bank/review pages removed, so that the extension build is smaller and the codebase is unambiguous.
13. As a learner, I want the deployed site to redeploy automatically when changes land on the main branch, so that fixes reach my phone without manual steps.

## Implementation Decisions

- **Hosting:** Deploy `packages/web` to **Vercel** via **GitHub integration** (auto-deploy on push to `main`, preview deploys for PRs). Vercel **Root Directory = `packages/web`**, build command `npm run build`, output `dist`. The `@dictionary/shared` workspace dependency must resolve during the Vercel build (build from the workspace so the shared package is available).
- **SPA routing:** Add a Vercel rewrite so all paths serve `index.html` (client-side routing). Without it, `/vocab` and `/review` 404 on direct open/refresh.
- **Web environment:** Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project (same Supabase project as the extension).
- **Supabase auth config:** Add the deployed production origin to Supabase Authentication URL configuration (Site URL + redirect allow-list) so the Google OAuth redirect flow returns to the deployed app. No Google Cloud change is needed — the Supabase OAuth callback is already registered.
- **Extension → web links:** The toolbar popup's "Open Vocab Bank" and "Review →" buttons open `"<web base>/vocab"` and `"<web base>/review"` in a new browser tab, instead of opening extension-internal pages.
- **Web base URL configuration:** Introduce a `VITE_WEB_APP_URL` environment variable in the extension package (e.g. `http://localhost:5174` in dev, the Vercel URL in production builds). The extension composes the two target URLs from this base via a small URL-resolution helper.
- **Retire internal pages:** Remove the extension's `vocab-bank` and `review` entrypoints (the internal `vocab-bank.html` and `review.html`). This also removes the JSON **export/import** feature, which existed only on the internal bank page and is being retired permanently.
- **Unchanged:** The in-page definition popup (lookup + login-gated save), the background OAuth worker, the toolbar popup's auth + word-count behavior, the Supabase schema/RLS, and the web app's existing `/vocab` and `/review` pages.
- **Auth model:** The extension and web app keep **separate** Supabase sessions (different storage origins). Opening the web app requires a one-time Google sign-in there; no token-passing between extension and web (rejected as a security risk).

## Testing Decisions

- Good tests assert **external behavior at the highest existing seam**, not implementation details. The project's test seam is the library layer (`packages/extension/lib/__tests__`) using Vitest; that remains the prior art.
- **Web-app URL resolution** is the one piece of new logic worth a unit test: a small pure helper that, given `VITE_WEB_APP_URL` and a path, returns the correct absolute URL (handles a trailing slash on the base, and the `/vocab` vs `/review` targets). Test it the way `hasSession`/`vocab-storage` are tested — pure assertions, no browser.
- **Regression guard:** the existing extension Vitest suite must still pass unchanged after retiring the internal pages. The retired pages' underlying review logic lives in `@dictionary/shared` and stays covered by the existing `review-session` tests.
- **Manual e2e** (consistent with the project's lack of UI-component tests):
  1. Deployed URL loads on desktop and phone; `/vocab` and `/review` survive a refresh (SPA rewrite works).
  2. Google sign-in works on the deployed web app; the signed-in bank shows the same words as the signed-in extension (same account).
  3. From the extension popup, "Open Vocab Bank" opens the deployed `/vocab` in a new tab; "Review →" opens the deployed `/review`.
  4. The extension no longer exposes `vocab-bank.html` / `review.html` (the build omits them).

## Out of Scope

- **"Add vocab by paste"** — a separate follow-up change with its own design.
- Re-introducing export/import anywhere — it is retired permanently in this change.
- Sharing the login session between the extension and the web app (token-passing) — rejected; a separate web sign-in is accepted.
- Migrating any pre-existing local-only words to the cloud (current words already live in Supabase).
- Offline support / service worker for the web app (it remains an installable-but-online PWA).
- A custom domain — the default Vercel URL is sufficient for now.
- Changing the Supabase schema, RLS, or the OAuth mechanism.

## Further Notes

- **Known minor behavior (not fixed here):** the web app's OAuth `redirectTo` is the site root (`/`), which routes to `/vocab`. So opening `/review` *before* signing into the web lands on `/vocab` after login — first-time only, since the web session persists afterward.
- **Deploy/configure sequence:** deploy to Vercel → obtain the production URL → set `VITE_WEB_APP_URL` in the extension → rebuild and reload the extension. For local testing before deploy, point `VITE_WEB_APP_URL` at `http://localhost:5174`.
- **Reload reminder:** load the unpacked extension only from `packages/extension/.output/chrome-mv3` (a stale root `.output` previously caused reloads to load old code).
