# Sleep Tracker — Frontend

## Overview

Manual sleep logging with pattern recognition and partner cycle sync. No sensors required — users log bedtime, wake time, and wake quality. The app derives personal sleep windows and surfaces partner overlap.

## Planned Views

- `src/views/sleep/SleepHome.vue` — main screen: today's log prompt, weekly chart, partner overlap strip
- `src/views/sleep/SleepLog.vue` — log entry: bedtime, wake time, wake quality, optional notes
- `src/views/sleep/SleepInsights.vue` — patterns over time: optimal window, debt accumulation, trend chart

## SleepHome Layout (proposed)

1. **Morning prompt** — if no entry logged today, show "How did you sleep?" card
2. **Weekly strip** — 7-day bar chart of sleep duration, colored by wake quality (green/amber/red)
3. **Partner strip** — overlaid partner schedule: shared window highlighted, divergence noted
4. **Insight card** — rotating tip based on recent data (e.g. "You wake best after 7h 15m")

## Sleep Log Entry

| Field | Type | Notes |
|-------|------|-------|
| Bedtime | time picker | Previous day if after midnight |
| Wake time | time picker | |
| Wake quality | 1–5 or emoji scale | Core signal for pattern recognition |
| Notes | text (optional) | Free-form (e.g. "woke at 3am", "vivid dreams") |

## Pattern Recognition (no ML)

With 2–3 weeks of data the app can surface:
- **Optimal duration** — rolling average of duration on nights rated ≥4
- **Optimal bedtime window** — bedtime range correlated with good wake scores
- **Sleep debt** — cumulative shortfall vs. personal optimal over the past 7 days
- **Weekday vs. weekend drift** — average bedtime delta between weekdays and weekends
- **Partner convergence** — nights where both partners' sleep windows overlap by ≥5h

Calculations are done server-side and returned via the insights endpoint. No third-party ML service required.

## Partner Sync

Both users log independently. The app fetches both datasets and computes overlap client-side or via the API. The partner strip shows:
- Shared sleep window (start of later bedtime → end of earlier wake time)
- Color-coded divergence: green (≥6h overlap), amber (3–6h), red (<3h)

Partner data is opt-in. Either partner can hide their data from the shared view in Settings.

## Morning Nudge

A morning notification ("How did you sleep?") deeplinks directly into `SleepLog.vue` with today's date pre-filled. Configurable in SettingsSheet — default on, time adjustable (default 08:30).

## Status

- Planned — not yet implemented
- Backend data model: see [Sleep Tracker — Backend](../../backend/sleep-tracker.md)
- Premium features: see [premiumfeatures.md](../../../../../premiumfeatures.md)
