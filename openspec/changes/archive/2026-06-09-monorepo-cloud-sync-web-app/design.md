## Context

The dictionary Chrome extension stores all vocab data in `chrome.storage.local` with no auth and no backend. This change introduces a Supabase backend, restructures the repo into an npm workspaces monorepo, adds Google OAuth to the extension, and ships a new PWA web app that consumes the same Supabase data for mobile practice.

Current state:
- Single-package repo at `~/dictionary-extension` (WXT + React + TypeScript)
- `lib/types.ts` and `lib/review-session.ts` are extension-only
- `chrome.storage.local` is the sole storage layer
- No auth, no backend, no mobile surface

## Goals / Non-Goals

**Goals:**
- Restructure repo to npm workspaces monorepo (`extension`, `shared`, `web`)
- Extract shared `VocabEntry` type and review session logic into `@dictionary/shared`
- Add Google OAuth (Supabase Auth) to the extension via `chrome.identity`
- Sync every word save to Supabase; fall back to local when signed out
- Add Export/Import JSON to the extension vocab bank
- Ship a mobile-responsive PWA at `packages/web` with vocab bank + flashcard review

**Non-Goals:**
- Spaced repetition / SM-2
- Offline support in the web app
- App Store distribution
- Multi-user social/sharing features
- Real-time sync between tabs or devices (eventual consistency via page load is sufficient)

## Decisions

### Monorepo with npm workspaces (not Turborepo/Nx)

The shared surface is narrow: one type file and one logic file. A plain npm workspaces setup in the root `package.json` avoids build-tool complexity. Turborepo would add configuration overhead with no meaningful gain at this scale.

### Supabase as the backend (not Firebase or custom FastAPI)

Supabase provides Postgres + Auth + RLS in one managed service. The user already has a Supabase account. RLS enforces per-user isolation at the database level without application-layer guards. Firebase would require Firestore's document model (worse fit for a flat word map); a custom FastAPI adds infrastructure overhead for a personal tool.

### Google OAuth only (not email/password or magic link)

One-tap sign-in on both surfaces. `chrome.identity.getAuthToken()` gives the extension a Google token with zero UI. The Supabase Auth `signInWithIdToken` method accepts it directly. Email/password and magic link have more friction for a personal tool.

### Supabase `vocab_entries` table mirrors the existing `VocabEntry` shape

The existing `VocabEntry` has `word`, `definition` (object), and `encounters` (array). These map to `text`, `jsonb`, and `jsonb` columns respectively. No data model translation needed — `vocab-storage.ts` serializes/deserializes identically to how it handles `chrome.storage.local` today. `UNIQUE(user_id, word)` enforces the same "one entry per word per user" invariant the local storage layer already relies on.

### Web app: React + Vite + shadcn + Tailwind (not Next.js or Remix)

The web app is a client-side SPA reading from Supabase directly — no SSR needed. Vite matches the extension's existing build tooling. Next.js and Remix add SSR complexity and different deployment targets for no benefit here.

### PWA manifest for homescreen install (not React Native)

Safari's "Add to Home Screen" gives iPhone homescreen presence without an Apple Developer account ($99/yr). The web app uses `viewport` + `theme-color` meta tags and a `manifest.webmanifest` to meet PWA install criteria. React Native remains a future option if App Store distribution is desired.

### Signed-out fallback to `chrome.storage.local`

The extension must continue working for signed-out users. On save: write to both local storage and Supabase (when signed in). On load: prefer Supabase when signed in, fall back to local. This means the extension degrades gracefully if Supabase is unreachable.

## Implementation Contract

### Shared package (`@dictionary/shared`)
- Exports: `VocabEntry`, `DefinitionData`, `Encounter` types (from current `lib/types.ts`)
- Exports: `createSession`, `rateCard`, `isSessionComplete` functions (from current `lib/review-session.ts`)
- Both `packages/extension` and `packages/web` import from `@dictionary/shared`
- The package must be buildable standalone (`tsc --noEmit` passes in isolation)

### Supabase schema
- Table: `vocab_entries(id uuid PK, user_id uuid FK→auth.users, word text, definition jsonb, encounters jsonb, created_at timestamptz, updated_at timestamptz)`
- Constraint: `UNIQUE(user_id, word)`
- RLS: all operations gated on `auth.uid() = user_id`
- Migration file: `supabase/migrations/0001_vocab_entries.sql`

### Extension auth flow
- Sign-in: `chrome.identity.getAuthToken({interactive: true})` → `supabase.auth.signInWithIdToken({provider: 'google', token})`
- Sign-out: `supabase.auth.signOut()` + `chrome.identity.removeCachedAuthToken()`
- Auth state persists via Supabase's built-in session (stored in `chrome.storage.local` as `supabase.auth.token`)
- Vocab bank page shows: signed-in → user avatar + email + sign-out button; signed-out → "Sign in with Google" button

### Extension vocab storage behavior
- `saveWord(entry)`: writes to `chrome.storage.local` always; additionally upserts to Supabase `vocab_entries` if signed in (conflict on `user_id, word` → append new encounter to `encounters` array)
- `getVocab()`: returns from Supabase if signed in, from `chrome.storage.local` if not
- `exportVocab()`: serializes full vocab bank as `VocabEntry[]` JSON, triggers browser download as `vocab-export-<date>.json`
- `importVocab(file)`: parses JSON, upserts each entry to Supabase; duplicate words have encounters merged (deduped by `savedAt` timestamp)

### Web app routes and behavior
- `/` → redirects to `/review` if authenticated, `/login` if not
- `/login` → Google sign-in button; on success redirects to `/`
- `/vocab` → fetches `vocab_entries` for `auth.uid()` from Supabase; displays word list with search; tap word to expand definition + encounters
- `/review` → draws up to 10 random words from Supabase; runs stateless session (same Easy/Hard/Again logic as extension); shows progress bar + completion screen
- OAuth callback: Supabase handles via `supabase.auth.getSessionFromUrl()` on app load

### Acceptance criteria
1. `npm run build` passes in all three packages from the repo root
2. Extension: saving a word while signed in creates/updates a row in `vocab_entries`
3. Extension: vocab bank shows correct word list when signed in (Supabase) and signed out (local)
4. Extension: Export produces valid JSON matching `VocabEntry[]`; Import upserts entries to Supabase
5. Web app: visiting `/vocab` on mobile shows the same words saved via extension
6. Web app: Review session completes a 10-card session using shared review logic
7. Web app: PWA manifest causes Safari on iOS to offer "Add to Home Screen"

## Risks / Trade-offs

- [Google token expiry in extension] `chrome.identity.getAuthToken()` may return a cached expired token → Mitigation: on Supabase auth error, call `chrome.identity.removeCachedAuthToken()` and retry once with `interactive: false`
- [Import JSON with malformed data] A corrupted export file could break the import → Mitigation: validate each entry against `VocabEntry` shape before upsert; skip invalid entries and report count
- [Encounter deduplication on import] Re-importing the same export would duplicate encounters → Mitigation: deduplicate encounters by `savedAt` timestamp before upsert
- [Supabase free tier limits] 500MB storage, 50MB database — more than sufficient for a personal vocab bank at this scale
- [No real-time sync] If the user saves a word in the extension and opens the web app in the same second, they won't see it until refresh → Acceptable for v1; noted as a future enhancement
