# PRD: Unified, Login-Gated Vocab Bank

## Problem Statement

When I click the extension's toolbar icon, I land on a small dashboard that only shows a word count and a couple of buttons — there is no way to sign in from here. The "Sign in with Google" button is buried on a separate full-page Vocab Bank tab that I didn't know to open. So the flow I actually want — install the extension, sign in, then start saving words — is impossible to discover from the toolbar. Worse, the extension lets me save words while signed out (into local-only storage), so my saved words don't sync and I have two disconnected places where "the vocab bank" seems to live (the toolbar dashboard vs. the full page).

## Solution

Make the **toolbar popup** the primary front door, and let me sign in from **any** surface where I hit a signed-out wall — so I'm never stuck:

- The first time I open the toolbar popup I'm asked to **sign in with Google** (OAuth runs right inside the popup).
- Once signed in, the popup shows **how many words are in my vocab bank** and a **CTA to open the full Vocab Bank page** in a new tab.
- **Saving a word requires being signed in.** When I select a word on a page while signed out, the in-page definition popup still shows the definition and offers its **own "Sign in with Google" button**; after I sign in there, it swaps to a Save button.
- If I open the full **Vocab Bank page** directly by URL while signed out, it shows its **own "Sign in with Google" button** too.

So sign-in is reachable from **all three surfaces** (toolbar popup, in-page definition popup, Vocab Bank page). The result is one coherent path: install → sign in (from wherever I am) → save words → open the Vocab Bank → import/export and review.

## User Stories

1. As a new user, I want the toolbar popup to prompt me to sign in with Google the first time I open it, so that I know signing in is the starting point.
2. As a user, I want to complete Google OAuth directly inside the toolbar popup, so that I don't have to hunt for a sign-in button on another page.
3. As a signed-in user, I want the toolbar popup to show how many words are in my vocab bank, so that I can see my progress at a glance.
4. As a signed-in user, I want a clear CTA in the toolbar popup to open the full Vocab Bank page in a new tab, so that I can browse my saved words.
5. As a signed-in user, I want a way to start a review session from the toolbar popup, so that I can study without first opening the bank.
6. As a signed-out user, I want the in-page definition popup to still show me a word's definition, part of speech, and example, so that lookups work even before I sign in.
7. As a signed-out user, I want the in-page definition popup to show its own "Sign in with Google" button in place of the Save button, so that I can sign in without leaving the page I'm reading.
8. As a signed-in user, I want the in-page definition popup to show a Save button, so that I can add the word to my vocab bank in one click.
9. As a signed-in user, I want each saved word to record the source article URL and the surrounding sentence, so that I keep the real context of each encounter.
10. As a signed-in user, I want saving a word to sync it to the cloud, so that my vocab bank is available across devices.
11. As a signed-out user, I want saving to be unavailable rather than silently writing to local-only storage, so that I never end up with words that don't sync.
12. As a user who opens the full Vocab Bank page while signed out, I want it to show its own "Sign in with Google" button, so that I can authenticate even if I arrived by direct URL.
13. As a signed-in user, I want the Vocab Bank page to list all my saved words with encounter counts, so that I can see everything I've collected.
14. As a signed-in user, I want to search, expand, and delete words on the Vocab Bank page, so that I can manage my collection.
15. As a signed-in user, I want to export my vocab bank to JSON from the Vocab Bank page, so that I can back it up.
16. As a signed-in user, I want to import a JSON vocab bank from the Vocab Bank page, so that I can migrate words saved elsewhere; imports must deduplicate by encounter timestamp.
17. As a signed-in user, I want to open the Review page from the Vocab Bank, so that I can run a flashcard session.
18. As a user, I want to sign out from the toolbar popup, so that I can switch accounts or stop syncing.
19. As a user, I want my signed-in state to be reflected consistently across the toolbar popup, the in-page popup, and the Vocab Bank page, so that the extension never looks half-logged-in.

## Implementation Decisions

- **Sign-in is reachable from all three surfaces.** The shared signed-in check is a fast, network-free session read (Supabase `getSession` via the existing chrome.storage session adapter), exposed as a small helper on the auth module and used by every surface to decide which state to render.
- **Toolbar popup is retained and becomes the auth gateway + status surface.** It renders two states:
  - *Signed out:* a "Sign in with Google" button that runs the existing OAuth flow (`signInWithGoogle` in the extension's auth module) directly — the popup is an extension page, so `chrome.identity.launchWebAuthFlow` is available.
  - *Signed in:* the vocab-bank word count plus a primary CTA that opens the Vocab Bank page in a new tab, a secondary CTA to open the Review page, and a Sign-out control.
- **The full Vocab Bank page keeps its own "Sign in with Google" button** for the signed-out / direct-URL case, calling the same `signInWithGoogle` directly (it is an extension page). Its word list, search, expand/delete, export, import, and "Review →" link are unchanged; Sign-out is available here and in the popup.
- **The in-page definition popup gains its own "Sign in with Google" button when signed out**, in place of the Save button; the definition lookup is unaffected. Because the popup is rendered by a **content script**, which does **not** have access to `chrome.identity`, this button cannot run OAuth directly.
- **A small background service worker is (re)introduced solely to perform OAuth on behalf of the content script.** The in-page sign-in button sends a runtime message (e.g. `{ type: 'sign-in' }`) to the background worker, which runs `launchWebAuthFlow` + `signInWithIdToken` and responds with success/failure; the content script then re-checks the session and swaps the button for Save. The toolbar popup and Vocab Bank page do **not** use this path — they sign in directly. The manifest's permissions are unchanged (`identity`, `storage`, `activeTab`, host permissions stay as-is); clicking the toolbar icon still opens the popup.
- **Storage write path is unchanged.** Words still write to local storage and upsert to the cloud (`vocab_entries`) when signed in. Because the UI now only exposes Save while signed in, the cloud upsert always happens on save; the local write becomes a harmless redundant cache. No schema or storage-logic change.
- **Read path is unchanged:** the Vocab Bank reads from the cloud when signed in.
- **Domain types are unchanged:** `VocabEntry`, `Encounter`, `DefinitionData` keep their shapes.

## Testing Decisions

- Good tests assert **external behavior at the highest existing seam**, not React internals. The project's tests live at the library seam (`lib/__tests__`) and cover storage and review-session logic with vitest; that remains the prior art.
- **Auth-gate helper:** the new "is there a session?" helper on the auth module is the one piece of new logic worth a unit test — assert it returns true/false based on the presence of a stored session, using the existing chrome.storage mocking already present in the storage tests.
- **Storage logic:** unchanged, so the existing `vocab-storage` tests must continue to pass without modification — this is the regression guard that confirms the save/import/dedupe behavior wasn't disturbed.
- **UI states** (popup signed-out vs. signed-in, in-page popup lock hint vs. Save button, Vocab Bank signed-out hint) are verified by **manual end-to-end testing** in a loaded extension, consistent with the project's current lack of component-level tests. The e2e script: load unpacked → open popup → sign in with Google → confirm word count + Open Vocab Bank CTA → select a word and save → confirm row in the bank and in the `vocab_entries` table → sign out → select a word → confirm the in-page "Sign in with Google" button replaces Save, click it, complete OAuth via the background worker, and confirm the button swaps to Save. Also verify signing in directly from the Vocab Bank page opened by URL.

## Out of Scope

- The PWA web app (`packages/web`) — this PRD only touches the Chrome extension.
- Spaced-repetition scheduling (SRS) — review remains a random 10-word session.
- Changing the OAuth mechanism, the Supabase schema, or the `vocab_entries` RLS policy.
- Programmatically opening the toolbar popup from the page (not supported by Chrome); the in-page popup signs in via its own button delegating to the background worker instead.
- Migrating any pre-existing local-only saved words into the cloud on first sign-in.

## Further Notes

- Hard-won constraints to respect when implementing: `@tailwindcss/vite` must stay registered in the WXT config; shadow-host inline styles must keep `all: initial` first; `cssInjectionMode: 'ui'` requires manual CSS injection into the shadow root; OAuth must use `launchWebAuthFlow` (not `getAuthToken`) to obtain an id_token, and the extension's `https://<id>.chromiumapp.org/` redirect URL must be registered on the Google OAuth Web client.
- This PRD also closes out the previously-planned "Extension OAuth sign-in e2e" verification: signing in from the popup and saving a word is the e2e path.
