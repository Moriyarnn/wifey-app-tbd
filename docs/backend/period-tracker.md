# Period Tracker — Backend

## Overview

Core feature of the app. Tracks menstrual cycles and logged days, computes summary predictions, and drives the notification system. Schema and full endpoint list live in [schema.md](schema.md) and [api.md](api.md) — this doc covers behavior and business logic.

## Data Model Summary

**`cycles`** — one row per menstrual cycle. `start_date` is always set; `end_date` is set when the period ends or auto-updated as days are logged. `predicted_start_date` and `ovulation_date` are computed and stored for notification use.

**`cycle_days`** — one row per logged day within a cycle. Holds `flow_intensity`, `notes`, and links to `symptoms`. A cycle can have days logged without all dates in the range being present (sparse logging is valid).

**`symptoms`** — one row per symptom tag per cycle day.

## Two Logging Models

The API supports two coexisting workflows:

**1. Retrospective range** — user logs a complete period after it ends by providing `start_date` + `end_date`. `end_date` is set at creation time. `currentCycle` is immediately queryable.

**2. Day-by-day (active)** — user logs each day as it happens. `end_date` is auto-set to the latest logged day on every `POST` or `DELETE` to `cycle_days`. An active period has `end_date` = today or yesterday. Do not treat a recent `end_date` as meaning the period has ended.

Both flows write to the same tables and produce the same shape of data.

## Key Behaviors

**Auto end_date (#36):** Every write to `cycle_days` updates the parent cycle's `end_date` to `MAX(date)` for that cycle. Deletions recalculate downward. This replaced the earlier manual-end flow and the `end_date IS NULL` active-cycle check.

**Adjust cycle (#26):** `PATCH /api/period/cycles/:id/adjust` updates `start_date` and/or `end_date` without touching `cycle_days` rows. Days that fall outside the new range become "orphaned" — they are preserved in the DB and returned with a flag so the UI can badge them.

**12h stability window:** The `period_ended` notification requires `updated_at` on the cycle to be at least 12 hours old before firing, to avoid sending a "period ended" email on a cycle that is still being edited.

**Dedup guard:** All notifications check `notification_log` before sending. The `period_ended` notification additionally checks `period_ended_notified` on the cycle row, which survives `start_date` edits (unlike a `notification_log` key derived from the date).

## Calculations (`GET /api/period/calculations/summary`)

Returns the following for the frontend summary strip and notification cron:

| Field | Description |
|-------|-------------|
| `avgCycleLength` | Mean gap between `start_date` values across all cycles |
| `avgPeriodLength` | Mean count of logged days per cycle |
| `nextPeriodDate` | Latest `start_date` + `avgCycleLength` |
| `ovulationDate` | `nextPeriodDate` − 14 days |
| `fertileWindow` | `ovulationDate` ± 2 days |
| `currentCycle` | Most recent cycle where `end_date` = today or yesterday, or `null` |
| `totalCyclesTracked` | Count of all cycles |

Requires a minimum of 2 completed cycles before surfacing predictions. Below that threshold, prediction fields return `null`.

## File Locations

```
wifey-app-backend/
├── routes/period/
│   ├── cycles.js        # cycle CRUD + adjust
│   ├── cycle_days.js    # day CRUD
│   └── calculations.js  # summary endpoint
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_ovulation_predictions.sql
    ├── 005_cycle_updated_at.sql
    ├── 006_cycle_period_ended_notified.sql
    └── 007_flow_intensity_spotting.sql
```

## Status

- Core feature: complete
- Flow intensity (`spotting` level): complete (#24)
- Adjust cycle: complete (#26)
- Auto end_date (#36): pending
- Period end UI wiring: pending
