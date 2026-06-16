## ADDED Requirements

### Requirement: Manually-added encounters are labeled in the vocab bank

When the web app renders an encounter whose `url` is the sentinel `"raycast://manual"`, it SHALL display an "Added in Raycast" label instead of a source link. Encounters with a real source URL SHALL continue to render their source link unchanged.

#### Scenario: Raycast-added encounter shows a label

- **WHEN** the user expands a word whose encounter has `url` equal to `"raycast://manual"`
- **THEN** that encounter SHALL display an "Added in Raycast" label instead of a blank or broken source link

#### Scenario: Page-sourced encounter is unchanged

- **WHEN** the user expands a word whose encounter has a real source URL
- **THEN** that encounter SHALL continue to display its source link as before
