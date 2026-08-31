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
| Framework | **Next.js 16** (App Router, Turbopack) | `next.config.mjs` — `images.remotePatterns` retains `images.unsplash.com` (seed) + `fra.cloud.appwrite.io` (Appwrite CDN). Asset proxy is reached through `unoptimized` `<Image>` consumers, not via `/_next/image` (see §5). |
| Hosting | **Appwrite Sites** — site `peka-ar`, SSR adapter, Node 22, auto-deploy from `Peka-ar/website` `main` | Production handbook: `specs/deployment.md`. Server API key is read as `STUDIOV_API_KEY ?? APPWRITE_API_KEY` (`src/lib/appwrite.ts` — Appwrite Sites forbids user-set `APPWRITE_`-prefixed vars). Vercel project deleted at migration (commit "v2 - appwrite migration"). |
| UI | **React 19**, **Tailwind CSS v4**, **lucide-react** | PostCSS-based, tokens in `globals.css` |
| 3D | **Google `<model-viewer>` 4.1.0/4.2.0** via `next/script` | No SSR — dynamically imported |
| Auth | **Appwrite Cloud** (region `fra`) — `@appwrite.io/react` (client hooks + SSR helpers) + `node-appwrite` (server) | `src/app/api/appwrite/[...appwrite]/route.ts` (handlers), `src/app/providers.tsx`, `src/lib/appwrite.ts`, `src/lib/auth-guards.ts` |
| DB | **Appwrite TablesDB** (`studiov`, 5 tables) + `node-appwrite` client | `src/lib/db.ts`, `src/lib/appwrite-config.ts`, `src/lib/enums.ts` (edge-safe enum module). **Prisma removed entirely in Phase 5** |
| File storage | **Appwrite Storage** — 2 buckets: `models` (ADMIN-create, 150 MB) + `reference-images` (BRAND-create, 16 MB) | browser-direct uploads via session-authenticated client; in-app reads via auth-gated proxy; published embeds via direct CDN URLs with publish-time `read:any` grants. Full spec: `file-storage-architecture.md` |
| Email | **Appwrite Cloud email** (Gmail SMTP configured in console: sender "Peka.ar", `studiov3242@gmail.com`) | transactional auth emails — Appwrite's built-in **verification** + **recovery** templates; click URL passed per-call via `createVerification({ url })` / `createRecovery({ url })`. Legacy Nodemailer stack (`src/lib/emails.ts`, `mail.ts`) is dead code (zero consumers, deleted in Phase 5) |
| Theming | **next-themes** (`next-themes@0.4.6`) | light/dark, `attribute="class"` |
| Dates | **date-fns** (`date-fns@4.4.0`) | `formatDistanceToNow` on dashboard |
| Passwords | **Appwrite** (Argon2, hashed server-side, app never stores them) | |

**Scripts:** `npm run dev` · `npm run build` · `npm run start` · `npm run lint` (eslint)

**Env vars:** `APPWRITE_API_KEY` (local/Vercel) — on Appwrite Sites the same key is set as the site variable `STUDIOV_API_KEY` (the `APPWRITE_` prefix is reserved there); read via the fallback in `src/lib/appwrite.ts`. Plus `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `NEXT_PUBLIC_APP_URL`. Full reference: `specs/deployment.md` §3 + `.env.example`.

---

## 3. Folder layout

```
website/
├── public/
│   └── embed-viewer.html      # static template for the public 3D embed (read by /embed route handler)
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # root layout: fonts + <Providers> (AppwriteProvider + ThemeProvider) + TopNav
│   │   ├── providers.tsx      # "use client" — AppwriteProvider (SSR session) wrapping ThemeProvider
│   │   ├── page.tsx           # / landing
│   │   ├── globals.css        # Tailwind v4 + design tokens + component classes
│   │   ├── loading.tsx        # root loading spinner
│   │   │                      # + segment loading.tsx in auth/, onboarding/, dashboard/, tasks/, analytics/, integrations/, notifications/, admin/ — framed nav feedback during RSC navigation (Phase 6)
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
│   │   ├── actions/           # server actions: auth.ts, project.ts, admin.ts, admin-users.ts, admin-analytics.ts, analytics.ts
│   │   └── api/               # see §5 API routes
│   ├── components/
│   │   ├── auth/              # SignInForm, SignUpForm, ForgotPasswordForm, ResetPasswordForm
│   │   ├── dashboard/         # DashboardLayout, NotificationBell, MobileNavDrawer
│   │   ├── admin/             # AdminLayout, AdminMobileNavDrawer
│   │   ├── ui/                # Alert, Badge, Button, Card, EmptyState, FormField, Input, Label, LinkButton, Modal, Select, Skeleton, Table, Textarea, cn
│   │   ├── TopNav.tsx, Hero.tsx, HeroCTA.tsx, BentoFeatures.tsx
│   │   ├── LandingPageClient.tsx, LandingExtras.tsx, ProductCatalog.tsx
│   │   ├── ThreeDConfigurator.tsx
│   │   └── ThemeProvider.tsx, ThemeToggle.tsx
│   ├── lib/
│   │   ├── db.ts              # TablesDB data layer: row types, getTablesDB(), getRowSafe, listAllRows, countRows, runTransaction, groupBy
│   │   ├── enums.ts           # edge-safe const enums + types (ProjectStatus/AssetStatus/AssetType/UserStatus/EventType/Role) — client-importable, zero SDK imports
│   │   ├── project-augment.ts # buildTaskJob()/usersToTaskBrand()/requesterLiteFromUsers() — TablesDB row → client TaskJob shape
│   │   ├── appwrite-config.ts # edge-safe Appwrite constants (endpoint, projectId, SESSION_COOKIE, DB/table/bucket ids) + buildFileUrl/bucketForAssetType/mime defaults — no SDK imports
│   │   ├── appwrite.ts        # APPWRITE_API_KEY + createAdminClient() / createSessionClient() / createPublicClient() factories
│   │   ├── auth-guards.ts     # requirePrincipal() — canonical auth resolver (Appwrite session + users-table row), React cache()-deduped per request (Phase 6); re-exports Role from enums.ts
│   │   ├── notifications.ts   # getRecentProjectActivity() (TablesDB `listRows`)
│   │   ├── status.ts          # PROJECT_STATUS_META map → Badge tone/icon/label (imports enums from @/lib/enums)
│   │   ├── embed-liveness.ts  # EMBED_LIVENESS_THRESHOLDS + getLivenessBadge + formatLastSeen
│   │   ├── types.ts           # Product interface + PRODUCTS[] demo data
│   │   ├── utils.ts           # generateEmbedCode, formatCount, formatChange, date helpers
│   │   ├── use-appwrite-upload.ts # client upload hook: useAppwriteUpload → { upload, isUploading, progress, error, reset }
│   │   ├── use-click-outside.ts, use-media-query.ts
│   │   └── (removed in Phase 4/5: prisma.ts, password.ts, emails.ts, mail.ts, uploadthing-server.ts, uploadthing.ts, hooks/use-presigned-upload.ts, storage/)
│   ├── assets/fonts/          # local woff2: Cormorant, Inter, JetBrains
│   ├── proxy.ts               # proxy (middleware) — cookie-presence route gating only
│   └── types/                 # ambient type augmentations
├── scripts/                   # sync-admin.ts (Appwrite bootstrap), seed-appwrite.ts (demo seed)
├── design.md                  # design system spec (read alongside §9 below)
├── specs/                     # ← you are here
└── tasks/                     # migration records (plan.md, todo.md, revert-to-uploadthing.md, appwrite-migration.md)
```

**Key path alias** (tsconfig): `@/*` → `src/*`.

---

## 4. Route map

All 16 `page.tsx` are **server components**. Interactivity lives in `*Client.tsx` / form subcomponents. API routes are not in the middleware matcher — auth is enforced inside each handler via `requirePrincipal()` or is public by design.

| Route | File | Auth | Summary |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Public | Marketing landing: Hero, TrustMarquee, sandbox (ProductCatalog + ThreeDConfigurator), Stats, BentoFeatures, GradientCTA, footer with **Privacy** (`/privacy`) + **Terms** (`/terms`) links. The footer is a single `max-w-7xl` flex row (`page.tsx:25-43`) — three brand badges (W3C WebXR, CORS, Model-Viewer 4.0) on the left, two legal links on the right, separated by `•` characters. Legal links are bare `<Link href="/privacy">` / `<Link href="/terms">` with the same mono-uppercase styling as the badges. |
| `/terms` `/privacy` | `src/app/{terms,privacy}/page.tsx` | Public | Static placeholder legal pages (replace before launch) |
| `/auth` | `src/app/auth/page.tsx` → `AuthClient.tsx` | Public (existing session → role-aware redirect: not onboarded → `/onboarding`, ADMIN → `/admin/dashboard`, BRAND → `/dashboard`) | 3-view form: signin / signup / forgot-password. Sign-in screen's CTA reads **"Sign Up"** (`SignInForm.tsx:136`) — renamed from the prior "Request Access" copy. TopNav is hidden on this route (and all `/auth/*` sub-routes) via `HIDDEN_ROUTES` in `TopNav.tsx:8`. |
| `/auth/verify` | `src/app/auth/verify/page.tsx` | Public | Appwrite email-verification link (`?userId=...&secret=...` → `updateVerification` via public client). Success card, **no auto session** — user signs in manually |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx` → `ResetPasswordForm` | Public | New-password form (`?userId=...&secret=...` → `updateRecovery` via public client, 1-hr expiry) |
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

### `GET|POST /api/appwrite/[...appwrite]` — Appwrite SSR auth handlers
- **File:** `src/app/api/appwrite/[...appwrite]/route.ts:1` (`createAppwriteHandlers` from `@appwrite.io/react/handlers/next`)
- Exposes sign-in/sign-up/sign-out/OAuth-callback routes under `/api/appwrite/*`. Creates the session cookie (`appwrite-session-<projectId>`, httpOnly, secure, sameSite=lax) and redirects to `redirects.success` (`/dashboard`) or `redirects.failure` (`/auth`). Requires the server API key (scopes `users.read/write` + `sessions.write`).

### `GET /api/notifications`
- **Auth:** delegated to `getRecentProjectActivity()` → `requirePrincipal()`.
- **Responses:** `200` `NotificationProject[] = { id, name, status, createdAt }[]` (10 newest of caller's projects) · `401`/`403`/`500` all return `[]` (graceful degrade for `NotificationBell`).
- **File:** `src/app/api/notifications/route.ts:1`

### Uploads — no API route (Phase 4)
Uploads no longer hit a Next.js API route. The browser calls Appwrite Storage directly (`storage.createFile` via the session-authenticated `useAppwrite()` client), then the `recordAssetUpload` **server action** (`src/app/actions/record-asset.ts:23`) creates the TablesDB `assets` row. Bucket `create` permissions gate the role (BRAND → `reference-images`, ADMIN → `models`).

### `GET /api/auth/clear-session`
- **File:** DELETED in Appwrite migration Phase 1. `StaleSessionError` now redirects directly to `/auth` from `requirePrincipalOrRedirect()` (see §7).

### `GET|POST /api/auth/[...nextauth]`
- **File:** DELETED in Appwrite migration Phase 1 — replaced by `GET|POST /api/appwrite/[...appwrite]` above.

### `POST /api/sdk/v1/events` — **public**
- **File:** `src/app/api/sdk/v1/events/route.ts:1`
- **Body:** `{ eventType: "VIEW"\|"INTERACTION"\|"AR_LAUNCH", sessionId: string, projectId: string }`
- **Responses:** `201 { success: true, eventId }` · `400` missing/invalid · `404` project not PUBLISHED · `500`
- Creates a TablesDB `analytics_events` row with the project's `brandId` (`createRow`, `rowId: ID.unique()`). CORS `*` via `next.config.mjs` headers for `/api/sdk/*`.

### `GET /api/sdk/v1/config/[projectId]` — **public, cached**
- **File:** `src/app/api/sdk/v1/config/[projectId]/route.ts:1`
- **Response `200`:** `{ assetUrls: { glb, usdz }, sdkConfig }` — `glb`/`usdz` derived on-the-fly by `resolveAssetUrl(asset)` (`route.ts:6`): `buildFileUrl(bucketForAssetType(type), fileId)` for `provider === "appwrite"` rows (always includes the required `?project=<id>` param — Phase 6 bug 3), else the stored `url` (legacy/external providers). Publicly readable because the storage file carries `read:any` after publish — see §6. Fallback to the first non-READY row per type when no READY exists. `Cache-Control: public, s-maxage=60, stale-while-revalidate=86400, Vary: Accept-Encoding`
- `404` if project missing or not `PUBLISHED` (the GLB check is implicit — an empty `glb` key yields the embed's "not currently available" state). `500` on error.

### `GET /api/v1/assets/[assetId]/file` — **auth-gated streaming proxy**
- **File:** `src/app/api/v1/assets/[assetId]/file/route.ts:1`
- **Auth gate:** always `requirePrincipal({ roles: [ADMIN, BRAND] })`. BRAND passes if `asset.ownerId === principal.userId` **or** the linked project's `brandId === principal.userId` (unlinked uploads are viewable by their owner — fixes the pre-Phase-4 404-on-unlinked-assets bug). 401/403 JSON via the auth-guard error classes.
- **Delivery flow** (`fetchAssetStream`, `route.ts:72`): `provider === "appwrite"` → `fetch("{endpoint}/storage/buckets/{bucket}/files/{fileId}/download")` with `X-Appwrite-Project` + `X-Appwrite-Key` headers, **streaming `res.body`** (web stream, no buffering); `provider ∈ {external, uploadthing}` (seed/legacy) → plain `fetch(asset.url)`.
- **Responses:** `200` with stored `mimeType` (type-default fallback), `Content-Disposition: inline; filename="<encoded originalName>"`, `Cache-Control: private, max-age=60`, upstream `Content-Length` when present, and a `[asset-proxy]` log line. `404 { error: "asset unavailable" }` if the row is missing, status ∉ {READY, PUBLISHED, ARCHIVED}, or the upstream fetch fails.
- **Consumers:** every in-app asset read — server-side rewrites in `getAllTasks`/`getUserProjects` (`src/lib/project-augment.ts:61` `proxyUrl`), and client-side compositions in `TasksClient.tsx` (`:81-93, :390, :479, :729, :821, :1253`) + `AdminTasksClient.tsx` (`:253, :383, :453, :510`). The public embed does **not** use this route (it reads direct CDN URLs from the SDK config — see §11).
- **`<Image>` consumers:** every `<Image>` that points at the proxy carries the `unoptimized` prop. **Why:** Next's image optimizer at `/_next/image` does a server-side `fetch(href)` without forwarding request headers (per official Next docs at https://nextjs.org/docs/app/api-reference/components/image#src). The proxy's `requirePrincipal` cookie check therefore always rejects `/_next/image`'s no-cookie fetch and surfaces a misleading "received null" error. `unoptimized` makes the **browser** fetch the proxy URL directly (cookies attached), the proxy resolves the session, and bytes stream through. Reference thumbnails/lighboxes don't benefit meaningfully from Next image optimization (small fixed-size, already WebP-friendly). `next.config.mjs` keeps `remotePatterns: ['images.unsplash.com', 'fra.cloud.appwrite.io']` for seed + potential direct CDN reads.
- **Trade-off:** every in-app read proxies through Vercel (single hop) — the public embed path avoids it entirely via CDN URLs. Acceptable at our scale; revisit if bandwidth becomes a constraint.

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
- `PENDING` → `COMPLETED`: only via `adminSubmitProject` (ADMIN; in-tx precondition check in a TablesDB transaction — `getRowSafe` read inside the transaction requires `status ∈ {PENDING, REVISIONS}` — failure → "Project is no longer available to submit")
- `REVISIONS` → `COMPLETED`: only via `adminSubmitProject` (ADMIN, same guard)
- `COMPLETED` → `PUBLISHED`: only via `brandPublishProject` (BRAND owner; guarded `updateRows` requiring `COMPLETED` + `brandId`)
- `COMPLETED` → `REVISIONS`: only via `brandSendForRevisions` (BRAND owner, requires non-empty note; creates a `revision_requests` row in the same transaction)
- `PUBLISHED` → `REVISIONS`: only via `brandSendForRevisions` (BRAND owner, requires note; embed stops serving on transition)
- `REVISIONS` is re-entrant: the brand can request more revisions on a project that's already in REVISIONS (creates another `revision_requests` row; status remains REVISIONS)
- `PUBLISHED` is the only embed-servable state. All other states render the embed's "not available" placeholder.
- The admin board shows 3 columns: `PENDING` (Queued), `REVISIONS` (Revisions Required), `COMPLETED` (Completed). `PUBLISHED` projects are read-only (show "Live on storefront" banner).
- The brand's `/tasks` shows 4 columns. Labels are role-dependent — see `src/lib/status.ts`: `ADMIN_LABEL` and `BRAND_LABEL` with `getStatusLabel(status, role)` helper.
- **Model replacement on REVISIONS:** when an admin resubmits a project that's already in `REVISIONS` (or any state with a prior model), the previous `MODEL_GLB`/`MODEL_USDZ` assets are flipped to `AssetStatus.ARCHIVED` inside the same TablesDB transaction as the new link + status flip (`runTransaction` in `lib/db.ts`). The old `assets` rows stay linked to the project (`projectId` unchanged) so they appear under a "Previous models" collapsible in the admin modal. **Archived files are always KEPT in Appwrite Storage** (user decision — archived models stay viewable via the proxy) with read:any preserved while the project is published; the legacy UploadThing cleanup branch was removed with the package in Phase 5. See `pages/admin.md` §3 and `file-storage-architecture.md` §10.

**Quota:** `createProject` runs a TablesDB transaction that atomically `decrementRowColumn(users, usageLimits, value: 1, min: 0)` — `usageLimits` is the **remaining budget** (default 10 for BRAND; 9999 for seeded ADMIN). Friendly error: "Usage limit exceeded. Please upgrade your plan."

**Full action reference:** §8 below.

---

## 7. Auth & onboarding workflow

### Registration
1. `SignUpForm` → `registerUser(formData)` (`auth.ts:61`, admin client): normalizes email, enforces password ≥ 6 chars. Verified existing user ⇒ throw `Email already registered`; unverified ⇒ `updatePassword` + re-send; new ⇒ `Users.create(ID.unique(), email, password)` + `users` TableDB row (`role: "BRAND"`, `usageLimits: 10`, `onboarded: false`, `status: "ACTIVE"`) + `updateLabels(["BRAND"])`.
2. Always sends a **link-based verification email** via `sendVerificationEmail(userId)` (mint session → `createVerification({ url })` → delete session; Appwrite appends `userId`+`secret` to the link).
3. Returns `{ email, verificationRequired: true }`; `SignUpForm` swaps to a **"Check your inbox"** screen with a spam hint + resend button (`resendVerificationEmail`, `auth.ts:121`).
4. User clicks the email link → `/auth/verify` → `updateVerification` → success card → **manual sign-in** (no auto session, deviation D2) → `getSessionPrincipal` routes to `/onboarding` (not onboarded) or `/dashboard`/`/admin/dashboard`.

### Login
1. `SignInForm` → `signIn.emailPassword({ email, password, ... })` (`useAuth()` → `POST /api/appwrite/signin/email-password` → sets the session cookie). No `preflightLogin` anymore (deleted, deviation D5).
2. On success → `getSessionPrincipal()` (`auth.ts:203`) reads the `users` row **and returns the session secret** → `SignInForm` calls `client.setSession(secret)` (provider client via `useAppwrite()`) so browser-direct SDK calls (uploads) are authenticated — SSR sign-in does not hydrate the client SDK (Phase 6 bug 1) → `router.push(postLoginPath(onboarded, role))`: not onboarded → `/onboarding`; ADMIN → `/admin/dashboard`; BRAND → `/dashboard`.
3. Errors mapped client-side from the `AppwriteException`: 401 / `user_invalid_credentials` / `user_not_found` → "Invalid email or password."; 429 / `*rate_limit*` → "Too many attempts. Please try again later."
4. Role/onboarded gating happens per-request in `requirePrincipal` / `requirePrincipalOrRedirect` (reads the `users` TableDB row) — suspended users are rejected at the page boundary, not at login.

### Email verify (Appwrite link-based — replaces the OTP + magic-link paths)
- `/auth/verify?userId=...&secret=...` → `Account(createPublicClient()).updateVerification({ userId, secret })` directly in the page (`src/app/auth/verify/page.tsx:1`). Invalid/missing/expired → "Verification link is invalid or expired." Success card links to `/auth`. No session is created.

### Password reset
- `ForgotPasswordForm` → `requestPasswordReset(email)` (`auth.ts:134`, public client): **always returns `{ success: true }`** (no enumeration; failures logged). Appwrite emails the recovery link (1-hr expiry).
- `/auth/reset-password?userId=...&secret=...` → `ResetPasswordForm({ userId, secret })` → `resetPassword(userId, secret, password)` (`auth.ts:150`): enforces ≥ 6 chars, `updateRecovery` on the public client. Invalid/expired → "Reset link is invalid or expired."

### Onboarding
- `OnboardingClient` 5 steps: (1) company name [required], (2) pipeline explainer, (3) product category, (4) storefront platform, (5) catalog size. Steps 3–5 optional/skippable.
- Final step → `completeOnboarding({ companyName, productCategory?, storefrontPlatform?, catalogSize? })` (`auth.ts:245`): requires principal, updates `User.{name, productCategory, storefrontPlatform, catalogSize, onboarded: true}`. Appwrite sessions re-read the `users` row per request, so no JWT refresh is needed. Revalidates 5 paths, redirects to `/dashboard`.

### `requirePrincipal()` — canonical auth resolver
- **File:** `src/lib/auth-guards.ts:64`
- Calls `createNextServerHelpers({ endpoint, projectId }).getLoggedInUser()` (reads the `appwrite-session-<projectId>` cookie), then loads the `users` TableDB row by `user.$id` via the admin client (`TablesDB.getRow({ databaseId: "studiov", tableId: "users", rowId })`). Returns typed `Principal { userId, email, role, onboarded, companyName }` — contract unchanged from the NextAuth era, so zero consumer edits were needed in the migration.
- Throws `UnauthenticatedError` (no/invalid session), `StaleSessionError extends UnauthenticatedError` (session valid but no `users` row — e.g. DB wiped), or `ForbiddenError` (role mismatch / not onboarded / account suspended).
- **Suspended check:** after loading the row, if `user.status === 'SUSPENDED'` it throws `ForbiddenError("Account suspended")`. Unlike the NextAuth era (which blocked login for suspended users), Appwrite allows login — this per-request check blocks every protected page, action, and API route for suspended users.
- Options: `{ roles?: Role[], requireOnboarded?: boolean, allowUnonboarded?: boolean }`. `Role` is a string-literal const/type pair from the edge-safe `src/lib/enums.ts:1` (re-exported by `auth-guards.ts`). Used by **every** server action, protected page, and API handler.

### `requirePrincipalOrRedirect()` — page auth helper
- **File:** `src/lib/auth-guards.ts:108`
- Wraps `requirePrincipal()` for pages (server components). Redirect map: `UnauthenticatedError`/`StaleSessionError` → `/auth` (the `/api/auth/clear-session` route was deleted — Appwrite expires the cookie itself); suspended → `/auth`; role error → `/dashboard`; **not onboarded** → `/onboarding` (replaces the middleware's old onboarded check, which the edge runtime can no longer perform). The only page that renders for a not-onboarded user (`/onboarding`) opts out via `allowUnonboarded: true`.
- 11 pages use it: `/tasks`, `/notifications`, `/integrations`, `/dashboard`, `/analytics`, `/onboarding`, `/admin/dashboard`, `/admin/users`, `/admin/tasks`, `/admin/analytics`.
- **Not used** in API routes or server actions — those catch auth errors and return appropriate status codes.

### Proxy/middleware (`src/proxy.ts:1`)
**Protected route table** (prefix → required roles): `/dashboard`, `/tasks`, `/notifications`, `/integrations`, `/analytics` → `["BRAND","ADMIN"]`. `/admin` → `["ADMIN"]`. The table is retained for documentation; the edge runtime cannot call the Appwrite API, so it cannot verify role/onboarded — those checks run per-request in `requirePrincipalOrRedirect`/`requirePrincipal` (the pages already call them).

**Logic (Next 16 `export function proxy`, cookie-presence only):**
1. `/onboarding` + no `appwrite-session-<projectId>` cookie → redirect `/auth`
2. Public bypass: `/`, `/auth/*`, `/embed/*` → `next()`
3. Protected route + no session cookie → redirect `/auth`
4. Otherwise → `next()`

**Matcher** (`proxy.ts:47`): `/dashboard/:path*`, `/tasks/:path*`, `/notifications/:path*`, `/integrations/:path*`, `/analytics/:path*`, `/admin/:path*`, `/auth/:path*`, `/onboarding/:path*`, `/embed/:path*`. **API routes are NOT in the matcher** — auth is enforced in-handler.

> Deep dive: `pages/auth.md`.

---

## 8. Server actions reference

All files start with `"use server"`. All auth via `requirePrincipal()`.

### `src/app/actions/auth.ts` (`auth.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `registerUser` | `(formData) → { email; verificationRequired: true }` | None | Admin client: create BRAND user (`Users.create` + `users` TableDB row `{ role: "BRAND", usageLimits: 10, onboarded: false, status: "ACTIVE" }` + `updateLabels(["BRAND"])`) or re-verify existing unverified; sends link-based verification email. Throws "Email already registered" (verified existing), "Password must be at least 6 characters" |
| `resendVerificationEmail` | `(email) → { success; status: "invalid"\|"sent" }` | None | Re-send verification email for unverified user (no-enumeration on verified/missing) |
| `requestPasswordReset` | `(email) → { success: true }` | None | `createRecovery` on the **public client**; always returns success (no enumeration, failures logged) |
| `resetPassword` | `(userId, secret, password) → { success: true }` | None | ≥ 6 chars; `updateRecovery` on the public client; throws "Reset link is invalid or expired" |
| `completeOnboarding` | `(input) → { success: true }` | `requirePrincipal()` | Sets name/category/platform/catalogSize + `onboarded: true` via `TablesDB.updateRow`; `updateLabels([role])`; no JWT refresh needed (Appwrite re-reads the row per request), revalidates 5 paths |
| `getSessionPrincipal` | `() → { onboarded; role; sessionSecret } \| null` | Session | `requirePrincipal()` in try/catch — used by `SignInForm` for post-login routing (replaces deleted `preflightLogin`); also returns the cookie session secret so `SignInForm` can `client.setSession(...)` (SSR sign-in does not hydrate the client SDK — Phase 6 bug 1) |
| `logout` | `() => Promise<void>` | Session | `Account.deleteSession({ sessionId: "current" })` + cookie delete + redirect `/` |

### `src/app/actions/project.ts` (`project.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `createProject` | `(name, assetIds: string[], sku?, instructions?, dimensions?) → { success; projectId; remaining }` | `Role.BRAND` | Pre-check `usageLimits > 0` (users row), then `runTransaction` (TablesDB): `decrementRowColumn(users, usageLimits, value: 1, min: 0)` — atomic quota guard, `usageLimits` is the **remaining budget**; verify all `assetIds` exist + READY + owned via `listRows(assets, equal("$id", assetIds))` (`.total` must equal `assetIds.length`; skipped when empty); `createRow(projects, ID.unique())` with JSON-stringified `dimensions`; `updateRows` links assets. Returns `{ success, projectId, remaining }` — only a **plain object**, never the raw Appwrite row (whose prototype/metadata breaks Server→Client serialization). Revalidates `/tasks`, `/dashboard`, `/admin/tasks`. Throws "Usage limit exceeded…" / "One or more assets not found or not ready" |
| `brandPublishProject` | `(projectId) → { success }` | `Role.BRAND` (owner) | Guarded `updateRows(projects, equal("$id") + equal("brandId") + equal("status", "COMPLETED"))` → 0 matched → "Project is not in a publishable state" / "Only projects awaiting your review can be published". Revalidates `/tasks`, `/dashboard`, `/embed/[id]`, `/admin/tasks` |
| `brandSendForRevisions` | `(projectId, note) → { success }` | `Role.BRAND` (owner) | Verifies ownership + non-empty note. `runTransaction`: in-tx precondition check — `getRowSafe(projects, id, txId)` must satisfy ownership + `status ∈ {COMPLETED, PUBLISHED}` (else "Project is not in a revisable state"), then staged `updateRow` by rowId → REVISIONS + `createRow(revision_requests)`. Revalidates `/tasks`, `/dashboard`, `/admin/tasks`, and `/embed/[id]` if was PUBLISHED |
| `getUserProjects` | `() → TaskJob[]` | any role | Batched TablesDB: projects by `equal("brandId")` + `orderDesc("$createdAt")`; assets + revision_requests by `equal("projectId", ids)`; brand via `getRow(users)` (principal fallback). Derived shape via `buildTaskJob()` (`lib/project-augment.ts`) |

### `src/app/actions/admin.ts` (`admin.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `getAllTasks` | `() → TaskJob[]` | `Role.ADMIN` | Batched TablesDB: all projects `orderDesc("$createdAt")`; assets/revisions by projectId IN-queries; brands by `$id` IN → `usersToTaskBrand` map. Same derived shape as `getUserProjects` |
| `adminSubmitProject` | `(projectId, glbAssetId, usdzAssetId?) → { success }` | `Role.ADMIN` | Verifies GLB (and USDZ) are READY models via `getRowSafe(assets)` (throws "GLB asset not found or not ready" / "USDZ asset not found or not ready"). `runTransaction`: (1) in-tx precondition check — `getRowSafe(projects, id, txId)` must have `status ∈ {PENDING, REVISIONS}` (else "Project is no longer available to submit"), then staged `updateRow` by rowId → COMPLETED (guards must NOT rely on a staged bulk `updateRows` response — Appwrite returns `{ total: 0, rows: [] }` for staged operations regardless of matches, Phase 6 bug 2); (2) archives any prior READY MODEL_GLB/USDZ on this project (`updateRows` on `$id` list, excluding new ids — `projectId` unchanged for history); (3) links the new GLB/USDZ (`updateRows` with `isNull("projectId")`). **Archived files are always KEPT** (no post-commit cleanup — the legacy UploadThing delete branch was removed in Phase 5) |

**`TaskJob`** (derived in `buildTaskJob()` at `lib/project-augment.ts:1`): `{ id, name, sku, instructions, dimensions, status: ProjectStatus, createdAt, brand, assets, revisionRequests?: { id, note, createdAt, requester?: { id, name, email } }[], referenceUrls: string[], assetUrls: { glb, usdz } | null, archivedAssetUrls: { glb: AssetLite[]; usdz: AssetLite[] } }`. `assignedTo`/`assignedUser` removed. `revisionRequests` newest first; `archivedAssetUrls` = project's ARCHIVED MODEL_GLB/USDZ (newest `$updatedAt` first) — drives the admin modal "Previous models" collapsible. Live `assetUrls` picker is `status === "READY"` only. `createdAt` = `$createdAt`; `dimensions` parsed from the JSON string column.

### `src/app/actions/admin-users.ts` (`admin-users.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `adminGetUsers` | `(search?, roleFilter?, statusFilter?, page?) → { users, total, page, totalPages }` | `Role.ADMIN` | `listRows(users)` with role/status `equal` filters + `orderDesc("$createdAt")` + `limit(50)`/`offset`; **search is a JS case-insensitive substring filter** over `email`/`name` on the filtered page (fulltext search deliberately avoided — no fulltext index on the table). `total` from filtered length; `totalPages = ceil(total / 50)`. Used by `/admin/users` table |
| `adminGetUser` | `(id) → { user }` | `Role.ADMIN` | `getRow(users, $id)`; `projectCount`/`assetCount`/`eventCount` via `countRows` (`listRows(...).total`); `recentProjects` = last 5 by `$createdAt`. Also returns `statusReason` and `suspendedAt`. Throws "User not found" |
| `adminUpdateUser` | `(id, { role?, usageLimits?, subscriptionTier? }) → { success: true }` | `Role.ADMIN` | `updateRows(users, equal("$id"))` — 0 matched → "User not found". Cannot update own account — throws "Cannot update your own account". Revalidates `/admin/users` |
| `adminSetUserStatus` | `(id, status, reason?) → { success: true }` | `Role.ADMIN` | `updateRows` to ACTIVE or SUSPENDED; when SUSPENDED sets `suspendedAt` (ISO string) + optional `statusReason`, else clears both. Cannot self-suspend. Revalidates `/admin/users` |
| `adminDeleteUser` | `(id) → { success: true }` | `Role.ADMIN` | **Explicit cascade `runTransaction`** (TablesDB has no FK cascades): projects by `equal("brandId")`, assets by `equal("ownerId")` ∪ `equal("projectId")`, events by `equal("brandId")` ∪ `equal("projectId")`, revision_requests by `equal("requestedBy")` ∪ `equal("projectId")` — `deleteRows` each — then `deleteRows(users)` + Appwrite `Users.delete(id)` (try/catch). Fixes the latent Prisma FK-Restrict bug (deleting a user with revision requests failed). Cannot self-delete. Revalidates `/admin/users` |

### `src/app/actions/admin-analytics.ts` (`admin-analytics.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `getPlatformKPIs` | `() → { totalUsers, totalProjects, totalEvents, suspendedUsers, projectsByStatus, signupsThisMonth, eventsThisMonth }` | `Role.ADMIN` | Platform-wide aggregate counts via `countRows` (`listRows(...).total` — documented cost: 1 read op per returned row on `total`). `projectsByStatus: { status: ProjectStatus; _count: number }[]` = 4 parallel status queries |
| `getSignupsSeries` | `(months?) → { labels, counts }` | `Role.ADMIN` | Monthly signup counts: per-month `between("$createdAt", start, end)` via `countRows`. `labels` are `"YYYY-MM"` strings. Default 12 months |
| `getProjectsByMonth` | `(months?) → { labels, counts }` | `Role.ADMIN` | `listAllRows(projects)` since the window start (max 100/page pagination) + JS month buckets |
| `getTopBrands` | `(take?) → brands[]` | `Role.ADMIN` | All BRAND users + `listAllRows(projects)` → JS count by `brandId` → sort desc → slice. Returns `{ id, name, email, status, createdAt, _count: { projects } }`. Default take=10 |

### `src/app/actions/analytics.ts` (`analytics.ts:1`)
| Export | Signature | Auth | Purpose |
|---|---|---|---|
| `getProjectLiveness` | `(projectIds) → Record<string, { lastEventAt: Date \| null }>` | Session | Per project: `listRows(analytics_events, equal("projectId")[, equal("brandId") for non-admin], orderDesc("$createdAt"), limit(1))` → converts `$createdAt` to `Date`. Consumers (`embed-liveness.ts`) call `.getTime()` |

---

## 9. Data model (Appwrite TablesDB)

**Phases 3–5 rewrote the data path from Prisma to Appwrite TablesDB.** The runtime data layer is entirely the TablesDB database `studiov` (id `studiov`), with type-safe helpers in `src/lib/db.ts:1`. Row types mirror the legacy Prisma models. **Prisma was fully removed in Phase 5** (`prisma/` folder, generated client, `src/lib/prisma.ts`, `@/generated/prisma/client` alias, deps, env vars — all gone). Enums live in the edge-safe `src/lib/enums.ts:1` (client-importable; re-exported by `db.ts` and `auth-guards.ts`) so no file depends on a generated client.

Table IDs (`src/lib/appwrite-config.ts:1`): `users`, `projects`, `assets`, `revision_requests`, `analytics_events`. Row identity: **`$id` is the canonical id everywhere** (users row `$id` == `userId` column == Appwrite auth user id; assets row `$id` == storage fileId since Phase 4). System columns `$createdAt`/`$updatedAt` are queryable + indexable; all tables have key indexes on `$createdAt` (added in Phases 0/3).

### Tables
- **`users`** — mirrors `User`: `$id`, `userId`, `email`, `role` (`BRAND`/`ADMIN`), `usageLimits` (Int, **remaining budget** since Phase 3), `name`, `onboarded`, `productCategory`, `storefrontPlatform`, `catalogSize`, `status` (`ACTIVE`/`SUSPENDED`), `suspendedAt` (ISO string), `statusReason`, `emailVerified`. Indexes: `idx_email`, `idx_role`, `idx_status`, `idx_createdAt` (`$createdAt`, added in Phase 3 for `adminGetUsers` ordering).
- **`projects`** — mirrors `Project`: `$id`, `name`, `sku`, `instructions`, `dimensions` (JSON stringified on write, parsed in `buildTaskJob`), `status` (`PENDING`/`REVISIONS`/`COMPLETED`/`PUBLISHED`), `sdkConfig` (JSON string, forward-compat only), `brandId`. Indexes: `idx_brandId`, `idx_status`, `idx_createdAt`. **No `assignedTo`/`adminNotes`** (lifecycle simplification). The STUDIO.V embed uses hardcoded viewer config (see §11, `pages/embed.md`).
- **`revision_requests`** — mirrors `RevisionRequest`: `$id`, `projectId`, `note`, `requestedBy` (userId). One row per brand revision request — full back-and-forth history. Indexes: `idx_projectId`, `idx_createdAt`.
- **`assets`** — mirrors `Asset` minus storage-provider fields: `$id` (= **storage fileId** since Phase 4), `projectId` (nullable — null until linked by `createProject`/`adminSubmitProject`), `ownerId`, `type` (`REFERENCE_IMAGE`/`MODEL_GLB`/`MODEL_USDZ`), `status` (`READY`/`ARCHIVED` — rows never enter `UPLOADING`/`PUBLISHED`/`DELETED`), `provider` (`"appwrite"`; legacy `"uploadthing"`/`"external"` on old rows), `fileId` (nullable — null for legacy seed rows), `url` (absolute Appwrite `/view` URL for `provider: "appwrite"`; stored `*.ufs.sh`/external URL for legacy rows), `originalName`, `mimeType`, `size`, `checksum` (MD5). **No `key`/`backupSynced`/`gdriveFileId` columns.** Rows are written by `recordAssetUpload` (`src/app/actions/record-asset.ts:23`). Indexes: `idx_projectId`, `idx_ownerId`, `idx_project_type_status` (compound, added in Phase 0).
- **`analytics_events`** — mirrors `AnalyticsEvent`: `$id`, `eventType` (`VIEW`/`INTERACTION`/`AR_LAUNCH`), `sessionId`, `projectId`, `brandId`. Indexes: `idx_projectId`, `idx_brandId`, `idx_createdAt`.

### Enums
Declared in the edge-safe `src/lib/enums.ts:1` (client-importable; re-exported by `db.ts` and `auth-guards.ts`). Literal-value identical to the old Prisma enums — structural drop-in, `TaskJob.status` typed as `ProjectStatus`:
- `UserStatus { ACTIVE, SUSPENDED }`
- `Role { BRAND, ADMIN }`
- `ProjectStatus { PENDING, REVISIONS, COMPLETED, PUBLISHED }`
- `AssetType { REFERENCE_IMAGE, MODEL_GLB, MODEL_USDZ }`
- `AssetStatus { UPLOADING, READY, PUBLISHED, ARCHIVED, DELETED }`
- `EventType { VIEW, INTERACTION, AR_LAUNCH }`

### Seed (`scripts/seed-appwrite.ts:1` — Appwrite-native, replaces the Prisma-era `prisma/seed.ts`)
Run with `npm run seed:appwrite`. Admin-client upserts against the TablesDB database + Appwrite Auth (labels + email verification). Skip-on-existence throughout.
- **Admin is env-driven** — read from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` in `.env`. If set, upserts the admin (promote if exists, create if not) with label `ADMIN`, `users` row (`role: "ADMIN"`, `usageLimits: 9999`, `onboarded: true`, `status: "ACTIVE"`). Skipped with a notice if the env vars are absent (delegates to `sync-admin`).
- BRAND `brand@example.com` / `brand123` (usageLimits 10, name "Acme Furniture Co.", label `BRAND`) — demo only, upserted every run.
- 3 projects: "Velvet Sheen Armchair" (PUBLISHED, `sdkConfig` JSON, GLB from Khronos sample + Unsplash ref), "Nordic Oak Table" (COMPLETED, GLB), "Eames Lounge Replica" (PENDING, no GLB). Assets use `provider: "external"` with GitHub raw / Unsplash URLs, GLB `status: READY` (the live-model picker + SDK config route require READY). Skip-on-existence by project name.

### Admin bootstrap (`scripts/sync-admin.ts:1`)
Permanent, idempotent admin management. Run with `npm run sync-admin`. Reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` from `.env` and:
- **Upserts** the env-driven admin via `Users.list` email lookup → create or update (`updateName` / `updatePassword` / `updateLabels(["ADMIN"])` / `updateEmailVerification(true)`), plus a `users` row upsert (`role: "ADMIN"`, `usageLimits: 9999`, `onboarded: true`, `status: "ACTIVE"`).
- **Deletes any stray ADMIN** user whose email is not the env-driven one (queries the `users` table for `role === "ADMIN"` rows where email ≠ env email → `Users.delete` + `deleteRow`). Ensures exactly one permanent admin.
- **Does NOT** touch any other data, projects, assets, or events. Safe to re-run.

---

## 10. File upload workflow (current state — Appwrite Storage)

> Historical context: R2 → Filebase → UploadThing+GDrive → Appwrite Storage (see `tasks/appwrite-migration.md` §0 Phase 4 and `file-storage-architecture.md` §14). Full current-state spec: `file-storage-architecture.md`.

**Flow:**
1. Client instantiates `useAppwriteUpload({ bucketId, maxSizeMB, allowedExtensions })` (`src/lib/use-appwrite-upload.ts:40`) — uses the pre-built `storage` service from `useAppwrite()` (session-authenticated client, `@appwrite.io/react` provider) and exposes `{ upload, isUploading, progress, error, reset }`.
2. `upload(file, type)` validates size/extensions, then `storage.createFile({ bucketId, fileId: ID.unique(), file, onProgress })` — the browser uploads **directly to Appwrite** (bypassing Vercel's serverless body limit — important for 100MB+ GLB files). `onProgress` receives `{ progress: 0-100 }` (client SDK `UploadProgress` is percent, not bytes) and drives the live progress bar in the upload tiles.
3. On success → `recordAssetUpload({ fileId, type })` server action (`src/app/actions/record-asset.ts:23`): `requirePrincipal` by type (REFERENCE_IMAGE → BRAND, MODELS → ADMIN — mirrors the bucket `create` perms), admin-client `storage.getFile` for metadata, then `createRow(assets, { rowId: fileId, data: { projectId: null, ownerId, type, status: READY, provider: "appwrite", fileId, url: buildFileUrl(...), originalName, mimeType, size, checksum } })`.
4. The hook returns the `RecordedAsset` `{ id, url, type, status, mimeType, size, originalName }` (no `key`) — stored in `uploadedAssets` (brand) or `glbAsset`/`usdzAsset` (admin).
5. Failure mapping: 403 → permission, 413 → too large, 429 → rate limit, 400 → bucket rejection; best-effort `deleteFile` orphan cleanup.

**Asset lifecycle:** `READY` (on upload complete) → `ARCHIVED` (set by `adminSubmitProject` on model replacement — see below). Rows never enter `UPLOADING`/`PUBLISHED`/`DELETED`. Publish/unpublish mutates **storage file permissions**, not row status.

**Model archival on replacement (admin resubmit on REVISIONS):**
When an admin uploads a new GLB/USDZ for a project that already has a `READY` model and calls `adminSubmitProject`, the previously-linked MODEL_GLB/USDZ rows are flipped to `AssetStatus.ARCHIVED` inside the same TablesDB `runTransaction` as the new link + status flip (see §8 `adminSubmitProject`). The archived rows stay linked to the project (`projectId` unchanged) so the admin's "Previous models" collapsible can list them. **Archived files are always KEPT** in Appwrite Storage (user decision — archived models stay viewable via the proxy and keep `read:any` while the project is published; the legacy UploadThing delete branch was removed with the package in Phase 5). No quota impact: re-uploading does not consume `usageLimits`. See `pages/admin.md` §3 for the UI side and `file-storage-architecture.md` §10 for the storage view.

**File validation:**
| Asset type | Allowed extensions | Max size | Bucket |
|---|---|---|---|
| `REFERENCE_IMAGE` | `jpg jpeg png webp gif avif` (console bucket gate + client check) | 16 MB | `reference-images` (BRAND-create) |
| `MODEL_GLB` | `glb` (client check) | 128 MB (hook) / 150 MB (bucket max) | `models` (ADMIN-create) |
| `MODEL_USDZ` | `usdz` (client check) | same | `models` (ADMIN-create) |

> GLB/USDZ MIME validation is best-effort (file picker filters by extension; `recordAssetUpload` defaults mime to `model/gltf-binary`/`model/vnd.usdz+zip`). Acceptable for MVP.

**Public access (publish grant / unpublish revoke):**
- `brandPublishProject` grants `read:any` on the project's READY GLB/USDZ storage files **before** flipping the status to `PUBLISHED` (failure → best-effort revoke + throw). Invariant: `PUBLISHED ⇒ files publicly readable`.
- `brandSendForRevisions` (when `wasPublished`) revokes `read:any` (`permissions: []`) **after** the transaction commits (failures logged only).
- Reference images never receive `read:any`. In-app reads always go through the auth-gated proxy (`GET /api/v1/assets/[assetId]/file`, §5) — bucket `read` is label-scoped, so the server API key does the fetching.

---

## 11. Public embed SDK

The SDK is the public-facing contract for third-party storefronts. **The embed is a static HTML file served by a route handler** — it does not render through `app/layout.tsx`, never loads fonts, never hydrates `TopNav` or `ThemeProvider`. See `pages/embed.md` for the full deep dive.

### `GET /api/sdk/v1/config/[projectId]` — config fetch
Public, cached (`s-maxage=60, stale-while-revalidate=86400, Vary: Accept-Encoding`). The 60s edge cache means a brand re-uploading a GLB sees the new model within ~60s of any iframe refresh. Returns:
```json
{
  "assetUrls": { "glb": "https://fra.cloud.appwrite.io/v1/storage/buckets/models/files/<fileId>/view", "usdz": "https://fra.cloud.appwrite.io/v1/storage/buckets/models/files/<fileId>/view" },
  "sdkConfig": { /* schema: see Project.sdkConfig in §9. Currently not consumed by the STUDIO.V embed — see note below. */ }
}
```
`assetUrls` are derived on-the-fly via `resolveAssetUrl(asset)` (`route.ts:6`) — `buildFileUrl(bucketForAssetType(type), fileId)` for `provider === "appwrite"` rows (always includes the required `?project=<id>` param, so rows uploaded before the Phase 6 bug 3 fix still resolve), falling back to the stored `url` for legacy/external rows. The absolute Appwrite `/view` CDN URLs are publicly readable because read:any was granted at publish; the embed viewer prepends an empty `APP_URL` so absolute URLs pass through. 404 for missing/non-PUBLISHED. File: `src/app/api/sdk/v1/config/[projectId]/route.ts:1`.

**Note on `sdkConfig`:** the STUDIO.V embed (`/embed/[projectId]`) uses **hardcoded viewer config** (camera-orbit, exposure, tone-mapping, environment, shadow, auto-rotate, controls, AR) lifted directly from `src/components/ThreeDConfigurator.tsx:42-47, 86-132` so the embed and the landing page render identically. The embed reads **`assetUrls.glb`** (and **`assetUrls.usdz` if present**, used for `ios-src` on iOS Quick Look) from the SDK config response. The `sdkConfig` field is kept in the response (and in the `projects` TablesDB row) for forward-compat and any third-party JS SDK consumers. See `pages/embed.md` §"Hardcoded config" for the full attribute table and §"AR button" for the device matrix.

### `POST /api/sdk/v1/events` — analytics ingest
Public, CORS `*`. Body `{ eventType, sessionId, projectId }`. Creates `AnalyticsEvent` with the project's `brandId`. The latest `VIEW.createdAt` per project is the **embed liveness signal** surfaced on `/analytics` (see below). File: `src/app/api/sdk/v1/events/route.ts:5`.

### Embed iframe (`/embed/[projectId]`)
- **Route handler:** `src/app/embed/[projectId]/route.ts:1`. Reads `public/embed-viewer.html` from disk, replaces the `{PROJECT_ID}` placeholder, returns `text/html; charset=utf-8` with `Cache-Control: no-store`. 404 if project not PUBLISHED or no GLB. `export const dynamic = "force-dynamic"` + `no-store` ensure fresh DB reads so a brand sending PUBLISHED → REVISIONS stops the embed immediately.
- **Static template:** `public/embed-viewer.html:1`. ~12 KB inline CSS + JS. Lazy-loads `model-viewer@4.2.0` from `ajax.googleapis.com`, fetches `/api/sdk/v1/config/{id}` (reads `assetUrls.glb` and `assetUrls.usdz`), builds a `<model-viewer>` element with **hardcoded viewer config** that matches `src/components/ThreeDConfigurator.tsx` exactly (see `pages/embed.md` §"Hardcoded config" for the full table, including `ar`/`ar-modes`/`ar-scale`/`ios-src`). Generates a `sessionId` (crypto.randomUUID) and POSTs `VIEW` on load, `INTERACTION` on first `camera-change`, `AR_LAUNCH` on first `ar-status: session-started`.
- **Visuals:**
  - **3D grid floor** — pure-CSS perspective floor (two `repeating-linear-gradient` layers, `perspective(800px) rotateX(62deg)`, masked at horizon and ground). Lives **inside `#frame`** at `z-index: 0;`; `#stage` (model-viewer) at `z-index: 1;` sits on top; `<model-viewer background-color="transparent">` plus `style.backgroundColor = "transparent"` removes the web component's opaque host background so the grid shows through wherever the model isn't drawn. No extra requests, no extra payload.
  - **Top-right controls** — landing-style auto-rotate toggle + compass reset camera buttons (circular 40×40, white background, `1px solid #E5E2DD`).
  - **Loader** — `RefreshCw` SVG with `animation: spin 1.2s linear infinite` + monospace `LOADING 3D MODEL…` text updating to `LOADING… NN%` on `progress` events.
  - **Error** — red monospace error message (`#dc2626`, 12px).
  - **No STUDIO.V badge** (was the bottom-right pill in v1; removed per user request).
  - **AR enabled** (matched on landing + tasks modals + the embed): the `<model-viewer>` carries `ar`, `ar-modes="webxr scene-viewer quick-look"`, `ar-scale="fixed"`, and (when a USDZ is present) `ios-src`. A slotted AR button "View in your space" replaces model-viewer's built-in bottom-right pill. The button is revealed only when `mv.canActivateAR` is truthy (Android Chrome → WebXR; non-Chrome Android → Scene Viewer app; iOS Safari → Quick Look with auto-generated USDZ fallback); it stays hidden on desktop. **See `pages/embed.md` §"AR button" for the full device matrix and analytics wiring.**
  - `AR_LAUNCH` analytics are emitted on `ar-status: session-started` (or `object-placed`), once per page view — the dormant AR-launch charts on `/analytics` and `/dashboard` are live again.
- **Resilience headers** (`next.config.mjs:36`): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: xr-spatial-tracking=(self), accelerometer=(self), gyroscope=(self)`. No `X-Frame-Options` (the embed is meant to be cross-origin-framed).
- **Embed code generator:** `generateEmbedCode(projectId)` in `src/lib/utils.ts:18` — produces an `<iframe src="{APP_URL}/embed/{id}" …>` snippet shown on `/integrations`. The URL is unchanged from prior versions; only the underlying implementation switched from a React page to a route handler.

### Embed liveness (`/analytics` leaderboard)
- The brand's analytics page (`src/app/analytics/page.tsx:131`) calls `getProjectLiveness(projectIds)` (`src/app/actions/analytics.ts:1`) which runs, per project, `listRows(analytics_events, equal("projectId"), orderDesc("$createdAt"), limit(1))` → `Date`. (The `/analytics` page's own metrics were migrated from Prisma to TablesDB in Phase 5.)
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

**Status badge metadata** (`src/lib/status.ts:1`): `PROJECT_STATUS_META` for the default visual treatment (tone + icon) and two label tables: `ADMIN_LABEL` (PENDING→"Queued", REVISIONS→"Revisions Required", COMPLETED→"Completed", PUBLISHED→"Published") and `BRAND_LABEL` (PENDING→"Processing", REVISIONS→"Revisions", COMPLETED→"Review", PUBLISHED→"Published"). `getStatusLabel(status, role)` returns the right label per viewer. Used by Tasks, Dashboard, Notifications, NotificationBell, and admin pages. The `status.ts` file is a client-safe module — it imports enums from `src/lib/enums.ts:1` (edge-safe, no runtime SDK imports).

---

## 13. Environment variables

File: `.env.example:1`. All required for full functionality.

| Variable | Purpose |
|---|---|
| `APPWRITE_API_KEY` | Appwrite server API key `studiov-server` — scopes: users/sessions/tables/columns/indexes/rows read+write, buckets/files read+write, messaging read+write, usage.read (per Phase 0 console log) |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | e.g. `https://fra.cloud.appwrite.io/v1` — project "Peka.ar" (`6a8562a20037b62075e1`) |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `6a8562a20037b62075e1` |
| `NEXT_PUBLIC_APP_URL` | App URL for auth callbacks + generated embed code |
| `ADMIN_EMAIL` | Permanent admin email (required for `npm run sync-admin` and `npm run seed:appwrite`) |
| `ADMIN_PASSWORD` | Permanent admin password (≥ 6 chars, set via Appwrite `updatePassword` on sync) |
| `ADMIN_NAME` | Admin display name (optional, defaults to "Studio Admin") |

**Removed in Phase 5** (no longer in `.env.example`): `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `UPLOADTHING_TOKEN`, `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET`/`_REFRESH_TOKEN`, `GDRIVE_BACKUP_FOLDER_ID`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`. Stripe vars were never wired (no handler exists) and were dropped from `.env.example`.

**Production deploy:** see `deployment.md`.

---

## 14. Deep-dive specs

- **`pages/tasks.md`** — `/tasks` Kanban + list views, New Task modal, Job Details (admin claim/upload), Review modal (approve & publish), Published viewer, role-specific actions.
- **`pages/dashboard.md`** — `/dashboard` metric computation (views, AR launches, interaction rate, conv. lift), 12-month chart, recent tasks, quick links, Suspense/error boundaries.
- **`pages/auth.md`** — `/auth` 3-view flow (signin/signup/forgot), `/auth/verify` link-based email verification, `/auth/reset-password`, Appwrite session plumbing (`createPublicClient` public routes), security properties.
- **`pages/admin.md`** — 4 admin pages (`/admin/dashboard`, `/admin/users`, `/admin/tasks`, `/admin/analytics`): `AdminLayout`, server actions, management modals, data flows.
- **`pages/embed.md`** — `/embed/[projectId]` static-HTML route handler + hardcoded viewer config (matches landing) + 3D grid floor + top-right controls (rotate/reset) + SDK config/events endpoints + analytics liveness signal + resilience headers.
- **`file-storage-architecture.md`** — full current Appwrite Storage architecture (browser-direct uploads, auth-gated proxy, publish grants/revokes) + migration history (R2 → Filebase → UploadThing+GDrive → Appwrite).

**Related (implemented, extended since written):**
- `auth-stabilization.md` — task plan for the `requirePrincipal` + email-fallback hardening (implemented). Extended with `StaleSessionError` + `requirePrincipalOrRedirect()` for stale-session self-healing (added Jul 2026).
- `deployment.md` — Vercel deploy guide + post-deploy checklist + local-vs-prod credential table.

---

## 15. Conventions to follow when editing

- **Server vs client:** pages are server components; interactivity goes in `*Client.tsx` with `"use client"`. UI primitives in `src/components/ui/` are server-compatible (except `Modal` which uses `createPortal`).
- **Auth:** never read `user.id`/`role` directly for authorization — always go through `requirePrincipal()` (Appwrite session + `users` TableDB row, per-request). For pages, use `requirePrincipalOrRedirect()` which auto-redirects (stale/absent/suspended → `/auth`, not-onboarded → `/onboarding`). For API routes, catch `UnauthenticatedError`/`ForbiddenError` and return appropriate status. For server actions, let errors propagate to the client. Client components read the session via `useAuth()` from `@appwrite.io/react` (no cookie access).
- **Public endpoints:** return generic 404 for both missing and non-public projects (prevent enumeration). SDK config/events already do this.
- **Atomic writes:** admin claim/submit use `updateMany` with preconditions in the `where` clause (no TOCTOU). Keep this pattern.
- **Revalidation:** after project mutations call `revalidatePath("/tasks")` and `revalidatePath("/dashboard")`. After onboarding, revalidate 5 paths.
- **Transitions:** only `transition-colors`, `transition-transform`, `transition-opacity` (never `transition-all`). `active:scale-95` on buttons. `duration-300` standard.
- **Ellipsis:** use `…` not `...`. Icon-only buttons need `aria-label`. Decorative icons get `aria-hidden="true"`.
- **3D:** `<model-viewer>` is loaded via `next/script` (no SSR) for the in-app configurator (`ThreeDConfigurator` is `dynamic(..., { ssr: false })`). Camera state (`cameraOrbit` / `cameraTarget` / `autoRotate`) is preserved across re-renders once the user has interacted — `ThreeDConfigurator` listens for the `camera-change` event to set a `hasInteractedRef`, and only resets to defaults on a fresh `product.src` *if* the user has not yet interacted. The user's auto-rotate toggle is respected on every URL change (the effect does not force it back on). The public embed at `/embed/[projectId]` does NOT use React; see `pages/embed.md` for the static-HTML path.
- **Modal focus:** `Modal` (`src/components/ui/Modal.tsx:78-105`) splits its mount/open effect by `[isOpen]` only (the keydown listener is in a separate effect with a stable `useCallback` handler backed by a `onCloseRef`). This prevents the focus-trap and `firstFocusable.focus()` calls from re-firing on every parent re-render, which would otherwise steal focus from textareas in modals like Review/Published on `/tasks`.
