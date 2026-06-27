## ADDED Requirements

### Requirement: Example sentence sourced from first available definition

`lookupWord` SHALL keep the first definition (`meanings[0].definitions[0].definition`) as the primary definition, but SHALL source the `example` field from the first definition that has a non-empty `example`, scanning across all entries and all meanings in payload order. When no definition in the payload has an `example`, the `example` field SHALL be absent (`undefined`).

#### Scenario: Example backfilled from a later definition

- **WHEN** a word's first definition has no `example` but a later definition (in the same or another meaning) does
- **THEN** the result's `definition` SHALL be the first definition's text
- **AND** the result's `example` SHALL be that later definition's example sentence

##### Example: example sourced from a later sense

- **GIVEN** API returns meanings[0].definitions[0] = { definition: "lasting a very short time" } (no example), and meanings[0].definitions[2] = { definition: "...", example: "the ephemeral joys of childhood" }
- **WHEN** `lookupWord("ephemeral")` resolves
- **THEN** result.definition = "lasting a very short time"
- **AND** result.example = "the ephemeral joys of childhood"

#### Scenario: No example anywhere in payload

- **WHEN** no definition across any meaning has an `example`
- **THEN** the result's `example` field SHALL be absent (`undefined`)
