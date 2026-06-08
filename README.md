# Dictionary — Chrome Extension

A monolingual **English → English** dictionary extension. Select any word on any webpage to instantly look it up, save words to a local vocab bank, and review them with flashcards.

## Features

- **Inline popup** — select 1–3 words on any page, a definition popup appears automatically
- **Word underline** — the selected word is underlined in indigo while the popup is open
- **Vocab Bank** — save words with one click; the source URL and surrounding sentence are saved as context
- **Encounter accumulation** — saving the same word from different articles adds to its encounter list
- **Flashcard Review** — 10-word sessions with Easy / Hard / Again self-rating
- **100% local** — all data lives in `chrome.storage.local`, no backend, no auth

## Tech Stack

- **WXT** — Chrome Extension Manifest V3 framework
- **React 19 + TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **Shadow DOM** — popup is isolated from host-page styles
- **Free Dictionary API** — `api.dictionaryapi.dev` (no API key required)

## Development

```bash
npm install
npm run build         # production build → .output/chrome-mv3/
npm run dev           # dev mode with HMR
npm test              # unit tests (Vitest)
```

**Load in Chrome:**
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `.output/chrome-mv3/`

After any code change: `npm run build` → click the reload icon on the extension in `chrome://extensions` → reload the target webpage.

## Project Structure

```
entrypoints/
  content.ts              # Content script — popup trigger, shadow DOM
  popup/                  # Toolbar popup (word count + nav buttons)
  vocab-bank/             # Standalone vocab bank page
  review/                 # Flashcard review page
lib/
  dictionary-service.ts   # Free Dictionary API wrapper
  vocab-storage.ts        # chrome.storage.local wrapper
  review-session.ts       # Pure flashcard session logic
  components/
    DefinitionPopup.tsx   # Popup React component (3 states: loading/not-found/definition)
  popup-styles.css        # Tailwind CSS injected into shadow DOM via ?inline
public/
  icon-{16,32,48,128}.png
scripts/
  generate-icons.mjs      # Regenerate PNG icons from SVG (requires sharp)
openspec/                 # Spectra specs and change history
```

## Regenerating Icons

```bash
node scripts/generate-icons.mjs
```

Outputs `public/icon-{16,32,48,128}.png`.
