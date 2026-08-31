# Auth Stabilization Plan

> **HISTORICAL — task plan written for the NextAuth/Prisma era and fully implemented before the Appwrite migration (Phases 0–2 of `tasks/appwrite-migration.md`).** References to Prisma, `@/auth`, JWT claims, and UploadThing below describe the *pre-migration* design, not the current codebase. The current data layer is Appwrite TablesDB (`src/lib/db.ts`) and auth is `requirePrincipal()` (`src/lib/auth-guards.ts`). Keep this file as a design-rationale record; do not treat it as current-state reference.

## Overview

Permanently fix every authentication failure in the STUDIO.V Next.js app: the "User account not found" error on Queue Generation, the onboarding `useSession` crash, slow initial page loads, and the deeper stale-JWT-identity vulnerability. Each task is a complete vertical slice that can be implemented, tested, and verified in one session.

## Architecture Decisions

- **Canonical DB principal resolver** — Every protected server action resolves the authenticated user from the database by session-derived ID, replacing ad hoc JWT-claim authorizations with a single `requirePrincipal()` function. This eliminates stale-role and stale-identity bugs permanently.
- **Remove `useSession()` from the client** — Onboarding updates the JWT server-side via `unstable_update` from `@/auth`, eliminating the need for `<SessionProvider>`. No client component calls `useSession()`.
- **Email-based fallback for user identity** — When `session.user.id` doesn't match a database record (the current bug), fall back to looking up the user by `session.user.email` to recover gracefully. This makes the system robust against JWT ID mismatches without requiring users to log out.
- **Atomic conditional writes** — Admin claim/submit operations use Prisma `updateMany` with all state preconditions in the `where` clause, eliminating TOCTOU races.
- **Public endpoints return uniform 404** — Both missing and non-public projects return the same generic 404 to prevent existence enumeration.

## Task List

### Phase 1: Immediate Blocker Fixes

#### Task 1: Fix onboarding crash — replace `useSession().update()` with server-side update

**Description:** `OnboardingClient.tsx` calls `useSession()` which crashes because no `<SessionProvider>` exists. Replace the client-side `useSession().update()` call with a server-side `unstable_update()` call inside the `completeOnboarding` server action.

**Acceptance criteria:**
- [ ] Onboarding page loads without "useSession must be wrapped in a SessionProvider" error
- [ ] Completing onboarding updates the JWT's `onboarded` claim server-side
- [ ] User is redirected to `/dashboard` after onboarding completes

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Sign up → verify OTP → complete onboarding → land on dashboard works

**Dependencies:** None

**Files touched:**
- `src/app/onboarding/OnboardingClient.tsx` — replace `useSession()` with direct server action call + redirect
- `src/app/actions/auth.ts` — add server-side `unstable_update()` call after `completeOnboarding`

**Estimated scope:** Small (2 files)

---

#### Task 2: Fix Queue Generation — email-based canonical user lookup in `createProject`

**Description:** `createProject` looks up the user by `session.user.id` which is broken (NextAuth v5 beta JWT ID mismatch). Fall back to `session.user.email` when the ID lookup returns null. This immediately fixes the "User account not found" error without requiring users to log out.

**Acceptance criteria:**
- [ ] `createProject` successfully finds the user by email when ID lookup fails
- [ ] Project is created with the correct `brandId` from the database-found user
- [ ] "User account not found" error is eliminated

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Upload images → Queue Generation → project created successfully

**Dependencies:** None (independent fix)

**Files touched:**
- `src/app/actions/project.ts` — add email fallback in user lookup

**Estimated scope:** Small (1 file)

---

#### Task 3: Apply email fallback to all remaining protected actions

**Description:** Apply the same `session.user.email` fallback pattern from Task 2 to all server actions and route handlers that use `session.user.id`: `getUserProjects`, `updateProjectStatus`, admin actions, `completeOnboarding`, notifications, integrations, upload route, analytics, and dashboard.

**Acceptance criteria:**
- [ ] All server actions resolve the canonical user ID from the database
- [ ] All route handlers resolve the canonical user ID from the database
- [ ] No protected action fails with "user not found" due to JWT ID mismatch

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Dashboard loads with correct user data
- [ ] Notifications page loads
- [ ] Integrations page loads
- [ ] Image upload works

**Dependencies:** Task 2

**Files touched:**
- `src/app/actions/project.ts` — already done in Task 2
- `src/app/actions/admin.ts`
- `src/app/actions/auth.ts`
- `src/app/dashboard/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/notifications/page.tsx`
- `src/app/integrations/page.tsx`
- `src/app/api/upload/image/route.ts`
- `src/lib/notifications.ts`
- `src/lib/auth-guards.ts`

**Estimated scope:** Medium (4-5 files)

---

### Checkpoint: Blockers cleared
- [ ] Sign up → verify OTP → complete onboarding → dashboard works
- [ ] Upload images → Queue Generation → project created
- [ ] All existing pages load without auth errors

---

### Phase 2: Canonical Auth Infrastructure

#### Task 4: Create `requirePrincipal()` canonical principal resolver

**Description:** Create a centralized `requirePrincipal()` function in `src/lib/auth-guards.ts` that: calls `auth()`, validates `session.user`, loads the user from DB by ID (with email fallback), returns a typed `Principal` object with `{ userId, email, role, onboarded, companyName }`, and throws typed errors. This is the single source of truth for all authorization decisions.

**Acceptance criteria:**
- [ ] `requirePrincipal()` returns typed `Principal` with DB-backed fields
- [ ] `requirePrincipal()` throws `UNAUTHENTICATED` error when no session
- [ ] `requirePrincipal()` throws `FORBIDDEN` error when user not found in DB
- [ ] `requirePrincipal({ roles: ["BRAND"] })` checks role from DB
- [ ] `requirePrincipal({ requireOnboarded: true })` checks onboarding from DB

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Unit testable: mock auth, mock Prisma, verify behavior
- [ ] Existing tests pass (if any)

**Dependencies:** Task 3 (email fallback pattern established)

**Files touched:**
- `src/lib/auth-guards.ts` — rewrite with `requirePrincipal()`

**Estimated scope:** Small (1 file)

---

#### Task 5: Replace all `session.user` usage with `requirePrincipal()`

**Description:** Replace every ad hoc `auth()` + `session.user.id/role` pattern across the codebase with the canonical `requirePrincipal()` from Task 4. This includes server actions, route handlers, page components, and the middleware proxy.

**Acceptance criteria:**
- [ ] Every file that called `auth() && session.user` now uses `requirePrincipal()`
- [ ] No file directly reads `session.user.role` or `session.user.id` for authorization
- [ ] Role checks use `principal.role` (from DB, not JWT)
- [ ] Onboarding checks use `principal.onboarded` (from DB, not JWT)

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] All pages and actions work end-to-end

**Dependencies:** Task 4

**Files touched:**
- `src/app/actions/project.ts`
- `src/app/actions/admin.ts`
- `src/app/actions/auth.ts`
- `src/app/dashboard/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/notifications/page.tsx`
- `src/app/integrations/page.tsx`
- `src/app/tasks/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/api/upload/image/route.ts`
- `src/lib/notifications.ts`
- `src/proxy.ts` — middleware role/onboarding checks

**Estimated scope:** Medium (5-8 files)

---

### Checkpoint: Auth infrastructure
- [ ] All protected endpoints use `requirePrincipal()`
- [ ] `tsc --noEmit` and `eslint` pass
- [ ] `npm run build` succeeds

---

### Phase 3: Admin & Authorization Hardening

#### Task 6: Fix admin project claim/submit — atomic conditional writes

**Description:** Replace the non-atomic check-then-update pattern in `claimProject` and `submitForReview` with Prisma `updateMany` that includes all authorization preconditions in the `where` clause. `claimProject` requires `status: "PENDING"` and `assignedTo: null`. `submitForReview` requires `status: "IN_PROGRESS"` and `assignedTo: principal.userId`.

**Acceptance criteria:**
- [ ] `claimProject` atomically claims only PENDING unassigned projects
- [ ] `submitForReview` atomically submits only IN_PROGRESS projects assigned to the caller
- [ ] Race conditions between concurrent admins are eliminated
- [ ] Error returned when precondition fails (status changed or already claimed)

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Manual: claim same project from two browser tabs — only one succeeds

**Dependencies:** Task 5 (uses `requirePrincipal()`)

**Files touched:**
- `src/app/actions/admin.ts` — rewrite claim and submit

**Estimated scope:** Small (1 file)

---

#### Task 7: Add BRAND role check to `createProject` and fix quota enforcement

**Description:** Add `role === "BRAND"` check to `createProject` via `requirePrincipal({ roles: ["BRAND"] })`. Move the quota check into an atomic Prisma transaction or use a single `findUnique` + conditional `create` within a transaction.

**Acceptance criteria:**
- [ ] `createProject` rejects ADMIN role with FORBIDDEN error
- [ ] Quota enforcement is atomic (no race to exceed limit)
- [ ] Error message doesn't leak whether user exists or quota exceeded

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] ADMIN user calling `createProject` directly receives Forbidden error

**Dependencies:** Task 5 (uses `requirePrincipal()`)

**Files touched:**
- `src/app/actions/project.ts`

**Estimated scope:** Small (1 file)

---

#### Task 8: Fix public SDK endpoints — require PUBLISHED status

**Description:** Update `GET /api/sdk/v1/config/[projectId]` and `GET /embed/[projectId]` to query by both `id` and `status: "PUBLISHED"`. Return a single generic 404 for both missing and non-public projects. For the SDK events endpoint, check `status: "PUBLISHED"` before accepting events.

**Acceptance criteria:**
- [ ] SDK config returns 404 for unpublished projects (instead of 403 with "not published")
- [ ] Embed page shows 404 for unpublished projects (instead of "not published yet" page)
- [ ] SDK events endpoint rejects events for unpublished projects with 404
- [ ] Published projects work exactly as before

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Manual: visit `/embed/{unpublished-project-id}` → 404

**Dependencies:** None

**Files touched:**
- `src/app/api/sdk/v1/config/[projectId]/route.ts`
- `src/app/api/sdk/v1/events/route.ts`
- `src/app/embed/[projectId]/page.tsx`

**Estimated scope:** Small (3 files)

---

#### Task 9: Fix notification API — add select, return 401 for unauthenticated

**Description:** Add explicit Prisma `select` to `getRecentProjectActivity` in `src/lib/notifications.ts` to return only `{ id, name, status, createdAt }`. Add authentication enforcement so unauthenticated requests return HTTP 401 instead of 200 with empty data.

**Acceptance criteria:**
- [ ] Notification API returns only `id`, `name`, `status`, `createdAt` fields
- [ ] Unauthenticated requests to `/api/notifications` return 401
- [ ] Authenticated requests work exactly as before

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Manual: check notification API response shape

**Dependencies:** None

**Files touched:**
- `src/lib/notifications.ts`
- `src/app/api/notifications/route.ts`

**Estimated scope:** Small (2 files)

---

### Checkpoint: Authorization
- [ ] Admin can claim/submit only projects matching workflow state
- [ ] BRAND role enforced for project creation
- [ ] SDK endpoints return 404 for non-public projects
- [ ] Notification API returns minimal fields

---

### Phase 4: Performance & Error Cleanup

#### Task 10: Eliminate redundant auth calls in dashboard

**Description:** `DashboardContent` calls `auth()` and then calls `getUserProjects()` which calls `auth()` again. Pass the session or principal from the parent to eliminate the duplicate. Also remove the empty-project analytics queries when the user has no projects.

**Acceptance criteria:**
- [ ] Dashboard data path calls `auth()` exactly once
- [ ] Analytics queries only execute when user has projects
- [ ] Page generation is faster

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Manual: dashboard loads without errors

**Dependencies:** Task 5 (uses `requirePrincipal()`)

**Files touched:**
- `src/app/dashboard/page.tsx`

**Estimated scope:** Small (1 file)

---

#### Task 11: Fix public auth action enumeration

**Description:** Normalize responses from `preflightLogin` and `resendVerificationOtp` to not reveal whether an email is registered, verified, or neither. Return the same response for all cases (except successful credential verification). Add rate limiting notes.

**Acceptance criteria:**
- [ ] `preflightLogin` returns same response for unregistered and unverified accounts
- [ ] `resendVerificationOtp` returns same response for unregistered and already-verified
- [ ] Error messages don't reveal account state

**Verification:**
- [ ] `tsc --noEmit` passes

**Dependencies:** None

**Files touched:**
- `src/app/actions/auth.ts` — normalize `preflightLogin` and `resendVerificationOtp`

**Estimated scope:** Small (1 file)

---

#### Task 12: Wrap UploadThing provider errors

**Description:** The upload route handler returns the UploadThing provider error message directly. Wrap it in a generic "Upload failed. Please try again." message. Log the detailed error server-side.

**Acceptance criteria:**
- [ ] Upload error responses don't contain provider implementation details
- [ ] Detailed error is logged server-side

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Manual: trigger upload error, check response is generic

**Dependencies:** Task 5 (uses `requirePrincipal()`)

**Files touched:**
- `src/app/api/upload/image/route.ts`

**Estimated scope:** XS (1 file)

---

### Checkpoint: Complete
- [ ] Sign up → dashboard → Queue Generation works end-to-end
- [ ] All authorization uses canonical DB-backed principal
- [ ] Admin actions are atomic and assignment-aware
- [ ] Public endpoints don't leak project/account existence
- [ ] Error messages don't expose internals
- [ ] `npm run build` succeeds

---

## Dependency Graph

```
Task 1 (onboarding useSession) ─┐
                                 ├── Checkpoint 1 (blockers cleared)
Task 2 (email fallback) ────────┘
        │
        └── Task 3 (apply email fallback everywhere)
                │
                └── Task 4 (requirePrincipal function) ──┐
                        │                                │
                        ├── Task 5 (replace all usage) ──┤
                        │        │                       │
                        │        ├── Task 6 (admin atomic)│
                        │        ├── Task 7 (quota/role) ─┤
                        │        ├── Task 10 (perf) ──────┤
                        │        └── Task 12 (error wrap)─┘
                        │
Task 8 (SDK public) ────┼────────────────────────────────
Task 9 (notifications) ─┼────────────────────────────────
Task 11 (enumeration) ──┘
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `unstable_update()` API changes in next-auth v5 beta | Onboarding breaks | Pin version; if removed, add SessionProvider as fallback (still avoids useSession) |
| Email fallback slower than ID lookup for `createProject` | Low (<5ms) | Only used when ID lookup fails; Prisma connection pooling absorbs cost |
| Canonical principal adds DB query to every action | Medium | Minimal `select` (5 columns); Prisma query is <10ms with connection pool |
| `token.sub` issue reappears after JWT refresh | Low | Canonical principal loads fresh DB state every time — JWT content irrelevant for auth decisions |
| Multiple files changed in Task 5 | Merge risk | Implement one file at a time, verify `tsc` after each |
