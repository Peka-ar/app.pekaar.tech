# Peka AR — Website Reference

> **Purpose:** Orientation doc for the Peka AR web app — what exists, where it lives, and the contracts that matter. Read this before touching any route, action, or integration, then the relevant deep-dive (§14). Deep detail lives in the deep-dives and the code, not here.

---

## 1. What is Peka AR

Peka AR is a premium micro-SaaS that converts standard product photography into interactive 3D/AR assets for D2C brands. A **Brand** uploads reference photos and dimensions; an **Admin** (production team) produces a GLB + optional USDZ; the Brand approves; the published model is embeddable as an iframe in any storefront.

**Two generation modes:** (display labels — enum values stay `PREMIUM`/`FAST`)
- **Artist** (default, enum `PREMIUM`) — artist-finished 3D model. Brand uploads photos, Admin produces GLB + USDZ, Brand reviews and publishes. 10 credits.
- **Fast** (enum `FAST`, labeled **"AI pipeline"**) — AI-generated 3D model (~5-10 min). Brand uploads photos + tags views, Hunyuan3D Modal API generates GLB, auto-flips to COMPLETED for brand review. 2 credits. Regenerate costs 1 credit. Clearly labeled "AI pipeline" throughout.

**Two roles:**
- **`BRAND`** (default on signup) — creates projects, uploads reference images, reviews the model, requests revisions (with a note), or approves & publishes.
- **`ADMIN`** (production + platform ops) — sees all projects, uploads 3D models (Artist mode) or overrides AI-generated models (Fast), submits for the brand's review, manages users, views platform KPIs.

**Project lifecycle (4 states):**

```
Artist (enum PREMIUM):
PENDING ───admin "Submit"───▶ COMPLETED ───brand "Approve & Publish"───▶ PUBLISHED
    ▲                            │                                              │
    │                            │ brand "Request Changes" (with note)         │
    │                            ▼                                              │
    └──────────────────── REVISIONS ◀─────── brand "Send for Revisions" ───────┘
                                    admin re-uploads + Submits
                                    back to COMPLETED

Fast (AI pipeline):
PENDING ───Modal API job───▶ COMPLETED ───brand "Approve & Publish"───▶ PUBLISHED
    ▲ (FAILED → brand "Regenerate")    │
                                       │ brand "Request Changes" (with note)
                                       ▼
                               REVISIONS ──admin re-submit──▶ COMPLETED
```

Status labels differ by viewer (`getStatusLabel` in `src/lib/status.ts`):

| Status | Admin label | Brand label |
|---|---|---|
| PENDING | Queued | Processing |
| REVISIONS | Revisions Required | Revisions |
| COMPLETED | Completed | Review |
| PUBLISHED | Published | Published |

**PUBLISHED is the only embed-servable state.** Sending a PUBLISHED project for revisions stops the embed immediately (embed route is `no-store` + `force-dynamic`). Revision notes are stored in the `revision_requests` table (one row per request) so the full back-and-forth is preserved.

**Site split:** this repo is the **app** at `https://app.pekaar.tech`. The marketing site (landing, pricing, contact, terms, privacy, about, blog) lives at the apex `https://pekaar.tech` in the sister repo `Peka-ar/pekaar.tech` (Astro — its specs live there). The apex permanently 301/308-redirects `/embed/*` + `/api/sdk/*` here; this repo's root `/` permanently redirects to the apex.

---

## 2. Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | config in `next.config.mjs` |
| Hosting | **Appwrite Sites** (site id `peka-ar`, display name `app.pekaar.tech`) at **https://app.pekaar.tech** + frozen Vercel mirror (still serves old vercel.app embed URLs; its cron trigger died at the split — external scheduler now) | handbook: `specs/deployment.md` |
| UI | **React 19**, **Tailwind CSS v4**, **lucide-react** | tokens in `globals.css` |
| 3D | **Google `<model-viewer>`** via `next/script` | no SSR — dynamically imported (in-app configurator) |
| Auth | **Appwrite Cloud** (region `fra`) — `@appwrite.io/react` (client + SSR helpers) + `node-appwrite` (server) | `src/server/auth-guards.ts`, `src/server/appwrite.ts` |
| DB | **Appwrite TablesDB** (database `studiov`, 6 tables) | `src/server/db/client.ts`, `src/lib/appwrite-config.ts` |
| File storage | **Appwrite Storage** — buckets `models` (ADMIN-create, 150 MB) + `reference-images` (BRAND-create, 16 MB) | browser-direct uploads; full spec: `file-storage-architecture.md` |
| Email | **Appwrite Cloud email** (Gmail SMTP in console) | built-in verification + recovery templates only — no app code sends email |
| Theming | none — **light-only** | dark surfaces survive as components only (ink bands, auth split) |
| Validation | **zod** | `src/server/http/schemas.ts` |
| Testing | **vitest** | `npm run test` — pure server modules only |
| Passwords | **Appwrite** (Argon2, hashed server-side; app never stores them) | |

**Scripts:** `npm run dev` · `build` · `start` · `lint` · `test` · `sync-admin` · `seed:appwrite` · `ensure-backend` (idempotent infra provisioning).

**API key gotcha:** Appwrite Sites forbids user-set env vars with the `APPWRITE_` prefix — the server key is read as `STUDIOV_API_KEY ?? APPWRITE_API_KEY` in `src/server/appwrite.ts`.

---

## 3. Folder layout

```
app.pekaar.tech/
├── public/embed-viewer.html   # static template served by the /embed route handler
├── public/peka_logo.png       # brand logo (image mark used by every header/footer; source for favicon set)
├── src/
│   ├── app/                   # App Router pages + actions/ (server actions) + api/ (API routes)
│   ├── components/            # ui/ (primitives), charts/ (ChartBars), auth/, dashboard/, admin/, ThreeDConfigurator
│   ├── lib/                   # client-safe: enums, appwrite-config, status, types, utils, hooks, project-augment
│   ├── server/                # server-only: auth-guards, appwrite, env, storage, db/, http/, domain/, services/
│   ├── assets/fonts/          # local woff2: Figtree 400+900 (display), Inter 300-600 (sans)
│   └── proxy.ts               # middleware — cookie-presence route gating only
├── scripts/                   # sync-admin.ts, seed-appwrite.ts, ensure-backend.ts
├── specs/                     # ← you are here
├── vercel.json                # Vercel Cron schedule (consumed by the frozen mirror; Sites ignores it)
└── design.md                  # design system spec (local-only)
```

Key subfolders: `src/app/actions/` (auth, project, admin, admin-users, admin-analytics, analytics, record-asset), `src/app/api/` (§5), `src/server/db/` (TablesDB client), `src/server/services/` (business logic), `src/server/domain/` (pure state machine + asset policy), `src/server/http/` (errors, rate limiting, ActionResult, zod).

**Path alias:** `@/*` → `src/*`. `src/lib/` is client-importable (edge-safe constants + enums); `src/server/` is never imported by client components.

---

## 4. Route map

All `page.tsx` are server components; interactivity lives in `*Client.tsx`. Auth is enforced per-request via `requirePrincipal()`/`requirePrincipalOrRedirect()` (§7), not by middleware.

| Route | Auth | Summary |
|---|---|---|
| `/` | Public | `permanentRedirect("https://pekaar.tech")` — marketing owns the apex; this route exists only to land old root links there |
| `/auth` | Public (session → role-aware redirect) | 3-view form: signin / signup / forgot-password |
| `/auth/verify` | Public | Email verification link (`?userId&secret` → `updateVerification`) |
| `/auth/reset-password` | Public | New-password form (`?userId&secret` → `updateRecovery`, 1-hr expiry) |
| `/onboarding` | Logged-in, not onboarded | 5-step wizard → `completeOnboarding` |
| `/dashboard` | BRAND/ADMIN + onboarded | Metrics, 12-mo chart, recent tasks — `pages/dashboard.md` |
| `/tasks` | BRAND/ADMIN + onboarded | Kanban + list, 4 status modals — `pages/tasks.md` |
| `/notifications` | BRAND/ADMIN | Recent projects + status table. **Role-aware shell** (`notifications/layout.tsx`): BRAND → own projects in the `DashboardLayout` shell; ADMIN → all recent platform projects in the `AdminLayout` shell. Reached from the brand sidebar and the admin sidebar's Notifications item |
| `/integrations` | BRAND/ADMIN + onboarded | Platform directory, live iframe preview, embed-code snippet |
| `/analytics` | BRAND/ADMIN + onboarded | `?range=7D\|30D\|ALL`; ADMIN=global, BRAND=scoped |
| `/billing` | BRAND/ADMIN | Current plan, credits remaining, plan comparison with per-plan Contact us → plan-request popup — `subscription-architecture.md` |
| `/admin/dashboard` | ADMIN | Platform KPIs, status table, signups chart, top brands — `pages/admin.md` |
| `/admin/users` | ADMIN | User list + detail drawer with role/status/limits management |
| `/admin/tasks` | ADMIN | All-project board, 3D upload + submit |
| `/admin/requests` | ADMIN | Contact request inbox — `subscription-architecture.md` |
| `/admin/analytics` | ADMIN | Platform KPI cards, signups series, top brands |
| `/embed/[projectId]` | Public | Static HTML iframe viewer — `pages/embed.md` |

Marketing routes (`/pricing`, `/contact`, `/terms`, `/privacy`, `/about`, `/blog`) live on the apex — sister repo `Peka-ar/pekaar.tech`. Billing stays here: paid CTAs on the marketing pricing page link cross-origin into `/billing`.

---

## 5. API routes (`src/app/api/`)

| Route | Auth | Purpose |
|---|---|---|
| `GET\|POST /api/appwrite/[...appwrite]` | public | SSR auth handlers (`createAppwriteHandlers` from `@appwrite.io/react`) — creates/deletes the session cookie, redirects to `/dashboard` or `/auth`. Needs the server API key. |
| `GET /api/notifications` | `requirePrincipal` | 10 newest of caller's projects. Errors degrade to `[]`. No UI consumer since the header bell was removed — retained as the auth-gated uptime probe in `deployment.md` (an unauthenticated request still returns `401`, proving the server is up). |
| `GET /api/health` | none | Verifies admin client can reach Appwrite (`200 {ok}` / `503`). For uptime monitors. |
| `GET /api/cron/maintenance` | `Bearer CRON_SECRET` (fail closed) | Nightly maintenance: storage-permission reconciliation, `rate_limits` (>48h) + `analytics_events` (>90d) pruning, and AI pipeline generation sweep (polls/finalizes stuck projects). Triggered by Vercel Cron on the frozen mirror — see `deployment.md` for the migration runbook if Vercel goes away. |
| `POST /api/sdk/v1/events` | public, CORS `*` | Analytics ingest: `{ eventType: VIEW\|INTERACTION\|AR_LAUNCH, sessionId, projectId }` → `analytics_events` row. Rate-limited 60/min/IP. |
| `GET /api/sdk/v1/config/[projectId]` | public, cached 60s | `{ assetUrls: { glb, usdz }, sdkConfig }` for PUBLISHED projects only (404 otherwise, prevents enumeration). URL derivation: `resolveAssetUrl` in the route file. |
| `GET /api/v1/assets/[assetId]/file` | auth-gated | Streaming proxy for **all in-app asset reads** — `requirePrincipal` (BRAND passes if owner or linked-project brand), then streams from Appwrite Storage with the server API key. `Cache-Control: private, max-age=60`. |
| `GET /api/v1/generation/[projectId]` | `requirePrincipal` | Polls and finalizes AI pipeline generation. Returns `{ generationStatus, generationError?, generationCompletedAt? }`. Also called by the nightly cron sweep. Rate-limited 30/min/principal. |

**Uploads have no API route:** the browser uploads directly to Appwrite Storage (session-authenticated `storage.createFile`), then the `recordAssetUpload` server action creates the `assets` row (§10).

**`<Image>` gotcha:** every `<Image>` pointing at the asset proxy must carry `unoptimized` — Next's optimizer at `/_next/image` fetches the URL without cookies, so the proxy's auth check always rejects it. `unoptimized` makes the browser fetch the proxy directly with cookies. In-app reads always proxy through the SSR host; the public embed avoids the proxy entirely via CDN URLs (§11) — acceptable at current scale.

---

## 6. Project lifecycle

**State machine** (pure rules in `src/server/domain/project-state-machine.ts`, enforced transactionally in `project.service.ts`):

| Transition | Who | Guard |
|---|---|---|
| `PENDING\|REVISIONS` → `COMPLETED` | ADMIN `adminSubmitProject` | in-tx read requires status ∈ {PENDING, REVISIONS} |
| `COMPLETED` → `PUBLISHED` | BRAND owner `brandPublishProject` | guarded `updateRows` requiring COMPLETED + brandId; ≥1 READY GLB |
| `COMPLETED\|PUBLISHED` → `REVISIONS` | BRAND owner `brandSendForRevisions` | non-empty note; creates `revision_requests` row in the same tx |

**Invariants:**
- **REVISIONS is not re-entrant** — a project already in REVISIONS must be resubmitted (→ COMPLETED) before another revision request.
- **Publish is fail-closed:** every READY GLB/USDZ storage file gets `read:any` granted *before* the status flip; any grant failure revokes already-granted files and aborts. `PUBLISHED ⇒ files publicly readable`.
- **Unpublish revokes:** `brandSendForRevisions` on a PUBLISHED project revokes `read:any` (`permissions: []`) after the tx commits, + `revalidatePath('/embed/[id]')`.
- **Model replacement archives:** on resubmit, prior READY MODEL_GLB/USDZ rows flip to `ARCHIVED` inside the same tx (projectId kept for "Previous models"); archived files are **always kept in storage** (user decision), no quota impact.
- **Quota:** `createProject` atomically `decrementRowColumn(users, usageLimits, min: 0)` in a tx — `usageLimits` is the **remaining budget** (default 10 for BRAND, 9999 for ADMIN).

**Gotcha (TablesDB):** a staged (in-transaction) bulk `updateRows` always returns `{ total: 0, rows: [] }` — the response only reflects executed ops at commit. Preconditions are therefore enforced with in-tx `getRowSafe` reads + single-row `updateRow`, never by checking staged bulk-update responses. `adminSubmitProject` also re-reads each new model inside the tx and requires READY + `projectId === null` (prevents COMPLETED with a model that silently failed to link).

---

## 7. Auth & session

Appwrite Cloud owns everything: password sessions (httpOnly cookie `appwrite-session-<projectId>`), link-based email verification, and recovery. **No OTP, no magic-link/Token model, no JWT claims** — the canonical identity is always resolved server-side per request.

**`requirePrincipal()`** (`src/server/auth-guards.ts`) — the ONLY auth resolver. Appwrite session → `users` TableDB row → `Principal { userId, email, role, onboarded, companyName }`. Throws `UnauthenticatedError`, `StaleSessionError extends UnauthenticatedError` (session valid but no users row — DB reset / deleted user), or `ForbiddenError` (role mismatch / not onboarded / suspended). Wrapped in React `cache()` so all calls in one request share one lookup. Never read `user.id`/`role` directly for authorization.

**`requirePrincipalOrRedirect()`** — page helper. Redirects: unauth/stale/suspended → `/auth`, not-onboarded → `/onboarding`, role error → `/dashboard`.

**Proxy** (`src/proxy.ts`) — edge middleware, cookie-presence only (the edge runtime cannot call Appwrite): public bypass for `/`, `/auth/*`, `/embed/*`; protected prefixes without a session cookie → `/auth`. API routes are not in the matcher — auth is in-handler.

**Suspended accounts:** Appwrite lets them log in, so `requirePrincipal` checks `users.status` per-request and throws `ForbiddenError("Account suspended")` — every protected page/action/route is blocked.

**Full flow details (registration, login, verify, reset, session plumbing):** `pages/auth.md`.

---

## 8. Server actions (`src/app/actions/`)

All `"use server"`, thin adapters over `src/server/services/*.service.ts` (layering: `backend-architecture.md`). **Mutations return `ActionResult<T> = { ok: true; data } | { ok: false; code, message }`** — clients branch on `result.ok`. Reads and auth forms keep the throw contract.

| Action | Auth | Purpose |
|---|---|---|
| `registerUser` | public, rate-limited 10/h/IP | Create BRAND user (Appwrite user + users row + label) or re-verify existing unverified; never resets a verified account's password (takeover guard); sends verification email |
| `resendVerificationEmail` | public, rate-limited 5/h/email + 10/h/IP | Re-send verification for unverified users (no enumeration) |
| `requestPasswordReset` | public, rate-limited 3/h/email + 10/h/IP | `createRecovery` on the **public client**; always returns success (no enumeration) |
| `resetPassword` | public | `updateRecovery` (≥8 chars, 1-hr expiry) on the public client |
| `completeOnboarding` | `requirePrincipal` | Sets name/category/platform/catalogSize + `onboarded: true`; revalidates 5 paths |
| `getSessionPrincipal` | session | Returns `{ onboarded, role, sessionSecret }` — `SignInForm` uses the secret to `client.setSession()` (SSR sign-in does not hydrate the client SDK — without this, browser-direct uploads go out as guest) |
| `logout` | session | `deleteSession("current")` + cookie delete + redirect `/` |
| `createProject` | BRAND | Tx: quota decrement + asset ownership/READY/`isNull(projectId)` check → PENDING project, links assets |
| `brandPublishProject` | BRAND owner | Fail-closed publish (§6) |
| `brandSendForRevisions` | BRAND owner | → REVISIONS + revision row; revoke grants if was PUBLISHED |
| `getUserProjects` | any role | Caller's projects (newest first) → `TaskJob[]` via `buildTaskJob()` (`src/lib/project-augment.ts`) |
| `getAllTasks` | ADMIN | All projects + brands + assets + revisions → `TaskJob[]` |
| `adminSubmitProject` | ADMIN | Tx: precondition + per-asset link verification + archive prior models + link new + → COMPLETED (§6) |
| `updateProjectDimensions` | BRAND owner or ADMIN | Overwrite the `dimensions` JSON on **any status** (generic 404 for missing/foreign — no enumeration); revalidates `/tasks`, `/dashboard`, `/admin/tasks` |
| `deletePendingProject` | BRAND owner | Cascade-delete a **PENDING-only** project (in-tx status precondition): project + linked assets + revision_requests + analytics_events rows, then best-effort storage file deletes + one post-commit orphan re-sweep for assets a racing FAST finalize may re-create. **Credits are never refunded.** Generic 404 for missing/foreign |
| `pollGeneration` | BRAND owner or ADMIN, rate-limited 30/min (`poll-gen:`) | Poll + finalize one FAST generation (generic 404 for missing/foreign — no enumeration) |
| `pollActiveGenerations` | BRAND owner or ADMIN, same `poll-gen:` bucket | Auto-poll-on-load batch (`/tasks`): server-scoped query for non-terminal FAST gens (BRAND own, ADMIN latest 10) → `Promise.allSettled(pollAndFinalize)` → `{ polled }` |
| `regenerateGeneration` | BRAND owner or ADMIN, rate-limited 6/h | Re-submit a terminal FAST generation (1 credit, refund on failure); ownership checked **before** deduction |
| `adminGetUsers` / `adminGetUser` | ADMIN | User list (JS search, 50/page) / user detail + counts + last-5 projects |
| `adminUpdateUser` / `adminSetUserStatus` / `adminDeleteUser` | ADMIN (not self) | Update role/limits/tier / suspend+reason or activate / **explicit cascade delete** (TablesDB has no FK cascades: projects, assets, events, revision_requests, users row, Appwrite user) |
| `getPlatformKPIs` / `getSignupsSeries` / `getProjectsByMonth` / `getTopBrands` | ADMIN | Platform aggregates for admin dashboard/analytics |
| `getProjectLiveness` | session | Latest event per project → embed liveness badges |
| `recordAssetUpload` | by type (REF → BRAND, MODELS → ADMIN) | Idempotent by `rowId = fileId`; ASSET_POLICY validation; creates READY `assets` row (§10) |
| `submitPlanRequest` | session, rate-limited 5/h/userId | Billing plan-request popup → `contact_requests` row; `company` auto-injected from principal; zod |
| `getSubscriptionOverview` | session | Billing page data: tier, credits, renewal date |
| `adminSetUserTier` | ADMIN (not self) | Set user's subscription tier + monthly credits + renewal date |
| `adminListContactRequests` | ADMIN | List contact requests (optional status filter) |
| `adminUpdateContactRequest` | ADMIN | Update request status |
| `adminDeleteContactRequest` | ADMIN | Delete contact request |

**Never return a raw Appwrite row from a server action** — project to a plain object first (`Models.Row` metadata breaks Next.js Server→Client serialization).

---

## 9. Data model (Appwrite TablesDB)

Database `studiov` (id `studiov`); table ids in `src/lib/appwrite-config.ts`; typed rows in `src/server/db/client.ts`; enums in edge-safe `src/lib/enums.ts`.

**Row identity: `$id` is the canonical id everywhere** — users row `$id` == `userId` == Appwrite auth user id; assets row `$id` == storage fileId.

- **`users`** — `$id`, `userId`, `email`, `role` (BRAND/ADMIN), `usageLimits` (Int, **remaining budget**), `subscriptionTier` (string, null→FREE), `creditsRenewedAt` (datetime), `monthlyCreditOverride` (Int, null), `name`, `onboarded`, `productCategory`, `storefrontPlatform`, `catalogSize`, `status` (ACTIVE/SUSPENDED), `suspendedAt`, `statusReason`, `emailVerified`. Indexes: email, role, status, `$createdAt`.
- **`projects`** — `$id`, `name`, `sku`, `instructions`, `dimensions` (JSON string), `status` (PENDING/REVISIONS/COMPLETED/PUBLISHED), `sdkConfig` (JSON string, forward-compat — the embed uses hardcoded config), `brandId`. Indexes: brandId, status, `$createdAt`.
- **`revision_requests`** — `$id`, `projectId`, `note`, `requestedBy`. One row per brand revision request.
- **`assets`** — `$id` (= storage fileId), `projectId` (null until linked), `ownerId`, `type` (REFERENCE_IMAGE/MODEL_GLB/MODEL_USDZ), `status` (READY/ARCHIVED — never UPLOADING/PUBLISHED/DELETED), `provider` (`"appwrite"`; legacy seed rows `"external"`), `fileId` (null for seed rows), `url` (absolute Appwrite `/view` URL; legacy rows keep external URLs), `originalName`, `mimeType`, `size`, `checksum`. Compound index: projectId+type+status.
- **`analytics_events`** — `$id`, `eventType` (VIEW/INTERACTION/AR_LAUNCH), `sessionId`, `projectId`, `brandId`.
- **`rate_limits`** — provisioned by `ensure-backend`; consumed by `consumeRateLimit` (`src/server/http/rate-limit.ts`). Fail-open.
- **`maintenance_locks`** — provisioned by `ensure-backend`; single `"nightly-lock"` row + `expiresAt` (6h TTL) claims the nightly cron run so overlapping triggers skip instead of double-crediting (`src/app/api/cron/maintenance/route.ts`). Fail-open when missing.
- **`contact_requests`** — provisioned by `ensure-backend`; name, email, company, message, interestedTier, status (NEW/CONTACTED/RESOLVED), sourceIp. Plan-request submissions from the billing popup, managed by admins at `/admin/requests`.

Schema is console-managed (no code migrations) — after console schema changes, update this section.

**Scripts:** `npm run sync-admin` (idempotent: upserts env-driven admin, deletes stray ADMINs — exactly one permanent admin). `npm run seed:appwrite` (local/dev only: demo brand + 3 projects with external-URL assets, skip-on-existence).

---

## 10. File upload flow

Full spec: `file-storage-architecture.md`.

1. Client hook `useAppwriteUpload({ bucketId, maxSizeMB, allowedExtensions })` (`src/lib/use-appwrite-upload.ts`) — uses the session-authenticated `storage` service from `useAppwrite()`.
2. `upload(file, type)` → browser calls `storage.createFile` **directly to Appwrite** (bypasses SSR body limit — essential for 100MB+ GLBs; `onProgress` is percent 0-100).
3. On success → `recordAssetUpload({ fileId, type })`: role check by type, `storage.getFile` metadata, ASSET_POLICY validation (reject → best-effort `deleteFile`), **idempotent** `createRow(assets, { rowId: fileId, …READY, provider: "appwrite" })`.
4. Client stores the returned `RecordedAsset`; brand links via `createProject(assetIds)`, admin via `adminSubmitProject(glbAssetId, usdzAssetId?)`.
5. Client SDK must hold the session: soft-navigation sign-in requires the `client.setSession(sessionSecret)` step (§8 `getSessionPrincipal`) or bucket `create` fails as guest.

**Validation:**

| Asset type | Extensions | Max size | Bucket |
|---|---|---|---|
| `REFERENCE_IMAGE` | jpg jpeg png webp gif avif (bucket gate + client) | 16 MB | `reference-images` (BRAND) |
| `MODEL_GLB` / `MODEL_USDZ` | glb / usdz (client check) | 128 MB (hook) / 150 MB (bucket) | `models` (ADMIN) |

**Delivery paths:** in-app reads always via the auth-gated proxy (§5); published embeds via direct CDN `/view` URLs (read:any granted at publish). **`/view` URLs must carry `?project=<id>`** — Appwrite rejects anonymous `/view` fetches without project context (404 even on read:any files), so `buildFileUrl` (`src/lib/appwrite-config.ts`) always includes it.

---

## 11. Public embed SDK

Full spec: `pages/embed.md`.

- **`/embed/[projectId]`** — route handler that reads `public/embed-viewer.html`, replaces `{PROJECT_ID}`, returns `no-store` + `force-dynamic` (PUBLISHED→REVISIONS stops serving immediately). Never touches `app/layout.tsx` — no fonts, no React, no providers.
- **`GET /api/sdk/v1/config/[projectId]`** — public, 60s-cached. Only `assetUrls.glb`/`usdz` are per-project; **viewer config is hardcoded** (same values as the in-app `ThreeDConfigurator`, which both the embed template and the marketing Sandbox mirror, user decision). `sdkConfig` is kept for forward-compat.
- **`POST /api/sdk/v1/events`** — VIEW on load, INTERACTION on first camera-change, AR_LAUNCH on first AR session-started/object-placed (once each per page view).
- **Dark/light toggle** in the viewer: light default, applied pre-paint from `localStorage["peka-embed-theme"]` (per-origin — shared across all embeds); fires no analytics event. Themed via local tokens only — see `pages/embed.md` §Dark / light theme (incl. the `--text-primary` inversion trap).
- **Embed liveness:** latest VIEW per project → "Last Seen" + amber (>7d) / red (>30d) badges on `/analytics` (`src/lib/embed-liveness.ts`).
- Resilience headers on `/embed/*` (`next.config.mjs`): nosniff, strict-origin-when-cross-origin, XR-sensor Permissions-Policy — and **no X-Frame-Options** (meant to be cross-origin framed).
- Embed code generator: `generateEmbedCode` in `src/lib/utils.ts` (iframe snippet shown on `/integrations`).

---

## 12. Design system

**Primary reference:** `design.md` (repo root, local-only) — v3.2: forest `#163300` primary CTA, lime `#9fe870` accent (accents + CTA fill on dark grounds), butter support on dark grounds, Figtree 400/900 display, sage `#e8ebe6`, light-only, 24px rounded-rect buttons. Tokens + component classes in `globals.css`; no dark mode in the app (the public embed template carries its own local light/dark toggle — `pages/embed.md` §Dark / light theme).

Key invariants:
- **Never white text on lime** — ink labels on accent (`--on-accent`); lime is never a button fill on a light ground.
- Button vocabulary is 1:1 with `globals.css` classes: `primary` (forest fill), `secondary` (lime fill — **dark grounds only**), `tertiary` (white + ink hairline — the light-ground secondary), `support` (butter fill — dark-ground secondary), `ghost`, `destructive`. `Button.tsx` / `LinkButton.tsx` expose all six; do not hand-roll ink/lime pill CTAs — convert strays to the kit.
- Tinted surfaces (sky/butter/accent-pale) are for capability/story bands and icon wells only — **never on interactive elements** (Peka Green owns interaction).
- Status chips use fill tints of canonical tokens — `PROJECT_STATUS_META` in `src/lib/status.ts` maps status → tone/icon + role labels.
- Figtree ships 400+900 only; every `.font-display` element is pinned to 900. App page headlines use the `.page-title` utility (`clamp(1.75rem,2.5vw,2rem)`).
- `transition-all` is banned (use `transition-colors`, `transition-opacity`, or an explicit `transition-[property]`); gradients and hard-coded hex/rgba are banned in app markup.
- Elevation shadows (`--shadow-1/2`) are reserved for floating layers (dropdowns, drawers, dark panels, hover lifts) — static white cards on sage are shadowless.
- Radii: canonical card `24px` (`rounded-[24px]` = `rounded-3xl`); dense/mid-size cards may use `16px` (`rounded-2xl`).

**v3.2 rollout state (all committed surfaces):** app shells (`DashboardLayout`/`AdminLayout` + mobile drawers) are a white sidebar with a sage `<main>`; there is no top header on desktop — mobile gets a slim top bar (hamburger + wordmark, below `md`) and page-level `action`s render right-aligned above content instead. Content cards are borderless white `24px` surfaces that pop on the sage canvas. Rolled-out pages: `/dashboard`, `/tasks`, `/notifications`, `/integrations`, `/analytics`, `/onboarding`, `/admin/*`; `/auth*` keeps its sanctioned white + ink-split layout with lime reserved for the dark panel. Dark ink panels survive only as component-level surfaces (`card inverted`, integrations embed section, review/published takeover modals, auth/onboarding split panels). Skeletons: pass `tone="sage"` for page-level white shapes; default (`canvas-soft`) is for bars on white card interiors.

---

## 13. Environment variables

File: `.env.example` (local-only — gitignored via the `.env*` pattern). Validated at boot by `src/server/env.ts` (zod, fails fast).

| Variable | Purpose |
|---|---|
| `APPWRITE_API_KEY` | Server API key (local). On Appwrite Sites it's `STUDIOV_API_KEY` — read via the fallback in `src/server/appwrite.ts` |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | e.g. `https://fra.cloud.appwrite.io/v1` |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `6a8562a20037b62075e1` |
| `NEXT_PUBLIC_APP_URL` | App URL for auth email links + embed code (runtime-read). **Production = `https://app.pekaar.tech`** — never the apex (that's the marketing site) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | For `sync-admin`/`seed:appwrite` — local only, never site variables |
| `CRON_SECRET` | Optional; guards `/api/cron/maintenance` (held by the frozen Vercel mirror today) |
| `HY3D_API_URL` | Optional; Hunyuan3D Modal API base URL (primary). Required for Fast mode. |
| `HY3D_API_URL_2` | Optional; Hunyuan3D Modal API base URL (fallback). |
| `HY3D_API_TOKEN` | Optional; Bearer token for Hunyuan3D Modal API (`hy3d-api-auth` secret). Required for Fast mode. |
| `LOG_LEVEL` | Optional; `src/server/logging.ts` |

---

## 14. Spec index

- **`backend-architecture.md`** — server layering, error taxonomy, ActionResult, rate limiting, state machine, services, db client, auth guards, testing, cron, `ensure-backend`.
- **`subscription-architecture.md`** — subscription tiers, credit renewal, contact requests, admin deal-setting, security.
- **`file-storage-architecture.md`** — Appwrite Storage: buckets, browser-direct uploads, proxy, publish grants/revokes, archival.
- **`deployment.md`** — production handbook: two Appwrite Sites (app @ app.pekaar.tech + marketing @ apex pekaar.tech), cutover runbook, env vars, workflow, rollback, DNS, frozen Vercel mirror.
- **`generation-architecture.md`** — AI pipeline (Fast) generation: Hunyuan3D Modal API integration, image normalization, manifest builder, poll/finalize, cron sweep, credits.
- **`pages/tasks.md`** — `/tasks` Kanban + list + the 4 status modals.
- **`pages/dashboard.md`** — `/dashboard` metrics + 12-month chart.
- **`pages/auth.md`** — `/auth*` flows + session plumbing + security properties.
- **`pages/admin.md`** — `/admin/*` pages + admin actions.
- **`pages/embed.md`** — `/embed/[projectId]` + SDK endpoints + hardcoded config.

---

## 15. Conventions to follow when editing

- **Server vs client:** pages are server components; interactivity goes in `*Client.tsx` with `"use client"`. UI primitives in `src/components/ui/` are server-compatible (except `Modal`, which uses `createPortal`).
- **Auth:** always `requirePrincipal()` / `requirePrincipalOrRedirect()` — never trust `user.id`/`role` directly. API routes catch `UnauthenticatedError`/`ForbiddenError` and return statuses; server actions let errors propagate (mutations wrap with `toActionResult`).
- **Public endpoints:** return generic 404 for both missing and non-public projects (prevent enumeration).
- **Atomic writes:** status preconditions live inside TablesDB transactions with in-tx reads (`getRowSafe`), never staged bulk-update responses.
- **Revalidation:** after project mutations call `revalidatePath("/tasks")` + `revalidatePath("/dashboard")` (and `/admin/tasks`, `/embed/[id]` where relevant).
- **Transitions:** only `transition-colors`, `transition-transform`, `transition-opacity` (never `transition-all`). `active:scale-95` on buttons. `duration-300` standard.
- **Ellipsis:** use `…` not `...`. Icon-only buttons need `aria-label`. Decorative icons get `aria-hidden="true"`.
- **Brand mark:** the logo is the image `public/peka_logo.png` rendered via `next/image` (there is no text wordmark component). Use `alt=""` inside home links that already carry an `aria-label`, `alt="Peka AR"` elsewhere. The favicon set is `src/app/favicon.ico` + `icon.png` + `apple-icon.png` (Next file conventions, all derived from `peka_logo.png` — regenerate all three together when the logo changes).
- **3D:** `<model-viewer>` loads via `next/script` (no SSR) for the in-app configurator. Camera state (`cameraOrbit`/`cameraTarget`/`autoRotate`) is preserved across re-renders once the user has interacted; reset only on fresh `product.src` if not yet interacted. The public embed is static HTML — see `pages/embed.md`.
- **Modal focus:** `Modal` splits its mount/open effect by `[isOpen]` only, with the keydown listener in a separate stable-callback effect — prevents focus-stealing from textareas in modals like Review/Published on `/tasks`.
- **Modal sizing:** the panel is height-constrained (`max-h-[calc(100dvh-32px)]`, flex column, `shrink-0` header/footer, `min-h-0` scrollable body) so long content scrolls instead of pushing the footer off-screen. Sizes: `sm|md|lg|xl|2xl|full` (`2xl` = `max-w-2xl`, used by the New Task wizard).
