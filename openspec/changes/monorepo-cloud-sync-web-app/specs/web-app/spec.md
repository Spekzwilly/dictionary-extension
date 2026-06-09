## ADDED Requirements

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
