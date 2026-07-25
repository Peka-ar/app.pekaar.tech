# Public Launch Readiness — Task List

## Phase 1: Quick wins

- [ ] **Task 1: Fix the 6 lint errors and 5 warnings**
  - `src/app/actions/project.ts:30` — replace `as any` with `as AssetStatus`
  - `src/app/actions/admin.ts:54` — drop unused `principal`
  - `src/app/auth/AuthClient.tsx:8` — drop unused `Link` import
  - `src/app/tasks/TasksClient.tsx:80-81` — drop unused `getStorefrontPlatform` / `getCatalogSize` helpers
  - `src/app/tasks/TasksClient.tsx:127` — type `uploadedAssets` (no `any[]`)
  - `src/lib/hooks/use-presigned-upload.ts:45` — drop unused `_type` param
  - `src/components/BentoFeatures.tsx:15` — escape the two apostrophes in "We've"
  - `src/components/ThemeToggle.tsx:11-13` — refactor to `useSyncExternalStore`
  - `src/components/ui/Drawer.tsx:70-84` — derive `present` from `isOpen`, move close-delay to a single `useEffect` that doesn't `setState` synchronously
  - **Verify:** `npm run lint` → 0 problems · `npm run build` → success

- [ ] **Task 2: Rename "Request Access" → "Sign Up" on sign-in**
  - `src/components/auth/SignInForm.tsx:136` — change button text
  - `specs/WEBSITE.md` §4 — note the rename
  - **Verify:** open `/auth`, button reads "Sign Up" and routes to signup

- [ ] **Task 3: Hide TopNav on /auth routes**
  - `src/components/TopNav.tsx:8` — add `'/auth'` to `HIDDEN_ROUTES`
  - **Verify:** `/auth`, `/auth/verify`, `/auth/reset-password` all hide the TopNav

- [ ] **Task 4: Add Privacy / Terms links to landing footer**
  - `src/app/page.tsx:24-38` — add two `<Link>` tags
  - `specs/WEBSITE.md` §4 — note the new footer links
  - **Verify:** scroll to footer, click each link, confirm 200

### Checkpoint: Quick wins
- [ ] `npm run lint` → 0 problems
- [ ] `npm run build` → success
- [ ] Browser smoke test: rename works, header hidden, footer links work

## Phase 2: Dark mode migration

- [ ] **Task 5: Refine dark mode tokens in `globals.css`**
  - `src/app/globals.css:46-66` — retune `.dark` block: contrast bump on `--text-primary` (`#f5f3ee`), lighter `--text-muted` / `--text-secondary`, add `--on-canvas-inverted`, dark-mode card shadow
  - **Verify:** `/` legible in both modes

- [ ] **Task 6: Migrate landing page (`/`) to tokens**
  - `src/app/page.tsx`
  - `src/components/LandingExtras.tsx`
  - `src/components/LandingPageClient.tsx`
  - `src/components/BentoFeatures.tsx`
  - `src/components/ProductCatalog.tsx`
  - `src/components/ThreeDConfigurator.tsx`
  - `src/components/Hero.tsx` (sanity)
  - Substitution: `#1A1A1A` → `var(--color-text-primary)`, `#F9F8F6` → `var(--color-canvas)`, `#EFEDEA` → `var(--color-canvas-secondary)`, `#E5E2DD` → `var(--color-border-default)`, `#4A4742` → `var(--color-text-secondary)`, `#7A7670` → `var(--color-text-muted)`
  - KEEP: coral `bg-[#c44320]` bands, dark-by-design `bg-[#1A1A1A]` blocks (Bento "Calibrated Scale" card, Hero "3D · AR Ready" pill)
  - **Verify:** flip toggle on `/` — every text/border/background tracks; coral + dark blocks constant

- [ ] **Task 7: Migrate auth pages to tokens**
  - `src/app/auth/AuthClient.tsx` (right form panel only; left dark panel stays)
  - `src/components/auth/SignInForm.tsx`
  - `src/components/auth/SignUpForm.tsx`
  - `src/components/auth/ForgotPasswordForm.tsx`
  - `src/components/auth/ResetPasswordForm.tsx`
  - `src/app/auth/verify/page.tsx`
  - `src/app/auth/reset-password/page.tsx`
  - `src/app/onboarding/OnboardingClient.tsx` (right form panel only; left aside stays dark)
  - Same substitution map
  - **Verify:** flip toggle on `/auth` — form panel switches between warm-cream and warm-charcoal; left dark panel constant

- [ ] **Task 8: Migrate dashboard + tasks + analytics to tokens**
  - `src/app/dashboard/page.tsx`
  - `src/app/analytics/page.tsx`
  - `src/app/tasks/TasksClient.tsx`
  - `src/app/tasks/page.tsx`
  - `src/app/dashboard/DashboardError.tsx`
  - Same substitution map. Convert `bg-white` → `bg-[var(--color-surface)]` (except on Hero `mesh-bg` panels)
  - **Verify:** open `/dashboard`, `/tasks`, `/analytics` in both modes

- [ ] **Task 9: Migrate admin pages to tokens**
  - `src/app/admin/users/AdminUsersClient.tsx`
  - `src/app/admin/tasks/AdminTasksClient.tsx`
  - `src/app/admin/dashboard/page.tsx`
  - `src/app/admin/analytics/page.tsx`
  - `src/app/admin/users/page.tsx`
  - `src/app/admin/tasks/page.tsx`
  - Same substitution map
  - **Verify:** open `/admin/dashboard`, `/admin/users`, `/admin/tasks`, `/admin/analytics` in both modes

- [ ] **Task 10: Migrate legal pages (privacy, terms) to tokens**
  - `src/app/privacy/page.tsx`
  - `src/app/terms/page.tsx`
  - Add `dark:bg-amber-900/20 dark:border-amber-800` to the amber placeholder notice banner
  - **Verify:** open `/privacy` and `/terms` in both modes

### Checkpoint: Dark mode complete
- [ ] `npm run lint` → 0 problems
- [ ] `npm run build` → success
- [ ] All routes flip correctly
- [ ] Grep `src/**/*.tsx` for the 6 hard-coded hex strings returns 0 matches outside the keep-list

## Phase 3: Spec update

- [ ] **Task 11: Update `design.md` with dark mode system**
  - Append "2.5 Dark Mode Tokens" — token contract, `:root` vs `.dark` roles, keep-list, substitution map

- [ ] **Task 12: Update `specs/WEBSITE.md`**
  - §4 — note the rename and the new footer links
  - §12 — reference `design.md` §2.5

### Checkpoint: Final
- [ ] All acceptance criteria met
- [ ] `npm run lint` clean
- [ ] `npm run build` clean
- [ ] Specs accurate
