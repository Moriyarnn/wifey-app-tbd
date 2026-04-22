# Pantry — Backend

## Overview

Two tables: `shopping_list` for items to buy and `pantry` for items in the house. Checking off a shopping list item triggers a move to pantry. The notification cron polls `pantry` daily for expiring items. Recipe integration (Phase 7+) will read pantry to score and suggest recipes.

## Data Model

### `shopping_list`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `name` | TEXT | Required |
| `quantity` | TEXT | Optional — "2 kg", "1 bunch", free-form |
| `category` | TEXT | produce / dairy / meat / bakery / frozen / dry_goods / other |
| `added_by` | INTEGER | FK to `users.id` — nullable until auth ships |
| `checked` | INTEGER | 0 = to buy, 1 = checked off |
| `checked_at` | TEXT | Timestamp when checked — used to sort checked items to bottom |
| `created_at` | TEXT | |

### `pantry`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `name` | TEXT | |
| `quantity` | TEXT | Remaining amount — free-form |
| `category` | TEXT | Same values as `shopping_list.category` |
| `bought_date` | TEXT | YYYY-MM-DD — auto-set to today when moved from shopping list |
| `expiry_date` | TEXT | YYYY-MM-DD — nullable |
| `opened_date` | TEXT | YYYY-MM-DD — nullable |
| `notes` | TEXT | Optional |
| `status` | TEXT | active / used / wasted — only `active` rows show in pantry view |
| `from_list_id` | INTEGER | FK to `shopping_list.id` — set when moved from shopping list, nullable for direct adds |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

**`status` values:**
- `active` — in the house, available
- `used` — consumed normally (swipe-left or "mark as used")
- `wasted` — thrown out expired (explicit "wasted" action — feeds waste tracking premium feature)

## API Endpoints (planned)

### Shopping List

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pantry/list` | All items ordered by checked ASC, category, name |
| POST | `/api/pantry/list` | Add item `{ name, quantity?, category? }` |
| PATCH | `/api/pantry/list/:id` | Update name/quantity/category or toggle `checked` |
| DELETE | `/api/pantry/list/:id` | Remove without buying |
| POST | `/api/pantry/list/:id/move-to-pantry` | Move checked item to pantry `{ expiry_date?, quantity? }` |
| DELETE | `/api/pantry/list/checked` | Bulk-clear all checked items (not bought, just removed) |

### Pantry

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pantry` | All active pantry items ordered by expiry_date ASC, nulls last |
| GET | `/api/pantry/expiring` | Items expiring within N days (default 7) — used by notification cron |
| POST | `/api/pantry` | Add item directly `{ name, quantity?, category?, expiry_date?, bought_date? }` |
| PATCH | `/api/pantry/:id` | Update any fields |
| PATCH | `/api/pantry/:id/status` | Set status to `used` or `wasted` |
| POST | `/api/pantry/:id/reorder` | Add item back to shopping list (copies name/quantity/category) |
| DELETE | `/api/pantry/:id` | Hard delete |

## Notifications

New notification types integrated into the existing daily cron:

| Type | Condition | Tier |
|------|-----------|------|
| `pantry_expiry_today` | Items with `expiry_date` = today | Free |
| `pantry_expiry_soon` | Items with `expiry_date` within 3 days | Free |
| `pantry_expiry_week` | Items with `expiry_date` within 7 days | Premium |
| `pantry_waste_tip` | Items within 2 days of expiry + matching recipe exists | Premium |

`pantry_waste_tip` fires only when the recipe integration is live. It includes the item name, days remaining, and a recipe suggestion that uses it.

## Waste Tracking (premium)

Every time a user marks an item as `wasted`, the event is recorded. The backend can then surface:
- Total items wasted per month
- Most frequently wasted categories
- Estimated cost of waste (if user opts to log prices)

No separate table required — `status = 'wasted'` rows in `pantry` plus `updated_at` are sufficient for aggregates.

## Reorder Patterns (premium)

After enough `shopping_list` → `pantry` → `used` cycles, the backend can detect average repurchase intervals per item. This is a simple aggregate: group by name, compute average days between `bought_date` values. If `NOW - last_bought_date > avg_interval * 0.9`, surface a reorder suggestion.

## Migrations

Planned:
- `008_pantry.sql` — `shopping_list` + `pantry` tables

## File Locations (planned)

```
wifey-app-backend/
├── routes/pantry/
│   ├── list.js     # shopping list CRUD + move-to-pantry
│   └── pantry.js   # pantry CRUD + expiry query
└── migrations/
    └── 008_pantry.sql
```

## Status

Planned — not yet implemented. Frontend spec: [Pantry — Frontend](../frontend/features/pantry.md)
