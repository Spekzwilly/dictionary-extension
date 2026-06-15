## 1. Deploy the web app to a public URL

- [x] 1.1 Implement the **Public deployment with client-side route serving** requirement: add `packages/web/vercel.json` with an SPA rewrite (all paths → `index.html`) and configure the Vercel project (Root Directory `packages/web`, build `npm run build`, output `dist`, `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, `@dictionary/shared` resolves in the build), with auto-deploy on `main`. Verify: the public URL loads, `/vocab` and `/review` survive a direct open/refresh (no 404), and a push to `main` triggers a redeploy.
- [x] 1.2 Implement the **Production authentication redirect** requirement: add the deployed origin to Supabase → Authentication → URL configuration (Site URL + redirect allow-list). Verify: signing in with Google on the deployed app returns to the deployed origin signed in and loads the Supabase word list.

## 2. Point the extension at the deployed app

- [x] 2.1 Add a `VITE_WEB_APP_URL` env var (in `packages/extension/.env` + env typing) and a small pure helper that resolves `${VITE_WEB_APP_URL}` + a path into an absolute URL (tolerating a trailing slash on the base). Verify: a unit test in `lib/__tests__` asserts the helper returns the correct `/vocab` and `/review` URLs for bases with and without a trailing slash.
- [x] 2.2 Satisfy the modified **Toolbar popup as auth gateway and status surface** requirement: the popup's "Open Vocab Bank" CTA opens `${web}/vocab` and the "Review" CTA opens `${web}/review`, each in a new tab, using the helper from 2.1. Verify e2e: in the loaded extension, clicking each CTA opens the correct deployed URL in a new tab.

## 3. Retire the internal extension pages

- [x] 3.1 Remove the extension's internal `vocab-bank` and `review` entrypoints, retiring these requirements: **Display all saved words as a list**, **Expand a word row to see full detail**, **Search words and definitions**, **Delete a word from the bank**, **Navigate to the Review page**, **Display auth state and sign-in/sign-out controls**, **Export vocab bank from extension**, and **Import vocab bank into extension** (export/import gone permanently). Verify: `npm run build --workspace=@dictionary/extension` succeeds and `.output/chrome-mv3` no longer contains `vocab-bank.html` or `review.html`.
- [x] 3.2 Confirm no regressions from the removal: the in-page save flow, toolbar popup auth/word-count, and background OAuth still work, and the shared review behavior is unaffected. Verify: `npm test --workspace=@dictionary/extension` passes unchanged.
