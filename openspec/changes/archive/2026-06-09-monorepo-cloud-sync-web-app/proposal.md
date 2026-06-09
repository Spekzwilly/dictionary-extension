## Why

The dictionary extension is feature-complete but its vocab bank is locked in `chrome.storage.local` — inaccessible on mobile. Adding cloud sync and a PWA web app lets the user practice saved words anywhere, on any device.

## What Changes

- **Repo restructured** into an npm workspaces monorepo: `packages/extension`, `packages/shared`, `packages/web`
- **Shared package** (`@dictionary/shared`) extracts `VocabEntry` type + review session logic so both surfaces share the same contract
- **Extension gains Google OAuth** (via `chrome.identity`) and writes every saved word to Supabase; falls back to `chrome.storage.local` when signed out
- **Extension gains Export/Import JSON** — one-click export of the full vocab bank as JSON; import uploads a JSON file to Supabase (enables one-time migration of existing local words)
- **New PWA web app** (`packages/web`): mobile-responsive React + shadcn app with Google OAuth, vocab bank list, and flashcard review session — installable on iPhone homescreen via Safari

## Non-Goals

- Spaced repetition (SRS/SM-2) — deferred to a future spec/discussion
- Offline support for the web app — online-only for v1
- Native iOS App Store distribution — PWA via Safari covers the use case without an Apple Developer account
- Multi-user social features (sharing banks) — personal tool first; multi-user-ready schema from day one

## Capabilities

### New Capabilities

- `cloud-sync`: Google OAuth sign-in in the Chrome extension and PWA; Supabase Auth integration; per-user RLS-protected `vocab_entries` table; extension writes words to Supabase on save
- `monorepo-structure`: npm workspaces root; `packages/shared` with `VocabEntry` type and review session logic extracted from the extension; both `extension` and `web` import from `@dictionary/shared`
- `web-app`: PWA React + Vite + TypeScript + shadcn app; Login page (Google OAuth), Vocab Bank page (list + search from Supabase), Review page (10-card session using shared logic); PWA manifest for homescreen install

### Modified Capabilities

- `vocab-storage`: when authenticated, reads from and writes to Supabase; falls back to `chrome.storage.local` when signed out; adds `exportVocab()` and `importVocab(entries)` operations
- `vocab-bank`: displays auth state (sign-in/sign-out button); reads word list from Supabase when signed in; adds Export JSON button and Import JSON button

## Impact

- Affected specs: `vocab-storage`, `vocab-bank`
- New specs: `cloud-sync`, `monorepo-structure`, `web-app`
- Affected code:
  - `lib/types.ts` → moved to `packages/shared/src/types.ts`
  - `lib/review-session.ts` → moved to `packages/shared/src/review-session.ts`
  - `lib/vocab-storage.ts` → extended with Supabase read/write + export/import
  - `entrypoints/vocab-bank/App.tsx` → auth UI + export/import buttons
  - New: `packages/web/` (full React app)
  - New: `supabase/migrations/0001_vocab_entries.sql`
  - New: root `package.json` (npm workspaces)
