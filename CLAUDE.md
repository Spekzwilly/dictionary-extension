# Dictionary Extension — Claude Instructions

## Build & Test

```bash
npm run build    # build → .output/chrome-mv3/
npm test         # unit tests (Vitest)
```

After rebuilding: go to `chrome://extensions`, click the reload icon on the extension, then reload the webpage under test.

## Architecture

**WXT** manages the extension scaffold (Manifest V3). Four entrypoints:
- `entrypoints/content.ts` — content script, shadow DOM popup
- `entrypoints/popup/` — toolbar popup (word count)
- `entrypoints/vocab-bank/` — full vocab bank page
- `entrypoints/review/` — flashcard review page

**Shadow DOM popup** — the content script mounts a React component inside a shadow root on `document.body` so host-page CSS cannot affect the popup. Tailwind CSS is injected via `?inline` import of `lib/popup-styles.css`.

**Storage** — `chrome.storage.local` only, word-keyed flat map under key `'vocab'`. No backend.

**Dictionary API** — `api.dictionaryapi.dev`, no key, returns `WordDefinition | NotFound` (never throws).

## Key Gotchas

- `cssInjectionMode: 'ui'` is set on the content script — WXT won't auto-inject CSS into the page. CSS must be manually injected into the shadow root.
- `@tailwindcss/vite` **must** be registered in `wxt.config.ts` under `vite.plugins`. Without it, `@import "tailwindcss"` only pulls in theme variables; utility classes are never generated.
- When setting inline styles on the shadow host, **never put `all: initial` last** in an `Object.assign`. `all` is a CSS shorthand that resets every property; if declared last, it overrides `position: fixed` and `z-index`, making the popup invisible.
- `lib/popup-styles.css` lives outside `entrypoints/` to avoid WXT treating it as a duplicate `content` entrypoint (WXT uses the base name to identify entrypoints).

## Spectra

This project uses Spectra SDD. Specs live in `openspec/specs/`, changes in `openspec/changes/`. Use `/spectra:*` skills for new features.
