## Why

When reading English articles in the browser, encountering unfamiliar words breaks reading flow — existing workarounds (new tab search, copy-paste to notes) are fragmented and provide no way to review saved words later. This extension solves the full loop: look up in context → save → review.

## What Changes

- New Chrome extension with a content script that shows an inline English definition popup on text selection
- New Vocab Bank page for browsing, searching, and managing saved words
- New Review page with flashcard-style sessions (10 random words per session, Easy/Hard/Again rating)
- Local persistence via `chrome.storage.local` — no backend, no account required

## Capabilities

### New Capabilities

- `dictionary-lookup`: Fetch and display an English definition popup when the user selects a word on any webpage
- `vocab-storage`: Persist saved words locally, accumulating multiple encounter contexts per word
- `vocab-bank`: Browse, search, expand, and delete saved words in a standalone extension page
- `review-session`: Flashcard review sessions drawing 10 random words from the bank with Easy/Hard/Again self-rating

### Modified Capabilities

(none — greenfield project)

## Impact

- Affected code: new project — all files under `~/dictionary-extension/`
- Dependencies: Free Dictionary API (`api.dictionaryapi.dev`), Chrome Extension Manifest V3, WXT build framework
- Chrome permissions required: `storage`, `activeTab`, host permissions `*://*/*`
