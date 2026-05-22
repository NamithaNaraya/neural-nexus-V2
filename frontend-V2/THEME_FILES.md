# Frontend Theme Control Map

This React v2 frontend is now set up so the shared product theme is controlled from a very small set of files.

## Quick Reference

For whole-project color changes, change only these 3 files:

1. `theme/palette.js`
2. `tailwind.config.js`
3. `src/index.css`

Use these files for normal app-wide theme changes:

| File | What it controls | When to change it | Impact |
|---|---|---|---|
| `theme/palette.js` | Base brand palette in plain hex values | When you want to change the product's main brand colors | Feeds Tailwind aliases and JS-side color helpers |
| `tailwind.config.js` | Shared utility color families like `primary`, `emerald`, `cyan`, `amber`, `slate`, `stone`, `zinc` | When old component classes must map to a new palette without editing every page | Makes existing buttons, badges, tabs, cards, chips, borders, and text follow the same palette |
| `src/index.css` | Semantic light/dark theme tokens like `--primary`, `--accent`, `--background`, `--border`, plus shared branded surfaces and glows | When you want to change light mode, dark mode, surface feel, contrast, or global background/hero behavior | Controls semantic theme behavior across the app |

## Optional helper file

| File | What it controls | Notes |
|---|---|---|
| `src/utils/visualPalette.js` | JS-accessible palette values for status colors and non-CSS rendering helpers | Keep this aligned with `theme/palette.js`. It already reads from that file. |

## Recommended order when changing the whole app theme

1. Update `theme/palette.js`
2. Check `src/index.css` semantic tokens for light and dark mode
3. Only adjust `tailwind.config.js` if you want the old Tailwind family names to behave differently

## Practical rule

If the UI is part of the normal shared app theme, do not hardcode page-level colors.

Prefer:

- semantic classes such as `bg-primary`, `text-primary`, `border-border`, `bg-card`, `text-muted-foreground`
- shared CSS utilities from `src/index.css`
- palette values from `theme/palette.js`

Avoid:

- page-level raw hex values
- one-off `rgb(...)` or `hsl(...)` values in components
- local color systems for normal app UI

## Exceptions kept outside this shared theme path

These areas are intentionally allowed to keep custom rendering colors:

- 2D graph views
- 3D graph views
- list view / custom visualization rendering

Those are product-specific visualization exceptions and should not be treated as regular UI theme leaks.

## If you want the fastest whole-project recolor

Start here first:

- `theme/palette.js`
- `src/index.css`

Those are the two highest-impact files.
