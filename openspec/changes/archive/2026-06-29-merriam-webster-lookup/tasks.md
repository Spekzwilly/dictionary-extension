## 1. Edge Function proxy

- [x] 1.1 Create the `mw-lookup` Supabase Edge Function (design decision: Proxy returns raw M-W JSON; parsing stays in shared) — it injects `MW_API_KEY` and returns M-W's JSON verbatim. Implements requirement "Primary lookup sources from Merriam-Webster Learner's via a proxy". Verify: `GET <supabase>/functions/v1/mw-lookup?word=happy` with the anon key returns M-W's JSON array; the key is absent from client-visible code.
- [x] 1.2 Gate the proxy on auth and read the query param (design decision: Proxy requires the Supabase anon key; word passed as query param). Verify: a request missing `word` returns `400`; a request missing the anon key is rejected; CORS headers permit the extension and web app origins.
- [x] 1.3 Deploy the function and set the `MW_API_KEY` secret. Verify: `supabase functions deploy mw-lookup` succeeds and a live `?word=happy` call returns senses-bearing M-W JSON.

## 2. Shared types and normalization

- [x] 2.1 Add `Sense` and extend `WordDefinition` with `senses[]`, keeping `definition`/`example` as optional legacy fields (design decision: `WordDefinition` gains `senses[]`; legacy fields normalized on read). Verify: `tsc --noEmit` passes across all workspaces.
- [x] 2.2 Add `normalizeDefinition` that back-fills `senses` from legacy `definition`/`example`. Implements requirement "Legacy single-definition entries normalize to senses". Verify: shared test asserts a legacy entry (no `senses`) yields a one-element `senses` array carrying the legacy definition and example.

## 3. M-W parser and fallback chain in shared

- [x] 3.1 Parse M-W's `def` sense-sequence tree into `senses[]` with examples, tolerating unknown node types. Implements requirement "Lookup result carries multiple senses with examples". Verify: shared test feeds an M-W JSON fixture and asserts ≥2 senses, each with its example sentences; an unknown node type is skipped without throwing.
- [x] 3.2 Wire `lookupWord(word, opts?)` to call the proxy when `mwProxyUrl` is present, then fall back to `dictionaryapi.dev` (design decisions: Shared takes proxy config via options; no env coupling — and — Fallback chain: M-W → dictionaryapi.dev). Implements requirement "Word not found shows graceful fallback". Verify: shared tests cover (a) M-W hit, (b) M-W suggestions → fallback hit, (c) no `mwProxyUrl` → fallback path, (d) both miss → `NotFound`; `fetch` is mocked, no live network.
- [x] 3.3 Map the `dictionaryapi.dev` fallback payload into the `senses` shape (primary definition + sourced examples). Implements requirement "Example sentence sourced from first available definition". Verify: fallback tests updated so the keyless source emits a populated `senses` array with the example backfilled from a later definition.

## 4. Surface rendering and proxy config

- [x] 4.1 Render multiple senses (each with examples) in the extension definition popup and pass `mwProxyUrl` derived from `VITE_SUPABASE_URL` plus the anon key to `lookupWord`. Implements requirement "Popup triggers on text selection". Verify: extension test suite passes; manual check shows ≥2 senses for a known multi-sense word.
- [x] 4.2 Render multiple senses in the web app `/vocab` and `/review` cards and pass proxy config to `lookupWord`. Verify: web build passes; manual check shows multiple senses on both routes, and an existing single-definition saved entry still renders via `normalizeDefinition`.
- [x] 4.3 Render multiple senses in the Raycast Add Vocab preview and pass `mwProxyUrl`/anon key built from Raycast preferences to `lookupWord`. Verify: `tsc --noEmit` passes for the raycast package; manual check shows senses in the preview.

## 5. Verification

- [x] 5.1 Run the full suite. Verify: `npm test --workspace=@dictionary/shared` and `npm test --workspace=@dictionary/extension` pass, and `npm run build` succeeds for all four packages.
