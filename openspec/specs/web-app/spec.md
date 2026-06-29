# web-app Specification

## Purpose

Defines the PWA web app (React + Vite) that gives authenticated users access to their vocab bank and flashcard review session from any browser, including iOS Safari homescreen install.

## Requirements

### Requirement: Login page with Google sign-in

The web app SHALL display a login page when the user is unauthenticated. The page SHALL offer a single "Sign in with Google" button that initiates the Supabase OAuth redirect flow. When the login page is opened from the extension (signalled by an `ext=1` query parameter), it SHALL auto-start the Google OAuth flow without requiring a second click, guarded so the auto-start fires at most once and never on the return leg of the redirect. If the user is already authenticated when the login page is opened with `ext=1`, the page SHALL skip OAuth, hand the existing session to the extension, and redirect to `/vocab`. The OAuth `redirectTo` SHALL target a clean route without `ext=1` so the return leg does not re-trigger auto-start.

#### Scenario: Unauthenticated user sees login page

- **WHEN** an unauthenticated user visits any route without the `ext=1` marker
- **THEN** the app SHALL redirect to `/login` and display the login page

#### Scenario: Sign-in button initiates OAuth

- **WHEN** user clicks "Sign in with Google"
- **THEN** the browser SHALL redirect to the Google OAuth consent screen

#### Scenario: Successful sign-in redirects to vocab bank

- **WHEN** Google OAuth completes successfully and the session is established
- **THEN** the app SHALL redirect to `/vocab`

#### Scenario: Extension-initiated login auto-starts OAuth

- **WHEN** a signed-out user opens `/login?ext=1`
- **THEN** the app SHALL auto-start `signInWithOAuth` once, sending the user straight to Google's consent screen with no intermediate click
- **THEN** `redirectTo` SHALL be a clean `/vocab` URL that does not carry `ext=1`

#### Scenario: Extension-initiated login while already signed in

- **WHEN** an already-authenticated user opens `/login?ext=1`
- **THEN** the app SHALL NOT start a new OAuth flow
- **THEN** the app SHALL hand the existing session to the extension and redirect to `/vocab`

#### Scenario: Return leg does not re-trigger auto-start

- **WHEN** the browser returns from Google's consent to the web app carrying an OAuth `code`/`access_token`
- **THEN** the app SHALL NOT re-fire `signInWithOAuth`, avoiding a redirect loop

##### Example: auto-start decision

| hasSession | ext=1 present | returning from OAuth | auto-start OAuth |
| ---------- | ------------- | -------------------- | ---------------- |
| no | yes | no | yes |
| yes | yes | no | no (hand back session, redirect) |
| no | no | no | no |
| no | yes | yes | no |


<!-- @trace
source: extension-auth-web-app-oauth
updated: 2026-06-16
code:
  - packages/shared/package.json
  - packages/raycast/src/lib/auth.ts
  - packages/raycast/src/add-vocab.tsx
  - package.json
  - packages/raycast/assets/extension-icon.png
  - packages/shared/vitest.config.ts
  - packages/raycast/src/lib/vocab.ts
  - packages/raycast/src/lib/supabase.ts
  - packages/web/src/pages/VocabPage.tsx
  - packages/shared/src/encounters.ts
  - packages/extension/lib/dictionary-service.ts
  - packages/raycast/package.json
  - packages/raycast/raycast-env.d.ts
  - packages/raycast/tsconfig.json
  - dictionary-extension-prd.md
  - packages/shared/src/index.ts
  - raycast-add-vocab-prd.md
  - packages/shared/src/dictionary.ts
tests:
  - packages/shared/src/__tests__/dictionary.test.ts
  - packages/shared/src/__tests__/encounters.test.ts
-->

---
### Requirement: Vocab bank page lists and searches saved words

The web app SHALL display a mobile-first list of all words the user has saved, fetched from Supabase. The list SHALL be searchable and each word SHALL expand to show full detail. Each word row SHALL provide a delete control that removes the entire entry for that word.

#### Scenario: Word list loads on page open

- **WHEN** authenticated user navigates to `/vocab`
- **THEN** all words in `vocab_entries` for that user SHALL be displayed, sorted by most recently saved first

#### Scenario: Empty bank state

- **WHEN** authenticated user has no saved words
- **THEN** an empty-state message SHALL be displayed

#### Scenario: Search filters word list

- **WHEN** user types into the search input
- **THEN** only words whose word text or definition contains the search string (case-insensitive) SHALL be shown

#### Scenario: Expand word row shows full detail

- **WHEN** user taps a word row
- **THEN** the row SHALL expand showing part of speech, full definition, example sentence (if any), and all encounter contexts (source URL, date, surrounding sentence)

#### Scenario: Delete control is visible on every word row

- **WHEN** the word list is displayed
- **THEN** each word row SHALL show a delete control without requiring the row to be expanded first
- **THEN** the control SHALL be rendered in red by default and a heavier red on hover

#### Scenario: Deleting an entry requires confirmation

- **WHEN** user activates the delete control on a word row
- **THEN** a confirmation prompt naming the word SHALL be shown before any deletion occurs
- **THEN** if the user cancels, the entry SHALL remain and nothing SHALL be deleted

#### Scenario: Confirmed delete removes the whole entry

- **WHEN** user confirms deletion of a word
- **THEN** the entire `vocab_entries` row for that word — its definition and all encounters — SHALL be deleted from Supabase, scoped to the signed-in user
- **THEN** the word SHALL be removed from the displayed list immediately, without refetching

#### Scenario: Delete failure restores the row

- **WHEN** the Supabase delete request returns an error after the row was optimistically removed
- **THEN** an error message SHALL be shown to the user
- **THEN** the list SHALL be restored so the entry reappears

---
### Requirement: Flashcard review session

The web app SHALL provide a flashcard review page at `/review` that runs a stateless 10-card session using the shared review session logic from `@dictionary/shared`.

#### Scenario: Session draws up to 10 random words

- **WHEN** user navigates to `/review`
- **THEN** the app SHALL fetch all words from Supabase and randomly select up to 10 for the session

#### Scenario: Card shows word on front, definition on back

- **WHEN** a card is displayed
- **THEN** the word SHALL be shown; tapping the card SHALL reveal the definition, part of speech, example, and encounter contexts

#### Scenario: Easy/Hard/Again rating advances session

- **WHEN** user taps Easy, Hard, or Again
- **THEN** the session SHALL advance according to the shared review session state machine (Easy → done; Hard → back of queue; Again → retry after remaining)

#### Scenario: Session completion screen

- **WHEN** both `remaining` and `again` queues are empty
- **THEN** a completion screen SHALL be displayed with a "Review again" button

#### Scenario: No words available

- **WHEN** user has no saved words and navigates to `/review`
- **THEN** the app SHALL display a message prompting the user to save words via the extension

---
### Requirement: PWA homescreen installability

The web app SHALL include a PWA manifest and appropriate meta tags so that iOS Safari offers "Add to Home Screen" and the installed app opens without browser chrome.

#### Scenario: iOS Safari shows Add to Home Screen option

- **WHEN** authenticated user visits the web app in iOS Safari
- **THEN** Safari SHALL offer the "Add to Home Screen" option in the share sheet

#### Scenario: Installed PWA opens without browser chrome

- **WHEN** user opens the installed app from the iPhone homescreen
- **THEN** the app SHALL launch in standalone mode with no Safari navigation bar

---
### Requirement: Signed-out users cannot access protected routes

The web app SHALL redirect unauthenticated requests for `/vocab` and `/review` to `/login`.

#### Scenario: Direct navigation to protected route while signed out

- **WHEN** unauthenticated user navigates directly to `/vocab` or `/review`
- **THEN** the app SHALL redirect to `/login`

---
### Requirement: Public deployment with client-side route serving

The web app SHALL be deployed to a public HTTPS URL and SHALL serve the SPA's `index.html` for all application routes, so client-side routing works on direct navigation and refresh. Deployment SHALL update automatically when changes land on the `main` branch.

#### Scenario: Deployed app is reachable

- **WHEN** a user opens the public deployment URL
- **THEN** the web app SHALL load and route to the login page when signed out

#### Scenario: Deep link survives refresh

- **WHEN** a user navigates directly to `/vocab` or `/review`, or refreshes while on one of those routes
- **THEN** the host SHALL serve the SPA and the client SHALL render that route (not a 404)

#### Scenario: Auto-deploy on main

- **WHEN** changes are pushed to the `main` branch
- **THEN** the public deployment SHALL rebuild and update automatically


<!-- @trace
source: deploy-standalone-vocab-bank
updated: 2026-06-15
code:
  - packages/extension/entrypoints/vocab-bank/App.tsx
  - packages/extension/entrypoints/review/App.tsx
  - packages/extension/entrypoints/vocab-bank/index.html
  - packages/extension/entrypoints/vocab-bank/main.tsx
  - packages/extension/lib/web-app-url.ts
  - packages/extension/entrypoints/vocab-bank/style.css
  - packages/extension/lib/vocab-storage.ts
  - vercel.json
  - packages/extension/entrypoints/review/index.html
  - deploy-standalone-vocab-bank-prd.md
  - packages/extension/entrypoints/review/main.tsx
  - packages/extension/entrypoints/review/style.css
  - dictionary-extension-prd.md
  - packages/extension/entrypoints/popup/App.tsx
tests:
  - packages/extension/lib/__tests__/web-app-url.test.ts
-->

---
### Requirement: Production authentication redirect

The deployed web app SHALL complete Google OAuth against its production origin and return the user to the deployed app signed in.

#### Scenario: Sign in on the deployed app

- **WHEN** a signed-out user signs in with Google on the deployed app
- **THEN** after consent the browser SHALL return to the deployed origin with a Supabase session established
- **THEN** the user's vocab bank SHALL load from Supabase

<!-- @trace
source: deploy-standalone-vocab-bank
updated: 2026-06-15
code:
  - packages/extension/entrypoints/vocab-bank/App.tsx
  - packages/extension/entrypoints/review/App.tsx
  - packages/extension/entrypoints/vocab-bank/index.html
  - packages/extension/entrypoints/vocab-bank/main.tsx
  - packages/extension/lib/web-app-url.ts
  - packages/extension/entrypoints/vocab-bank/style.css
  - packages/extension/lib/vocab-storage.ts
  - vercel.json
  - packages/extension/entrypoints/review/index.html
  - deploy-standalone-vocab-bank-prd.md
  - packages/extension/entrypoints/review/main.tsx
  - packages/extension/entrypoints/review/style.css
  - dictionary-extension-prd.md
  - packages/extension/entrypoints/popup/App.tsx
tests:
  - packages/extension/lib/__tests__/web-app-url.test.ts
-->

---
### Requirement: Manually-added encounters are labeled in the vocab bank

When the web app renders an encounter whose `url` is the sentinel `"raycast://manual"`, it SHALL display an "Added in Raycast" label instead of a source link. Encounters with a real source URL SHALL continue to render their source link unchanged.

#### Scenario: Raycast-added encounter shows a label

- **WHEN** the user expands a word whose encounter has `url` equal to `"raycast://manual"`
- **THEN** that encounter SHALL display an "Added in Raycast" label instead of a blank or broken source link

#### Scenario: Page-sourced encounter is unchanged

- **WHEN** the user expands a word whose encounter has a real source URL
- **THEN** that encounter SHALL continue to display its source link as before

<!-- @trace
source: add-vocab-raycast
updated: 2026-06-16
code:
  - dictionary-extension-prd.md
  - raycast-add-vocab-prd.md
-->
