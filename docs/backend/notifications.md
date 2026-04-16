# Notifications

## Strategy
- **Method:** Email via Gmail SMTP + Nodemailer (all platforms — iPhone, Android, desktop)
- **Rationale:** iOS does not support background push for PWAs; email is the universal fallback that works everywhere with no native app or developer account required
- **Auth:** Gmail App Password stored in `wifey-app-backend/.env` — `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `RECIPIENT_EMAIL`
- **Delivery:** Daily cron at 08:00 + startup catch-up (fires immediately on start if the computer was off at cron time)
- **Kill switch:** Set `DISABLE_EMAIL=true` in the env file to disable all email sending and skip cron startup entirely. Set to `false` (or remove the var) to re-enable. Default in `.env.dev`; commented out in `.env.uat`.
- **Design:** Registered list in `notifications/index.js` — each type has an id, condition fn, and email template. Add new types by registering a new entry, no structural changes needed.
- **Deduplication:** `notification_log` table (migration 003) — `(type_id, date_key)` unique index prevents double sends
- **Tone:** Cute and affectionate, addressed to the wife.

## Active Types (13)
See `wifey-app-backend/notifications/index.js` for full condition logic and email templates.

| id | Trigger | Repeats? |
|----|---------|----------|
| `period_due_3d` | 3 days before next period | Once |
| `period_due_2d` | 2 days before next period | Once |
| `period_due_1d` | 1 day before next period | Once |
| `period_overdue_1d` | Period 1 day late | Once |
| `period_overdue_3d` | Period 3 days late | Once |
| `period_overdue_5d` | Period exactly 5 days late | Once |
| `irregular_cycle` | Cycle length deviates significantly | Weekly (Mondays) |
| `fertile_window_tomorrow` | Day before fertile window starts | Once |
| `fertile_window_start` | Fertile window begins today | Once |
| `ovulation_today` | Ovulation day | Once |
| `fertile_window_ending` | Last day of fertile window (ovulation+1) | Once |
| `pms_window` | 5 days before next period | Once |
| `cycle_summary` | Day after period ends | Once |

## period_ended dedup contract

`period_ended` uses a two-layer guard to guarantee exactly one summary email per cycle, regardless of edits:

**Layer 1 — row flag (`cycles.period_ended_notified`)**
The flag is set to `1` via `onSent` immediately after the email is sent. `check` always queries `period_ended_notified = 0`, so the notification can never fire twice for the same cycle row — even if `start_date`, `end_date`, or any other field is later changed (issue #27).

Delete + recreate produces a new row with `period_ended_notified = 0`, so a fresh email fires after the stability window. This is intentional: a recreated cycle is treated as a new cycle.

**Layer 2 — stability window (`updated_at`, 12h)**
Both `check` and `onSent` require `updated_at < datetime('now', '-12 hours')`. This prevents the notification from firing while the user is still actively editing. Safe for cron and future live/push delivery alike — a blocked check gets a second chance via the 3-day lookback window (`end_date BETWEEN 3 days ago AND yesterday`).

**Constraint for cycle editing UI (issue #27)**
Any route that writes `start_date` or `end_date` — including the smart editing controls — **must** also set `updated_at = CURRENT_TIMESTAMP`. Without this, the stability window does not reset and an already-stable cycle could be notified mid-edit.

## Future
- Public version will use configurable templates with `{{name}}`, `{{days_until_period}}` placeholders.
- Move to a 24/7 server so startup catch-up pattern can be retired.
