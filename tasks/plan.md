# Implementation Plan: Public Launch Readiness — STUDIO.V Website

## Overview

Five small jobs to ship the site publicly: harden dark mode so the theme toggle actually works, rename `Request Access` → `Sign Up` on the sign-in screen, clean up the 6 lint errors + 5 warnings, add legal-page links to the landing footer, and hide the redundant TopNav on `/auth`. All changes preserve current behavior in light mode and respect the existing design system in `design.md` / `WEBSITE.md`.

## Architecture Decisions

1. **Dark mode: token migration, not `dark:` variants.** The codebase already has CSS custom properties (`--canvas`, `--surface`, `--text-primary`, etc.) with a `.dark` override in `globals.css`. The bug is that 100+ classes use hard-coded `text-[#1A1A1A]`, `bg-[#F9F8F6]`, etc., which bypass the token swap. The fix is to convert all those classes to the token references (`text-[var(--color-text-primary)]`, `bg-[var(--color-canvas)]`, `border-[var(--color-border-default)]`, etc.) — the same pattern already used correctly in `Hero.tsx`, `LandingExtras.tsx`, `DashboardLayout.tsx`, and `Card.tsx`. This is a mechanical substitution, not a redesign. The `.dark` token values get a slight retune for better contrast.
2. **The `AuthClient` split-screen is dark by design.** That page has a forced black left panel (`bg-[#1A1A1A]`) — it stays. Only the right (form) panel flips with the theme.
3. **Coral `bg-[#c44320]` bands stay coral** — they're brand accents, not theme tokens. Same for the white-on-coral text.
4. **Rename Request Access → Sign Up is a 1-line text change** in `SignInForm.tsx:136` plus a copy refresh in `WEBSITE.md` §4.
5. **Lint fixes are mechanical** — type the `any`s, drop unused vars, and refactor the two `useEffect`-setState cases to satisfy `react-hooks/set-state-in-effect` (use `useSyncExternalStore` for `ThemeToggle`, derive `present` from `isOpen` for `Drawer`).
6. **Footer legal links** are added to `src/app/page.tsx` only, as two inline `<Link>`s.
7. **Hide TopNav on `/auth`** — add `/auth` to `HIDDEN_ROUTES` in `TopNav.tsx:8`. This also catches `/auth/verify` and `/auth/reset-password` because they all start with `/auth`.

## Task List

### Phase 1: Quick wins (no dependencies, ship first)

- [ ] **Task 1: Fix the 6 lint errors and 5 warnings**
  - Files: `src/app/actions/project.ts:30` (cast `as any` → cast `as AssetStatus`), `src/app/actions/admin.ts:54` (drop unused `principal`), `src/app/auth/AuthClient.tsx:8` (drop unused `Link` import), `src/app/tasks/TasksClient.tsx:80-81` (drop unused `getStorefrontPlatform` / `getCatalogSize` helpers), `src/app/tasks/TasksClient.tsx:127` (type `uploadedAssets`), `src/lib/hooks/use-presigned-upload.ts:45` (drop unused `_type` param), `src/components/BentoFeatures.tsx:15` (escape the two apostrophes in "We've"), `src/components/ThemeToggle.tsx:11-13` (refactor to `useSyncExternalStore`), `src/components/ui/Drawer.tsx:70-84` (refactor `present` to derive from `isOpen`).
  - Verification: `npm run lint` returns 0 problems. `npm run build` succeeds.

- [ ] **Task 2: Rename "Request Access" → "Sign Up" on sign-in**
  - File: `src/components/auth/SignInForm.tsx:136` — change button text only.
  - Update: `specs/WEBSITE.md` §4 (`/auth` row) — note the rename.
  - Verification: open `/auth`, confirm button reads "Sign Up" and routes to signup view on click.

- [ ] **Task 3: Hide TopNav on /auth routes**
  - File: `src/components/TopNav.tsx:8` — add `'/auth'` to `HIDDEN_ROUTES`.
  - Verification: `/auth`, `/auth/verify`, `/auth/reset-password` all hide the TopNav.

- [ ] **Task 4: Add Privacy / Terms links to landing footer**
  - File: `src/app/page.tsx:24-38` — add a `<div>` with two `<Link>` tags to `/privacy` and `/terms`.
  - Update: `specs/WEBSITE.md` §4 to note the new footer links.
  - Verification: scroll to landing footer, click each link, confirm 200.

### Checkpoint: Quick wins
- [ ] `npm run lint` returns 0 problems
- [ ] `npm run build` succeeds
- [ ] All four visible changes verified manually in a browser

### Phase 2: Dark mode migration (the big one)

- [ ] **Task 5: Refine the dark mode token values in `globals.css`**
  - File: `src/app/globals.css:46-66` — retune the `.dark` block: higher contrast on `--text-primary` (`#f5f3ee`), lighter `--text-muted` / `--text-secondary`, add `--on-canvas-inverted`, add dark-mode-aware card shadow.
  - Verification: open `/` in both modes, confirm text legibility.

- [ ] **Task 6: Migrate landing page (`/`) to tokens**
  - Files: `src/app/page.tsx`, `src/components/LandingExtras.tsx`, `src/components/LandingPageClient.tsx`, `src/components/BentoFeatures.tsx`, `src/components/ProductCatalog.tsx`, `src/components/ThreeDConfigurator.tsx`, `src/components/Hero.tsx` (sanity).
  - Substitution map:
    - `#1A1A1A` → `var(--color-text-primary)`
    - `#F9F8F6` → `var(--color-canvas)`
    - `#EFEDEA` → `var(--color-canvas-secondary)`
    - `#E5E2DD` → `var(--color-border-default)`
    - `#4A4742` → `var(--color-text-secondary)`
    - `#7A7670` → `var(--color-text-muted)`
  - KEEP: `bg-[#c44320]` coral bands (brand accent), `bg-[#1A1A1A]` on Bento "Calibrated Scale" card and Hero "3D · AR Ready" pill (intentional dark surfaces).
  - Verification: flip toggle on `/` — every text/border/background tracks the theme. Coral + dark-by-design blocks stay constant.

- [ ] **Task 7: Migrate auth pages to tokens**
  - Files: `src/app/auth/AuthClient.tsx` (left dark panel stays dark, right form panel migrates), `src/components/auth/SignInForm.tsx`, `src/components/auth/SignUpForm.tsx`, `src/components/auth/ForgotPasswordForm.tsx`, `src/components/auth/ResetPasswordForm.tsx`, `src/app/auth/verify/page.tsx`, `src/app/auth/reset-password/page.tsx`, `src/app/onboarding/OnboardingClient.tsx`.
  - Same substitution map.
  - Verification: flip toggle on `/auth` — form panel switches between warm-cream and warm-charcoal. Left "Stereoscopic realism" panel stays dark in both.

- [ ] **Task 8: Migrate dashboard + tasks + analytics to tokens**
  - Files: `src/app/dashboard/page.tsx`, `src/app/analytics/page.tsx`, `src/app/tasks/TasksClient.tsx`, `src/app/tasks/page.tsx`, `src/app/dashboard/DashboardError.tsx`.
  - `DashboardLayout` and `Card` already use tokens, so page-level conversions are enough.
  - Same substitution map. Convert `bg-white` → `bg-[var(--color-surface)]` (except on the Hero's `mesh-bg` panel which is intentionally light).
  - Verification: open `/dashboard`, `/tasks`, `/analytics` in both modes.

- [ ] **Task 9: Migrate admin pages to tokens**
  - Files: `src/app/admin/users/AdminUsersClient.tsx`, `src/app/admin/tasks/AdminTasksClient.tsx`, `src/app/admin/dashboard/page.tsx`, `src/app/admin/analytics/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/tasks/page.tsx`.
  - Same substitution map.
  - Verification: open `/admin/dashboard`, `/admin/users`, `/admin/tasks`, `/admin/analytics` in both modes.

- [ ] **Task 10: Migrate legal pages (privacy, terms) to tokens**
  - Files: `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`. Simple swap.
  - Add `dark:bg-amber-900/20 dark:border-amber-800` to the amber placeholder notice banner.
  - Verification: open `/privacy` and `/terms` in both modes.

### Checkpoint: Dark mode complete
- [ ] `npm run lint` still 0 problems
- [ ] `npm run build` still succeeds
- [ ] All routes flipped via the toggle, every text/border/background tracks correctly
- [ ] Grep `src/**/*.tsx` for `#1A1A1A`, `#F9F8F6`, `#EFEDEA`, `#E5E2DD`, `#4A4742`, `#7A7670` returns 0 matches outside the keep-list

### Phase 3: Spec update

- [ ] **Task 11: Update `design.md` with the dark mode system**
  - Append "2.5 Dark Mode Tokens" section documenting the token contract, the role of `globals.css` `:root` vs `.dark`, the keep-list, and the substitution map.

- [ ] **Task 12: Update `specs/WEBSITE.md`**
  - §4 route map — note the "Request Access" → "Sign Up" rename and the new footer links.
  - §12 design system — reference the new `design.md` §2.5 dark mode section.

### Checkpoint: Final
- [ ] All acceptance criteria met
- [ ] `npm run lint` clean
- [ ] `npm run build` clean
- [ ] Specs accurate

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Token swap misses a class, leaving a light-mode-only hard-coded color | Med | After Task 10, grep `src/` for the 6 hard-coded hex strings and confirm only the keep-list matches. |
| `react-hooks/set-state-in-effect` lint fix for `ThemeToggle` breaks hydration | Med | Use `useSyncExternalStore` (React 18+, available in Next 16 / React 19) — exactly what the rule recommends. The `suppressHydrationWarning` on `<body>` means the flash is already acceptable. |
| Drawer refactor changes the mount/unmount animation timing | Low | Read the current `useEffect` carefully — `setPresent(true)` is intentional (lets the close animation finish before unmounting via the 300ms timeout). The lint fix derives `present` from `isOpen` directly when `isOpen === true` and only uses local state to delay the `false → unmount` transition via `animatingOut`. |
| Renaming `Request Access` → `Sign Up` affects analytics or copy elsewhere | Low | Grep the repo first to confirm the only occurrence is in `SignInForm.tsx:136`. |
| Footer legal links create a visual mismatch with the current mono-caps styling | Low | Match the existing footer copy style (text-[10px] font-mono tracking-widest uppercase, muted color, hover-primary). |

## Open Questions

- None blocking. The three clarifications (full token migration, keep placeholders, add `/auth` to `HIDDEN_ROUTES`) were answered with the recommended options.

## Files likely touched (consolidated)

```
src/app/globals.css                                  [Task 5]
src/app/page.tsx                                     [Task 4, 6]
src/app/auth/AuthClient.tsx                          [Task 1, 7]
src/app/auth/verify/page.tsx                         [Task 7]
src/app/auth/reset-password/page.tsx                 [Task 7]
src/app/onboarding/OnboardingClient.tsx              [Task 7]
src/app/dashboard/page.tsx                           [Task 8]
src/app/dashboard/DashboardError.tsx                 [Task 8]
src/app/analytics/page.tsx                           [Task 8]
src/app/tasks/page.tsx                               [Task 8]
src/app/tasks/TasksClient.tsx                        [Task 1, 8]
src/app/privacy/page.tsx                             [Task 10]
src/app/terms/page.tsx                               [Task 10]
src/app/actions/admin.ts                             [Task 1]
src/app/actions/project.ts                           [Task 1]
src/components/TopNav.tsx                            [Task 3]
src/components/ThemeToggle.tsx                       [Task 1]
src/components/ThreeDConfigurator.tsx                [Task 6]
src/components/ProductCatalog.tsx                    [Task 6]
src/components/BentoFeatures.tsx                     [Task 1, 6]
src/components/Hero.tsx                              [Task 6, sanity]
src/components/LandingExtras.tsx                     [Task 6]
src/components/LandingPageClient.tsx                 [Task 6]
src/components/auth/SignInForm.tsx                   [Task 2, 7]
src/components/auth/SignUpForm.tsx                   [Task 7]
src/components/auth/ForgotPasswordForm.tsx           [Task 7]
src/components/auth/ResetPasswordForm.tsx            [Task 7]
src/components/ui/Drawer.tsx                         [Task 1]
src/app/admin/users/AdminUsersClient.tsx             [Task 9]
src/app/admin/users/page.tsx                         [Task 9]
src/app/admin/tasks/AdminTasksClient.tsx             [Task 9]
src/app/admin/tasks/page.tsx                         [Task 9]
src/app/admin/dashboard/page.tsx                     [Task 9]
src/app/admin/analytics/page.tsx                     [Task 9]
src/lib/hooks/use-presigned-upload.ts                [Task 1]
design.md                                            [Task 11]
specs/WEBSITE.md                                     [Task 12]
```

**Estimated scope per task:** All 12 tasks are S (1-2 files) or M (3-5 files), except Tasks 6/7/8/9 (token migration across many files in one route group each) which are L — kept as one task each because they share the same mechanical substitution and a single "checkpoint after migration" is enough to verify each.

**Total estimated work:** 12 tasks, 3 checkpoints, all sequential. Tasks 1-4 are shippable independently; Tasks 5-10 are the dark mode effort; Tasks 11-12 close the loop with docs.
