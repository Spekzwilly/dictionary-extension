## Why

The Raycast "Add with sentence…" form lets the user attach a typed sentence to an encounter, but encounter sentences are no longer displayed anywhere — the web vocab and review pages now show the dictionary's `definition.example` instead (commits `d4d48fe`, `d7060e9`). The form captures dead data and adds friction. The dictionary example is already available on every saved entry and already rendered in the Raycast preview.

## What Changes

- Remove the "Add with sentence…" secondary action and its `Form` from the Add Vocab command.
- Saving a found word always records a `raycast://manual` encounter with **no** sentence.
- **BREAKING** (internal): `saveWord` drops its `sentence` parameter — `saveWord(definition)`.
- No change to the preview: it already renders `definition.example` from the dictionary lookup.

## Non-Goals

- No Supabase migration. Existing entries with a stored `encounter.sentence` are left inert (those sentences are no longer displayed anywhere).
- No change to the shared `Encounter` type — `sentence` stays optional (the browser extension still sets it).
- No change to the web app or extension; the web already reads `definition.example`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `raycast-add-vocab`: the "Add Vocab saves to the shared vocab bank" requirement drops the "Add with sentence…" secondary action and the saved encounter no longer carries a user-typed sentence.

## Impact

- Affected specs: `raycast-add-vocab`
- Affected code:
  - `packages/raycast/src/add-vocab.tsx` — remove `SentenceForm`, the `Action.Push`, and unused imports (`Form`, `useNavigation`)
  - `packages/raycast/src/lib/vocab.ts` — drop `sentence` param from `saveWord`
