# Exercise — Frontend

## Intent

A lightweight workout log. This feature is intentionally small — it does not aim to be a fitness app. Its value comes from sitting alongside the period tracker and recipes in the same household hub, allowing light cross-feature awareness. Deep integration with either feature is out of scope.

## Planned View

- `src/views/ExerciseView.vue` — log entry + weekly activity strip

## Log Entry Fields

| Field | Notes |
|-------|-------|
| Date | Defaults to today |
| Type | Run / Walk / Yoga / Strength / Cycling / Swim / Other |
| Duration | Minutes |
| Intensity | Light / Moderate / Intense |
| Notes | Optional free-form |

No sets, reps, weight, GPS, or calorie tracking. Those belong in dedicated fitness apps.

## Hub Card

A simple weekly activity strip — coloured dots for days with a logged workout, greyed out for rest days. Tapping opens the exercise view.

## Cross-feature Touchpoints (light)

These connections are surfaced as suggestions, not enforced logic. The user is never blocked or redirected.

**Period tracker:** Each cycle phase has a general energy profile. During the current phase, the exercise view shows a one-line suggestion (e.g. "Follicular phase — energy is rising, good week for intensity"). Same phase-tag mechanism used by recipes. No data is shared between the two features beyond the current phase label.

**Recipes:** After logging a workout, an optional card appears in the recipe section ("You worked out today — here are some recovery meal ideas"). Recipes tagged `post-workout` surface here. The exercise log does not write to recipes and recipes do not write to the exercise log.

## Data Model (planned)

Single table `exercise_logs`: `id`, `user_id`, `date`, `type`, `duration_min`, `intensity`, `notes`, `created_at`. Migration: `009_exercise_logs.sql` (or `010` depending on sleep tracker migration numbering).

## Status

Planned — small idea, low priority. Not in launch scope. Documented to capture intent before implementation.

## Premium Extensions

See [premiumfeatures.md](../../../../../premiumfeatures.md) — Exercise section.
