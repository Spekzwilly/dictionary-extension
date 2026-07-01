# A Review-Day is bucketed by the user's local clock, not UTC

The Progress graph buckets Card Reviews into days. We compute the day key on the client using the browser's local timezone, so a review at 11pm and one at 1am land on the days the user actually experienced them. The alternative — bucketing by UTC on the server — is simpler and consistent, but a 10pm-PST review would fall on "tomorrow," scattering a user's late-night reps across the wrong cells and making a *personal consistency* graph read wrong. Consistency is a human, clock-relative notion, so we follow the user's clock.

## Consequences

- The stored day is a `date` computed client-side and sent with each review; the server does not derive it from a timestamp.
- Changing this later (e.g. to UTC) would re-bucket all historical data and silently shift every cell — hard to reverse. Hence this record.
- Edge cases (crossing timezones while travelling, DST) can nudge a review to an adjacent cell. Accepted — the alternative is worse for the common case.
