## Context

`lookupWord` in `packages/shared/src/dictionary.ts` is the single lookup implementation shared by the extension content script, the web app (`/vocab`, `/review`), and the Raycast Add Vocab command. It currently calls the keyless `api.dictionaryapi.dev` and returns one `WordDefinition` with a single `definition` and optional `example`. The data is thin — terse senses, examples frequently missing.

Merriam-Webster's **Learner's Dictionary API** returns learner-oriented definitions with multiple senses and embedded example sentences, but requires an API key. Three constraints shape the design:

- `lookupWord` must stay dependency-light (no `supabase-js`) — each surface owns its own Supabase calls.
- The key must never ship in a client build (extension/web bundles and the Raycast build are all inspectable).
- Stored vocab (`VocabEntry.definition`) already exists in Supabase in the single-definition shape; we cannot orphan it.

## Goals / Non-Goals

**Goals:**

- Source primary lookups from M-W Learner's Dictionary with richer, multi-sense, example-bearing data.
- Keep the M-W key server-side via a thin Supabase Edge Function proxy.
- Degrade gracefully to `dictionaryapi.dev` when M-W has no entry (smaller word list) or the proxy is unreachable.
- Preserve reads of existing single-definition stored entries with no data migration.

**Non-Goals:**

- Changing pronunciation/audio sourcing (owned by `pronounce-audio`).
- Removing `dictionaryapi.dev` (kept as fallback).
- A generic backend/API gateway — the function proxies M-W only.

## Decisions

### Proxy returns raw M-W JSON; parsing stays in shared

The Edge Function `mw-lookup` is a thin pass-through: it injects the `MW_API_KEY`, calls M-W, and returns M-W's JSON verbatim with CORS headers. All parsing (`def.sseq` tree → senses) lives in `packages/shared/src/dictionary.ts`.

Rationale: the parse is the complex, test-worthy part. Keeping it in shared means one tested parser and no function redeploy to tweak parsing. The function only ever changes when the key or CORS policy changes. Alternative (parse in the function, return our normalized shape) was rejected: it splits parsing logic into an undeployable-locally edge runtime and couples the type to a deploy.

### Proxy requires the Supabase anon key; word passed as query param

`GET <proxyUrl>?word=<word>` with the Supabase anon key in the `Authorization`/`apikey` header (every surface already holds this key). The function is not a fully open proxy — callers must present the anon key.

Rationale: reuses existing credentials, no new auth. Alternative (fully public function) rejected — invites abuse of our M-W rate budget.

### Shared takes proxy config via options; no env coupling

`lookupWord(word, opts?: { mwProxyUrl?: string; mwApiKey?: string })`. Extension and web derive `mwProxyUrl` from their existing `VITE_SUPABASE_URL` (`<url>/functions/v1/mw-lookup`) and pass `VITE_SUPABASE_ANON_KEY`; Raycast builds it from its existing preference values. When `mwProxyUrl` is absent, `lookupWord` skips M-W and goes straight to `dictionaryapi.dev`.

Rationale: shared has no Vite `import.meta.env` in the Raycast (non-Vite) build, so it cannot read env itself. Passing config keeps shared dependency-light and each surface authoritative over its own config. No new env var is introduced — the proxy URL is derived from the Supabase URL already configured everywhere.

### Fallback chain: M-W → dictionaryapi.dev

Try M-W (via proxy) first. On M-W not-found, network error, or missing proxy config, fall back to the existing `dictionaryapi.dev` parser (called directly, keyless, unchanged). Only return `NotFound` when both miss.

Rationale: M-W Learner's omits rarer/technical words; the keyless API has broader (if thinner) coverage. The fallback also makes the proxy a soft dependency — an Edge Function outage degrades quality but never breaks lookup.

### `WordDefinition` gains `senses[]`; legacy fields normalized on read

```ts
export type Sense = { definition: string; examples?: string[] }
export type WordDefinition = {
  word: string
  partOfSpeech: string
  senses: Sense[]
  definition?: string   // legacy, optional — superseded by senses
  example?: string      // legacy, optional
  audio?: AccentAudio
  phonetic?: string
}
```

A `normalizeDefinition(raw)` helper guarantees `senses` is populated: for new M-W/fallback results the parser fills `senses` directly; for old stored entries (which have `definition`/`example` but no `senses`), the helper synthesizes a one-element `senses` array from the legacy fields. All renderers read `senses`.

Rationale: avoids a Supabase data migration of every existing row. Old rows keep working; new saves carry `senses`. The `dictionaryapi.dev` fallback parser also emits `senses` (collapsing its meanings into senses) so both sources share one downstream shape.

## Implementation Contract

**Behavior:** On any surface, looking up a word returns M-W Learner's multi-sense data when available (each sense with definition + example sentences), falling back to `dictionaryapi.dev` otherwise. The definition popup (extension), `/vocab` and `/review` cards (web), and Add Vocab preview (Raycast) render multiple senses, each with its examples.

**Interfaces / data shapes:**

- Edge Function: `GET <supabase>/functions/v1/mw-lookup?word=<word>`, auth via anon key header. Responds `200` with M-W's JSON array (entries, or suggestion strings on miss), `400` on missing `word`, `5xx` on M-W/key failure. CORS headers allow the extension and web app origins.
- `lookupWord(word: string, opts?: { mwProxyUrl?: string; mwApiKey?: string }): Promise<LookupResult>` — unchanged return union (`WordDefinition | NotFound`), now with `senses[]` populated on `WordDefinition`.
- `WordDefinition.senses: Sense[]` always non-empty on success; `Sense = { definition: string; examples?: string[] }`.
- `normalizeDefinition(raw): WordDefinition` — back-fills `senses` from legacy `definition`/`example`.

**Failure modes:**

- M-W returns suggestions (not-found) → fall back to `dictionaryapi.dev`; if that also misses → `NotFound`.
- Proxy unreachable / non-2xx / no `mwProxyUrl` → silently fall back to `dictionaryapi.dev`. No error surfaced to the user.
- M-W key invalid/over quota → proxy `5xx` → same fallback.

**Acceptance criteria:**

- Shared unit tests (extend `packages/shared/src/__tests__/dictionary.test.ts`): M-W JSON fixture → multi-sense parse; M-W suggestion response → fallback path; legacy entry → `normalizeDefinition` yields one sense; both-miss → `NotFound`. Tests mock `fetch`; no live network.
- Each surface renders ≥2 senses for a known multi-sense word (manual check).
- Extension/shared test suites pass (`npm test --workspace=@dictionary/shared`, `--workspace=@dictionary/extension`).

**In scope:** M-W parser + fallback chain + `senses[]` type + `normalizeDefinition` + the Edge Function + sense rendering on all three surfaces.

**Out of scope:** audio sourcing, removing `dictionaryapi.dev`, migrating stored Supabase rows, any new env var beyond the M-W key secret.

## Risks / Trade-offs

- [M-W `def.sseq` tree is deeply nested and irregular (sense groups `sseq`, bindings `bs`, run-ons)] → Parser targets the common `sense.dt` shape (`text` + `vis` examples) and tolerates unknown node types by skipping them; fixture-based tests cover the shapes we render.
- [Edge Function adds an infra component that can fail] → Fallback to keyless API means an outage degrades richness but never breaks lookup; the function is stateless and redeployable.
- [Two sources produce differently-shaped raw data] → Both normalize through `senses[]` before leaving `dictionaryapi.dev`/M-W parsers, so renderers see one shape.
- [Existing stored entries lack `senses`] → `normalizeDefinition` on read; no migration, no orphaned data.
- [M-W free tier 1000 req/day] → Anon-key-gated proxy + client-side de-dup via existing storage limits exposure; fallback absorbs quota exhaustion.

## Migration Plan

1. Deploy the `mw-lookup` Edge Function and set the `MW_API_KEY` secret (`supabase functions deploy mw-lookup` + `supabase secrets set`).
2. Ship the shared parser + `senses[]` type + `normalizeDefinition` (renderers tolerate both shapes via normalize).
3. Update each surface's renderer to show senses and pass proxy config to `lookupWord`.
4. Rollback: revert surfaces/shared; old rows and the keyless fallback keep lookups working independently of the function.

## Open Questions

- Should the proxy cache responses (Edge KV) to stay under the M-W daily quota? Deferred — revisit only if quota becomes a real limit.
