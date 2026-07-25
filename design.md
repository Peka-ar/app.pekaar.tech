# STUDIO.V Design System

This document outlines the core design guidelines for the STUDIO.V micro-SaaS. Adhere to these principles to maintain a consistent, premium, and enterprise-grade aesthetic across all future pages and components.

## 1. Brand Identity & Aesthetics
**Vibe:** Editorial, Premium, Corporate, Minimalist but Dynamic.
The UI should feel like a high-end architectural digest or premium fashion e-commerce site, rather than a standard flat-design SaaS.

## 2. Color Palette
Use these precise hex codes to maintain the high-end editorial feel.

### Backgrounds & Surfaces
- **Primary Canvas (`#F9F8F6`)**: The main app background. A warm, sophisticated off-white.
- **Secondary Canvas (`#EFEDEA`)**: Used for subtle contrast, hover states, or secondary panels.
- **Surface (`#FFFFFF`)**: Pure white for cards, popups, and elevated bento boxes.
- **Inverted Canvas (`#1A1A1A`)**: Used sparingly for high-contrast sections or inverted bento boxes.

### Typography & Lines
- **Primary Text (`#1A1A1A`)**: For all primary headings and active buttons.
- **Secondary Text (`#4A4742`)**: For body paragraphs and readable descriptions.
- **Muted Text (`#7A7670`)**: For subheadings, overlines, and disabled states.
- **Borders (`#E5E2DD`)**: The standard border color for structural divisions.

### Accents
- **Amber (`amber-500`)**: Used for glowing highlights (e.g., the spark icon).
- **Emerald (`emerald-500`)**: Used for "Live" or "Calibrated" status indicators.
- **Coral (`#c44320`)**: The brand's primary call-to-action color. Used for solid hero bands (e.g. landing `StatsRibbon`, the "From The Field" testimonials section) and the "Send Reset Link" / "Sign Up" form button accents. Always paired with white text. Stays constant across light and dark modes — it is a brand token, not a theme token.

## 3. Typography
The typography relies on high-contrast pairings to achieve its editorial look.

- **Serif (`Cormorant Garamond`)**: Used for large, impactful headings (`h1`, `h2`, `h3`). 
  *Pattern*: Often mixed with `italic` and `font-light` or `font-normal` for elegance.
- **Sans-Serif (`Inter`)**: Used for body copy, UI buttons, and readable data.
  *Pattern*: Keep it highly legible.
- **Monospace (`JetBrains Mono`)**: Used for developer snippets, technical metrics, overlines, and labels.
  *Pattern*: Usually styled with `uppercase`, `text-[10px]` or `text-[9px]`, and `tracking-widest` or `tracking-[0.25em]`.

## 4. Layouts & Structure
- **Containers**: Standardize on `max-w-7xl` with `mx-auto` for main content areas.
- **Bento Grids**: Use rounded bento-box layouts (`rounded-[2rem]`, `rounded-2xl`, `rounded-3xl`) for features and info panels to maintain a modern SaaS feel.
- **Text Wrapping**: Always use `style={{ textWrap: 'balance' }}` on large `h1` and `h2` elements to prevent orphan words and awkward line breaks.

## 5. Interactions & Micro-Animations
- **Hover States**: Prefer slight background color shifts (e.g., `hover:bg-[#EFEDEA]`) and border color darkens (`hover:border-[#1A1A1A]`).
- **Click States**: Use `active:scale-95` on primary buttons for a tactile, responsive feel.
- **Transitions**: **Never use `transition-all`**. Strictly use compositor-friendly transitions such as `transition-colors`, `transition-transform`, and `transition-opacity` paired with standard tailwind durations (e.g., `duration-300`).

## 6. Accessibility (Vercel Guidelines Compliant)
- **Focus States**: All interactive elements must rely on the global `:focus-visible` outline setup in `index.css` (a 2px solid `#1A1A1A` ring). Never use `outline-none` unless specifically replacing it with a custom `:focus-visible` ring.
- **Icon Buttons**: Any button without text (containing only a Lucide icon) MUST include an `aria-label`.
- **Ellipses**: Always use the proper typographic ellipsis character (`…`) rather than three dots (`...`).
- **Decorative Icons**: Set `aria-hidden="true"` on icons that do not provide standalone meaning.
- **Form Controls**: Every input must have a wrapping `<label>` or be linked via `htmlFor`.

## 2.5. Dark Mode Tokens

The theme system lives in **`src/app/globals.css:10-66`**. Two `:root` blocks define semantic CSS custom properties (light defaults in `:root`, dark overrides in `.dark`). `next-themes` toggles the `class` attribute on `<html>` (config in `src/components/ThemeProvider.tsx`, hydration-safe toggle in `src/components/ThemeToggle.tsx`).

### The token contract

Every color in a React component **must** be one of these token references (via `var(--color-*)` or `var(--*)`). Tailwind's arbitrary-value syntax is the canonical way to bind them in a class string:

| Tailwind class | Token | Light value | Dark value | Used for |
|---|---|---|---|---|
| `bg-[var(--color-canvas)]` | `--canvas` | `#faf9f5` | `#141413` | App background |
| `bg-[var(--color-canvas-secondary)]` | `--canvas-secondary` | `#efe9de` | `#252320` | Hover rows, muted panels, section backgrounds |
| `bg-[var(--color-surface)]` | `--surface` | `#ffffff` | `#1f1e1b` | Cards, popups, inputs |
| `bg-[var(--color-canvas-inverted)]` | `--canvas-inverted` | `#181715` | `#f5f3ee` | Forced dark/light surfaces (e.g. auth left panel — inverts across themes) |
| `text-[var(--color-text-primary)]` | `--text-primary` | `#141413` | `#f5f3ee` | Headings, body, primary buttons |
| `text-[var(--color-text-secondary)]` | `--text-secondary` | `#3d3d3a` | `#c4c0b6` | Body paragraphs, descriptions |
| `text-[var(--color-text-muted)]` | `--text-muted` | `#6c6a64` | `#9a968d` | Overlines, captions, sub-labels, chart x-axis |
| `border-[var(--color-border-default)]` | `--border-default` | `#e6dfd8` | `#3d3d3a` | Structural dividers, card borders |
| `bg-[var(--color-primary)]` | `--primary` | `#cc785c` | `#cc785c` | CTA buttons (coral, identical in both modes) |

The `--color-*` aliases on `globals.css:25-35` exist to fix an undefined-token bug — keep both forms when referencing.

### Keep-list (do NOT migrate)

These hex codes are **brand tokens, not theme tokens** — they must stay constant across light and dark mode:

- `bg-[#c44320]` + `text-white` — coral hero bands (landing `StatsRibbon` in `LandingExtras.tsx:41`, the "From The Field" testimonials in `LandingPageClient.tsx:118`).
- `bg-[#181715]` + `text-[#faf9f5]` on the Bento **"Calibrated Scale"** card (`BentoFeatures.tsx:38-48`) — intentional dark surface, paired with `border-[#252320]` and the `bg-[#252320]` icon well.
- `bg-[#1A1A1A] text-white` on the **Auth split-screen left panel** (`AuthClient.tsx:25`) and **Onboarding left aside** (`OnboardingClient.tsx:57`) — these are the brand-visual panels, intentionally dark in both themes. The right form panels flip with the theme.
- `bg-[var(--color-canvas-inverted)] text-[var(--color-canvas)]` for the Hero "3D · AR Ready" pill (`Hero.tsx:80`) and the active-state ThreeDConfigurator auto-rotate button (`ThreeDConfigurator.tsx:130`) — these are **inverted surfaces** that stay visually distinct by inverting the canvas, so the token naturally does the right thing.
- `bg-[#111111]` / `bg-[#2A2A2A]` + `text-[var(--color-canvas)]` on the **Integrations embed-code panel** (`IntegrationsClient.tsx:295-355`) — a developer-tool surface, intentionally always dark.

### Component class extensions

`globals.css:99-104` declares `.card` with a light-mode box-shadow. `globals.css:106-108` adds `.dark .card { box-shadow: 0 1px 3px rgba(0,0,0,0.4); }` for dark mode — preserves the elevation feel without the warm undertone.

### Substitution map (the rules)

When migrating a hard-coded class to a token:

| Old | New |
|---|---|
| `text-[#1A1A1A]` | `text-[var(--color-text-primary)]` |
| `text-[#4A4742]` | `text-[var(--color-text-secondary)]` |
| `text-[#7A7670]` | `text-[var(--color-text-muted)]` |
| `text-[#A3A3A3]` | `text-[var(--color-text-muted)]` (chart x-axis, faded labels) |
| `bg-[#F9F8F6]` | `bg-[var(--color-canvas)]` |
| `bg-[#EFEDEA]` | `bg-[var(--color-canvas-secondary)]` |
| `bg-[#E5E2DD]` | `bg-[var(--color-border-default)]` (or `border-[var(--color-border-default)]`) |
| `bg-white` | `bg-[var(--color-surface)]` (preserve `/50`, `/90` opacity variants) |
| `bg-[#1A1A1A]` + `text-white` (button) | `bg-[var(--color-text-primary)] text-[var(--color-canvas)]` + `hover:opacity-90` |
| `text-white` on `bg-[var(--color-text-primary)]` | `text-[var(--color-canvas)]` |

### Theme toggle

`ThemeToggle` uses `useSyncExternalStore` to detect mount — necessary for hydration safety. The `suppressHydrationWarning` attribute on `<body>` in `src/app/layout.tsx` accepts the brief flash when the user's stored preference is loaded on mount.
