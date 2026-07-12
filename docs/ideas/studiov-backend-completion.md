# STUDIO.V Backend Completion

## Problem Statement

How might we transform STUDIO.V from a fast frontend with a functional-but-incomplete backend into a fully production-ready SaaS where real brands can register, upload products, receive manually-created 3D models, embed them via iframe, and see real analytics — without over-engineering the manual 3D pipeline?

## Recommended Direction

**Vertical Slice + Iframe Embed.** Close the ~23 specific gaps found in the initial audit in priority order: fix the core workflow loop first (TasksClient surgery + schema), complete user registration (email verification, password reset, onboarding), build the iframe embed viewer, replace mock analytics with real DB queries, then harden for production. No npm package, no CDN, no web component — just iframe embeds that work everywhere.

## Key Assumptions to Validate

- [ ] **iframe embeds suffice for launch** — brands accept pasting an iframe snippet (like YouTube/Google Maps). Test: show the embed code to 3 potential customers.
- [ ] **Manual 3D pipeline is sustainable** for first 10-50 customers. Test: calculate admin-hours per product; identify the volume where it breaks.
- [ ] **Real analytics with existing CSS chart UI** looks credible. Test: render the chart with real numbers and check readability.
- [ ] **Resend free tier** (3,000 emails/month) covers initial volume. Test: estimate verification + reset emails per 100 signups.

## Implementation Plan

### Phase 1: Schema & Dependencies (Foundation) ✅ Done

**`prisma/schema.prisma`**:
- [x] User: add `emailVerified DateTime?`, `onboarded Boolean @default(false)`, `analyticsEvents AnalyticsEvent[]`
- [x] Project: add `sku String?`, `instructions String?`, `dimensions Json?` (`{ length, width, height, unit }`), `assignedTo String? @db.ObjectId`, `@@index([brandId])`
- [x] Token model: `{ id, identifier, token @unique, type, expires, createdAt }` for email verification and password reset tokens
- [x] AnalyticsEvent: add `@@index([projectId])`, `@@index([brandId])`, relation to User (`brand User @relation`)
- [x] Remove `ASSIGNED` from `ProjectStatus` enum (dead code — admin jumps PENDING → IN_PROGRESS)

**`src/lib/stripe.ts`**:
- [x] Throw at module load if `STRIPE_SECRET_KEY` is missing (replace `"dummy_key"` fallback).

**`package.json`**:
- [x] Add `resend` dependency.

**`.env.example`**:
- [x] Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

```
npx prisma generate && npx prisma db push
```

---

### Phase 2: User Registration Completion ✅ Done

**Email Verification:**
1. [x] `SignUpForm.tsx` — Remove `companyName` field (moved to onboarding). Signup is now just email + password. After `registerUser`, show "Check your email" screen instead of immediate `signIn`.
2. [x] `src/app/actions/auth.ts` — `registerUser` no longer reads `companyName`. Generates token (`crypto.randomUUID`), stores in `Token` table (`type: "email_verification"`, `expires: +24h`), sends verification email via Resend.
3. [x] `src/lib/resend.ts` — `new Resend(process.env.RESEND_API_KEY)`
4. [x] `src/lib/emails.ts` — `sendVerificationEmail(email, token)` and `sendPasswordResetEmail(email, token)` with HTML templates sent from `onboarding@resend.dev`
5. [x] `src/app/auth/verify/page.tsx` — Reads `token` from search params, calls `verifyEmail` server action.
6. [x] `src/app/actions/auth.ts` — `verifyEmail(token)`: validates token, sets `user.emailVerified = now`, deletes token.
7. [x] `src/auth.ts` — In `authorize()`, reject if `user.emailVerified` is null.

**Password Reset:**
1. [x] `ForgotPasswordForm.tsx` — Replace `setSubmitted(true)` stub with `requestPasswordReset(email)` server action.
2. [x] `src/app/actions/auth.ts` — `requestPasswordReset(email)`: finds user, generates token, stores in `Token` table (`type: "password_reset"`, `expires: +1h`), sends reset email.
3. [x] `src/app/auth/reset-password/page.tsx` — Shows new-password form, calls `resetPassword(token, newPassword)`.
4. [x] `src/app/actions/auth.ts` — `resetPassword(token, newPassword)`: validates token, hashes via bcrypt, updates user, deletes token.

**Onboarding:**
1. [x] `OnboardingWizard.tsx` — Step 1: add company-name input. On finish: calls `completeOnboarding(name)` which saves to `user.name` and sets `user.onboarded = true`, navigates to `/tasks` for first product upload.
2. [x] `auth/page.tsx` — Show wizard after sign-in (not signup), gated by `onboarded` flag.

**Cleanup:**
1. [x] `SignInForm.tsx` — Remove decorative Google/Apple buttons (lines 114-126).
2. [x] `proxy.ts` — Change `/tasks` from `["ADMIN"]` to `["BRAND", "ADMIN"]`. Add `/embed/:path*` to public paths. Add `/auth/verify` and `/auth/reset-password` to public paths.

---

### Phase 3: Core Workflow (TasksClient Surgery) ✅ Done

**`src/app/actions/project.ts`:**
- [x] `createProject` — Accept `sku`, `instructions`, `dimensions`. Pass to `prisma.project.create`.
- [x] `getUserProjects` — Select new fields.
- [x] `updateProjectStatus` — Add state-machine guard: brand can only transition REVIEW → PUBLISHED.

**`src/app/actions/admin.ts`:**
- [x] `claimProject` — Set `assignedTo: session.user.id`.
- [x] `submitForReview` — Validate project is in IN_PROGRESS before allowing submission.

**`src/app/tasks/TasksClient.tsx` (biggest surgery — 780 lines):**
- [x] `job.sku` → `project.sku`
- [x] `job.thumbnail` → `project.referenceUrls[0]`
- [x] `job.assignee` → Show admin name or "Unassigned"
- [x] `job.date` → `project.createdAt`
- [x] `job.additionalInstructions` / `job.specificInstructions` → `project.instructions`
- [x] Dimensions (hardcoded 85/105/90) → `project.dimensions` or remove
- [x] Reference Images grid (4 fixed slots) → dynamic `project.referenceUrls` map
- [x] 3D Reviewer → `project.assetUrls.glb` instead of `PRODUCTS[0]`
- [x] Published viewer → `project.assetUrls.glb` instead of `PRODUCTS[0]`
- [x] "New Task" form → Add `sku`, `instructions`, `dimensions` inputs

---

### Phase 4: Iframe Embed ✅ Done

**`src/app/embed/[projectId]/page.tsx`** — Public server component:
- [x] Fetches project by `projectId` (select `assetUrls`, `sdkConfig`, `status`)
- [x] Returns 404 if not found, 403 if not PUBLISHED
- [x] Renders minimal layout with model-viewer, STUDIO.V watermark, theme from config
- [x] Loads model-viewer from Google CDN
- [x] Passes data to client component for analytics tracking

**`src/components/EmbedViewer.tsx`** — Client component:
- [x] Renders `<model-viewer>` with `assetUrls.glb`
- [x] Generates `sessionId` on mount
- [x] Fires `POST /api/sdk/v1/events { eventType: "VIEW", sessionId, projectId }` on load
- [x] Attaches model-viewer listener: camera interaction → `INTERACTION` event
- [x] Attaches model-viewer listener: ar-status change → `AR_LAUNCH` event

**`src/lib/utils.ts`** — Simplify `generateEmbedCode`:
- [x] Remove `webComponent` variant (iframe-only)
- [x] iframe URL: `${APP_URL}/embed/${projectId}`
- [x] Accept `projectId` parameter

**`src/app/integrations/page.tsx`** — [x] Fetch `{ id, name }` pairs (not just names).

**`src/app/integrations/IntegrationsClient.tsx`** — Major simplification:
- [x] Remove React/Vanilla/Shopify tabs (all non-existent)
- [x] Single iframe embed code display
- [x] Product dropdown passes `projectId` to `generateEmbedCode`
- [x] Remove `@studiov/react`, `cdn.studiov.io`, `<studiov-viewer>` references
- [x] API key: keep as cosmetic or remove
- [x] "Regenerate" button: remove

---

### Phase 5: Real Analytics ✅ Done

**`src/app/analytics/page.tsx`** — Convert from mocked client component to real server data:
- [x] Metrics: real `AnalyticsEvent` counts (total views, interaction rate, total AR launches). Period-over-period change computed from two date ranges.
- [x] Bar chart: aggregate events by week/month for last 12 periods, grouped by eventType. Compute max for Y-axis dynamically.
- [x] Leaderboard: `prisma.analyticsEvent.groupBy` by `projectId`, join with `Project.name`, order by view count.
- [x] Date range toggle (7D/30D/ALL): actually filter queries by date range.
- [x] Keep existing CSS bar chart UI (no chart library).

---

### Phase 6: Production Hardening (Deferred)

1. Rate limiting on SDK endpoints (per-IP, per-projectId)
2. Zod input validation on all server actions
3. Stripe webhook: add `invoice.payment_failed`, handle `subscription.updated` upgrades
4. Type-safe session role (`types/next-auth.d.ts` — module augmentation)
5. Billing page: replace fake invoices with "No invoices yet" empty state
6. UploadThing `onUploadComplete`: optionally persist to DB to prevent orphaned files

## Scope

### In (Phases 1-4)
- Schema + env changes
- Email verification + password reset + onboarding persistence
- TasksClient surgery (the biggest functional gap)
- Iframe embed viewer + simplified Integrations page
- Real analytics with existing chart UI

### Deferred (Phase 6)
- Rate limiting, input validation, Stripe webhook completeness, type safety, billing cleanup

## Not Doing (and Why)

- **`@studiov/react` npm package** — iframe is universal. Build when customers ask for a React component.
- **`cdn.studiov.io` CDN** — model-viewer loads from Google CDN. No need for our own.
- **`<studiov-viewer>` web component** — iframe achieves the same goal with zero install.
- **`embed.studiov.io` subdomain** — use same domain (`/embed/[projectId]`). CNAME can be added later.
- **Google/Apple OAuth** — credentials sign-in works. OAuth is a nice-to-have, not a launch blocker.
- **Automated 3D generation (ML)** — manual pipeline is permanent per user decision.
- **Stripe checkout** — not ready, manual billing for first customers. Code exists, needs env vars.
- **Real Stripe invoices** — no Stripe account yet. Show "No invoices" empty state.
- **Chart library (Recharts/Visx)** — CSS bar chart works. Upgrade if charts need interactivity.
- **`ProjectStatus.ASSIGNED`** — dead code. Removing simplifies the state machine.

## Open Questions (Resolved)

1. **Onboarding company name** → Moved from SignUpForm to OnboardingWizard step 1 (cleaner signup).
2. **Embed analytics** → Embed viewer fires its own events (no postMessage).
3. **Email "from" address** → Resend default `onboarding@resend.dev` for now.
4. **Seed data** → OK to wipe and re-seed after schema changes.
