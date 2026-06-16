# PRD: English Dictionary Chrome Extension

## Problem Statement

When reading English articles in the browser, I frequently encounter words I don't fully know. Existing workflows are fragmented: I either ignore the word, open a new tab to search it, or copy it into a notes app. None of these let me stay in the reading flow, and there's no way to review words I've looked up later. Generic translation extensions solve for a different use case (L1→L2 translation) and don't support monolingual English learning.

## Solution

A Chrome extension that:
1. Detects when I select a word on any webpage and instantly shows an English definition popup inline — no tab switching, no breaking reading flow.
2. Lets me save any looked-up word to a local vocab bank with one click. Each save records the source article URL and the surrounding sentence as context.
3. Provides a **Vocab Bank** page — a searchable list of all saved words with expandable encounter history.
4. Provides a **Review** page with flashcard-style review and self-rating (Easy / Hard / Again) — words rated "Again" loop back in the same session. Each session draws 10 random words from the bank.

The key differentiator is **encounter history**: the same word can be saved multiple times from different articles. When reviewing, I see every real sentence I pulled the word from — not a generic dictionary example.

## User Stories

1. As a reader, I want a definition popup to appear automatically when I select a word, so that I can look up its meaning without leaving the article.
2. As a reader, I want the selected word to be visually underlined in the article, so that I can see which word the popup is referring to.
3. As a reader, I want the popup to show the word's definition, part of speech, and one example sentence, so that I understand how the word is used.
4. As a reader, I want to save a word to my vocab bank with a single click in the popup, so that I can review it later without interrupting my reading.
5. As a reader, I want the popup to dismiss when I click elsewhere or start a new selection, so that it doesn't get in my way.
6. As a reader, I want the popup to appear near my text selection, so that I don't have to move my eyes far from where I was reading.
7. As a reader, I want to see a clear message when a word is not found in the dictionary, so that I know the lookup failed rather than getting a blank popup.
8. As a learner, I want each saved word to store the article URL and the surrounding sentence as context, so that I can remember where I first encountered it.
9. As a learner, I want to save the same word from multiple articles over time, so that each new encounter is recorded without overwriting previous ones.
10. As a learner, I want to open the Vocab Bank from the extension toolbar popup, so that I can browse my saved words.
11. As a learner, I want to start a review session from the extension toolbar popup, so that I can study without navigating to the bank first.
12. As a learner, I want to see how many words are in my vocab bank from the extension toolbar popup, so that I know how much I've accumulated.
13. As a learner, I want to browse all my saved words in a list on the Vocab Bank page, so that I can see everything I've collected.
14. As a learner, I want to search my vocab bank by word or definition, so that I can quickly find a specific word.
15. As a learner, I want to expand a word in the bank to see its full definition, example sentence, and all encounter contexts, so that I can read it in detail.
16. As a learner, I want only one word expanded at a time in the bank list, so that the list stays readable.
17. As a learner, I want to delete a word from the bank, so that I can remove words I've fully mastered or saved by mistake.
18. As a learner, I want each review session to draw 10 random words from my bank, so that sessions are short and varied.
19. As a learner, I want the review page to show me one word at a time as a flashcard, so that I can test my recall before seeing the answer.
20. As a learner, I want to flip a flashcard to see its definition, part of speech, example sentence, and all encounter contexts, so that I can fully understand the word.
21. As a learner, I want to rate each flashcard as Easy, Hard, or Again after reviewing it, so that I can signal my confidence level.
22. As a learner, I want cards rated "Again" to loop back later in the same session, so that I keep practicing words I don't know yet.
23. As a learner, I want cards rated "Easy" to be marked done for the current session, so that I don't waste time on words I already know.
24. As a learner, I want to see my progress during a review session (e.g. "3 / 10 done"), so that I know how far through the deck I am.
25. As a learner, I want to see a completion screen when I finish a review session, so that I get a sense of closure.
26. As a learner, I want to see how many times I've encountered a word (e.g. "Seen 3 times"), so that I can gauge how important it is.
27. As a learner, I want all encounter context sentences displayed when I flip a flashcard, so that I can see the word in its original real-world contexts.
28. As a learner, I want my vocab bank to persist across browser restarts and computer reboots, so that I never lose my saved words.
29. As a learner, I want the extension to work on any website, so that I can look up words regardless of what I'm reading.
30. As a learner, I want the definition popup to not interfere with normal browsing when I'm not looking up words, so that the extension stays out of my way.

## Implementation Decisions

### Visual Design
Clean and minimal — white cards, indigo accent color, system sans-serif font. Validated via prototype. No serif or dark-mode variants in v1.

### Three extension surfaces
1. **Content script popup** — inline floating card on text selection
2. **Vocab Bank page** — standalone extension page, browsable word list
3. **Review page** — standalone extension page, flashcard session

The extension toolbar popup is a thin launcher: shows word count, two buttons ("Vocab Bank" and "Review").

### Module: `dictionary-service`
Wraps the Free Dictionary API (`https://api.dictionaryapi.dev/api/v2/entries/en/<word>`). Normalizes the raw response into a `WordDefinition` shape:
```
{
  word: string
  partOfSpeech: string
  definition: string
  example?: string
}
```
On a 404 or network error, returns a typed `NotFound` result rather than throwing. Only the first definition of the first meaning is used.

### Module: `vocab-storage`
Thin wrapper over `chrome.storage.local`. Data shape:
```
{
  [word: string]: {
    word: string
    definition: WordDefinition
    encounters: Array<{
      url: string
      sentence: string
      savedAt: number  // unix timestamp
    }>
  }
}
```
Saving a word that already exists appends a new encounter rather than overwriting. Exposes: `saveWord`, `getWord`, `getAllWords`, `deleteWord`.

### Module: `review-session`
Pure function module — takes an array of vocab entries, returns a session queue manager. On init, shuffles entries and slices to 10. Manages three buckets: `remaining`, `again`, `done`. Rating "Easy" moves card to `done`; "Hard" keeps in `remaining`; "Again" moves to back of `again` queue (surfaced after `remaining` is exhausted). No state persisted to storage — resets on page reload.

### Module: `content-script`
Injected into all pages via Manifest V3. Listens to `mouseup` / `selectionchange` events. On selection of 1–3 words, calls `dictionary-service` and renders the `definition-popup` React component into a shadow DOM node appended to `document.body`. Uses shadow DOM to prevent style leakage from host pages. Underlines the selected word in the host page using a temporary `<span>` with `text-decoration: underline` in the host page's accent color (indigo). Dismisses on `mousedown` outside the popup.

### Module: `definition-popup` (React component)
Renders inside the shadow DOM. Receives `WordDefinition | NotFound | Loading` as props. Shows definition, PoS, example sentence, and a Save button. On Save click, calls `vocab-storage.saveWord` with the current page URL and selected sentence context. Button changes to "✓ Saved" state after saving.

### Module: `vocab-bank-page` (React page)
Searchable accordion list of all saved words. One row expanded at a time — clicking another row collapses the current one. Each row shows: word, PoS, truncated definition, encounter count, last-saved date. Expanded row shows: full definition, example sentence, all encounter contexts (source URL + sentence). Delete button inside expanded row. "Review →" CTA in header navigates to the review page.

### Module: `extension-popup` (React component)
Toolbar popup. Shows total word count. Two buttons: "Vocab Bank" and "Review" — both call `chrome.tabs.create` to open the respective standalone pages.

### Module: `review-page` (React page)
Standalone extension page. On mount, loads all words from `vocab-storage`, initializes a `review-session` (10 random words). Renders one flashcard at a time: word on front, definition + PoS + example + all encounter contexts on back. Shows session progress (e.g. "3 / 10 done"). Shows completion screen when session queue is empty with a "Review again" button that re-shuffles a new set of 10.

### Tech Stack
- TypeScript + React + shadcn/Tailwind
- Manifest V3 Chrome Extension
- WXT framework for build tooling (handles MV3 boilerplate, HMR, multi-page builds)
- Free Dictionary API (no API key required)
- `chrome.storage.local` for persistence (no backend)

## Testing Decisions

Good tests verify external behavior through the module's public interface — not implementation details like internal state or which internal functions were called.

**Modules to test:**

- **`dictionary-service`** — mock `fetch`; verify correct `WordDefinition` shape returned for a valid response; verify `NotFound` returned on 404; verify graceful handling of malformed API response.
- **`vocab-storage`** — mock `chrome.storage.local`; verify `saveWord` creates a new entry; verify saving the same word again appends an encounter rather than overwriting; verify `getAllWords` returns all entries; verify `deleteWord` removes entry.
- **`review-session`** — no mocking needed (pure logic); verify session is capped at 10 words; verify "Easy" moves card to done; verify "Again" brings card back after remaining queue; verify session completes when all cards are Easy or Hard.

## Out of Scope

- Cloud sync or cross-device access (v2)
- Audio pronunciation playback
- Multi-word phrase lookup (phrases of 4+ words)
- Spaced repetition algorithm (SRS scheduling across sessions)
- Export to Anki / Notion / CSV
- Japanese or other language support
- Word history / analytics dashboard
- Offline dictionary fallback (no internet)
- Mobile / Firefox support
- Dark mode

## Further Notes

- The extension should request only necessary permissions: `storage`, `activeTab`, and host permissions for `*://*/*` (for content script injection).
- Shadow DOM for the popup is critical — without it, host page CSS frequently breaks the popup layout on complex sites.
- The Free Dictionary API has no rate limiting documentation; for personal use it is reliable but not guaranteed. A graceful "not found" fallback covers the gap.
- Project folder: `~/dictionary-extension`
- Prototype lives at `~/dictionary-extension/src/pages/` — throwaway, delete before shipping.
