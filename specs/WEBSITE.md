# STUDIO.V — Website Reference

> **Purpose:** Single source of truth for the entire STUDIO.V web app. Read this before touching any route, action, model, or integration. For deep dives on the three most complex areas, see the linked specs at the bottom.

---

## 1. What is STUDIO.V

STUDIO.V is a premium micro-SaaS that converts standard product photography into interactive 3D/AR assets for D2C brands. A **Brand** uploads reference photos and dimensions; an **Admin** (production team) produces a GLB + optional USDZ; the Brand approves; the published model is embeddable as an iframe in any storefront.

**Two roles:**
- **`BRAND`** (default on signup) — creates projects, uploads reference images, reviews the model's quality, requests revisions (with a note), or approves & publishes.
- **`ADMIN`** (production + platform ops) — sees all projects, picks up queued work, uploads 3D models, submits for the brand's review, manages users, views platform KPIs.

**Project lifecycle (4 states):**

```
PENDING ───admin "Submit"───▶ COMPLETED ───brand "Approve & Publish"───▶ PUBLISHED
   ▲                            │                                              │
   │                            │ brand "Request Changes" (with note)         │
   │                            ▼                                              │
   └──────────────────── REVISIONS ◀─────── brand "Send for Revisions" ───────┘
                                   admin re-uploads + Submits
                                   back to COMPLETED
```

Status labels differ by viewer:

| Status | Admin label | Brand label |
|---|---|---|
| PENDING | Queued | Processing |
| REVISIONS | Revisions Required | Revisions |
| COMPLETED | Completed | Review |
| PUBLISHED | Published | Published |

Embeds serve only when status is PUBLISHED. When a brand sends a PUBLISHED project for revisions, the embed stops serving immediately.

Revision notes are stored in the `RevisionRequest` table (one row per request) so the full back-and-forth is preserved.

---

## 2. Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | `next.config.mjs` |
| UI | **React 19**, **Tailwind CSS v4**, **lucide-react** | PostCSS-based, tokens in `globals.css` |
| 3D | **Google `<model-viewer>` 4.1.0/4.2.0** via `next/script` | No SSR — dynamically imported |
| Auth | **NextAuth v5** (`next-auth@5.0.0-beta.31`), JWT strategy, Credentials provider | `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts` |
| DB | **Prisma 7** + `@prisma/adapter-pg` on **Supabase Postgres** | `prisma/schema.prisma`, `src/lib/prisma.ts` |
| File storage | **UploadThing v7** (`uploadthing@7.7.4`, `@uploadthing/react@7.3.3`) | appId `7r8xhgyw3k`, region `sea1`, CDN `*.ufs.sh` |
| Backup storage | **Google Drive** via service account (`googleapis@173`) | backup-only, never in serving path |
| Email | **Resend** (`resend@6.6.0`) | transactional auth emails |
| Theming | **next-themes** (`next-themes@0.4.6`) | light/dark, `attribute="class"` |
| Dates | **date-fns** (`date-fns@4.4.0`) | `formatDistanceToNow` on dashboard |
| Passwords | **bcryptjs** (12-round salt) | `src/lib/password.ts` |

**Scripts:** `npm run dev` · `npm run build` · `npm run start` · `npm run lint` (eslint)

---

## 3. Folder layout

```
website/
├── prisma/
│   ├── schema.prisma          # User, Project, Asset, Token, AnalyticsEvent + enums
│   ├── seed.ts                # env-driven admin + demo brand + 3 projects (Khronos/Unsplash URLs)
│   ├── migrations/            # Prisma migrations
│   └── generated/client/      # generated Prisma client (imported as @/generated/prisma/client)
├── public/
│   └── embed-viewer.html      # static template for the public 3D embed (read by /embed route handler)
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # root layout: fonts + ThemeProvider + TopNav
│   │   ├── page.tsx           # / landing
│   │   ├── globals.css        # Tailwind v4 + design tokens + component classes
│   │   ├── loading.tsx        # root loading spinner
│   │   ├── auth/              # /auth, /auth/verify, /auth/reset-password
│   │   ├── onboarding/        # /onboarding (5-step wizard)
│   │   ├── dashboard/         # /dashboard + DashboardSkeleton + DashboardError
│   │   ├── tasks/             # /tasks (Kanban + list)
│   │   ├── notifications/     # /notifications
│   │   ├── integrations/      # /integrations (SDK + embed code)
│   │   ├── analytics/         # /analytics?range=7D|30D|ALL
│   │   ├── admin/             # /admin/dashboard, /admin/users, /admin/tasks, /admin/analytics
│   │   ├── embed/[projectId]/ # public iframe 3D viewer (route handler + static HTML)
│   │   ├── privacy/ terms/    # static placeholder legal pages
│   │   ├── actions/           # server actions: auth.ts, project.ts, admin.ts
│   │   └── api/               # see §5 API routes
│   ├── components/
│   │   ├── auth/              # SignInForm, SignUpForm, ForgotPasswordForm, ResetPasswordForm, OtpInput
│   │   ├── dashboard/         # DashboardLayout, NotificationBell, MobileNavDrawer
│   │   ├── admin/             # AdminLayout, AdminMobileNavDrawer
│   │   ├── ui/                # Alert, Badge, Button, Card, EmptyState, FormField, Input, Label, LinkButton, Modal, Select, Skeleton, Table, Textarea, cn
│   │   ├── TopNav.tsx, Hero.tsx, HeroCTA.tsx, BentoFeatures.tsx
│   │   ├── LandingPageClient.tsx, LandingExtras.tsx, ProductCatalog.tsx
│   │   ├── ThreeDConfigurator.tsx
│   │   └── ThemeProvider.tsx, ThemeToggle.tsx
│   ├── lib/
│   │   ├── prisma.ts          # singleton Prisma client
│   │   ├── auth-guards.ts     # requirePrincipal() — canonical auth resolver
│   │   ├── password.ts        # hashPassword / verifyPassword (bcrypt, 12 rounds)
│   │   ├── emails.ts          # sendVerificationOtpEmail / sendPasswordResetEmail (Resend)
│   │   ├── resend.ts          # getResend() factory
│   │   ├── notifications.ts   # getRecentProjectActivity()
│   │   ├── status.ts          # PROJECT_STATUS_META map → Badge tone/icon/label
│   │   ├── embed-liveness.ts  # EMBED_LIVENESS_THRESHOLDS + getLivenessBadge + formatLastSeen
│   │   ├── types.ts           # Product interface + PRODUCTS[] demo data
│   │   ├── utils.ts           # generateEmbedCode, formatCount, formatChange, date helpers
│   │   ├── uploadthing.ts     # generated useUploadThing helpers
│   │   ├── use-click-outside.ts, use-media-query.ts
│   │   ├── hooks/use-presigned-upload.ts   # wraps useUploadThing → {upload, isUploading, error, reset}
│   │   └── storage/           # types.ts, gdrive-adapter.ts, index.ts (no S3 adapter — UploadThing handles it)
│   ├── assets/fonts/          # local woff2: Cormorant, Inter, JetBrains
│   ├── auth.ts                # NextAuth instance (Credentials + JWT)
│   ├── auth.config.ts        # Edge-compatible config (callbacks: jwt, session)
│   ├── proxy.ts               # middleware (route gating + onboarding enforcement)
│   └── types/                 # ambient type augmentations
├── design.md                  # design system spec (read alongside §9 below)
├── specs/                     # ← you are here
└── tasks/                     # migration records (plan.md, todo.md, revert-to-uploadthing.md)
```

**Key path aliases** (tsconfig): `@/*` → `src/*`, `@/generated/prisma/client` → `prisma/generated/client`.

---

## 4. Route map

All 16 `page.tsx` are **server components**. Interactivity lives in `*Client.tsx` / form subcomponents. API routes are not in the middleware matcher — auth is enforced inside each handler via `requirePrincipal()` or is public by design.

| Route | File | Auth | Summary |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Public | Marketing landing: Hero, TrustMarquee, sandbox (ProductCatalog + ThreeDConfigurator), Stats, BentoFeatures, GradientCTA, footer with **Privacy** (`/privacy`) + **Terms** (`/terms`) links. The footer is a single `max-w-7xl` flex row (`page.tsx:25-43`) — three brand badges (W3C WebXR, CORS, Model-Viewer 4.0) on the left, two legal links on the right, separated by `•` characters. Legal links are bare `<Link href="/privacy">` / `<Link href="/terms">` with the same mono-uppercase styling as the badges. |
| `/terms` `/privacy` | `src/app/{terms,privacy}/page.tsx` | Public | Static placeholder legal pages (replace before launch) |
| `/auth` | `src/app/auth/page.tsx` → `AuthClient.tsx` | Public (redirects logged-in+onboarded → `/dashboard`) | 3-view form: signin / signup / forgot-password. Sign-in screen's CTA reads **"Sign Up"** (`SignInForm.tsx:136`) — renamed from the prior "Request Access" copy. TopNav is hidden on this route (and all `/auth/*` sub-routes) via `HIDDEN_ROUTES` in `TopNav.tsx:8`. |
| `/auth/verify` | `src/app/auth/verify/page.tsx` | Public | Magic-link email verification (`?token=...` → `verifyEmail`) |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx` | Public | New-password form (`?token=...` → `resetPassword`) |
| `/onboarding` | `src/app/onboarding/page.tsx` → `OnboardingClient.tsx` | Logged-in, not onboarded | 5-step wizard → `completeOnboarding` |
| `/dashboard` | `src/app/dashboard/page.tsx` | BRAND/ADMIN + onboarded | Metrics, 12-mo chart, recent tasks, quick links — **see `pages/dashboard.md`** |
| `/tasks` | `src/app/tasks/page.tsx` → `TasksClient.tsx` | BRAND/ADMIN + onboarded | Kanban + list; create/approve/upload — **see `pages/tasks.md`** |
| `/notifications` | `src/app/notifications/page.tsx` → `NotificationsClient.tsx` | BRAND/ADMIN | Table of recent projects + status |
| `/integrations` | `src/app/integrations/page.tsx` → `IntegrationsClient.tsx` | BRAND/ADMIN + onboarded | Hero (eyebrow + serif "Drop your 3D models anywhere." + 3-stat row `No API key` / `Zero setup` / `Any storefront`, subtitle shows guidance for the currently-selected platform). Below: 2-col row — left card **"Where it works"** with a clickable 5-tile directory (Shopify / WooCommerce / Webflow / Custom / Other) where the detected platform gets a passive **"Detected"** pill in the top-right and the currently-selected tile gets a thicker border + filled background; the **"How to embed"** paragraph below the grid always reflects the selected platform (so users can preview guidance for any of the 5 stores) + Requirements sub-card. Right card **"What you'll see"** = live iframe of the selected project. Full-width dark embed-code card (product dropdown + snippet + copy). No API key (the iframe is unauthenticated) |
| `/analytics` | `src/app/analytics/page.tsx` | BRAND/ADMIN + onboarded | `?range=7D\|30D\|ALL`; current vs prev period, time-series, top models; ADMIN=global, BRAND=scoped |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | ADMIN | Platform KPIs: total users/projects/events, active/suspended breakdown, Projects by Status table, 12-mo signups bar chart, top 10 brands table — **see `pages/admin.md`** |
| `/admin/users` | `src/app/admin/users/page.tsx` → `AdminUsersClient.tsx` | ADMIN | User list with search/filter, pagination, detail modal with role/status/usage limits/subscription tier management — **see `pages/admin.md`** |
| `/admin/tasks` | `src/app/admin/tasks/page.tsx` → `AdminTasksClient.tsx` | ADMIN | All projects (6 statuses), board + list, status override, claim + 3D upload, reassign — **see `pages/admin.md`** |
| `/admin/analytics` | `src/app/admin/analytics/page.tsx` | ADMIN | Platform-wide KPI cards, signups time-series chart, Projects by Status table, Top Brands table — **see `pages/admin.md`** |
| `/embed/[projectId]` | `src/app/embed/[projectId]/route.ts` | Public | Static HTML iframe viewer (route handler reads `public/embed-viewer.html`, 404 if not PUBLISHED or no GLB) — **see `pages/embed.md`** |

**Auth deep dive:** `pages/auth.md`. **Auth flow overview:** §7 below.

---

## 5. API routes (`src/app/api/`)

### `GET /api/notifications`
- **Auth:** delegated to `getRecentProjectActivity()` → `requirePrincipal()`.
- **Responses:** `200` `NotificationProject[] = { id, name, status, createdAt }[]` (10 newest of caller's projects) · `401`/`403`/`500` all return `[]` (graceful degrade for `NotificationBell`).
- **File:** `src/app/api/notifications/route.ts:1`

### `GET|POST /api/uploadthing`
- **File:** `src/app/api/uploadthing/route.ts:1` (`createRouteHandler`) · router in `src/app/api/uploadthing/core.ts:1`
- **Three uploaders** (all call `createAssetAndBackup` on completion → create `Asset` READY + fire-and-forget GDrive backup):

| Endpoint | File type | Max size | Auth | AssetType |
|---|---|---|---|---|
| `referenceImageUploader` | `image` | 16MB, 1 file | `Role.BRAND` | `REFERENCE_IMAGE` |
| `modelGlbUploader` | `blob` | 128MB, 1 file | `Role.ADMIN` | `MODEL_GLB` |
| `modelUsdzUploader` | `blob` | 128MB, 1 file | `Role.ADMIN` | `MODEL_USDZ` |

- `createAssetAndBackup` (`core.ts:10`) persists `{ id: assetId (UUID), key: file.key (real UT key), url: file.ufsUrl, ownerId, originalName, ... }`, then async-backs-up to GDrive with `<assetId>.<ext>` as the backup filename. `asset.id` = UploadThing `customId` = GDrive filename base — the single cross-storage tracker. See `file-storage-architecture.md` §12.

### `GET /api/auth/clear-session`
- **File:** `src/app/api/auth/clear-session/route.ts:1`
- **Purpose:** Clears stale JWT session cookies when the DB user record is gone. Called by `requirePrincipalOrRedirect()` on `StaleSessionError`. Calls `signOut({ redirect: false })` (works in route handlers, unlike server components where `cookies().set()` is read-only), then redirects to `/auth`. Route is intentionally omitted from the proxy matcher to avoid bounce loops.

### `GET|POST /api/auth/[...nextauth]`
- **File:** `src/app/api/auth/[...nextauth]/route.ts:1` (re-export of `handlers` from `src/auth.ts:8`)
- Standard NextAuth v5 endpoints (`/signin`, `/callback/credentials`, `/session`, …). Credentials provider verifies email+password via `verifyPassword`; requires `emailVerified`.

### `POST /api/sdk/v1/events` — **public**
- **File:** `src/app/api/sdk/v1/events/route.ts:5`
- **Body:** `{ eventType: "VIEW"\|"INTERACTION"\|"AR_LAUNCH", sessionId: string, projectId: string }`
- **Responses:** `201 { success: true, eventId }` · `400` missing/invalid · `404` project not PUBLISHED · `500`
- Creates `analyticsEvent` with the project's `brandId`. CORS `*` via `next.config.mjs` headers for `/api/sdk/*`.

### `GET /api/sdk/v1/config/[projectId]` — **public, cached**
- **File:** `src/app/api/sdk/v1/config/[projectId]/route.ts:5`
- **Response `200`:** `{ assetUrls: { glb, usdz }, sdkConfig }` with `Cache-Control: public, s-maxage=60, stale-while-revalidate=86400, Vary: Accept-Encoding`
- `404` if project missing, not `PUBLISHED`, or has no GLB. `500` on error.

---

## 6. Project lifecycle workflow

```
                 BRAND                        ADMIN
  ┌────────────────────────────┐    ┌───────────────────────────┐
  │  /tasks → "New Task" modal  │    │                           │
  │  upload reference images    │    │                           │
  │  + dimensions + SKU        │    │                           │
  │  → createProject()         │    │                           │
  │         (PENDING)           │    │                           │
  │              │              │    │                           │
  │              ▼              │    │  /tasks → click PENDING    │
  │                               │    │  → "Claim Task"           │
  │                               │    │  → claimProject()        │
  │                               │    │     (IN_PROGRESS)        │
  │                               │    │         │                │
  │                               │    │         ▼                │
  │                               │    │  Job Details modal       │
  │                               │    │  upload GLB (+ USDZ)     │
  │                               │    │  → markAsCompleted()    │
  │                               │    │     (COMPLETED)          │
  │              │              │    │                           │
  │              ▼              │    │                           │
  │  /tasks REVIEW column        │    │                           │
  │  → "Review Model" modal     │    │                           │
  │  → ThreeDConfigurator        │    │                           │
  │  → "Approve & Publish"       │    │                           │
  │  → updateProjectStatus()    │    │                           │
  │     (PUBLISHED)             │    │                           │
  │                               │    │  OR                       │
  │  /tasks REVIEW column        │    │                           │
  │  → "Request Changes" (note) │    │                           │
  │  → brandRequestChanges()    │    │                           │
  │     (REVIEW)                 │    │                           │
  │              │              │    │                           │
  │              ▼              │    │                           │
  │  /integrations → embed code  │    │                           │
  │  /embed/[id] public viewer   │    │                           │
  └────────────────────────────┘    └───────────────────────────┘
```

**State machine (`ProjectStatus`):**
- `PENDING` → `COMPLETED`: only via `adminSubmitProject` (ADMIN, atomic `updateMany` requiring `status: { in: [PENDING, REVISIONS] }`)
- `REVISIONS` → `COMPLETED`: only via `adminSubmitProject` (ADMIN, same atomic guard as above)
- `COMPLETED` → `PUBLISHED`: only via `brandPublishProject` (BRAND owner only, atomic `updateMany` requiring `COMPLETED` + `brandId: caller`)
- `COMPLETED` → `REVISIONS`: only via `brandSendForRevisions` (BRAND owner only, requires non-empty note; creates a `RevisionRequest` row in the same transaction)
- `PUBLISHED` → `REVISIONS`: only via `brandSendForRevisions` (BRAND owner only, requires note; embed stops serving on transition)
- `REVISIONS` is re-entrant: the brand can request more revisions on a project that's already in REVISIONS (creates another `RevisionRequest` row; status remains REVISIONS)
- `PUBLISHED` is the only embed-servable state. All other states render the embed's "not available" placeholder.
- The admin board shows 3 columns: `PENDING` (Queued), `REVISIONS` (Revisions Required), `COMPLETED` (Completed). `PUBLISHED` projects are read-only (show "Live on storefront" banner).
- The brand's `/tasks` shows 4 columns. Labels are role-dependent — see `src/lib/status.ts`: `ADMIN_LABEL` and `BRAND_LABEL` with `getStatusLabel(status, role)` helper.

**Quota:** `createProject` runs a `Serializable` transaction checking `project.count < user.usageLimits` (default 10 for BRAND; 9999 for seeded ADMIN). Throws "Usage limit exceeded. Please upgrade your plan."

**Full action reference:** §8 below.

---

## 7. Auth & onboarding workflow

### Registration
1. `SignUpForm` → `registerUser(formData)` (`auth.ts:82`): normalizes email, enforces password ≥ 6 chars. If an unverified user exists, re-hashes password + re-issues OTP; otherwise creates `BRAND` user with `usageLimits: 10`. Always issues a 6-digit OTP (hashed, 10-min expiry) via `issueVerificationOtp` → `sendVerificationOtpEmail` (Resend).
2. Returns `{ email, verificationRequired: true }`; `SignUpForm` swaps to OTP view (`OtpInput` 6-box).
3. `verifyEmailOtp(email, otp)` (`auth.ts:190`): validates against hashed `email_verification_otp` tokens (oldest-first via `verifyPassword`), sets `emailVerified`, deletes all OTP tokens.
4. Auto `signIn("credentials")` → redirect to `/onboarding` (not onboarded) or `/dashboard`.

### Login
1. `SignInForm` → `preflightLogin(email, password)` (`auth.ts:51`): validates credentials **without** creating a session. Returns `{ status: "invalid_credentials" }` or `{ status: "valid", onboarded }`.
2. On valid → `signIn("credentials")` (NextAuth). The Credentials `authorize` (`auth.ts:18`) requires `emailVerified` + valid `hashedPassword`; returns `null` if `user.status === 'SUSPENDED'` — preventing login for suspended users.
3. JWT callback (`auth.config.ts:8`) copies `sub`, `role`, `id`, `onboarded` onto the token. Session callback surfaces them as `session.user.{id,role,onboarded}`.

### Magic-link verify (alt path)
- `/auth/verify?token=...` → `verifyEmail(token)` (`auth.ts:125`): looks up `email_verification` UUID token (1-hr expiry), marks `emailVerified`, deletes token.

### Password reset
- `ForgotPasswordForm` → `requestPasswordReset(email)` (`auth.ts:144`): always returns `{ success: true }` (no enumeration). If user exists, creates `password_reset` UUID (1-hr expiry), emails link.
- `/auth/reset-password?token=...` → `ResetPasswordForm` → `resetPassword(token, password)` (`auth.ts:167`): enforces ≥ 6 chars, validates token, updates `hashedPassword`, deletes token.

### Onboarding
- `OnboardingClient` 5 steps: (1) company name [required], (2) pipeline explainer, (3) product category, (4) storefront platform, (5) catalog size. Steps 3–5 optional/skippable.
- Final step → `completeOnboarding({ companyName, productCategory?, storefrontPlatform?, catalogSize? })` (`auth.ts:225`): requires principal, updates `User.{name, productCategory, storefrontPlatform, catalogSize, onboarded: true}`, calls `unstable_update({ user: { onboarded: true } })` to refresh the JWT, revalidates 5 paths, redirects to `/dashboard`.

### `requirePrincipal()` — canonical auth resolver
- **File:** `src/lib/auth-guards.ts:40`
- Calls `auth()`, then loads user from DB by `session.user.id` (falls back to `session.user.email` if not found — handles JWT ID mismatch gracefully). Returns typed `Principal { userId, email, role, onboarded, companyName }`.
- Throws `UnauthenticatedError` (no session), `StaleSessionError extends UnauthenticatedError` (session valid but user not in DB — e.g., DB wiped), or `ForbiddenError` (role mismatch / not onboarded / account suspended).
- **Suspended check:** after loading the user, if `user.status === 'SUSPENDED'` it throws `ForbiddenError("Account suspended")` (`auth-guards.ts:63`). This blocks access to every protected page, server action, and API route for suspended users.
- Options: `{ roles?: Role[], requireOnboarded?: boolean }`. Used by **every** server action, protected page, and API handler.

### `requirePrincipalOrRedirect()` — page auth helper
- **File:** `src/lib/auth-guards.ts:79`
- Wraps `requirePrincipal()` specifically for pages (server components). On `StaleSessionError`: `redirect("/api/auth/clear-session")` — the route handler calls `signOut()` and redirects to `/auth`. On `UnauthenticatedError`: `redirect("/auth")`. On `ForbiddenError` (role/onboarding): `redirect("/dashboard")`. On success returns `Principal`. Route handler indirection is necessary because `cookies().set()` is read-only in server components — `signOut` cannot clear cookies from a page render.
- 11 pages use it: `/tasks`, `/notifications`, `/integrations`, `/dashboard`, `/analytics`, `/onboarding`, `/admin/dashboard`, `/admin/users`, `/admin/tasks`, `/admin/analytics`.
- **Not used** in API routes or server actions — those catch auth errors and return appropriate status codes.

### Middleware (`src/proxy.ts:16`)
**Protected route table** (prefix → required roles): `/dashboard`, `/tasks`, `/notifications`, `/integrations`, `/analytics` → `["BRAND","ADMIN"]`. `/admin` → `["ADMIN"]`.

**Logic order:**
1. Logged-in + onboarded + on `/auth` → redirect `/dashboard`
2. On `/onboarding` + not logged in → redirect `/auth`
3. On `/onboarding` + onboarded → redirect `/dashboard`
4. Public bypass: `/`, `/auth/*`, `/embed/*` → `next()`
5. Protected + not logged in → redirect `/auth`
6. Protected + logged in + wrong/missing role → redirect `/dashboard`
7. Protected + logged in + `onboarded === false` → redirect `/onboarding`
8. Otherwise → `next()`

**Matcher** (`proxy.ts:64`): `/dashboard/:path*`, `/tasks/:path*`, `/notifications/:path*`, `/integrations/:path*`, `/analytics/:path*`, `/admin/:path*`, `/auth/:path*`, `/onboarding/:path*`, `/embed/:path*`. **API routes are NOT in the matcher** — auth is enforced in-handler.

> Deep dive: `pages/auth.md`.

---

## 8. Server actions reference

All files start with `"use server"`. All auth via `requirePrincipal()`.

### `src/app/actions/auth.ts` (`auth.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `preflightLogin` | `(email, password) → { status: "invalid_credentials" } \| { status: "valid"; onboarded }` | None | Validate credentials without session (used before `signIn`) |
| `resendVerificationOtp` | `(email) → { success; status: "invalid"\|"sent" }` | None | Re-issue OTP for unverified user (no-enumeration on verified/missing) |
| `registerUser` | `(formData) → { email; verificationRequired: true }` | None | Create BRAND user (usageLimits 10) or re-verify existing unverified; issues OTP |
| `verifyEmail` | `(token) → { success: true }` | None | Magic-link verify; throws "Verification link is invalid or expired" |
| `requestPasswordReset` | `(email) → { success: true }` | None | Always returns success; emails reset link if user exists |
| `resetPassword` | `(token, password) → { success: true }` | None | ≥ 6 chars; throws "Reset link is invalid or expired" |
| `verifyEmailOtp` | `(email, otp) → { success: true }` | None | 6-digit OTP verify; throws "Verification code is invalid or expired" |
| `completeOnboarding` | `(input) → { success: true }` | `requirePrincipal()` | Sets name/category/platform/catalogSize + `onboarded: true`, refreshes JWT, revalidates 5 paths |
| `logout` | `() => Promise<void>` | (signOut) | `signOut({ redirectTo: "/" })` |

### `src/app/actions/project.ts` (`project.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `createProject` | `(name, assetIds: string[], sku?, instructions?, dimensions?) → { success; project }` | `Role.BRAND` | Serializable txn: quota check, verify all `assetIds` are READY + owned, create PENDING project, link assets. Revalidates `/tasks`, `/dashboard`, `/admin/tasks`. Throws "Usage limit exceeded…" / "One or more assets not found or not ready" |
| `brandPublishProject` | `(projectId) → { success }` | `Role.BRAND` (owner) | Verifies `project.brandId === principal.userId` and `project.status === COMPLETED`. Atomic `updateMany` → sets `PUBLISHED`. Throws "Only projects awaiting your review can be published" / "Project is not in a publishable state". Revalidates `/tasks`, `/dashboard`, `/embed/[id]`, `/admin/tasks` |
| `brandSendForRevisions` | `(projectId, note) → { success }` | `Role.BRAND` (owner) | Verifies ownership, non-empty note, and `status ∈ {COMPLETED, PUBLISHED}`. Serializable txn: atomic `updateMany` to REVISIONS + create `RevisionRequest { projectId, note, requestedBy }` row. Revalidates `/tasks`, `/dashboard`, `/admin/tasks`, and `/embed/[id]` if was PUBLISHED |
| `getUserProjects` | `() → AugmentedProject[]` | any role | Caller's projects (newest first) with assets + brand + revisionRequests; derived `referenceUrls`, `assetUrls { glb, usdz }` |

### `src/app/actions/admin.ts` (`admin.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `getAllTasks` | `() → AugmentedTask[]` | `Role.ADMIN` | All projects (newest first) with brand + assets + sdkConfig + revisionRequests (with requester name/email). Same derived shape as `getUserProjects` |
| `adminSubmitProject` | `(projectId, glbAssetId, usdzAssetId?) → { success }` | `Role.ADMIN` | Verifies GLB (and USDZ) are READY models. Atomic `updateMany` requiring `status ∈ {PENDING, REVISIONS}` → sets `COMPLETED`. Throws "GLB asset not found or not ready" / "USDZ asset not found or not ready" / "Project is not in a submittable state" / "Project is no longer available to submit" |

**`AugmentedProject`/`AugmentedTask`** (derived in `getUserProjects`/`getAllTasks`): `{ id, name, sku, instructions, dimensions, status, createdAt, brand, assets, revisionRequests?: { id, note, createdAt, requester?: { id, name, email } }[], referenceUrls: string[], assetUrls: { glb, usdz } \| null }`. `assignedTo` and `assignedUser` are removed. `revisionRequests` is sorted newest first.

### `src/app/actions/admin-users.ts` (`admin-users.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `adminGetUsers` | `(search?, roleFilter?, statusFilter?, page?) → { users, total, page, totalPages }` | `Role.ADMIN` | List all users with optional search/filter/pagination. `search` matches email or name (case-insensitive). Used by `/admin/tasks` reassign dropdown and `/admin/users` table. 50 per page |
| `adminGetUser` | `(id) → { user }` | `Role.ADMIN` | Single user with `projectCount`, `assetCount`, `eventCount` (from `_count`), plus `recentProjects` (last 5). Also returns `statusReason` and `suspendedAt`. Throws "User not found" |
| `adminUpdateUser` | `(id, { role?, usageLimits?, subscriptionTier? }) → { success: true }` | `Role.ADMIN` | Update user metadata. Cannot update own account — throws "Cannot update your own account". Revalidates `/admin/users` |
| `adminSetUserStatus` | `(id, status, reason?) → { success: true }` | `Role.ADMIN` | Set user to ACTIVE or SUSPENDED. When SUSPENDED, sets `suspendedAt: new Date()` and optional `statusReason`. Cannot self-suspend. Revalidates `/admin/users` |
| `adminDeleteUser` | `(id) → { success: true }` | `Role.ADMIN` | Permanently deletes user and all related data (cascading Prisma delete). Cannot self-delete. Revalidates `/admin/users` |

### `src/app/actions/admin-analytics.ts` (`admin-analytics.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `getPlatformKPIs` | `() → { totalUsers, totalProjects, totalEvents, suspendedUsers, projectsByStatus, signupsThisMonth, eventsThisMonth }` | `Role.ADMIN` | Platform-wide aggregate counts. `projectsByStatus` is a `ProjectStatus[]` group-by with `_count`. All values computed via parallel `prisma` queries |
| `getSignupsSeries` | `(months?) → { labels, counts }` | `Role.ADMIN` | Monthly signup counts for the last N months (default 12). `labels` are `"YYYY-MM"` strings; `counts` are integers. Iterates month-by-month |
| `getTopBrands` | `(take?) → brands[]` | `Role.ADMIN` | Top N BRAND users by project count (JS-sorted after fetch). Returns `{ id, name, email, status, createdAt, _count: { projects } }`. Default take=10 |

---

## 9. Data model (Prisma)

File: `prisma/schema.prisma:1`. Client import: `@/generated/prisma/client`.

### Models
- **`User`** (`schema.prisma:10`): `id (cuid)`, `email @unique`, `emailVerified DateTime?`, `role Role @default(BRAND)`, `subscriptionTier String?`, `usageLimits Int @default(10)`, `name String?`, `onboarded Boolean @default(false)`, `productCategory String?`, `storefrontPlatform String?`, `catalogSize String?`, `hashedPassword String?`, `status UserStatus @default(ACTIVE)`, `suspendedAt DateTime?`, `statusReason String?`, relations: `projects Project[]`, `assets Asset[]`, `analyticsEvents AnalyticsEvent[]`, `revisionRequests RevisionRequest[]`.
- **`Project`** (`schema.prisma:44`): `id`, `name`, `sku?`, `instructions?`, `dimensions Json?`, `status ProjectStatus @default(PENDING)`, `sdkConfig Json?`, `brandId`, relations: `brand User`, `analytics AnalyticsEvent[]`, `assets Asset[]`, `revisionRequests RevisionRequest[]`. `@@index([brandId])`. **No `assignedTo` / `adminNotes`** (removed in the lifecycle simplification). The `sdkConfig Json?` field is **not currently consumed by the STUDIO.V embed** (embed uses hardcoded viewer config — see §11 and `pages/embed.md`); it is kept for forward-compat and third-party JS SDK consumers.
- **`RevisionRequest`** (`schema.prisma:70`): `id`, `projectId`, `note`, `requestedBy` (userId), relations: `project Project @relation(onDelete: Cascade)`, `requester User`. `@@index([projectId])`, `@@index([createdAt])`. One row per brand revision request — preserves the full back-and-forth history.
- **`Asset`** (`schema.prisma:104`): `id`, `projectId String?`, `ownerId`, `type AssetType`, `status AssetStatus @default(UPLOADING)`, `provider String @default("uploadthing")`, `key`, `url`, `originalName`, `mimeType`, `size Int`, `checksum String?`, `backupSynced Boolean @default(false)`, `gdriveFileId String?`, relations: `project Project?`, `owner User`. `@@index([projectId])`, `@@index([ownerId])`.
- **`Token`** (`schema.prisma:61`): `id`, `identifier`, `token @unique`, `type` (`email_verification` / `email_verification_otp` / `password_reset`), `expires DateTime`, `createdAt`. Used by auth flows.
- **`AnalyticsEvent`** (`schema.prisma:70`): `id`, `eventType EventType`, `sessionId`, `projectId`, `brandId`, relations to `Project` + `User`. `@@index([projectId])`, `@@index([brandId])`.

### Enums
- `UserStatus { ACTIVE, SUSPENDED }` (`schema.prisma:33`)
- `Role { BRAND, ADMIN }` (`schema.prisma:38`)
- `ProjectStatus { PENDING, REVISIONS, COMPLETED, PUBLISHED }` (`schema.prisma:63`)
- `AssetType { REFERENCE_IMAGE, MODEL_GLB, MODEL_USDZ }` (`schema.prisma:101`)
- `AssetStatus { UPLOADING, READY, PUBLISHED, ARCHIVED, DELETED }` (`schema.prisma:107`)
- `EventType { VIEW, INTERACTION, AR_LAUNCH }` (`schema.prisma:95`)

### Seed (`prisma/seed.ts:1`)
- **Admin is env-driven** — read from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` in `.env`. If set, the seed upserts the admin user (promote if exists, create if not). The same env vars are used by `npm run sync-admin` (see below) for ongoing management.
- BRAND `brand@example.com` / `brand123` (usageLimits 10, name "Acme Furniture Co.") — demo only, skip-on-existence.
- 3 projects: "Velvet Sheen Armchair" (PUBLISHED, GLB from Khronos sample, Unsplash ref), "Nordic Oak Table" (COMPLETED, GLB), "Eames Lounge Replica" (PENDING, no GLB). Assets use `provider: "external"` with GitHub raw / Unsplash URLs. Skip-on-existence — won't recreate projects that already exist.

### Admin bootstrap (`scripts/sync-admin.ts:1`)
Permanent, idempotent admin management. Run with `npm run sync-admin`. Reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` from `.env` and:
- **Upserts** the env-driven admin user (preserves all data — promotes a BRAND to ADMIN if the email already exists, or creates a new ADMIN with `status: ACTIVE`, `onboarded: true`, `emailVerified: now`, `usageLimits: 9999`).
- Refreshes `hashedPassword` (bcrypt 12 rounds) and `name` on every run.
- **Deletes any stray ADMIN** user whose email is not the env-driven one (removes legacy `admin@studiov.com` and any other non-env admin accounts). Ensures exactly one permanent admin.
- **Does NOT** touch any other data, projects, assets, or events. Safe to re-run.

---

## 10. File upload workflow (current state — UploadThing)

> Historical context: a Filebase presigned-URL architecture was built then reverted to UploadThing (see `tasks/revert-to-uploadthing.md`). Full current-state spec: `file-storage-architecture.md`.

**Flow:**
1. Client instantiates `usePresignedUpload(endpoint)` (`src/lib/hooks/use-presigned-upload.ts:1`) — a thin wrapper over `useUploadThing` exposing `{ upload, isUploading, progress, error, reset }` (the `progress` number 0–100 is wired from UploadThing v7's `onUploadProgress` and rendered as a live progress bar in the admin upload tiles).
2. `upload(file, type)` calls `startUpload([file])`. UploadThing middleware (`core.ts:75`) runs `requirePrincipal({ roles: [...] })`, generates `assetId` via `crypto.randomUUID()`, slugifies the filename, sets `customId: assetId` + `name: sluggedName` via `UTFiles`, and returns `{ userId, assetType, assetId, originalName }`.
3. Browser uploads directly to UploadThing's S3 (bypassing Vercel's serverless body limit — important for 100MB+ GLB files).
4. `onUploadComplete` fires → `createAssetAndBackup(metadata, file)` (`core.ts:10`):
   - Builds GDrive backup name: `<assetId>.<ext>` via `buildBackupName()`.
   - Creates `Asset` with `id: assetId` (UUID = UT customId), `status: READY`, `key: file.key` (real UT key), `url: file.ufsUrl`.
   - Fire-and-forget `gdriveAdapter.backupFile(file.key, asset.url, asset.mimeType, backupName)` → on success sets `backupSynced: true` + `gdriveFileId`.
5. Returns `{ asset: { id, url, key: file.key, type, status, mimeType, size } }` as `serverData` — the hook surfaces this to the client.

**Asset lifecycle:** `UPLOADING` (transient, not used in UT flow) → `READY` (on upload complete) → `PUBLISHED` (conceptually when project publishes; not currently auto-transitioned).

**File validation:**
| Asset type | Allowed MIME | Max size | Uploader endpoint |
|---|---|---|---|
| `REFERENCE_IMAGE` | image/* (UT `image` type) | 16 MB | `referenceImageUploader` (BRAND) |
| `MODEL_GLB` | any blob (UT `blob`) | 128 MB | `modelGlbUploader` (ADMIN) |
| `MODEL_USDZ` | any blob | 128 MB | `modelUsdzUploader` (ADMIN) |

> GLB/USDZ MIME validation is best-effort post-upload (file picker filters by extension). Acceptable for MVP.

**GDrive backup** (`src/lib/storage/gdrive-adapter.ts:1`): `backupFile(key, sourceUrl, mimeType, backupName)` downloads from `asset.url` (the `*.ufs.sh` URL) and uploads to the shared Drive folder, returning the new file id. `backupName` is `<asset.id>.<ext>` (= the same UUID that is the UploadThing `customId`) — passed by `core.ts:31-41`. No-ops with a warning if `GDRIVE_*` env vars are unset. Never in the serving path.

---

## 11. Public embed SDK

The SDK is the public-facing contract for third-party storefronts. **The embed is a static HTML file served by a route handler** — it does not render through `app/layout.tsx`, never loads fonts, never hydrates `TopNav` or `ThemeProvider`. See `pages/embed.md` for the full deep dive.

### `GET /api/sdk/v1/config/[projectId]` — config fetch
Public, cached (`s-maxage=60, stale-while-revalidate=86400, Vary: Accept-Encoding`). The 60s edge cache means a brand re-uploading a GLB sees the new model within ~60s of any iframe refresh. Returns:
```json
{
  "assetUrls": { "glb": "https://…ufs.sh/…/model.glb", "usdz": "https://…ufs.sh/…/model.usdz" },
  "sdkConfig": { /* schema: see Project.sdkConfig in §9. Currently not consumed by the STUDIO.V embed — see note below. */ }
}
```
404 for missing/non-PUBLISHED/no-GLB. File: `src/app/api/sdk/v1/config/[projectId]/route.ts:5`.

**Note on `sdkConfig`:** the STUDIO.V embed (`/embed/[projectId]`) uses **hardcoded viewer config** (camera-orbit, exposure, tone-mapping, environment, shadow, auto-rotate, controls) lifted directly from `src/components/ThreeDConfigurator.tsx:42-47, 86-99` so the embed and the landing page render identically. The embed reads **only `assetUrls.glb`** from the SDK config response. The `sdkConfig` field is kept in the response (and in the `Project` Prisma model) for forward-compat and any third-party JS SDK consumers. See `pages/embed.md` §"Hardcoded config" for the full attribute table.

### `POST /api/sdk/v1/events` — analytics ingest
Public, CORS `*`. Body `{ eventType, sessionId, projectId }`. Creates `AnalyticsEvent` with the project's `brandId`. The latest `VIEW.createdAt` per project is the **embed liveness signal** surfaced on `/analytics` (see below). File: `src/app/api/sdk/v1/events/route.ts:5`.

### Embed iframe (`/embed/[projectId]`)
- **Route handler:** `src/app/embed/[projectId]/route.ts:1`. Reads `public/embed-viewer.html` from disk, replaces the `{PROJECT_ID}` placeholder, returns `text/html; charset=utf-8` with `Cache-Control: no-store`. 404 if project not PUBLISHED or no GLB. `export const dynamic = "force-dynamic"` + `no-store` ensure fresh DB reads so a brand sending PUBLISHED → REVISIONS stops the embed immediately.
- **Static template:** `public/embed-viewer.html:1`. ~10 KB inline CSS + JS. Lazy-loads `model-viewer@4.2.0` from `ajax.googleapis.com`, fetches `/api/sdk/v1/config/{id}` (reads only `assetUrls.glb`), builds a `<model-viewer>` element with **hardcoded viewer config** that matches `src/components/ThreeDConfigurator.tsx` exactly (see `pages/embed.md` §"Hardcoded config" for the full table). Generates a `sessionId` (crypto.randomUUID) and POSTs `VIEW` on load, `INTERACTION` on first `camera-change`.
- **Visuals:**
  - **3D grid floor** — pure-CSS perspective floor (two `repeating-linear-gradient` layers, `perspective(800px) rotateX(62deg)`, masked at horizon and ground). Lives **inside `#frame`** at `z-index: 0;`; `#stage` (model-viewer) at `z-index: 1;` sits on top; `<model-viewer background-color="transparent">` plus `style.backgroundColor = "transparent"` removes the web component's opaque host background so the grid shows through wherever the model isn't drawn. No extra requests, no extra payload.
  - **Top-right controls** — landing-style auto-rotate toggle + compass reset camera buttons (circular 40×40, white background, `1px solid #E5E2DD`).
  - **Loader** — `RefreshCw` SVG with `animation: spin 1.2s linear infinite` + monospace `LOADING 3D MODEL…` text updating to `LOADING… NN%` on `progress` events.
  - **Error** — red monospace error message (`#dc2626`, 12px).
  - **No STUDIO.V badge** (was the bottom-right pill in v1; removed per user request).
  - **No AR** — USDZ `ios-src`, `ar`, and `ar-modes` attributes are not set; matches landing's `ThreeDConfigurator` (no AR button there either). The SDK config still returns `assetUrls.usdz` for any future re-add or third-party consumer. `AR_LAUNCH` analytics are no longer emitted.
- **Resilience headers** (`next.config.mjs:36`): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: xr-spatial-tracking=(self), accelerometer=(self), gyroscope=(self)`. No `X-Frame-Options` (the embed is meant to be cross-origin-framed).
- **Embed code generator:** `generateEmbedCode(projectId)` in `src/lib/utils.ts:18` — produces an `<iframe src="{APP_URL}/embed/{id}" …>` snippet shown on `/integrations`. The URL is unchanged from prior versions; only the underlying implementation switched from a React page to a route handler.

### Embed liveness (`/analytics` leaderboard)
- The brand's analytics page (`src/app/analytics/page.tsx:131`) calls `getProjectLiveness(projectIds)` (`src/app/actions/analytics.ts:1`) which runs a single `prisma.analyticsEvent.groupBy({ _max: { createdAt } })`.
- Threshold helper: `src/lib/embed-liveness.ts:1` — `EMBED_LIVENESS_THRESHOLDS = { AMBER_DAYS: 7, RED_DAYS: 30 }`. `getLivenessBadge()` returns `"ok" | "amber" | "red" | "never"`.
- The leaderboard's "Last Seen" column shows the relative time + an amber badge ("May not be live") if 7–30 days, or a red badge ("Embed may be broken") if >30 days or never.

---

## 12. Design system

**Primary reference:** `design.md` (repo root) — brand identity, color hex codes, typography pairings, layout rules, interaction micro-animations, accessibility rules. See `design.md` §2.5 ("Dark Mode Tokens") for the full token contract, keep-list (coral bands, dark-by-design surfaces, inverted pills), and substitution map that powers light/dark theming.

**Additional tokens/classes in `src/app/globals.css:1`** (not covered in `design.md`):
- **Semantic CSS custom properties** (light defaults in `:root` + dark overrides in `.dark` block at `globals.css:46-66`):
  - Light: `--canvas #faf9f5`, `--canvas-secondary #efe9de`, `--surface #fff`, `--canvas-inverted #181715`, `--text-primary #141413`, `--text-secondary #3d3d3a`, `--text-muted #6c6a64`, `--border-default #e6dfd8`, `--primary #cc785c`, `--primary-hover #a9583e`, `--on-primary #fff`.
  - Dark: `--canvas #141413`, `--canvas-secondary #252320`, `--surface #1f1e1b`, `--canvas-inverted #f5f3ee`, `--text-primary #f5f3ee`, `--text-secondary #c4c0b6`, `--text-muted #9a968d`, `--border-default #3d3d3a`. Primary/accent unchanged.
- **Aliases** `--color-*` map to the above (fixes an undefined-token bug — keep both when referencing).
- **Accent palette** (light mode): `--accent-1 #ff5a3c`, `--accent-2 #5b5bd6`, `--accent-3 #1fb6a6`, `--accent-gradient`, `--accent-gradient-soft`. Dark mode slightly punchier (`#ff6b4a`, `#7575e8`, `#2dd4c0`).
- **Component classes** (`@layer components`): `.card`, `.btn-primary`, `.btn-secondary`, `.label-mono`, `.pill`, `.input-base`, `.th-mono`, `.gradient-text`, `.mesh-bg`, `.glow-border`, `.accent-ring`. `.card` has a dark-mode `box-shadow` override at `globals.css:106-108` for proper elevation feel on dark surfaces.
- **Fonts** loaded as local woff2 in `layout.tsx:6`: Cormorant (serif, `--font-serif-loaded`), Inter (sans, `--font-sans-loaded`), JetBrains (mono, `--font-mono-loaded`). Surfaced as `--font-serif/sans/mono` via `@theme` in `globals.css:3`.
- **Global `:focus-visible`**: 2px solid `--text-primary`, offset 2px (`globals.css:87`). Never use `outline-none` without a replacement ring.
- **Theme:** `next-themes` `attribute="class"`, `defaultTheme="light"`, `enableSystem`. `ThemeToggle` is hydration-safe — uses `useSyncExternalStore` to detect mount (`ThemeToggle.tsx:11-13`) so the placeholder `<div>` is shown during SSR and the real button takes over post-hydration without a `react-hooks/set-state-in-effect` lint error. `<body>` carries `suppressHydrationWarning` to absorb the no-flash transition.

**Status badge metadata** (`src/lib/status.ts:1`): `PROJECT_STATUS_META` for the default visual treatment (tone + icon) and two label tables: `ADMIN_LABEL` (PENDING→"Queued", REVISIONS→"Revisions Required", COMPLETED→"Completed", PUBLISHED→"Published") and `BRAND_LABEL` (PENDING→"Processing", REVISIONS→"Revisions", COMPLETED→"Review", PUBLISHED→"Published"). `getStatusLabel(status, role)` returns the right label per viewer. Used by Tasks, Dashboard, Notifications, NotificationBell, and admin pages. The `status.ts` file is a client-safe module (no Prisma runtime imports).

---

## 13. Environment variables

File: `.env.example:1`. All required for full functionality.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase transaction-mode pooler (port 6543, `?pgbouncer=true`) — app runtime |
| `DIRECT_URL` | Supabase session-mode pooler (port 5432) — Prisma CLI migrations |
| `AUTH_SECRET` | JWT encryption (generate: `openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | App URL for Stripe redirects + auth callbacks + embed code |
| `UPLOADTHING_TOKEN` | UploadThing API key (appId `7r8xhgyw3k`) |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth 2.0 Client ID (Desktop app) — from Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Paired with above |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | From `npx tsx scripts/get-gdrive-refresh-token.ts` (one-time consent flow) |
| `GDRIVE_BACKUP_FOLDER_ID` | Your Drive folder ID (owned by you — no sharing needed) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender (local: `onboarding@resend.dev`) |
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` (billing, optional for initial deploy) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` for `/api/webhooks/stripe` |
| `STRIPE_PRICE_STARTER` / `_GROWTH` / `_ENTERPRISE` | Price IDs for tiers |
| `ADMIN_EMAIL` | Permanent admin email (required for `npm run sync-admin` and seed) |
| `ADMIN_PASSWORD` | Permanent admin password (bcrypt-hashed on sync, ≥ 6 chars) |
| `ADMIN_NAME` | Admin display name (optional, defaults to "Studio Admin") |

**Production deploy:** see `deployment.md`.

---

## 14. Deep-dive specs

- **`pages/tasks.md`** — `/tasks` Kanban + list views, New Task modal, Job Details (admin claim/upload), Review modal (approve & publish), Published viewer, role-specific actions.
- **`pages/dashboard.md`** — `/dashboard` metric computation (views, AR launches, interaction rate, conv. lift), 12-month chart, recent tasks, quick links, Suspense/error boundaries.
- **`pages/auth.md`** — `/auth` 3-view flow (signin/signup/forgot), `/auth/verify` magic-link, `/auth/reset-password`, OTP input, preflight, JWT callbacks.
- **`pages/admin.md`** — 4 admin pages (`/admin/dashboard`, `/admin/users`, `/admin/tasks`, `/admin/analytics`): `AdminLayout`, server actions, management modals, data flows.
- **`pages/embed.md`** — `/embed/[projectId]` static-HTML route handler + hardcoded viewer config (matches landing) + 3D grid floor + top-right controls (rotate/reset) + SDK config/events endpoints + analytics liveness signal + resilience headers.
- **`file-storage-architecture.md`** — full current UploadThing architecture + Filebase migration history.

**Related (implemented, extended since written):**
- `auth-stabilization.md` — task plan for the `requirePrincipal` + email-fallback hardening (implemented). Extended with `StaleSessionError` + `requirePrincipalOrRedirect()` for stale-session self-healing (added Jul 2026).
- `deployment.md` — Vercel deploy guide + post-deploy checklist + local-vs-prod credential table.

---

## 15. Conventions to follow when editing

- **Server vs client:** pages are server components; interactivity goes in `*Client.tsx` with `"use client"`. UI primitives in `src/components/ui/` are server-compatible (except `Modal` which uses `createPortal`).
- **Auth:** never read `session.user.id`/`role` directly for authorization — always go through `requirePrincipal()` (DB-backed). For pages, use `requirePrincipalOrRedirect()` which auto-redirects on stale/absent sessions. For API routes, catch `UnauthenticatedError`/`ForbiddenError` and return appropriate status. For server actions, let errors propagate to the client.
- **Public endpoints:** return generic 404 for both missing and non-public projects (prevent enumeration). SDK config/events already do this.
- **Atomic writes:** admin claim/submit use `updateMany` with preconditions in the `where` clause (no TOCTOU). Keep this pattern.
- **Revalidation:** after project mutations call `revalidatePath("/tasks")` and `revalidatePath("/dashboard")`. After onboarding, revalidate 5 paths.
- **Transitions:** only `transition-colors`, `transition-transform`, `transition-opacity` (never `transition-all`). `active:scale-95` on buttons. `duration-300` standard.
- **Ellipsis:** use `…` not `...`. Icon-only buttons need `aria-label`. Decorative icons get `aria-hidden="true"`.
- **3D:** `<model-viewer>` is loaded via `next/script` (no SSR) for the in-app configurator (`ThreeDConfigurator` is `dynamic(..., { ssr: false })`). Camera state (`cameraOrbit` / `cameraTarget` / `autoRotate`) is preserved across re-renders once the user has interacted — `ThreeDConfigurator` listens for the `camera-change` event to set a `hasInteractedRef`, and only resets to defaults on a fresh `product.src` *if* the user has not yet interacted. The user's auto-rotate toggle is respected on every URL change (the effect does not force it back on). The public embed at `/embed/[projectId]` does NOT use React; see `pages/embed.md` for the static-HTML path.
- **Modal focus:** `Modal` (`src/components/ui/Modal.tsx:78-105`) splits its mount/open effect by `[isOpen]` only (the keydown listener is in a separate effect with a stable `useCallback` handler backed by a `onCloseRef`). This prevents the focus-trap and `firstFocusable.focus()` calls from re-firing on every parent re-render, which would otherwise steal focus from textareas in modals like Review/Published on `/tasks`.
