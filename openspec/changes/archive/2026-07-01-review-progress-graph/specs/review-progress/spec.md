## ADDED Requirements

### Requirement: Review activity is persisted per local-clock day

The system SHALL record every card review as an increment to a per-user, per-day counter. The day SHALL be determined by the user's local clock (browser timezone) at the moment of review, not by a server or UTC clock. Each rated card SHALL increment the counter for the current local day by one.

#### Scenario: First card of the day lights the day

- **WHEN** a signed-in user rates the first card on a local-clock day that has no prior activity
- **THEN** the system creates a record for that (user, day) with a card count of 1

#### Scenario: Subsequent cards accumulate

- **WHEN** a signed-in user rates additional cards on a day that already has activity
- **THEN** the day's card count increases by one per rated card

#### Scenario: Late-night review belongs to the user's day

- **WHEN** a user rates a card at 11:00 PM in their local timezone
- **THEN** the review is counted on that local calendar day, regardless of the UTC date

#### Scenario: Abandoned session still counts

- **WHEN** a user rates some cards but leaves before the session is complete
- **THEN** every card that was rated is still counted for that day

### Requirement: Review activity increments are atomic and per-user isolated

The system SHALL increment a day's counter atomically so that concurrent writes (e.g. two open tabs) cannot overwrite each other's count. Review activity SHALL be isolated per user under row-level security such that a user can read and write only their own activity.

#### Scenario: Concurrent increments do not clobber

- **WHEN** two tabs for the same user each rate a card for the same day at the same time
- **THEN** the day's card count reflects both increments (increases by two)

#### Scenario: Users cannot read others' activity

- **WHEN** a user queries review activity
- **THEN** only that user's own activity rows are returned

### Requirement: Progress page shows a trailing 12-month consistency graph

The system SHALL provide a `/progress` route, guarded to signed-in users, that renders a GitHub-style contribution grid covering the trailing ~12 months (53 weeks × 7 days). Each cell SHALL represent one local-clock day. A day with at least one card review SHALL be lit; a day with zero SHALL be blank. Cell color intensity SHALL scale with the number of cards reviewed that day using fixed buckets.

#### Scenario: Active day is lit and shaded by volume

- **WHEN** the Progress page loads and a day has review activity
- **THEN** that day's cell is rendered lit with a shade corresponding to its card count

#### Scenario: Inactive day is blank

- **WHEN** a day within the trailing 12 months has zero card reviews
- **THEN** that day's cell is rendered blank

##### Example: fixed intensity buckets

| Cards reviewed that day | Cell shade |
| ----------------------- | ---------- |
| 0                       | blank      |
| 1–4                     | level 1    |
| 5–9                     | level 2    |
| 10–19                   | level 3    |
| 20+                     | level 4    |

### Requirement: Progress page shows current and longest streak

The system SHALL display the user's current streak and longest streak, both derived from the day records. The current streak SHALL count consecutive review-days ending at today or yesterday, and SHALL remain unbroken through today until a full day passes with zero reviews. The longest streak SHALL be the longest run of consecutive review-days ever achieved.

#### Scenario: Current streak survives an un-reviewed today

- **WHEN** the user reviewed yesterday and every prior day back N days, but has not yet reviewed today
- **THEN** the current streak shows N (it is not zeroed until today passes with zero reviews)

#### Scenario: A fully missed day breaks the streak

- **WHEN** a past day within a run has zero card reviews
- **THEN** the run does not extend across that day

##### Example: streak computation

- **GIVEN** today is 2026-07-01, and review-days are 2026-06-28, 2026-06-29, 2026-06-30 (no review yet on 2026-07-01), and an earlier run of 2026-06-01 through 2026-06-10
- **WHEN** the Progress page computes streaks
- **THEN** current streak = 3 (28th–30th, alive through today) and longest streak = 10 (June 1–10)

### Requirement: Progress page has an inviting empty state

The system SHALL render the blank 12-month grid together with a prompt to begin reviewing when the user has no review activity, rather than hiding the graph.

#### Scenario: New user sees the goal

- **WHEN** a signed-in user with zero review activity opens the Progress page
- **THEN** the full blank grid is shown alongside a prompt linking to the review flow

### Requirement: Progress page is reachable from the vocab bank

The system SHALL provide a link to the Progress page from the Vocab Bank header, alongside the existing Review link, and SHALL provide a back-link from the Progress page to the vocab bank.

#### Scenario: Navigate to progress

- **WHEN** a signed-in user views the Vocab Bank header
- **THEN** a Progress link is present that navigates to `/progress`
