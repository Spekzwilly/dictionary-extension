## Context

Greenfield Chrome extension. No existing codebase to migrate. The project directory at `~/dictionary-extension` contains only a throwaway UI prototype (Vite + React) used to validate the design — it will be replaced by the real WXT-based extension build.

The extension serves one user (personal tool) and stores all data locally. There is no backend, no auth, and no sync requirement in v1.

## Goals / Non-Goals

**Goals:**

- Inline definition popup triggered by text selection on any webpage
- One-click save to local vocab bank with encounter context (URL + sentence)
- Vocab Bank page: searchable accordion list of saved words
- Review page: 10-word flashcard session with Easy/Hard/Again rating
- Clean, minimal visual design (white cards, indigo accent)

**Non-Goals:**

- Cloud sync or cross-device access
- Audio pronunciation
- Spaced repetition scheduling across sessions
- Export to Anki/Notion/CSV
- Multi-language support (Japanese etc.)
- Dark mode
- Firefox support

## Decisions

### Use WXT as the build framework

WXT handles Manifest V3 boilerplate, multi-entrypoint builds (content script, popup, options pages), and HMR during development. The alternative (raw Vite + CRXJS) requires more manual wiring for MV3 service workers and entrypoints. WXT's convention-based structure maps naturally to our surfaces: `entrypoints/content.ts`, `entrypoints/popup/`, `entrypoints/vocab-bank/`, `entrypoints/review/`.

### Shadow DOM for the definition popup

The content script injects a React component into a Shadow DOM root rather than directly into the host page's DOM. This prevents host-page CSS from leaking into the popup (critical on complex sites like news articles and docs). The shadow root is appended to `document.body` and positioned absolutely near the selection.

### Free Dictionary API with typed NotFound result

`api.dictionaryapi.dev` requires no API key and returns definition + part of speech + example sentence — exactly the Standard tier we need. On 404 or network failure, the service returns a typed `{ type: 'not-found' }` result rather than throwing, so the popup can render a graceful "Word not found" state without error boundaries.

### chrome.storage.local with word-keyed map

Words are stored as a flat map keyed by the lowercase word string. Each entry holds the `WordDefinition` snapshot at save time plus an `encounters[]` array. Saving the same word again appends to `encounters[]` rather than overwriting — this is the core encounter-history feature. `chrome.storage.local` has a 10 MB quota which is more than sufficient for a personal vocab bank.

### 10-word random session, no cross-session scheduling

Each review session shuffles the full bank and slices to 10. Session state (queue, again pile, done count) lives in React component state only — nothing is persisted. This keeps the implementation simple and avoids a scheduling database. The trade-off is that "Hard" ratings don't carry forward to future sessions; this is acceptable for v1.

### Underline selected word in host page

When the popup opens, the content script wraps the selected text in a temporary `<span>` with `text-decoration: underline; text-decoration-color: #6366f1` to visually anchor the popup to the word. The span is removed when the popup dismisses. This is done in the host DOM (not shadow DOM) so it appears inline with the article text.

## Implementation Contract

### Content Script → Popup trigger
- On `mouseup`, if `window.getSelection().toString().trim()` is 1–3 words, the content script calls the dictionary service and mounts the popup.
- The popup renders within a Shadow DOM root positioned via `getBoundingClientRect()` of the selection.
- The selected text is wrapped in a temporary `<span>` underline in the host DOM; the span is removed on popup dismiss (`mousedown` outside shadow root).
- If the API returns `NotFound`, the popup renders: "No definition found for '{word}'."

### WordDefinition shape (dictionary-service output)
```
{
  word: string
  partOfSpeech: string
  definition: string
  example?: string
}
```

### VocabEntry shape (vocab-storage)
```
{
  word: string                  // lowercase, used as storage key
  definition: WordDefinition    // snapshot at first save
  encounters: Array<{
    url: string                 // document.location.href at save time
    sentence: string            // surrounding sentence of selected text
    savedAt: number             // Date.now()
  }>
}
```
`saveWord` is idempotent on `definition` — always uses the first-saved definition. Subsequent saves only append to `encounters[]`.

### Review session mechanics
- On mount, `review-session` receives all `VocabEntry[]`, shuffles, slices to `min(10, total)`.
- Three buckets: `remaining[]`, `again[]`, `done[]`.
- "Easy" → move to `done`. "Hard" → move to back of `remaining`. "Again" → move to back of `again`.
- When `remaining` is empty, drain `again` into `remaining` and continue.
- Session ends when both `remaining` and `again` are empty.
- Progress indicator: `done.length / sessionTotal`.

### Acceptance criteria
- Selecting a word on any page shows the popup within 1 second.
- Saving a word twice from different URLs results in one entry with two encounters.
- A review session never shows more than 10 cards on first pass.
- "Again"-rated cards reappear after all other remaining cards.
- Deleting a word from the bank removes it from storage and the list.
- Searching the bank filters by word and definition text.

## Risks / Trade-offs

- [Risk] Free Dictionary API availability — no SLA for personal use → Mitigation: graceful "not found" UI; user can still see the selected word even if definition fails.
- [Risk] Shadow DOM popup positioning breaks on pages using `position: fixed` containers or `transform` on ancestors → Mitigation: use `document.body` as mount point with `position: fixed` coordinates derived from `getBoundingClientRect()` + `window.scroll{X,Y}`.
- [Risk] Content script fires on pages where text selection is programmatically managed (e.g. Google Docs) → Mitigation: out of scope for v1; acceptable gap for a personal reading tool.
- [Risk] 10-word cap means with a small bank (<10 words), every session reviews the full bank → acceptable and expected behavior.
