## ADDED Requirements

### Requirement: Session draws 10 random words

On session start, the system SHALL shuffle all saved words and select up to 10 as the session deck. If fewer than 10 words are saved, all words SHALL be included.

#### Scenario: Bank has more than 10 words

- **WHEN** a review session starts with more than 10 words in the bank
- **THEN** exactly 10 words SHALL be selected at random for the session

#### Scenario: Bank has 10 or fewer words

- **WHEN** a review session starts with 10 or fewer words in the bank
- **THEN** all words SHALL be included in the session

#### Scenario: Session restarts with new shuffle

- **WHEN** user clicks "Review again" on the completion screen
- **THEN** a new random selection of 10 words SHALL be drawn (may differ from the previous session)

---

### Requirement: Flashcard shows word on front, detail on back

Each flashcard SHALL show only the word on its front face. Clicking the card SHALL flip it to reveal the definition, part of speech, example sentence, encounter count, and all encounter context sentences.

#### Scenario: View card front

- **WHEN** a new flashcard is shown
- **THEN** only the word SHALL be visible with a "tap to reveal" affordance

#### Scenario: Flip card

- **WHEN** user clicks the card
- **THEN** the card SHALL reveal: definition, part of speech, example sentence, encounter count ("Seen N×"), and all encounter context sentences with their source URLs and dates

---

### Requirement: Self-rating with Easy / Hard / Again

After flipping a card, the user SHALL rate it. Rating SHALL determine how the card is handled for the rest of the session.

#### Scenario: Rate Easy

- **WHEN** user rates a card "Easy"
- **THEN** the card SHALL be moved to the done pile and SHALL NOT appear again in this session

#### Scenario: Rate Hard

- **WHEN** user rates a card "Hard"
- **THEN** the card SHALL remain in the remaining queue and SHALL appear again later in this session

#### Scenario: Rate Again

- **WHEN** user rates a card "Again"
- **THEN** the card SHALL be placed at the back of the "again" pile and SHALL reappear after all remaining cards are exhausted

##### Example: Again card reappear order

- **GIVEN** session queue: [A, B, C] and again pile: []
- **WHEN** user rates A as "Again"
- **THEN** queue becomes [B, C] and again pile becomes [A]; A reappears after B and C are rated

---

### Requirement: Again pile drains after remaining queue is empty

When the remaining queue is exhausted, the system SHALL drain the again pile into the queue and continue the session.

#### Scenario: Remaining exhausted, again pile has cards

- **WHEN** the remaining queue reaches 0 and the again pile is non-empty
- **THEN** again pile cards SHALL become the new remaining queue and the session SHALL continue

---

### Requirement: Session progress indicator

The review page SHALL show a progress indicator displaying how many cards have been marked done out of the total session size.

#### Scenario: Progress updates on rating

- **WHEN** user rates a card "Easy"
- **THEN** the done count SHALL increment and the progress indicator SHALL update (e.g. "3 / 10 done")

---

### Requirement: Session completion screen

When all cards have been rated Easy (done pile equals session total), the system SHALL display a completion screen.

#### Scenario: All cards done

- **WHEN** done count equals session total
- **THEN** a completion screen SHALL appear with a "Review again" button

#### Scenario: Restart from completion screen

- **WHEN** user clicks "Review again"
- **THEN** a new session SHALL begin with a fresh random selection of 10 words
