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

## 1. Project Setup

- [x] 1.1 Initialize project: use WXT as the build framework (WXT + React + TypeScript) in `~/dictionary-extension`, replacing the prototype scaffold. Verify with `pnpm dev` launching the extension in a Chrome dev session without errors.
- [x] 1.2 Configure Tailwind CSS and shadcn/ui in the WXT project. Verify by rendering a shadcn `Button` component in the popup entrypoint and confirming it is styled correctly.
- [x] 1.3 Configure WXT entrypoints for all four surfaces: content script, toolbar popup, vocab-bank page, review page. Verify that `pnpm build` produces all four bundles without errors.

## 2. Dictionary Service

- [x] 2.1 Implement `dictionary-service` module: fetches from Free Dictionary API with typed NotFound result. Normalizes to the WordDefinition shape (dictionary-service output) establishing the WordDefinition data shape: `{ word, partOfSpeech, definition, example? }`. Verify with unit tests: valid word returns correct shape; 404 returns `{ type: 'not-found' }`; network error returns `{ type: 'not-found' }` without throwing.
- [x] 2.2 Implement word not found shows graceful fallback: popup renders "No definition found for '{word}'" when the service returns `NotFound`. Verify manually: looking up a nonsense word shows the fallback message in the popup.

## 3. Vocab Storage

- [x] 3.1 Implement `vocab-storage` module using the chrome.storage.local with word-keyed map. Expose `saveWord`, `getWord`, `getAllWords`, `deleteWord` to satisfy save word to vocab bank and retrieve all saved words requirements. Verify with unit tests using a mocked `chrome.storage.local`: `getAllWords` returns empty array when storage is empty; `saveWord` creates a new entry; `getAllWords` returns all entries.
- [x] 3.2 Implement encounter accumulation in `saveWord` per the VocabEntry shape (vocab-storage): saving a word that already exists appends a new encounter to `encounters[]` without overwriting the existing definition. Verify with unit test: save the same word twice from different URLs → one entry with two encounters, definition unchanged.
- [x] 3.3 Implement delete word from storage: `deleteWord` removes a word entry entirely from `chrome.storage.local`. Verify with unit test: save a word, call `deleteWord`, then `getAllWords` returns an empty array.

## 4. Content Script — Popup Trigger

- [x] 4.1 Implement content script → popup trigger: `mouseup` listener triggers on selection of 1–3 words, calls `dictionary-service`, and mounts the definition popup (satisfying popup triggers on text selection). Verify manually: selecting a single word on any webpage shows the definition popup within 1 second.
- [x] 4.2 Implement selection guard: popup SHALL NOT appear for selections longer than 3 words or whitespace-only selections. Verify manually: selecting a 4-word phrase and selecting only whitespace produce no popup.
- [x] 4.3 Implement popup dismisses on outside click: `mousedown` outside the shadow root closes the popup and removes the underline span. Also handles new selection while popup open — closes existing popup and begins new lookup. Verify manually: clicking outside closes the popup; making a new selection replaces it.

## 5. Content Script — Word Underline

- [x] 5.1 Implement underline selected word in host page: when the popup opens, wrap the selected text in a temporary `<span>` with `text-decoration: underline; text-decoration-color: #6366f1` in the host DOM. Remove the span when the popup dismisses. Verify manually: selected word is underlined while popup is open; underline disappears on dismiss.

## 6. Definition Popup Component

- [x] 6.1 Build the `DefinitionPopup` React component. Use Shadow DOM for the definition popup so the popup does not interfere with host page styles. Accepts `WordDefinition | NotFound | Loading` as props. Verify: loading state shows spinner; not-found state shows "No definition found for '{word}'"; definition state shows word, part of speech, definition, and example. Test on a page with custom CSS to confirm style isolation.
- [x] 6.2 Implement popup positioning: shadow root is mounted on `document.body` with `position: fixed`, coordinates derived from `getBoundingClientRect()` of the selection. Verify manually: popup appears near selected text on pages with and without scrolling.
- [x] 6.3 Implement save word to vocab bank button in the popup: calls `vocab-storage.saveWord` with the current page URL and the surrounding sentence as encounter context. Button changes to "✓ Saved" state after saving. Verify manually: clicking Save adds the word to storage; button shows saved state; saving again appends an encounter.

## 7. Toolbar Popup

- [x] 7.1 Build the extension toolbar popup page showing total saved word count from `vocab-storage.getAllWords`. Displays "N words saved". Verify manually: open popup before and after saving words to confirm count updates.
- [x] 7.2 Add two CTA buttons: "Vocab Bank" and "Review". Each calls `chrome.tabs.create` to open the respective standalone extension page. Verify manually: clicking each button opens the correct page in a new tab.

## 8. Vocab Bank Page

- [x] 8.1 Build the Vocab Bank page to display all saved words as a list sorted by most recently saved first. Each row shows word, part of speech, truncated definition, encounter count, and last-saved date. Show empty-state message when no words are saved. Verify manually: saved words appear in correct order; empty bank shows empty state.
- [x] 8.2 Implement expand a word row to see full detail (accordion behavior): clicking a row expands it to show full definition, example sentence, and all encounter contexts. Only one row is expanded at a time — opening another row collapses the current one; clicking the same row toggles it closed. Verify manually: accordion opens, collapses, and single-expansion constraint holds.
- [x] 8.3 Implement search words and definitions: filter the word list by word or definition text (case-insensitive) in real time. Show "No words matching '{query}'" when no results. Verify manually: typing a partial word filters correctly; typing definition text filters correctly; clearing input restores full list.
- [x] 8.4 Implement delete a word from the bank: "Remove from bank" button inside expanded row calls `vocab-storage.deleteWord` and removes entry from list immediately. Verify manually: delete a word, confirm it disappears from the list and is absent after page reload.
- [x] 8.5 Implement navigate to the Review page: "Review →" CTA button in the page header opens the Review page. Verify manually: clicking button opens the review page in a new tab.

## 9. Review Session Logic

- [x] 9.1 Implement `review-session` pure module with 10-word random session, no cross-session scheduling: takes `VocabEntry[]`, shuffles, slices to `min(10, total)` (satisfying session draws 10 random words), returns a queue manager with review session mechanics — `remaining`, `again`, `done` buckets and `rate(Easy|Hard|Again)`. Implements self-rating with Easy / Hard / Again: Easy→done, Hard→back of remaining, Again→back of again pile. Implements again pile drains after remaining queue is empty: when remaining empties, again pile becomes new remaining. Verify with unit tests (no mocks needed): session capped at 10; Easy moves to done; Hard requeues; Again defers; again pile drains correctly; session ends when remaining and again are both empty.
- [x] 9.2 Verify session completion condition: a session where all cards are rated "Easy" triggers `sessionDone`. Verify with unit test: rate all 10 cards Easy → `done.length === 10` and session is complete.

## 10. Review Page

- [x] 10.1 Build the Review page: on mount loads all words from `vocab-storage`, initializes a `review-session`. Flashcard shows word on front, detail on back — renders word-only on front face. Verify manually: opening review page shows a single-word flashcard with "tap to reveal" affordance.
- [x] 10.2 Implement flashcard flip: clicking the card reveals definition, part of speech, example sentence, encounter count ("Seen N×"), and all encounter context sentences with source URLs and dates. Verify manually: flip shows all required fields for a word with multiple encounters.
- [x] 10.3 Implement session progress indicator: "N / 10 done" progress bar and label updates after each "Easy" rating. Verify manually: progress increments only on Easy; Hard and Again do not increment the done count.
- [x] 10.4 Implement session completion screen: shown when all cards are done. Includes "Review again" button that draws a new session draws 10 random words (fresh shuffle). Verify manually: complete a session → see completion screen → "Review again" starts a new session.

## 11. Polish and Packaging

- [x] 11.1 Delete the prototype pages (`src/pages/PopupPage.tsx`, `ReviewPage.tsx`, `BankPage.tsx`, `data/mockWords.ts`) and all prototype-only routes. Verify: `pnpm build` succeeds with no references to prototype files.
- [x] 11.2 Write the extension manifest (via WXT config): request only necessary permissions — `storage`, `activeTab`, host permissions `*://*/*`. Verify: `pnpm build` produces a `manifest.json` with exactly those permissions and no extras.
- [ ] 11.3 Load the built extension in Chrome via `chrome://extensions` and run an end-to-end smoke test covering acceptance criteria: select a word → popup appears with underline → save it → open Vocab Bank → word appears with correct encounter → open Review → word appears in session. Verify all steps pass without console errors.
