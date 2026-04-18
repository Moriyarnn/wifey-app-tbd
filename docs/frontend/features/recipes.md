# Recipes — Frontend

## Overview

Shared household recipe book. Both partners can browse, add, and favorite recipes. Recipes are tagged with ingredients (linking to Groceries) and cycle phases (linking to the Period Tracker for craving-based suggestions).

## Planned Views

- `src/views/RecipesView.vue` — recipe browser with search and phase/category filter
- `src/views/RecipeDetail.vue` — full recipe: ingredients, steps, phase tags, notes
- `src/views/RecipeEdit.vue` — add/edit a recipe

## Recipe Fields

| Field | Notes |
|-------|-------|
| Name | Required |
| Description | Short summary |
| Ingredients | List of name + quantity; linkable to pantry |
| Steps | Ordered list |
| Cycle phase tags | None / Menstrual / Follicular / Ovulatory / Luteal (multi-select) |
| Category tags | Breakfast / Lunch / Dinner / Snack / Dessert |
| Prep time | Minutes |
| Servings | Number |
| Notes | Free-form |
| Favorited | Per-user boolean |

## Period Cravings Integration (free)

Recipes tagged with one or more cycle phases are surfaced automatically on the recipe browser when the user is in that phase. No history required — phase is known as soon as one cycle exists.

**Phase tag rationale (shown as helper text when tagging a recipe):**
- **Menstrual** — iron-rich, anti-inflammatory, comfort foods (red meat, leafy greens, ginger, dark chocolate)
- **Follicular** — light, fresh, fermented (salads, eggs, yogurt, whole grains)
- **Ovulatory** — fiber-rich, anti-inflammatory (berries, leafy greens, legumes)
- **Luteal** — complex carbs, magnesium, mood-stabilizing (sweet potato, nuts, oats, dark chocolate)

The recipe browser shows a "For your phase" section at the top when in-phase recipes exist. The filter bar also allows manually filtering by phase.

**Premium extensions:**
- Symptom-triggered suggestions: "you logged cramps today — here are anti-inflammatory recipes" (in-app card + optional notification)
- Learned cravings: surfaces phase-matched recipes 1–2 days before the phase based on your logged symptom patterns
- Nutritional context card on each recipe: brief note on why this food helps in the current phase
- Partner nudge: partner receives a suggestion to cook a phase-appropriate meal

## Groceries Integration

From a recipe detail view, tapping "Cook this" cross-references ingredients against the current pantry:
- Ingredients already in pantry are shown as available (green)
- Missing ingredients can be added to the shopping list in one tap
- On confirm, available ingredients are decremented from pantry quantities

## Notion Sync (premium)

Recipes can be pulled from a connected Notion database. Field mapping is configurable (Notion property name → recipe field). Sync is one-way: Notion → app. Changes made in-app do not push back to Notion.

## Status

Planned — not yet implemented.
