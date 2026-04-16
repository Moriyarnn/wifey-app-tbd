# Period Tracker — Frontend

## Views
- `src/views/period/PeriodHome.vue` — main screen
- `src/views/period/PeriodLog.vue` — log entry view
- `src/views/period/CycleDetail.vue` — single cycle detail

## PeriodHome Layout
1. **Header** — back button, today's date label, settings icon (opens SettingsSheet)
2. **Status strip** — three tiles: Next period / Cycle day / Fertile window
3. **Month navigation** — prev/next arrows + month label
4. **Calendar grid** — days colored by period/fertile/ovulation status; tap a day to open the log panel
5. **Day panel** — log, edit, or delete an entry for the selected day; shows flow intensity + notes + symptoms

## Period Logging Model
Two methods are supported and coexist in the UI:

**1. Retrospective range** — user selects a start + end date as a complete range after the period is done. `end_date` is set at log time. `currentCycle` is populated immediately.

**2. Day-by-day (active)** — user taps each day as it happens. During an active period logged this way, `end_date` is not set until the user explicitly ends the period, so `currentCycle` can be `null` in queries and notification checks even though a period is ongoing. Do not assume a `null` `currentCycle` means no period is happening.

**Issue #42 (pending):** Once shipped, `end_date` will always be auto-set to `MAX(date)` of logged days on every add or delete. Active cycle detection will shift from checking `end_date IS NULL` to checking `end_date = today or yesterday`. This eliminates the ambiguity in day-by-day logging.

## Key Logic
- Summary data fetched from `GET /api/period/calculations/summary`
- All cycle days fetched from `GET /api/period/cycle-days/all` for calendar coloring
- `justSaved` ref drives save-confirmation animation — **known bug #1**: needs to be a Set to support concurrent animations
- Period end flow (`PATCH /api/period/cycles/:id/end`) exists in the API but is not yet wired in the UI

## Calendar Badge Sizing
Badge icons in calendar day cells use `clamp()` to scale proportionally with the cell size across all screen sizes:
- Badge: `clamp(12px, calc((100vw - 76px) / 7 * 0.35), 20px)`
- Icon: `clamp(10px, calc((100vw - 76px) / 7 * 0.30), 18px)`

The 76px accounts for: wrapper padding (40px) + calendar padding (24px) + grid gaps (12px). This ensures badges never overlap the day number on small mobile screens while staying capped at 20px on desktop.

## Onboarding Tutorial (`OnboardingTutorial.vue`)

A 3-slide animated modal shown once on first visit (keyed to `localStorage: wifey_onboarding_done`). Teleported to `<body>`, dismissible via Skip, Got it, or the X button (X skips localStorage so it re-shows next visit).

| Slide | Title | Animation |
|-------|-------|-----------|
| 1 | Log a past period | Finger dot drags across 5 mini-calendar cells using an asymmetric bezier sweep (`cubic-bezier(0.9,0,0.8,1)`, 1.6s). Anchor cells scale up; filled cells highlight in pink. |
| 2 | Track as it happens | Finger taps cells 1–3 individually (800ms cadence), glides to cell 6 (bookend), then cells 4–5 auto-fill simultaneously with a snappy 0.18s pop. |
| 3 | Make predictions smarter | A day bubble pulses, then symptom chips (Cramps, Fatigue, Mood swings) animate in one by one. |

**Pointer positioning:** The finger dot (`z-index: 3`) sits centered on each cell (`top: cell-size / 2 - 10px`) and always renders above cells, including scaled anchor cells (`z-index: 2`).

**Cell sizing:** Both the JS `cx()` helper and the CSS `--cell` variable use the same `clamp()` formula so pointer positions always align with rendered cells at any screen width.

**`forceOpen` prop:** Allows the tutorial to be re-opened externally (e.g. from a help button) without clearing the localStorage flag.

**Pending (#22):** Once period start/middle/end icons are improved, update slides 1–2 to reflect the new icons in the mini-calendar cells.

## Logging Hints (`LoggingHints.vue`)

A compact, always-visible hint strip (no modal) showing two looping mini-calendar animations and a static ovulation hint. Intended as an in-context reminder of the two logging methods. Runs its own independent animation timers (`runDrag`, `runTap`) on mount.

## Status
- UI complete
- Period end wiring: pending
- Bug #1 (justSaved): pending
- OnboardingTutorial: complete — pending icon update (#22)
- #42 (auto end_date): pending — will change active-cycle detection model
