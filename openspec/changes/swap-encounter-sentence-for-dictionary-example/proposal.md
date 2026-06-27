## Why

The page-surrounding sentence we capture on Save is low value — it is usually an incomplete fragment, and Raycast adds have no sentence at all. Meanwhile the dictionary API already returns a clean, complete example sentence per definition, but it shows blank for most words because the lookup only reads it from the very first definition slot (which dictionaryapi.dev usually leaves empty).

## What Changes

- `dictionary-lookup`: `lookupWord` keeps `definitions[0].definition` as the primary definition but backfills `example` by scanning all entries → meanings → definitions for the first non-empty `example`. This fills examples that already exist in the API payload.
- `vocab-storage`: the content script stops capturing the surrounding page sentence; saves pass an empty `sentence`. The encounter record (source URL + timestamp) is unchanged, so "encountered N×" and the "Saved from" list still work.
- `Encounter.sentence` becomes optional (`sentence?: string`). The web app's existing `enc.sentence && …` guards already hide empty sentences on both Review and Vocab pages — no web-app changes needed.

## Non-Goals

- LLM-generated example sentences (rejected: adds an API key, cost, latency, and async failure paths on every save; the dictionary API already supplies examples).
- Backfilling examples into already-saved entries (re-looking up a word fills it; small bank, not worth a migration now).
- Any change to Review or Vocab page rendering — `definition.example` already renders on both.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dictionary-lookup`: `example` is now sourced from the first definition that has one across all meanings, not only `definitions[0]`.
- `vocab-storage`: the captured encounter no longer records the surrounding sentence; `sentence` is optional and saved empty.

## Impact

- Affected specs: `dictionary-lookup`, `vocab-storage`
- Affected code:
  - `packages/shared/src/dictionary.ts` — example backfill scan
  - `packages/shared/src/types.ts` — `Encounter.sentence` → optional
  - `packages/extension/entrypoints/content.ts` — remove `getSurroundingSentence`, pass `sentence: ''`
