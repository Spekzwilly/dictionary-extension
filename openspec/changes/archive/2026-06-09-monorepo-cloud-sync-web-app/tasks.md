<!--
Each task description MUST state:
- the behavior or contract being delivered (what is observably true when the
  task is complete), and
- the verification target that proves completion (test, CLI invocation,
  analyzer check, manual assertion, or content review).

File paths are supporting context for locating the work, never the task
itself. "Edit file X" is not a valid task — it is missing both behavior and
verification.
-->

## 1. Monorepo Structure

- [x] 1.1 Set up npm workspaces monorepo root: create root `package.json` declaring workspaces `packages/extension`, `packages/shared`, `packages/web` — `npm install` from repo root installs all workspace dependencies without errors. Satisfies: npm workspaces monorepo root; Monorepo with npm workspaces (not Turborepo/Nx).
- [x] 1.2 Create shared package (`@dictionary/shared`) at `packages/shared/` exporting `VocabEntry`, `DefinitionData`, `Encounter` types and `createSession`, `rateCard`, `isSessionComplete` functions — `tsc --noEmit` inside `packages/shared` passes with no errors. Satisfies: Shared package exports VocabEntry type and review session logic.
- [x] 1.3 Move Chrome extension source into `packages/extension/` and declare it as a workspace member — `npm run build` inside `packages/extension` produces a valid `.output/chrome-mv3/` without errors. Satisfies: Extension package is a workspace member.
- [x] 1.4 Update all imports of `VocabEntry`, `DefinitionData`, and review session functions in `packages/extension` to import from `@dictionary/shared` — `tsc --noEmit` in `packages/extension` passes and no local `lib/types` or `lib/review-session` imports remain for those symbols. Satisfies: Existing extension imports updated to use shared package.

## 2. Supabase Setup

- [x] 2.1 Create `supabase/migrations/0001_vocab_entries.sql` implementing the Supabase schema and Supabase as the backend (not Firebase or custom FastAPI): define `vocab_entries` table, `UNIQUE(user_id, word)` constraint, and RLS policy `auth.uid() = user_id` — running the migration against a local Supabase instance (or reviewing the SQL) confirms the schema matches the design contract. Satisfies: Supabase `vocab_entries` table mirrors the existing `VocabEntry` shape; Per-user data isolation via Supabase RLS.
- [x] 2.2 (Manual) Create a Supabase project, run the migration, and enable Google OAuth provider in the Supabase dashboard — Supabase dashboard shows the `vocab_entries` table and Google listed as an enabled provider.

## 3. Extension: Google OAuth Sign-in

- [x] 3.1 Implement extension auth flow: `signInWithGoogle()` using `chrome.identity.getAuthToken({interactive: true})` and `supabase.auth.signInWithIdToken()` — clicking "Sign in with Google" on the vocab bank page signs the user in and the page reloads showing the user's email. Satisfies: Google OAuth sign-in in Chrome extension; Google OAuth only (not email/password or magic link).
- [x] 3.2 Implement `signOut()` that calls `supabase.auth.signOut()` and `chrome.identity.removeCachedAuthToken()` — clicking "Sign out" clears the session and the vocab bank reloads showing the sign-in button. Satisfies: Sign out from Chrome extension.
- [x] 3.3 Implement expired Google token recovery: on Supabase auth error, remove cached token and retry `getAuthToken({interactive: false})` once before surfacing a "Session expired" message — simulating an expired token triggers the retry path without showing an OAuth popup. Satisfies: Expired token recovery in extension.

## 4. Extension: Cloud-Synced Vocab Storage

- [x] 4.1 Implement extension vocab storage behavior: modify `saveWord()` to always write to `chrome.storage.local` and additionally upsert to Supabase when signed in — saving while signed in creates/updates a Supabase row; saving while signed out writes only to local storage. Satisfies: Save word to vocab bank (modified); Signed-out fallback to `chrome.storage.local`.
- [x] 4.2 Modify `getAllWords()` to read from Supabase when signed in and from `chrome.storage.local` when signed out — vocab bank displays Supabase entries when signed in and local entries when signed out. Satisfies: Retrieve all saved words (modified).

## 5. Extension: Auth UI on Vocab Bank Page

- [x] 5.1 Add auth state UI to the vocab bank page: show "Sign in with Google" button when signed out; show user email and "Sign out" button when signed in — opening the vocab bank page reflects the correct auth state; signing in reloads the word list from Supabase. Satisfies: Display auth state and sign-in/sign-out controls; Display all saved words as a list (modified).

## 6. Extension: Export and Import JSON

- [x] 6.1 Implement `exportVocab()` that serializes the full vocab bank to a `VocabEntry[]` JSON file and triggers a browser download named `vocab-export-<YYYY-MM-DD>.json` — clicking "Export JSON" in the vocab bank downloads a valid JSON file containing all saved words. Satisfies: Export vocab bank as JSON; Export vocab bank from extension.
- [x] 6.2 Implement `importVocab(file)` that parses a `VocabEntry[]` JSON file, validates each entry, upserts valid entries to Supabase with encounter deduplication by `savedAt`, and returns an import summary — clicking "Import JSON" with a valid file upserts entries and shows how many were imported; duplicate encounters are not duplicated. Satisfies: Import vocab bank from JSON; Import vocab bank into extension; Supabase `vocab_entries` table mirrors the existing `VocabEntry` shape.
- [x] 6.3 Add "Export JSON" and "Import JSON" buttons to the vocab bank page UI, with error message when import is attempted while signed out — buttons are visible on the vocab bank page; import while signed out shows the sign-in-required error message. Satisfies: Import requires sign-in.

## 7. Web App: Project Setup

- [x] 7.1 Initialize React + Vite + TypeScript app at `packages/web/` with `@dictionary/shared`, `@supabase/supabase-js`, `react-router-dom`, shadcn/ui, and Tailwind CSS — `npm run build` inside `packages/web` completes without errors. Satisfies: Web app: React + Vite + shadcn + Tailwind (not Next.js or Remix).
- [x] 7.2 Add `manifest.webmanifest` and viewport/theme-color meta tags to the web app — iOS Safari displays the "Add to Home Screen" option in the share sheet; launching from homescreen opens the app in standalone mode. Satisfies: PWA homescreen installability; PWA manifest for homescreen install (not React Native).
- [x] 7.3 Implement web app routes and behavior: route guard redirects unauthenticated users from `/vocab` and `/review` to `/login`; `/` redirects authenticated users to `/vocab` and unauthenticated users to `/login` — navigating directly to `/vocab` or `/review` while signed out redirects to `/login`. Satisfies: Signed-out users cannot access protected routes.

## 8. Web App: Login Page

- [x] 8.1 Build the `/login` page with a "Sign in with Google" button that initiates the Supabase OAuth redirect — clicking the button redirects to Google OAuth; successful sign-in redirects to `/vocab` with a session established. Satisfies: Login page with Google sign-in; Google OAuth sign-in in web app; Session persistence across page reloads.

## 9. Web App: Vocab Bank Page

- [x] 9.1 Build the `/vocab` page that fetches all words from Supabase for the signed-in user, renders a mobile-first searchable list, and expands rows to show full definition and encounter contexts — the vocab bank shows the same words saved via the Chrome extension; search filters correctly by word and definition text; tapping a row expands it. Satisfies: Vocab bank page lists and searches saved words.

## 10. Web App: Flashcard Review Page

- [x] 10.1 Build the `/review` page that fetches words from Supabase, selects up to 10 randomly, and runs the stateless review session using `createSession`, `rateCard`, `isSessionComplete` from `@dictionary/shared` — a review session completes correctly with Easy/Hard/Again routing; completion screen appears when all queues are empty; navigating to `/review` with no words shows the prompt to save via the extension. Satisfies: Flashcard review session; Session draws up to 10 random words; Easy/Hard/Again rating advances session; Session completion screen; No words available.

## 11. Acceptance Criteria Verification

- [x] 11.1 Verify all acceptance criteria from the design: (1) `npm run build` passes in all three packages from root; (2) saving a word while signed in creates a Supabase row; (3) vocab bank shows Supabase words when signed in and local words when signed out; (4) Export produces valid `VocabEntry[]` JSON; (5) Import upserts entries from JSON; (6) web app `/vocab` shows the same words saved via extension; (7) Review session completes using shared logic; (8) PWA manifest triggers iOS Safari "Add to Home Screen" — all 8 acceptance criteria pass manual verification.
