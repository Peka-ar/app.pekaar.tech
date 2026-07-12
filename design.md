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
