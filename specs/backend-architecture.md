# Backend Architecture

> Parent: [`./WEBSITE.md`](./WEBSITE.md) — cross-cutting architecture spec for the server-side layering, error taxonomy, and rate limiting. Read `WEBSITE.md` first; this file is the deep reference for `src/server/`.

## 1. Layering model

```
src/app/actions/*        Thin "use server" adapters: parse context, call a service,
                          run Next.js cache side-effects (revalidatePath), return ActionResult.
src/server/services/*    Business logic + auth checks. Throw AppError on failure.
src/server/domain/*      Pure, framework-free rules (state machine, asset policy).
src/server/db/*          TablesDB client + Appwrite error mapping.
src/server/http/*        Shared HTTP concerns (errors, rate limiting, zod schemas, ActionResult).
src/server/*             appwrite client factory, auth-guards, env, logging, storage (file permission helpers).
src/lib/                 Client-safe helpers (appwrite-config, status, enums, project-augment shapes).
```

Rules:
- **Actions never contain business logic** beyond revalidation and result mapping.
- **Services never call `revalidatePath`/`router`** — they are pure server logic.
- **Client components import actions, never services.**
- `project-augment.ts` stays in `src/lib/` (its `TaskJob`/`TaskAsset` shapes are consumed as types by client components), but imports its row/enum types from `@/server/db/client` and `@/lib/enums`.

## 2. Error taxonomy (`src/server/http/errors.ts`)

`AppError` (extends `Error`) carries `code: ErrorCode`, `httpStatus`, and `userMessage` (safe to show end users; defaults to `message`).

| Code            | HTTP | Raised by                                                       |
|-----------------|------|-----------------------------------------------------------------|
| `VALIDATION`    | 400  | zod schema failures (`ValidationError`)                         |
| `UNAUTHENTICATED` | 401 | missing/invalid session (`UnauthenticatedError`)               |
| `FORBIDDEN`     | 403  | role checks, self-edit guards (`ForbiddenError`)                |
| `NOT_FOUND`     | 404  | missing rows / unauthorized reads of a specific entity (`NotFoundError`) |
| `STATE_CONFLICT` | 409 | illegal project status transitions (`ConflictError`)            |
| `QUOTA_EXCEEDED` | 402 | `usageLimits` exhausted (`QuotaExceededError`)                  |
| `RATE_LIMITED`  | 429  | `consumeRateLimit` rejection (`RateLimitError`)                 |
| `INTERNAL`      | 500  | unexpected failures (`InternalError`)                           |

`StaleSessionError extends UnauthenticatedError`: session cookie exists but no matching `users` row → `requirePrincipalOrRedirect` redirects to `/auth`.

- **API routes** use `handleApiError(err)` (`src/server/http/handler.ts`) which maps `AppError` → JSON `{ code, message: userMessage }` + HTTP status; non-AppError → 500.
- **Mutation server actions** use `toActionResult(fn)` (`src/server/http/result.ts`) → `ActionResult<T>`; unexpected errors log + map to `INTERNAL`.

## 3. ActionResult contract (`src/server/http/result.ts`)

```
type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string }
```

- **Mutations** (`createProject`, `brandPublishProject`, `brandSendForRevisions`, `adminSubmitProject`, `adminUpdateUser`, `adminSetUserStatus`, `adminDeleteUser`) return `ActionResult`; clients branch on `result.ok` and render `result.message` (never `console.error`).
- **Reads** (`getUserProjects`, `getAllTasks`, `adminGetUsers`, admin-analytics, `getProjectLiveness`) keep throwing; server pages catch via `error.tsx`.
- **Auth forms** (register/reset/verify/onboarding) keep the throw contract — form components catch and display `err.message`.

## 4. Rate limiting (`src/server/http/rate-limit.ts`)

Appwrite table **`rate_limits`** (db `studiov`, created by `scripts/ensure-backend.ts`). Columns: `remaining` (int, min 0), `windowStart` (datetime), `route` (string, size 64).

- Window = `floor(now / windowSeconds) * windowSeconds`; `rowId = sha256(route|id|windowIndex).slice(0, 36)`.
- First hit in a window → `createRow({ remaining: limit - 1, windowStart })`. Later hits → `decrementRowColumn(remaining, 1, min: 0)`.
- `remaining === 0` → reject (throw `RateLimitError`).
- **Fail-open:** any Appwrite error while enforcing logs and passes the request (downtime must not block auth/ingest).
- Documented slop: Appwrite row updates are not fully serialized per key, so the true ceiling is ~limit + concurrent-writers-in-flight.
- `clientIpFromRequest` / `clientIpForAction` extract the real client IP from `x-forwarded-for`/`x-real-ip` (set by the hosting edge — Appwrite Sites / Vercel), falling back to `"unknown"`.

### Applied limits

| Endpoint / action                    | Key                   | Window | Limit |
|--------------------------------------|-----------------------|--------|-------|
| `POST /api/sdk/v1/events`            | IP                    | 60s    | 60    |
| `registerUser`                       | IP                    | 1h     | 10    |
| `resendVerificationEmail`            | email                 | 1h     | 5     |
| `resendVerificationEmail`            | IP                    | 1h     | 10    |
| `requestPasswordReset`               | email                 | 1h     | 3     |
| `requestPasswordReset`               | IP                    | 1h     | 10    |

## 5. Project state machine (`src/server/domain/project-state-machine.ts`)

Pure rule table `PROJECT_TRANSITIONS` + `canTransition(from, to, by)`, `allowedNextStatuses`, `describeTransition`. Consulted by `project.service.ts` for publish/revisions/submit. Matches production behavior exactly — including the fact that **REVISIONS is not re-entrant** via `brandSendForRevisions` (from must be COMPLETED or PUBLISHED).

```
ADMIN:  PENDING|REVISIONS  → COMPLETED
BRAND:  COMPLETED          → PUBLISHED
BRAND:  COMPLETED|PUBLISHED → REVISIONS
SYSTEM: PENDING|REVISIONS  → COMPLETED  (Fast generation auto-flip)
```

## 6. Services (`src/server/services/`)

| Service file                  | Exports                                                                 |
|-------------------------------|-------------------------------------------------------------------------|
| `project.service.ts`          | `createProjectService`, `brandPublishProjectService`, `brandSendForRevisionsService`, `getUserProjectsService`, `getAllTasksService`, `adminSubmitProjectService`, `listAppwriteModelAssetsForProject` |
| `generation.service.ts`       | `startFastGeneration`, `pollAndFinalize`, `regenerateFastGeneration`, `finalizeStaleGenerations` |
| `user-admin.service.ts`       | `adminGetUsersService`, `adminGetUserService`, `adminUpdateUserService`, `adminSetUserStatusService`, `adminDeleteUserService` |
| `analytics.service.ts`        | `getProjectLivenessService`, `getPlatformKPIsService`, `getSignupsSeriesService`, `getProjectsByMonthService`, `getTopBrandsService` |
| `notification.service.ts`     | `getRecentProjectActivity`                                             |
| `maintenance.service.ts`      | `runMaintenance`, `reconcileStoragePermissions`, `pruneRateLimitRows`, `pruneAnalyticsEvents`, pure helpers `hasPublicRead`, `shouldModelAssetBePublic` |

Storage permission helpers live in `src/server/storage.ts` (not a `services/` file): `setFilePublic`, `setFilePublicWithRetry` (3 attempts, 250ms exp backoff). Consumed by `project.service.ts` (publish fail-closed grant / unpublish revoke), `src/app/actions/project.ts`, and `maintenance.service.ts`.

Publish semantics (unchanged from prior behavior, now centralized):
- Fail-closed: every model `read:any` grant must succeed **before** the status flip; on any failure revoke already-granted files and throw.
- Requires ≥1 READY GLB.
- Unpublish (send-for-revisions on a PUBLISHED project) revokes `read:any` with `setFilePublicWithRetry` (3 attempts, 250ms exp backoff; residual drift covered by the nightly reconciliation sweep in §11).

## 7. Data access (`src/server/db/`)

- `client.ts` — singleton `TablesDB` (cached on `globalThis`), `DB` constant map, `getRowSafe` (returns `null` only on Appwrite 404; other errors are `mapAppwriteError`'d and thrown — fail loud), `listAllRows` (paged), `countRows`, `runTransaction` (commit/rollback with best-effort rollback on failure), `groupBy`, plus typed row interfaces (`UsersRow`, `ProjectsRow`, `AssetsRow`, `RevisionRequestRow`, `AnalyticsEventRow`) and enum re-exports.
- `errors.ts` — `isNotFoundError`, `mapAppwriteError` (404/429/401/403/400/5xx → taxonomy).
- No separate repo layer: the data surface is a single TablesDB, so repos were intentionally skipped to avoid ceremony. Services use `client.ts` helpers directly; transactional sequences stay in services.

## 8. Appwrite client factory (`src/server/appwrite.ts`)

- `createAdminClient()` — cached singleton, `env.APPWRITE_API_KEY`.
- `createSessionClient(secret, userAgent?)`, `createPublicClient()`.
- `env.ts` validates `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` (`STUDIOV_API_KEY ?? APPWRITE_API_KEY`), `NEXT_PUBLIC_APP_URL`, optional `ADMIN_*`, `CRON_SECRET`. Fails fast with a joined issue list.

## 9. Auth guards (`src/server/auth-guards.ts`)

- `getSessionPrincipal` (React `cache`d) → `Principal { userId, email, role, onboarded, companyName }`; throws `UnauthenticatedError` / `StaleSessionError` / `ForbiddenError` (suspended).
- `requirePrincipal(options)` — optional `roles`, `requireOnboarded`.
- `requirePrincipalOrRedirect(options)` — redirects `/auth` on unauthenticated/stale, `/onboarding` when not onboarded, `/dashboard` on forbidden.

## 10. Testing (`vitest`)

`npm run test` — node environment, `src/server/**/*.test.ts`. Covers: state machine transitions, asset policy validation, Appwrite error mapping, zod schemas, ActionResult/toActionResult mapping, maintenance pure helpers (58 tests). Pure modules only; no network.

## 11. Nightly maintenance cron

**Route:** `GET /api/cron/maintenance` (`src/app/api/cron/maintenance/route.ts`). Registered in `vercel.json` at `0 2 * * *` (02:00 UTC daily). `maxDuration = 60` (raise if the reconcile sweep grows). **Trigger source:** Vercel Cron fires this against the **frozen Vercel deployment** (which holds `CRON_SECRET`) — Appwrite Sites has no scheduler. If the Vercel project is deleted, move the trigger to an external scheduler (GitHub Actions / cron-job.org) hitting `https://pekaar.tech/api/cron/maintenance` and set `CRON_SECRET` as an Appwrite site variable (see `deployment.md` §3).

**Auth guard (fail closed):** the cron trigger sends `Authorization: Bearer ${CRON_SECRET}`. If `CRON_SECRET` is unset → `503 { ok: false, error: "not configured" }` (run skipped, logged). If the header does not match `Bearer ${env.CRON_SECRET}` → `401`. Any other failure goes through `handleApiError`.

**Work (`runMaintenance`, `src/server/services/maintenance.service.ts`) — runs the three steps in parallel:**

1. `reconcileStoragePermissions()` — enforces the invariant **"PUBLISHED project ⇒ its READY/PUBLISHED/ARCHIVED model assets carry `read("any")`; anything else ⇒ no `read("any")`"**.
   - Scans all `projects` rows (`Query.select(["status","brandId"])`) → set of published project ids.
   - Scans all GLB/USDZ rows (`Query.or(types)`, `Query.or(READY|PUBLISHED|ARCHIVED)`, `provider === "appwrite"`, `Query.select(["projectId","type","status","fileId"])`), filtered to those with a `fileId`.
   - Per asset: `storage.getFile` → `hasPublicRead(file.$permissions)`; only on drift call `setFilePublicWithRetry` (from `src/server/storage.ts`). Failures are counted + logged, never thrown, so one bad file can't abort the run.
   - Report: `{ scanned, granted, revoked, failures }`.
   - Legacy `AssetStatus.PUBLISHED` rows are treated as public-capable (matching the file-proxy route's viewable statuses).
2. `pruneRateLimitRows(olderThanMs = 48h)` — deletes `rate_limits` rows whose `windowStart` is older than 48h. Batched: `listRows` (limit 100, `Query.select(["remaining"])`) → `deleteRows` by `$id` chunk, loop until empty (Appwrite bulk-op plan limit is 100 rows/request on Free, 1000 on Pro).
3. `pruneAnalyticsEvents(olderThanMs = 90d)` — same batching over `analytics_events` filtered by `$createdAt` (`Query.select(["eventType"])`).
4. `finalizeStaleGenerations()` — finds all projects in RUNNING/SUBMITTED status (Fast mode), polls/finalizes each via Modal API. Idempotent — safe to run nightly as a safety net.

Response: `200 { ok: true, storage: {...}, rateLimitsDeleted, analyticsEventsDeleted }`. All work is logged via `logger`.

Pure helpers `hasPublicRead` and `shouldModelAssetBePublic` are unit-tested (see §10).

## 12. Infra provisioning

`npm run ensure-backend` (`scripts/ensure-backend.ts`, tsx, needs `.env` with API key) — idempotent:
- Creates `rate_limits` table + `remaining`/`windowStart`/`route` columns if missing.
- Hardens buckets:
  - `reference-images`: perms `['create("label:BRAND")']` (no read), `fileSecurity: true`, antivirus + encryption on.
  - `models`: perms `['create("label:ADMIN")','read("label:ADMIN")']`, allowed extensions `["glb","usdz"]`, antivirus + encryption on.

## 13. Module index

| Symbol | Location |
|--------|----------|
| `AppError`, `AppErrorCode`, subclasses | `src/server/http/errors.ts` |
| `withApi`, `handleApiError` | `src/server/http/handler.ts` |
| `consumeRateLimit`, `enforceRateLimit`, `clientIpFromRequest`, `clientIpForAction` | `src/server/http/rate-limit.ts` |
| `ActionResult`, `ok`, `fail`, `toActionResult` | `src/server/http/result.ts` |
| zod schemas | `src/server/http/schemas.ts` |
| `PROJECT_TRANSITIONS`, `canTransition`, `allowedNextStatuses`, `describeTransition` | `src/server/domain/project-state-machine.ts` |
| `ASSET_POLICY`, `validateAssetUpload`, `extensionOf`, `isAssetType` | `src/server/domain/asset-policy.ts` |
| `DB`, `getTablesDB`, `getRowSafe`, `listAllRows`, `countRows`, `runTransaction`, `groupBy`, row types | `src/server/db/client.ts` |
| `isNotFoundError`, `mapAppwriteError` | `src/server/db/errors.ts` |
| `createAdminClient`, `createSessionClient`, `createPublicClient`, `APPWRITE_API_KEY` | `src/server/appwrite.ts` |
| `env` | `src/server/env.ts` |
| `logger` | `src/server/logging.ts` |
| `getSessionPrincipal`, `requirePrincipal`, `requirePrincipalOrRedirect`, `Principal` | `src/server/auth-guards.ts` |
| `setFilePublic`, `setFilePublicWithRetry` | `src/server/storage.ts` |
| `buildManifest`, `findGlbPath`, `validateViews`, `MANIFEST_SCHEMA`, `MODEL_NAME` | `src/server/hunyuan/manifest.ts` |
| `getHy3dConfig`, `submitJob`, `pollJob`, `downloadArtifact`, `withFailover`, `Hy3dNotConfiguredError`, `Hy3dSubmissionError`, `Hy3dTransientError`, `Hy3dExpiredError` | `src/server/hunyuan/client.ts` |
| `startFastGeneration`, `pollAndFinalize`, `regenerateFastGeneration`, `finalizeStaleGenerations` | `src/server/services/generation.service.ts` |
| `runMaintenance`, `reconcileStoragePermissions`, `pruneRateLimitRows`, `pruneAnalyticsEvents`, `hasPublicRead`, `shouldModelAssetBePublic` | `src/server/services/maintenance.service.ts` |
| `GET /api/cron/maintenance` (Vercel Cron entrypoint) | `src/app/api/cron/maintenance/route.ts` |
| `GET /api/v1/generation/[projectId]` (generation poll endpoint) | `src/app/api/v1/generation/[projectId]/route.ts` |
| Project/user-admin/analytics/notification services | `src/server/services/*.service.ts` |
| Thin action adapters | `src/app/actions/{project,admin,admin-users,admin-analytics,analytics,auth,record-asset}.ts` |
| `ensure-backend` script | `scripts/ensure-backend.ts` |
