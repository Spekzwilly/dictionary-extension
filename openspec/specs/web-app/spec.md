# web-app Specification

## Purpose

Defines the PWA web app (React + Vite) that gives authenticated users access to their vocab bank and flashcard review session from any browser, including iOS Safari homescreen install.

## Requirements

### Requirement: Login page with Google sign-in

The web app SHALL display a login page when the user is unauthenticated. The page SHALL offer a single "Sign in with Google" button that initiates the Supabase OAuth redirect flow.

#### Scenario: Unauthenticated user sees login page

- **WHEN** an unauthenticated user visits any route
- **THEN** the app SHALL redirect to `/login` and display the login page

#### Scenario: Sign-in button initiates OAuth

- **WHEN** user clicks "Sign in with Google"
- **THEN** the browser SHALL redirect to the Google OAuth consent screen

#### Scenario: Successful sign-in redirects to vocab bank

- **WHEN** Google OAuth completes successfully and the session is established
- **THEN** the app SHALL redirect to `/vocab`

---
### Requirement: Vocab bank page lists and searches saved words

The web app SHALL display a mobile-first list of all words the user has saved, fetched from Supabase. The list SHALL be searchable and each word SHALL expand to show full detail.

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