## Why

The current dictionary source (`api.dictionaryapi.dev`) returns thin meanings — often a single terse definition and frequently no example sentence — which is weak for a vocab-learning app. The Merriam-Webster Learner's Dictionary returns clearer, learner-oriented definitions with multiple senses and real example sentences.

## What Changes

- Switch the primary lookup source in `packages/shared/src/dictionary.ts` to the **Merriam-Webster Learner's Dictionary API**.
- Add a **Supabase Edge Function proxy** that holds the M-W API key server-side. All three surfaces (extension content script, web app, raycast) call the proxy — the key is never shipped in any client build.
- **Fallback chain**: try M-W Learner's first; on not-found (M-W has a smaller word list), fall back to the existing keyless `dictionaryapi.dev` parser.
- **BREAKING** (internal type): extend `WordDefinition` to carry **multiple senses**, each with its own definition and optional example sentences, parsed from M-W's `def` tree. The single `definition`/`example` fields are superseded by a `senses[]` array.
- Update the UI on all three surfaces (extension definition popup, web app `/vocab` + `/review`, raycast Add Vocab preview) to render multiple senses.

## Non-Goals

- **M-W audio/pronunciation** — M-W returns its own audio, but pronunciation already has its own capability (`pronounce-audio`) and fallback chain. This change does not touch audio sourcing; existing audio resolution stays.
- **Replacing `dictionaryapi.dev` entirely** — it remains as the fallback source, not removed.
- **A general-purpose API gateway** — the Edge Function proxies M-W only; it is not a generic backend.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dictionary-lookup`: lookup now sources from M-W Learner's via a server-side proxy with `dictionaryapi.dev` fallback, and returns multiple senses with example sentences instead of a single definition.

## Impact

- **Affected specs**: `dictionary-lookup` (modified)
- **Affected code**:
  - `packages/shared/src/dictionary.ts` — M-W parser, fallback chain, proxy call
  - `packages/shared/src/types.ts` — `WordDefinition` gains `senses[]`
  - `supabase/functions/mw-lookup/` — new Edge Function proxy (holds `MW_API_KEY`)
  - `packages/extension/` — definition popup renders senses
  - `packages/web/` — `/vocab` + `/review` render senses
  - `packages/raycast/` — Add Vocab preview renders senses
  - Consumers of `VocabEntry.definition` (stored shape) — migration/back-compat for existing single-definition entries
- **New dependency/config**: M-W Developer API key (Learner's Dictionary), stored as a Supabase Edge Function secret; new `VITE_*` proxy URL for the function endpoint.
