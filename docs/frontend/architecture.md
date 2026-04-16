# Frontend Architecture

## Tech
- Vue 3 + TypeScript + Vuetify
- Port 5173 (Docker)

## State Management
No Pinia — local `ref`/`computed` in each view.

## API Communication
Native `fetch` with `window.location.hostname:3000/api` as the base URL.

## Styling
Vuetify components + scoped CSS. No Tailwind.

## Views & Components
```
src/
├── views/
│   ├── HubView.vue              # Main hub / landing
│   └── period/
│       ├── PeriodHome.vue       # Calendar, summary strip, day log/edit/delete panel
│       ├── PeriodLog.vue
│       └── CycleDetail.vue
└── components/
    ├── SettingsSheet.vue        # Bottom sheet — theme changer (UI only, issue #10)
    ├── OnboardingTutorial.vue   # 3-slide animated tutorial modal, shown once on first visit
    └── LoggingHints.vue        # Compact always-visible hint strip with mini animations
```

## Feature Docs
- [Period Tracker](features/period-tracker.md)
- [Groceries](features/groceries.md)
- [Anniversaries](features/anniversaries.md)
- [Recipes](features/recipes.md)

## Theme
- Theme changer lives in `SettingsSheet.vue`
- Intended to propagate via CSS custom properties (`--color-accent`, `--color-bg` on `:root`) across all views
- Not yet wired to real functionality (issue #10)
