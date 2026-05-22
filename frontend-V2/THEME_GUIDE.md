# Theme & Color Palette Guide

This document explains how the color system is structured in the **Frontend React V2** project. To change the brand colors or overall theme, you need to understand the relationship between these three core files.

## Summary Table

| File | Role | Importance |
| :--- | :--- | :--- |
| [`theme/palette.js`](./theme/palette.js) | **Source of Truth** | Most important for brand identity. Defines raw Hex codes for all primary, neutral, and accent colors. |
| [`tailwind.config.js`](./tailwind.config.js) | **Class Mapping** | Maps palette colors to Tailwind classes (e.g., `primary-500`). It translates the palette into a usable design system. |
| [`src/index.css`](./src/index.css) | **Dynamic Variables** | Defines CSS variables (HSL) used for Dark/Light mode switching. Manages global UI elements like backgrounds and borders. |

---

## Detailed Breakdown

### 1. The Palette Layer (`theme/palette.js`)
This is where you define the specific "paint" you are using. If you have a specific hex code from a designer, you put it here.
- **Example**: Changing `brand.primary` here will update all components that use the "brand" primary color.

### 2. The Configuration Layer (`tailwind.config.js`)
This file "imports" the palette and creates the logic for Tailwind. 
- It maps the `THEME_PALETTE` to standard Tailwind names like `emerald`, `cyan`, etc.
- It also defines **Aliases** (like `primary: hsl(var(--primary))`) which allow the UI to change colors dynamically without changing the code.

### 3. The CSS Variable Layer (`src/index.css`)
This file is critical for **Dark Mode** and **Theming**.
- It uses HSL values instead of Hex codes. 
- When the `:root` or `.dark` class changes, these variables update instantly across the entire application.
- **Importance**: This file ensures that "Primary" means one thing in Light mode and something slightly different (usually brighter/softer) in Dark mode.

---

## Workflow: How to Change a Color

If you want to update the **Primary Brand Color** across the whole app:

1.  **Update Hex Code**: Go to `theme/palette.js` and change `brand.primary`.
2.  **Update HSL Variable**: Go to `src/index.css` and update `--primary` in both `:root` (light) and `.dark` blocks.
    - *Tip: Use an online converter to get the HSL components (e.g., "262 83% 58%") from your Hex code.*
3.  **Verify Tailwind**: Ensure `tailwind.config.js` is correctly mapping the variable (it usually is by default).

> [!TIP]
> **Why use three files?**
> By splitting the theme into these layers, we ensure the project is highly maintainable. You can change your brand color in ONE place (`palette.js`) and have it automatically propagate to all components, while still allowing for complex dark-mode logic in `index.css`.
