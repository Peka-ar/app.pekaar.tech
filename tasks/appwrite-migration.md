# Appwrite Migration Plan — STUDIO.V

> **Status:** IN PROGRESS — Phases 0–5 done; Phase 6 in progress (verification smoke test; perf fixes landed 2026-08-28; three Phase-6-found bugs fixed 2026-08-30: SPA session hydration, staged bulk-update guard, embed asset URL missing `?project=`).
> **Parent:** `../specs/WEBSITE.md` · `../specs/file-storage-architecture.md`
> **Historical context:** this repo has migrated storage twice before (R2 → Filebase → UploadThing, see `file-storage-architecture.md` §13 and the older `tasks/` records). This migration is the **first full-stack** one: auth, database, storage, and email all move to Appwrite Cloud.

---

## 0. Migration log (append as phases complete)

### Phase 0 — Console setup — DONE (2026-08-19)

Everything below was created in the Appwrite console via MCP against project **`6a8562a20037b62075e1`** ("Peka.ar", region `fra`). **Project name intentionally NOT renamed** — STUDIO.V is rebranding to Peka.ar; the site will be updated separately.

| Resource | ID | Details |
|---|---|---|
| API key | `studiov-server` | Scopes: users.read/write, sessions.read/write, tables/columns/indexes/rows read+write, buckets/files read+write, providers/messages/targets/topics/subscribers read+write, usage.read. **Secret is in `.env` → `APPWRITE_API_KEY`** (gitignored; do NOT re-print into committed files) |
| Web platform | `web-production-site` | hostname `studio-v-indol.vercel.app`. NOTE: creating a `localhost` platform returns 409 — Appwrite implicitly allows localhost, so no dev platform is needed |
| Database | `studiov` | serverless spec |
| Table `users` | `users` | see §3.1; unique index `idx_email` on `email` (email-format column), keys `idx_role`, `idx_status` |
| Table `projects` | `projects` | see §3.2; keys `idx_brandId`, `idx_status`, `idx_createdAt` on **`$createdAt`** (system column IS indexable in TablesDB — confirmed) |
| Table `assets` | `assets` | see §3.3; keys `idx_projectId`, `idx_ownerId`, composite `idx_project_type_status` (`[projectId, type, status]`) |
| Table `revision_requests` | `revision_requests` | see §3.4; keys `idx_projectId`, `idx_createdAt` |
| Table `analytics_events` | `analytics_events` | see §3.5; keys `idx_projectId`, `idx_brandId`, `idx_createdAt` |
| Bucket `models` | `models` | 150 MB max, no extension gate, file_security ON, perms `["create(\"label:ADMIN\")", "read(\"label:ADMIN\")"]`, encryption OFF (>20 MB skip), antivirus OFF, compression none |
| Bucket `reference-images` | `reference-images` | 16 MB max, extensions `jpg png webp gif avif`, file_security ON, perms `["create(\"label:BRAND\")", "read(\"label:BRAND\")"]`, encryption ON, antivirus ON |
| SMTP | — | `smtp.gmail.com:465` SSL, user `studiov3242@gmail.com`, app password `dlcdoogejmqerylq`, sender name **"Peka.ar"**, sender email `studiov3242@gmail.com`, enabled. (Same Gmail account the old Nodemailer stack used) |

**Critical discovery — permission string format (this Appwrite version):** the old `create(role:label:ADMIN)` format is REJECTED with `general_argument_invalid`. The raw string format is now quoted with the role selector as the argument:

```
create("label:ADMIN")     → Permission.create(Role.label('ADMIN'))
read("label:BRAND")       → Permission.read(Role.label('BRAND'))
read("any")               → Permission.read(Role.any())
read("user:ABC123")       → Permission.read(Role.user('ABC123'))
```

No `role:` prefix anywhere. Applies to bucket-level, file-level, and row-level permission strings in API/SDK calls.

**Other Phase 0 notes:**
- `tables_db_create_table` accepts `columns` + `indexes` arrays in ONE call (see §3 schema defs). Enum columns need `elements` array. Required columns CANNOT have `default` (API rule); app code must always supply values.
- Auth methods enabled on project: email-password, magic-url, email-otp, anonymous, invites, jwt, phone (defaults). Only email-password is used by the app; tightening the rest is optional.
- Email templates (verification/recovery) left at Appwrite defaults — the click URL is passed per-call via `createVerification({ url })` / `createRecovery({ url })`, so no template edits are needed for Phase 1-2.
- Org "GitHub Student Organization" (`6a85627c9045b9507bc8`) still shows `status: draft` but the project is `active` and the plan (`auto-1`, pro group, $0) is applied — no usage blocked. Keep an eye on it.

### Phase 1 — Foundations — DONE (2026-08-19)

NextAuth fully removed; Appwrite SSR session plumbing in place. Gates: `npm run build` passes, `npm run lint` 0 errors, zero `next-auth`/`@/auth` imports.

| Item | Result |
|---|---|
| Deps | `appwrite@25.2.0` (pinned to `^25.2.0` to satisfy `@appwrite.io/react@0.1.0` peer range), `node-appwrite@26.2.0`, `@appwrite.io/react@0.1.0`, `@tanstack/react-query@5.101.4`. Legacy packages NOT uninstalled (Phase 5) |
| `src/lib/appwrite-config.ts` | **new (deviation from §4.2):** edge-safe constants only (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `SESSION_COOKIE`, `APPWRITE_DATABASE_ID`, `APPWRITE_USERS_TABLE_ID`) — zero SDK imports so `src/proxy.ts` (edge) can import `SESSION_COOKIE` without bundling `node-appwrite` |
| `src/lib/appwrite.ts` | `APPWRITE_API_KEY` (server-only), `createAdminClient()` (cached singleton), `createSessionClient(secret, userAgent?)`; re-exports the config constants |
| Handler route | `src/app/api/appwrite/[...appwrite]/route.ts` — `createAppwriteHandlers` from `@appwrite.io/react/handlers/next`, `redirects: { success: "/dashboard", failure: "/auth" }` |
| Providers | `src/app/providers.tsx` = `AppwriteProvider` (`endpoint`/`projectId`/`ssr: { session, basePath: "/api/appwrite" }`) wrapping the existing `ThemeProvider`; `layout.tsx` (now async) reads the cookie via `createNextServerHelpers({ endpoint, projectId }).readSessionCookie()` and passes it down |
| `src/proxy.ts` | Rewritten as cookie-presence gate only (`request.cookies.has(SESSION_COOKIE)`); `export function proxy` (Next 16 proxy convention). Role/onboarded gating moved into `requirePrincipalOrRedirect` per-request. `protectedRoutes` table retained for documentation; matcher unchanged |
| `src/lib/auth-guards.ts` | Rewritten (pulled from Phase 2 per §14.3): `createNextServerHelpers(...).getLoggedInUser()` → null ⇒ `UnauthenticatedError`; admin-client `TablesDB.getRow(users, user.$id)` → missing ⇒ `StaleSessionError`; `status === "SUSPENDED"` ⇒ `ForbiddenError("Account suspended")`; local `Role` const+type (structurally identical to generated Prisma enums). `requirePrincipalOrRedirect` now auto-redirects not-onboarded → `/onboarding` (replaces the middleware's onboarded check; `onboarding/page.tsx` opts out via `allowUnonboarded`), and suspended / stale-session → `/auth` (clear-session route deleted per §4.6). `Principal` contract unchanged — zero consumer edits |
| `src/app/actions/auth.ts` | Removed `unstable_update` import + call (`completeOnboarding` — JWT refresh no longer needed; session reads the DB row per request). `logout` rewritten server-side: session-client `account.deleteSession({ sessionId: "current" })` + `cookies().delete(SESSION_COOKIE)` + `redirect("/")`. Prisma-backed register/OTP/preflight actions left intact until Phase 2 |
| `src/app/auth/page.tsx` | `getLoggedInUser()` → redirect `/dashboard` when a session exists. Interim: onboarded-aware routing lands with Phase 2 (no Appwrite sessions exist yet) |
| Client swaps | `SignInForm`/`SignUpForm`: `signIn` (next-auth/react) → `useAuth().signIn.emailPassword`; `DashboardLayout`/`MobileNavDrawer`: `useSession` → `useAuth`; `AdminLayout`: `SessionProvider` wrapper dropped (user arrives via props) |
| Deleted | `src/auth.ts`, `src/auth.config.ts`, `src/types/next-auth.d.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/auth/clear-session/route.ts` |

**Cookie name — corrected vs §14.1:** the `@appwrite.io/react` package's default session cookie is **`appwrite-session-<projectId>`** (verified in installed source: `dist/esm/config-CxVjjUye.js` → `DEFAULT_COOKIE_NAME_PREFIX = "appwrite-session"`), NOT `a_session_<projectId>` (the raw-SDK convention). `createAppwriteHandlers`, `readSessionCookie`, and the client hooks share this default, so no `cookieName` override is needed. `SESSION_COOKIE` in `appwrite-config.ts` matches the package default.

**Scope note (gate interpretation):** the §14.2 gate "zero next-auth/prisma imports" was applied as **zero `next-auth` / `@/auth` imports**. Prisma imports remain in the ~25 files slated for Phases 2–4 (`actions/project.ts`, SDK routes, admin pages, `api/uploadthing`, etc.) — full prisma removal is Phase 3 (data layer) + Phase 5 (delete `prisma/`). Runtime auth flows are in a documented broken-interim state until Phase 2: the NextAuth/Prisma stack is gone from the auth path, but Appwrite user rows aren't wired into the forms yet, so signup/sign-in won't complete a session until Phase 2 lands.

### Phase 2 — Auth — DONE (2026-08-19)

Signup → verify email → login → onboarding → dashboard works end-to-end on Appwrite. Gates: `npm run build` passes (with `NODE_OPTIONS=--max-old-space-size=6144` on this machine — default heap OOMs in the Turbopack TypeScript step, pre-existing), `npm run lint` 0 errors, zero `next-auth`/`@/auth` imports, zero `@/lib/prisma|@/lib/password|@/lib/emails` imports in the auth path.

| Item | Result |
|---|---|
| `src/lib/appwrite.ts` | Added `createPublicClient()` — bare endpoint+project client for PUBLIC routes (`updateVerification`, `createRecovery`, `updateRecovery`). Do NOT attach the API key: `applications` role lacks the `public` scope → `(role: applications) missing scope (public)` |
| `src/app/actions/auth.ts` | **Full rewrite — prisma/OTP/next-auth residue removed.** New exports: `registerUser(formData) → { email, verificationRequired: true }`, `resendVerificationEmail(email) → { success, status: "invalid"\|"sent" }`, `requestPasswordReset(email) → { success: true }` (always succeeds, no enumeration; errors logged), `resetPassword(userId, secret, password) → { success: true }`, `completeOnboarding(input)` (unchanged contract), `getSessionPrincipal() → { onboarded, role } \| null`, `logout` (kept server action, see §4.4). Private: `normalizeEmail`, `optionalText`, `appUrl()`, `lookupUserByEmail` (`Users.list` + `Query.equal("email")`), `sendVerificationEmail(userId)` (mint session → `createVerification({ url: APP_URL + "/auth/verify" })` → delete session in `finally`; Appwrite appends `userId`+`secret` to the link). Deleted: `preflightLogin`, `verifyEmail`, `verifyEmailOtp`, `resendVerificationOtp`, `issueVerificationOtp`, `generateOtp` |
| `registerUser` (deviation §4.4) | **Admin client, not handler** (D1): `Users.list` by email → verified ⇒ throw "Email already registered"; unverified ⇒ `Users.updatePassword` + resend; new ⇒ `Users.create(ID.unique(), email, password)` + `TablesDB.createRow(users, { rowId: user.$id, data: { userId, email, role: "BRAND", usageLimits: 10, onboarded: false, status: "ACTIVE" } })` + `Users.updateLabels(["BRAND"])` + verification email (failure → recoverable throw "Account created, but we couldn't send the verification email…"). Password min 6 |
| Verify flow (deviation §4.4) | `/auth/verify?userId=&secret=` → `Account(createPublicClient()).updateVerification` → **success card, NO auto session** (D2 — verified: `updateVerification` returns no session token) → manual sign-in → onboarding routing. Invalid/missing/expired → error card |
| Reset flow | `/auth/reset-password?userId=&secret=` + `ResetPasswordForm({ userId, secret })` → `updateRecovery({ userId, secret, password })` (public client). Link invalid/expired → "Reset link is invalid or expired" |
| `SignInForm` | Dropped `preflightLogin` (D5): `signIn.emailPassword` → `getSessionPrincipal()` → `postLoginPath(onboarded, role)` (`/onboarding`, `/admin/dashboard`, `/dashboard`). Error mapping: 401 / `user_invalid_credentials` / `user_not_found` → "Invalid email or password."; 429 / `*rate_limit*` → "Too many attempts…" |
| `SignUpForm` | OTP stage removed → "Check your inbox" + spam hint + `Resend verification email` button (calls `resendVerificationEmail`). No auto sign-in after signup |
| `AuthClient` | Dropped `handleSignUpSuccess`/`onSuccess` |
| `/auth` page | Onboarded-aware: session + not onboarded → `/onboarding`; ADMIN → `/admin/dashboard`; BRAND → `/dashboard`; no session → `AuthClient` |
| Deleted | `src/components/auth/OtpInput.tsx` (zero remaining imports) |
| Console | No changes (localhost implicitly allowed; prod platform registered in Phase 0). **Open question for Phase 5:** register `studio-v-indol.vercel.app` is already done; no per-env URLs needed |

### Phase 3 — Data layer — DONE (2026-08-19)

Read/write data path rewritten from Prisma to TablesDB. Gates: `npm run lint` 0 errors, `npm run build` passes (with `NODE_OPTIONS=--max-old-space-size=6144`).

| Item | Result |
|---|---|
| `src/lib/appwrite-config.ts` | Added `APPWRITE_PROJECTS_TABLE_ID`, `APPWRITE_ASSETS_TABLE_ID`, `APPWRITE_REVISION_REQUESTS_TABLE_ID`, `APPWRITE_ANALYTICS_EVENTS_TABLE_ID`, `APPWRITE_MODELS_BUCKET_ID` |
| `src/lib/db.ts` | **new:** local enums (`ProjectStatus`/`AssetStatus`/`AssetType`/`UserStatus`/`EventType` — same literal values as the generated Prisma enums, structural drop-in); row interfaces (`UsersRow`/`ProjectsRow`/`AssetsRow`/`RevisionRequestRow`/`AnalyticsEventRow` extending `Models.Row`); `getTablesDB()` singleton; `getRowSafe()`; `listAllRows()` (paginates past the 100-row `listRows` cap); `countRows()` (via `listRows(...).total`); `runTransaction()` (create → stage ops by `transactionId` → commit, best-effort rollback on error); `groupBy()` |
| `src/lib/project-augment.ts` | **new:** `buildTaskJob()` maps a project row + assets + brand + revision requests to the client `TaskJob` shape — `id` = `$id`, `createdAt`/`updatedAt` = system columns, `dimensions` parsed from the mediumtext JSON string, proxy URLs `/api/v1/assets/{id}/file` (kept in Phase 3), archived-sort by `$updatedAt`. `key`/`gdriveFileId` dropped from derived assets (client types made optional; GDrive link hides via its falsy check in `AdminTasksClient.tsx:581`) |
| `src/app/actions/project.ts` | `createProject` — pre-check `usageLimits > 0`, then tx: `decrementRowColumn(users, usageLimits, value:1, min:0)` (atomic quota guard; **`usageLimits` now means remaining budget** — admin UI already renders "remaining") + asset ownership/READY verify + `createRow(projects, ID.unique())` + `updateRows` asset link. `brandPublishProject` — single guarded `updateRows`. `brandSendForRevisions` — tx: status flip via `Query.or([COMPLETED, PUBLISHED])` + `createRow(revision_requests)`. `getUserProjects` — batched: projects by brandId, assets/revisions by `equal(projectId, ids)`, brand via `getRow(users)` with principal fallback |
| `src/app/actions/admin.ts` | `getAllTasks` — batched IN-queries for assets/revisions/brands, grouped in JS. `adminSubmitProject` — tx: status flip (`rows.length === 0` → "Project is no longer available to submit"), archive prior READY GLB/USDZ (`updateRows`, collect `fileId`s for `utapi.deleteFiles` — legacy UT keys live in `assets.fileId` until Phase 4), link new assets (`isNull(projectId)`) |
| `src/app/actions/admin-users.ts` | `adminGetUsers` — role/status via queries, **search via JS substring filter** (avoids the fulltext-index requirement on `email`/`name`), 50/page, `total` from filtered length. `adminGetUser` — counts via `countRows`, recent 5 projects. `adminUpdateUser`/`adminSetUserStatus` — `updateRows` with `equal("$id", id)` (0 matched → "User not found"). `adminDeleteUser` — **explicit cascade tx** (projects by brandId; assets by ownerId ∪ projectId; events by brandId ∪ projectId; revisions by requestedBy ∪ projectId; users row) + Appwrite `Users.delete(id)` — fixes the latent Prisma FK-Restrict bug where deleting a user with revision requests failed |
| `src/app/actions/admin-analytics.ts` | Counts via `countRows`; `projectsByStatus` ×4 status queries; `getSignupsSeries` per-month `between("$createdAt", start, end)`; `getProjectsByMonth` fetch-since + JS month buckets; `getTopBrands` all brands + all projects → JS count by brandId → sort/slice |
| `src/app/actions/analytics.ts` | `getProjectLiveness` — per-project `listRows(equal(projectId[, brandId]), orderDesc("$createdAt"), limit(1))` → converts `$createdAt` to `Date` (consumers in `embed-liveness.ts` call `.getTime()`) |
| `src/lib/notifications.ts` | `getRecentProjectActivity` → `listRows(projects, equal(brandId), orderDesc("$createdAt"), limit(10))` |
| Client type tweaks | `TasksClient.tsx`/`AdminTasksClient.tsx`: `TaskAsset.key`/`gdriveFileId` → `?: string \| null`. `AdminUsersClient.tsx`: `createdAt: Date \| string`, `suspendedAt: Date \| string \| null` (server returns ISO strings; consumers wrap in `new Date(...)`) |
| Console | `users` table: key index `idx_createdAt` on `$createdAt` added via MCP (`tables_db_create_index`, status now `available`) — required for `orderDesc` in `adminGetUsers`. All other tables already had `$createdAt` indexes from Phase 0 (verified via `tables_db_list_indexes`) |

**SDK corrections vs §6 (verified in `node-appwrite@26.2.0` dist types):** `bulkUpdate`/`bulkDelete` do NOT exist — the real names are `updateRows({queries, data})` / `deleteRows({queries})`, both returning the matched `RowList<Row>` (use `rows.length === 0` as the throw guard). `RowList<Row> = { total, rows }` — NOT `documents` (`models.d.ts:27-36`). `incrementRowColumn` has only a `max` bound; `decrementRowColumn` has `min`. `listRows` default limit 25, **max 100**. Transactions: `createTransaction({ttl?})` → pass `transactionId` on every staged call (createRow/updateRows/deleteRows/decrementRowColumn, and listRows/getRow for uncommitted reads) → `updateTransaction({ commit: true | rollback: true })`. `Query.or([...])` takes a single array of query strings; `Query.equal("$id", [ids])` is IN semantics; `Query.isNull(col)` exists. **`updateRows` with no queries updates ALL rows — never call without queries.**

**Phase 3 deviations from plan (recorded):**
- `TaskJob.status` typed as the `ProjectStatus` literal union (not `string`) so client `PROJECT_STATUS_META[status]` indexing type-checks (identical union to the generated enum).
- `adminGetUsers` search is JS-side (case-insensitive substring over the filtered list) — no fulltext index needed; fine at this scale.
- `getProjectLiveness` returns `Date` values (original contract preserved).
- Interim breakage (expected): the UT uploader still writes Prisma `assets` rows until Phase 4 — `createProject` cannot see brand uploads yet; asset proxy + SDK routes remain Prisma-backed (thumbnails 404 for TablesDB-created rows). Phase 3 gate verified via MCP-inserted asset rows + UI walkthrough.

### Phase 4 — Storage — DONE (2026-08-19)

UploadThing removed from the upload/proxy path; all file traffic is Appwrite Storage (browser-direct createFile → TablesDB `assets` rows → auth-gated proxy streaming; published embeds consume direct CDN URLs). Gates: `npm run lint` 0 errors, `npm run build` passes (`NODE_OPTIONS=--max-old-space-size=6144`).

**Phase 4 follow-up — server-action return shape (2026-08-19):**
- Browser smoke test surfaced `Error: Only plain objects, and a few built-ins, can be passed to Client Components from Server Components` when `createProject` returned the raw Appwrite `ProjectsRow` from `db.createRow`. `Models.Row` instances carry `$permissions`, `$sequence`, etc. whose prototype/metadata break Next.js's RSC serializer (the row was reachable but un-stringifiable).
- **Fix:** `createProject` now returns `{ success, projectId, remaining }` — only the id of the newly created row, never the row itself. Other actions (`adminSubmitProject`, `brandPublishProject`, `brandSendForRevisions`, `recordAssetUpload`) already returned plain objects and were unaffected.
- **Rule recorded in `specs/file-storage-architecture.md` Risks:** never return an Appwrite row from a server action — always project to a plain object first. Future actions returning created/read rows must do the same.

| Item | Result |
|---|---|
| `src/lib/appwrite-config.ts` | Added `APPWRITE_REFERENCE_IMAGES_BUCKET_ID` (`reference-images`), `buildFileUrl(bucketId, fileId)` → `${APPWRITE_ENDPOINT}/storage/buckets/{b}/files/{f}/view` (server-side URL construction; the server SDK `getFileView` returns bytes, not a URL), `bucketForAssetType(type)` (REFERENCE_IMAGE → `reference-images`, else `models`), `defaultMimeTypeForAssetType(type)` (GLB → `model/gltf-binary`, USDZ → `model/vnd.usdz+zip`) |
| `src/app/actions/record-asset.ts` | **new server action:** `recordAssetUpload({ fileId, type }) → { asset: RecordedAsset }`. Auth by type: REFERENCE_IMAGE → `[Role.BRAND]`, MODEL_GLB/MODEL_USDZ → `[Role.ADMIN]` (console buckets `create` gated the same way). Admin-client `storage.getFile` → `createRow(assets, { rowId: fileId })` — **assets row `$id` = storage fileId** (single identifier), `projectId: null`, `ownerId: principal.userId`, `status: READY`, `provider: "appwrite"`, `url` = `buildFileUrl`, `size` = `file.sizeOriginal`, `checksum` = `file.signature` (MD5), `mimeType` falls back to the type default. Returns the client-facing asset shape (no `key`) |
| `src/lib/use-appwrite-upload.ts` | **new client hook** (replaces `src/lib/hooks/use-presigned-upload.ts`, deleted): `useAppwriteUpload({ bucketId, maxSizeMB, allowedExtensions }) → { upload(file, type), isUploading, progress, error, reset }`. Uses the pre-built `storage` service from `useAppwrite()` (session-authenticated client, `@appwrite.io/react` provider). `storage.createFile({ bucketId, fileId: ID.unique(), file, onProgress: (p) => setProgress(p.progress) })` — client SDK `UploadProgress` is `{ progress: 0-100 }` (NOT bytes, unlike the server SDK `{ progress, bytesUploaded, bytesTotal }`). Then `recordAssetUpload`. Error mapping: 403 → permission, 413 → too large, 429 → rate limit, 400 → bucket rejection; best-effort `deleteFile` orphan cleanup on failure |
| `src/app/actions/project.ts` | `brandPublishProject` — **grant-before-flip**: `listAppwriteModelAssets(projectId)` (READY + provider `appwrite` GLB/USDZ with `fileId`) → `storage.updateFile({ permissions: [read(any)] })` allSettled, then guarded `updateRows` → status PUBLISHED; flip failure → best-effort revoke (`permissions: []`) + throw. `brandSendForRevisions` — after commit, if `wasPublished`: revoke read:any on the same asset set (`permissions: []`), log-only on failure. `updateFile` sends `permissions` only when defined, so `[]` clears file-level perms. `Permission`/`Role` from `node-appwrite` aliased `AppwriteRole` (local `Role` enum already imported from `@/lib/auth-guards`) |
| `src/app/actions/admin.ts` | `adminSubmitProject` — archived-file cleanup now provider-split: rows with `provider === "uploadthing"` → `utapi.deleteFiles(fileId)` (legacy UT keys; `uploadthing-server.ts` kept until Phase 5); rows with `provider === "appwrite"` → **files KEPT** (user decision: archived models stay viewable via "Previous models") |
| Proxy `src/app/api/v1/assets/[assetId]/file/route.ts` | **TablesDB rewrite.** `getRowSafe(assets, id)` → 404 if missing or status ∉ {READY, PUBLISHED, ARCHIVED}. Always auth-gated: `requirePrincipal([ADMIN, BRAND])`; BRAND must be `ownerId === principal.userId` OR the linked project's `brandId` (fixes the old 404-on-unlinked-assets bug: unlinked uploads happen during project creation — the old route required `asset.projectId` and threw 404). Delivery: provider `appwrite` → `fetch("{endpoint}/storage/buckets/{b}/files/{f}/download")` with `X-Appwrite-Project` + `X-Appwrite-Key` headers, stream `res.body` (web stream, no buffering); providers `external`/`uploadthing` (seed/legacy) → plain `fetch(asset.url)`. Headers: stored `mimeType` (type-default fallback), `Content-Disposition: inline`, `Cache-Control: private, max-age=60`, upstream `Content-Length` when present. Log line on every hit. `deliverAsset`/`x-source` removed |
| SDK config `src/app/api/sdk/v1/config/[projectId]/route.ts` | **TablesDB rewrite** (`listRows(equal(projectId))`): emits `assets.url` **directly** — the stored absolute Appwrite `/view` URL (read:any granted at publish makes it publicly fetchable; embed-viewer prepends `APP_URL` = `""`, so absolute URLs pass through). Fallback: first non-READY row of each type if no READY exists. `sdkConfig` passthrough. Cache headers unchanged |
| SDK events `src/app/api/sdk/v1/events/route.ts` | **TablesDB rewrite:** `createRow(analytics_events, { eventId: ID.unique(), data: { eventType, sessionId, projectId, brandId: project.brandId } })`, 201. Same validation + PUBLISHED guard |
| Embed `src/app/embed/[projectId]/route.ts` | **TablesDB rewrite** (`listRows` hasGlb check) — deviation from plan ("no change") because the Prisma gate couldn't see TablesDB rows, breaking publish→embed. Serves `public/embed-viewer.html` with `{PROJECT_ID}` replaced |
| `src/app/tasks/TasksClient.tsx` | `usePresignedUpload` → `useAppwriteUpload({ bucketId: APPWRITE_REFERENCE_IMAGES_BUCKET_ID, maxSizeMB: 16, allowedExtensions: ["jpg","jpeg","png","webp","gif","avif"] })`; `upload(file, "REFERENCE_IMAGE")`; `UploadedAsset` now the hook's `RecordedAsset` type; local `TaskAsset.key?/gdriveFileId?` fields dropped |
| `src/app/admin/tasks/AdminTasksClient.tsx` | Two hooks, both `bucketId: APPWRITE_MODELS_BUCKET_ID`, `maxSizeMB: 128` (`glb`/`usdz` extensions); `upload(file, "MODEL_GLB"/"MODEL_USDZ")`; local `UploadedAsset` type removed (imported from the hook); GDrive "Previous models" download link removed (no `gdriveFileId` on TablesDB rows), copy → "Earlier uploads remain available in Appwrite storage. New uploads replace the previous ones." |
| `next.config.mjs` | `images.remotePatterns`: `*.ufs.sh` → `fra.cloud.appwrite.io` (glb/usdz loads go through the proxy, but future `<Image>`-served refs may hit Appwrite CDN) |
| Deleted | `src/app/api/uploadthing/` (route + core), `src/lib/hooks/use-presigned-upload.ts`, `src/lib/uploadthing.ts` (client re-export, nothing imported it), `src/lib/storage/` (types, gdrive-adapter, gdrive-client, asset-delivery, naming, index) |
| Kept until Phase 5 | `src/lib/uploadthing-server.ts` (`utapi` — legacy archive cleanup in `adminSubmitProject`), `src/app/api/admin/assets/[assetId]/gdrive-download/route.ts` (legacy rows only), `prisma/` + generated client — runtime Prisma reads remain in `dashboard`, `notifications`, `integrations`, `analytics` pages + the gdrive-download route; enum-type-only imports in ~10 client files (`ProjectStatus`, `Role`, `UserStatus` from `@/generated/prisma/client`) |

**Phase 4 notes:**
- **File visibility model:** bucket-level `read` is label-scoped (BRAND for reference-images, ADMIN for models); browser-side `getFileView` of another user's file is blocked. The proxy route (admin-client fetch with API key) is the delivery path for in-app rendering; **read:any is only ever granted on published projects' GLB/USDZ files** — reference images never get read:any. Grant/revoke happens on the storage file, not the row.
- **Deliberate mirror:** published CDN URL = `assets.url` (the same absolute `/view` URL the SDK config emits). No cache-busting query.
- **In-app gating stays on the row** (status/owner checks) — file-level perms are a second layer for the embed path.
- Interim breakage (expected): `api/admin/assets/[assetId]/gdrive-download` and Prisma-backed seeds reference `assets.gdriveFileId` — legacy rows only, new rows store `null` (column is absent on TablesDB; the route queries Prisma which sees empty tables → 404, harmless).
- `Query.or` used inside `listAllRows` for the publish asset set (single array of query strings).

### Phase 5 — Seed, scripts & final cleanup — DONE (2026-08-19)

Prisma fully removed from runtime, scripts, and config; Appwrite-native seed + admin-bootstrap scripts in place. Gates: `npm run lint` 0 errors, `npm run build` passes (`NODE_OPTIONS=--max-old-space-size=6144`), `npm run sync-admin` idempotent (run 1 "Created", run 2 "Updating"). `npm run seed:appwrite` written but **not executed** (user opted out — demo data not seeded into the shared dev project).

| Item | Result |
|---|---|
| `src/lib/enums.ts` | **new (edge-safe, zero SDK imports):** `ProjectStatus`/`AssetStatus`/`AssetType`/`UserStatus`/`EventType`/`Role` const+type pairs moved out of `db.ts`/`auth-guards.ts` (which now re-export from it) so client components can import them without bundling `node-appwrite`. 13 files re-pointed off `@/generated/prisma/client` (client files → `@/lib/enums`; server pages' `Role` → `@/lib/auth-guards`) |
| Page rewrites (un-documented blocker for `prisma/` deletion) | `dashboard`/`integrations`/`analytics`/`notifications` pages migrated from Prisma reads to TablesDB: `dashboard` — `listAllRows<AnalyticsEventRow>` (metrics) + `greaterThanEqual("$createdAt", iso)` VIEW filter (chart); `integrations` — `getRowSafe<UsersRow>` (storefrontPlatform) + `listAllRows<ProjectsRow>` (PUBLISHED, `orderDesc("$createdAt")`); `analytics` — `eventQueries()` builder (brandId/eventType/from/to), `countRows` ×3 per range, `listAllRows<AnalyticsEventRow>` for chart + `groupBy`-based leaderboards (`projectCounts`), `listAllRows<ProjectsRow>` by `$id` IN for names; `notifications` — `listAllRows<ProjectsRow>` + `as ProjectStatus` cast. All `$createdAt` comparisons use ISO strings |
| `adminSubmitProject` | utapi legacy-cleanup branch removed (`archivedUtKeys` collection + post-commit `utapi.deleteFiles`). **Behavior note:** archival row-flip unchanged; legacy `provider: "uploadthing"` rows' files can no longer be deleted (UT token removed with the package) — rows remain ARCHIVED and inert |
| Deleted | `src/lib/{prisma,password,emails,mail,uploadthing-server}.ts`, `src/app/api/admin/assets/[assetId]/gdrive-download/route.ts` (zero consumers since Phase 4), `prisma/` (schema, migrations, seed, generated client), `prisma.config.ts`, `scripts/get-gdrive-refresh-token.ts`, `scripts/get-published-id.ts`, `probe-analytics.mjs` (stale, referenced non-existent `prisma.event`) |
| `scripts/seed-appwrite.ts` | **new** + `npm run seed:appwrite`: admin-client upserts (env admin from `ADMIN_*`; demo `brand@example.com`/`brand123`, name "Acme Furniture Co.") with `updateLabels([role])` + `updateEmailVerification(true)` + users rows (`rowId` = Appwrite `$id`); 3 demo projects (Velvet Sheen Armchair PUBLISHED w/ sdkConfig / Nordic Oak Table COMPLETED / Eames Lounge Replica PENDING) with `provider: "external"` asset rows (Khronos GLB + Unsplash URLs, GLB `status: READY`); skip-on-existence (email lookup + project-name `equal`). Not run (user opted out) |
| `scripts/sync-admin.ts` | **rewritten Appwrite** (was Prisma): `Users.list` by email → create or update (`updateName`/`updatePassword`/`updateLabels(["ADMIN"])`/`updateEmailVerification(true)`), users-row upsert (`role: "ADMIN"`, `usageLimits: 9999`, `onboarded: true`, `status: "ACTIVE"`); stray ADMINs deleted via users-table `role === "ADMIN"` query where email ≠ env email (`Users.delete` + `deleteRow`, per-row try/catch). **Verified:** run 1 created admin `werewolfiscool404@gmail.com` (`6a85e2ac00277cca950c` — no prior user matched env email; no strays existed), run 2 "Updating" |
| Config | `package.json`: removed `@prisma/adapter-pg`, `@prisma/client`, `pg`, `@types/pg`, `bcryptjs`, `@types/bcryptjs`, `next-auth`, `nodemailer`, `@types/nodemailer`, `googleapis`, `uploadthing`, `@uploadthing/react`, `prisma`, `hermes-parser` (stray direct dep), `postinstall: prisma generate`, `prisma.seed`; added `seed:appwrite` + `dotenv` devDep `^17.4.2` (previously only transitive via prisma — scripts would have broken after prune). 184 packages pruned. `tsconfig.json`: `@/generated/prisma/client` alias removed. `.env.example`: replaced per §9 (7 vars). `.env`: legacy vars stripped (`DATABASE_URL`, `DIRECT_URL`, `UPLOADTHING_TOKEN`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `GMAIL_*`, `GOOGLE_*`, `GDRIVE_*`). `.gitignore`: prisma entries removed. `next.config.mjs`: unchanged (Phase 4) |

**Phase 5 notes:**
- Transient `tsc` errors from `.next/types/validator.ts` (stale generated route types for the deleted gdrive-download route) resolve on `npm run build` — not a source issue.
- `npm run seed:appwrite` remains unverified against the live project; run it in Phase 6 (or locally) to complete the §10 gate.
- No `next-auth`/`prisma`/`uploadthing`/`bcryptjs`/`nodemailer`/`googleapis` imports remain anywhere in `src/` (verified by grep after deletions).

### Phase 6 — Verification & performance — IN PROGRESS (2026-08-28)

Manual smoke test (user) surfaced severe latency + a post-sign-in stuck render. Profiling from `npm run dev` logs: `POST /api/appwrite/sign-in/email-password` 7.9s (2.6s app-code), `POST /auth getSessionPrincipal` 1.5s, `GET /admin/dashboard` 8.4s app-code, `GET /dashboard` 3.4s app-code, `GET /admin/users` ~1s. Root causes + fixes:

| Fix | Files | Result |
|---|---|---|
| Sign-in double navigation: `SignInForm` called `router.push()` + `router.refresh()` — refresh re-rendered `/auth`, which (session present) `redirect()`ed to `/admin/dashboard` again → two competing dashboard renders + an /auth render = frozen page until manual refresh | `src/components/auth/SignInForm.tsx` | Removed `router.refresh()` (push fetches fresh RSC with the new cookie); button stays `isLoading` through navigation. Sign-in now lands directly on the target route |
| `requirePrincipal` unmemoized — 2 sequential Appwrite RTTs (getLoggedInUser → users-row getRow) per call, repeated per page render (page guard + data actions each re-fetched) | `src/lib/auth-guards.ts` | Core session+row fetch wrapped in React `cache()` (`getSessionPrincipalData`); role/onboarded checks stay outside the cached fn. All calls in one request share a single session lookup + row fetch. Contract unchanged (zero consumer edits) |
| `getSignupsSeries(12)` = 12 sequential `countRows` (~600ms RTT each) — dominant cost of /admin/dashboard's 8.4s app-code | `src/app/actions/admin-analytics.ts` | Single `listAllRows(users, ≥(months-1))` + JS month bucketing (mirrors `getProjectsByMonth`); labels now computed from local months (consistent with the bucket key) |
| `getPlatformKPIs` projectsByStatus: 4 sequential `countRows` | same | `Promise.all` over the 4 status queries |
| Brand /dashboard ran 2 sequential `listAllRows(analytics_events)` (metrics + 12-mo chart) | `src/app/dashboard/page.tsx` | One brandId `listAllRows` (parallel with `getUserProjects` via `Promise.all`) + JS filter (projectId set, VIEW, ≥ 12 mo); metrics + chart derived in memory |
| `/integrations` user-row + published-projects queries ran serially | `src/app/integrations/page.tsx` | `Promise.all` |
| No navigation loading states → `router.push` showed a frozen frame while RSC streamed (8-15s dev / 1.5-3s prod) | new `src/app/{auth,dashboard,tasks,onboarding,analytics,integrations,notifications,admin}/loading.tsx` | Segment `loading.tsx` files render the same layout chrome (`DashboardLayout`/`AdminLayout`) + existing skeletons (`DashboardSkeleton`/`AdminDashboardSkeleton`) so navigations show instant framed feedback |

**Perf ledger (attempts logged):**
- **Kept:** `router.refresh()` removal — direct sign-in landing verified in prod (`next start`); before: double dashboard render + /auth render per sign-in, after: single navigation.
- **Kept:** `cache()` on the principal fetch — collapses 2-5 duplicated auth RTTs per request to 1.
- **Kept:** serial→parallel + single-fetch refactors in admin-analytics/dashboard/integrations — before: 12+4+2 serial RTTs on /admin/dashboard, after: all parallel.
- **Not attempted:** analytics page merge (6 countRows + 3 listAllRows → 1 fetch) — already parallelized at the page level (single `Promise.all` + 2 small serial follow-ups); wall-clock dominated by slowest query, not sum; left as-is to avoid range-behavior risk.

**Measured (prod `next start`, port 3001):** server ready 791ms (dev: 17.1s); sign-in → /admin/dashboard landed in one navigation; full dashboard rendered. Dev-mode per-route Turbopack compiles (`GET / 55s`, `Compiling /admin/dashboard`) are dev-only and absent from prod builds — final timing gate should be measured on `next start`. **Pending:** user manual re-measure of the full Phase 6 flow (signup → verify → onboarding → tasks → admin submit → publish → embed) after these fixes.

#### Phase 6 follow-up — three Phase-6-found bugs (2026-08-30)

Manual Phase 6 testing (user) surfaced three additional bugs — all latent since Phase 4, first-ever exercised by an upload:

**Bug 1 — client SDK unauthenticated after SPA sign-in (browser-direct uploads fail as guest).**
- Symptom: BRAND ref-image upload in the New Task modal → `Missing "create" permission for role "label:BRAND". Only "[\"any\",\"guests\"]" scopes are allowed…`. Same class of failure awaited admin GLB/USDZ uploads (`models` bucket, `label:ADMIN`).
- Root cause: the `@appwrite.io/react` **SSR sign-in never hydrates the client SDK session**. The proxy handler (`sign-in/email-password`) creates the session server-side, sets the httpOnly `appwrite-session-<projectId>` cookie, and returns only `{ user }`; the provider's client is built once per page load with `setSession(ssr.session)` from the root-layout prop. After an SPA sign-in, `router.push()` is a soft navigation — Next.js does **not** re-fetch the shared root layout, so `Providers` keeps `session = null` and `storage.createFile` (browser-direct POST to `fra.cloud.appwrite.io`) goes out **guest** (no `X-Appwrite-Session` header, no API-domain cookie). The `router.refresh()` removed by the perf fix had been accidentally masking this. First upload ever attempted = Phase 6, hence never caught.
- Fix: `getSessionPrincipal()` (`src/app/actions/auth.ts:203`) now also returns `sessionSecret` (read via the same `createNextServerHelpers.readSessionCookie()` the root layout uses); `SignInForm` (`src/components/auth/SignInForm.tsx:43`) calls `client.setSession(sessionSecret)` (the provider's `client`, via `useAppwrite()`) before `router.push()`. This mirrors the library's own `clearClientSession` in-place mutation pattern; no new security surface (the secret was already client-visible on every authenticated render via the layout prop). Also fixes stale `useAuth().user` in `DashboardLayout`/`MobileNavDrawer` after SPA login (same root cause).
- Verified (user, 2026-08-30): BRAND ref-image upload and admin GLB upload both succeed post-fix.

**Bug 2 — "Project is no longer available to submit" on `adminSubmitProject` (and latent twin in `brandSendForRevisions`).**
- Symptom: admin clicks "Submit for Review" → the transactional status flip throws. Project stayed `PENDING`, uploaded GLB stayed unlinked.
- Root cause: the optimistic-concurrency guard inspected the response of a **staged (in-transaction) bulk `updateRows`**, which Appwrite returns as `{ total: 0, rows: [] }` **regardless of matches** — staged operations are queued, not evaluated for the response (they still apply at commit). Read-only evidence: the exact query matches via `listRows` (1 row); `createProject`'s staged `updateRows` (response ignored) applied at commit (same-second `$updatedAt` on the linked asset). Confirmed by a live probe (2026-08-30): four staged `updateRows` variants (`or()`, array-equal, `equal($id,[])`, `equal+isNull`) all returned `total: 0`; transaction rolled back, data verified untouched.
- Fix: `adminSubmitProject` (`src/app/actions/admin.ts:105`) and `brandSendForRevisions` (`src/app/actions/project.ts:183`) now re-read the row **inside** the transaction (`getRowSafe(projects, id, txId)` — proven in-tx read), enforce the status/ownership precondition there, then stage a single-row `updateRow` by `rowId`. Commit-time conflict detection still guards against concurrent external writes. Direct (non-staged) guarded `updateRows` (`brandPublishProject`, `adminUpdateUser`, `adminSetUserStatus`) execute immediately and return real rows — unaffected.
- Verified (user, 2026-08-30): "Submit for Review" succeeded — project "chair" → COMPLETED, the freshly uploaded `wren-chair.glb` linked to the project (asset `$updatedAt` bumped by the link step), then brand publish → PUBLISHED.

**Bug 3 — public embed viewer: "Failed to load model" (asset URL missing `?project=`).**
- Symptom: `/integrations` "What you'll see" preview (and any `/embed/{id}` iframe) shows "Failed to load model"; the generated embed iframe code itself is correct (`src="{APP_URL}/embed/{id}"`, unchanged design — the route serves `public/embed-viewer.html` server-side).
- Root cause: the SDK config endpoint emits the **stored** `assets.url` (`buildFileUrl` output = `{endpoint}/storage/buckets/{b}/files/{f}/view` with **no `?project=` param**). Appwrite requires project context on anonymous requests: live probe (2026-08-30) — bare URL → **404** even though the file has `read("any")` (granted correctly at publish, confirmed via `storage.getFile` `$permissions`); with `?project=<id>` → **200** + the 4.4MB GLB, CORS-valid (Appwrite echoes `Access-Control-Allow-Origin` for the registered `localhost:3000` platform, preflight 204). `model-viewer` fetch of the dead URL → `error` event → "Failed to load model".
- Fix: `buildFileUrl` (`src/lib/appwrite-config.ts:13`) now appends `?project=${APPWRITE_PROJECT_ID}`. To repair **already-uploaded** rows without a data migration, the SDK config route (`src/app/api/sdk/v1/config/[projectId]/route.ts:26`) now derives the URL on-the-fly via `resolveAssetUrl(asset)` → `buildFileUrl(bucketForAssetType(type), fileId)` for `provider === "appwrite" && fileId` rows, falling back to the stored `url` for external/legacy providers. Single source of truth going forward.
- **Pending:** user re-test — `/integrations` preview should render the model; embed code pasted into a standalone HTML page should load too.



---

## 1. Goal

Replace the current backend with **Appwrite Cloud** under the **GitHub Student Pack education plan** (`plan auto-1`, group: pro, $0):

| Resource | Plan limit | Notes |
|---|---|---|
| Storage | **150 GB** (vs UploadThing free 2 GB) | 5 GB max file size (`fileSize: 5000` MB) — comfortably covers the 128 MB GLB cap |
| Bandwidth | 2,000 GB / mo | 2 TB |
| Users | 200,000 | |
| DB reads / writes | 1.75M / 750K per mo | |
| Executions / GB-hours | 3.5M / 1,000 | |
| Custom SMTP | yes (`customSmtp: true`) | replaces Nodemailer + Gmail SMTP |
| Projects | 2 | reuse existing `Peka.ar` project |

**What is replaced (full replacement):**

| Current | Replacement |
|---|---|
| NextAuth v5 (JWT, Credentials) | Appwrite Auth (email/password, Argon2, cookie sessions) |
| Prisma 7 + `@prisma/adapter-pg` + Supabase Postgres | Appwrite **TablesDB** (tables/rows, relationships, transactions) |
| UploadThing v7 (3 FileRouter uploaders) | Appwrite **Storage** (2 buckets, browser-direct chunked uploads) |
| Google Drive backup + UT→GDrive fallback proxy | Dropped entirely (Appwrite storage is the durable copy) |
| Nodemailer + Gmail SMTP (OTP/reset emails) | Appwrite email service (verification/recovery templates) via custom SMTP |
| `bcryptjs` password hashing | Appwrite handles hashing (Argon2) |
| `Token` table (OTP/magic-link/reset rows) | Eliminated — Appwrite manages verification/recovery tokens |

**Decisions locked in (user-confirmed):**
- Use existing `Peka.ar` project (rename to STUDIO.V in console). Org "GitHub Student Organization" shows `status: draft` — verify billing is active before Phase 0 completion.
- Full replacement; GDrive backup and Stripe env vars are dropped (Stripe was optional/pre-launch anyway).
- Auth UX: email + password signup with a verification step. Appwrite's native verification is **link-based** (not a typed 6-digit code) — the `OtpInput` screen becomes a "check your inbox" screen (see §4.4).
- Start fresh: no data migration; port the seed script to Appwrite.

---

## 2. Target architecture

```
Browser (Next.js 16 App Router)
├── @appwrite.io/react (AppwriteProvider, useAuth/useAppwrite hooks)
│     └── SSR mutations POST → /api/appwrite/*  (createAppwriteHandlers)
├── direct storage.createFile() uploads (browser → Appwrite, chunked)
├── direct Appwrite file URLs for PUBLISHED assets (read:any file permission)
└── Appwrite session cookie: a_session_<PROJECT_ID> (httpOnly, set by handler)

Server (Next.js route handlers / server actions / server components)
├── createNextServerHelpers({ endpoint, projectId })   → session client per request
├── createAdminClient({ apiKey })                      → admin client (users, tablesDB, storage)
├── requirePrincipal() → getLoggedInUser() + users row → Principal (unchanged contract)
└── src/lib/db.ts      → TablesDB query/transaction helpers

Appwrite Cloud (project: STUDIO.V, region fra)
├── Auth: users (labels ADMIN/BRAND), sessions, email templates (custom SMTP)
├── TablesDB: database "studiov" — 5 tables (see §3)
├── Storage: buckets "models" + "reference-images" (see §5)
└── Email: verification + recovery templates (Gmail SMTP as custom SMTP)
```

**Key simplification over today:** the happy-path embed (PUBLISHED) reads **direct Appwrite URLs** — no Vercel proxy hop, no `x-source` observability, no 8s UT timeout, no GDrive fallback. The `/api/v1/assets/[assetId]/file` proxy remains only for **non-published** (auth-gated) reads.

---

## 3. Data model — TablesDB schema

Database `studiov`. All tables created via MCP console tools (or `node-appwrite` admin client) in Phase 0.

> Appwrite column types: `varchar` (inline, indexable ≤768 chars), `text` (16,383, off-page), `mediumtext` (4M chars), `enum`, `boolean`, `integer` (32-bit), `bigint`, `datetime`, `email`, `url`. `string` is deprecated.

### 3.1 `users` (profile — identity lives in Appwrite Auth)

| Column | Type | Required | Notes |
|---|---|---|---|
| `userId` | varchar(64) | yes | `$id` of the Appwrite user (row id = `ID.unique()` set to the Appwrite `$id` via `createRow` with explicit `rowId`) |
| `email` | varchar(320) | yes | mirrored for admin search; unique index |
| `role` | enum(`BRAND`,`ADMIN`) | yes | mirrors user label |
| `subscriptionTier` | varchar(32) | no | |
| `usageLimits` | integer | yes | default 10 |
| `name` | varchar(255) | no | |
| `onboarded` | boolean | yes | default false |
| `productCategory` | varchar(64) | no | |
| `storefrontPlatform` | varchar(64) | no | |
| `catalogSize` | varchar(64) | no | |
| `status` | enum(`ACTIVE`,`SUSPENDED`) | yes | default ACTIVE |
| `suspendedAt` | datetime | no | |
| `statusReason` | text | no | |

Indexes: unique `email`, key `role`, key `status`.

### 3.2 `projects`

| Column | Type | Required | Notes |
|---|---|---|---|
| `name` | varchar(255) | yes | |
| `sku` | varchar(128) | no | |
| `instructions` | text | no | |
| `dimensions` | mediumtext | no | JSON string |
| `status` | enum(`PENDING`,`REVISIONS`,`COMPLETED`,`PUBLISHED`) | yes | default PENDING |
| `sdkConfig` | mediumtext | no | JSON string; unused by embed (hardcoded config) — kept for forward-compat |
| `brandId` | varchar(64) | yes | Appwrite user `$id` |

Indexes: key `brandId`, key `status`, key `createdAt`.

### 3.3 `assets`

| Column | Type | Required | Notes |
|---|---|---|---|
| `projectId` | varchar(64) | no | nullable — unlinked until `createProject` / `adminSubmitProject` |
| `ownerId` | varchar(64) | yes | |
| `type` | enum(`REFERENCE_IMAGE`,`MODEL_GLB`,`MODEL_USDZ`) | yes | |
| `status` | enum(`UPLOADING`,`READY`,`PUBLISHED`,`ARCHIVED`,`DELETED`) | yes | default UPLOADING |
| `provider` | varchar(32) | yes | `appwrite` or `external` (seed) |
| `fileId` | varchar(64) | no | Appwrite storage file id (null for `external` seed rows) |
| `url` | varchar(2048) | yes | Appwrite view URL or external URL |
| `originalName` | varchar(255) | yes | |
| `mimeType` | varchar(128) | yes | |
| `size` | bigint | yes | |
| `checksum` | varchar(128) | no | |

Indexes: key `projectId`, key `ownerId`, composite key `[projectId, type, status]` (live-model picker + previous-models history).

### 3.4 `revision_requests`

| Column | Type | Required |
|---|---|---|
| `projectId` | varchar(64) | yes |
| `note` | text | yes |
| `requestedBy` | varchar(64) | yes |

Indexes: key `projectId`, key `createdAt`.

### 3.5 `analytics_events`

| Column | Type | Required |
|---|---|---|
| `eventType` | enum(`VIEW`,`INTERACTION`,`AR_LAUNCH`) | yes |
| `sessionId` | varchar(64) | yes |
| `projectId` | varchar(64) | yes |
| `brandId` | varchar(64) | yes |

Indexes: key `projectId`, key `brandId`, key `createdAt`.

### 3.6 Deleted

- `Token` — Appwrite manages OTP/verification/recovery internally.
- `User.hashedPassword`, `emailVerified` — Appwrite-owned.

---

## 4. Auth migration

### 4.1 Dependencies

```bash
npm install appwrite node-appwrite @appwrite.io/react @tanstack/react-query
npm uninstall next-auth bcryptjs nodemailer @types/nodemailer
```

### 4.2 New files

| File | Purpose |
|---|---|
| `src/app/api/appwrite/[...appwrite]/route.ts` | `createAppwriteHandlers({ endpoint, projectId, apiKey, basePath: "/api/appwrite", redirects: { success: "/dashboard", failure: "/auth" } })` — exposes sign-in/sign-up/sign-out/oauth routes; API key scopes `users.read`, `users.write`, `sessions.write` |
| `src/app/providers.tsx` | `"use client"` — `<AppwriteProvider endpoint projectId ssr={{ session, basePath: "/api/appwrite" }}>` wrapping children (keeps existing `ThemeProvider` nesting) |
| `src/lib/appwrite.ts` | `APPWRITE_CONFIG` (`NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`), `createAdminClient()` (reusable), `createSessionClient(sessionSecret)` (per request). Exports `SESSION_COOKIE = 'a_session_' + projectId` |
| `src/lib/use-appwrite-upload.ts` | `"use client"` — replaces `use-presigned-upload.ts`, wraps `storage.createFile` with `onProgress`; returns `{ upload, isUploading, progress, error, reset }` (same contract, see §5) |

### 4.3 Rewrites

| File | Change |
|---|---|
| `src/lib/auth-guards.ts` | `requirePrincipal()`: `createNextServerHelpers(appwrite).getLoggedInUser()` → `null` ⇒ `UnauthenticatedError`; fetch `users` row by `user.$id` → missing ⇒ `StaleSessionError`; `status === 'SUSPENDED'` ⇒ `ForbiddenError("Account suspended")`; role/onboarded checks unchanged. `Principal { userId, email, role, onboarded, companyName }` contract unchanged — **zero changes in consumers** |
| `src/proxy.ts` | Edge middleware cannot call Appwrite API. Rewrite: keep route table + redirect logic but auth signal = **presence of `a_session_<PROJECT_ID>` cookie** (no NextAuth `req.auth`). Role/onboarded gating stays in `requirePrincipal` (already the pattern: pages call `requirePrincipalOrRedirect`). Matcher unchanged |
| `src/app/layout.tsx` | Read `readSessionCookie()` from `createNextServerHelpers` and pass to `Providers` |
| `src/app/actions/auth.ts` | See §4.4 |
| `src/app/auth/page.tsx` + `AuthClient.tsx` + `SignInForm/SignUpForm/ForgotPasswordForm` | Wire to `useAuth()` hooks (`signIn.emailPassword`, `signUp.emailPassword`) + `account.createRecovery` via `useAppwrite()` |
| `src/app/auth/verify/page.tsx` | Parse `userId` + `secret` from URL → `Account(createPublicClient()).updateVerification({ userId, secret })` → **success card, no auto session** (D2) → user signs in manually → onboarded-aware routing |
| `src/app/auth/reset-password/page.tsx` | Parse `userId` + `secret` → `account.updateRecovery({ userId, secret, password })` |

### 4.4 Action mapping

| Current action | Appwrite equivalent |
|---|---|
| `registerUser(formData)` (create BRAND + OTP email) | **D1 (deviation):** admin client, not handler — `Users.list` by email → verified ⇒ throw `Email already registered`; unverified ⇒ `updatePassword` + resend; new ⇒ `Users.create(ID.unique(), email, password)` + `createRow(users, { userId, email, role: "BRAND", usageLimits: 10, onboarded: false, status: "ACTIVE" })` + `updateLabels(["BRAND"])` → then `sendVerificationEmail(userId)` (mint session → `createVerification({ url: APP_URL + '/auth/verify' })` → delete session). Returns `{ email, verificationRequired: true }` — same client contract |
| `verifyEmailOtp(email, otp)` | Replaced by verify page flow: `updateVerification({ userId, secret })` (secret from URL, public client). **UX note:** link-based, not typed code — `OtpInput` screen became "check your inbox" copy (implemented). A literal 6-digit code would require custom Appwrite Messaging email templates — out of scope (flag if required) |
| `preflightLogin(email, password)` | **Deleted** (D5) — `signIn.emailPassword` surfaces Appwrite errors directly (`AppwriteException` with `.code`/`.type`); post-login routing via new `getSessionPrincipal()` → `postLoginPath(onboarded, role)` |
| `requestPasswordReset(email)` | `account.createRecovery({ email, url: APP_URL + '/auth/reset-password' })` on the **public client** (API-key client fails: `applications` role lacks `public` scope) — always returns `{ success: true }` (no enumeration), templates the email |
| `resetPassword(token, password)` | `updateRecovery({ userId, secret, password })` — `userId`+`secret` from URL params (public client); Appwrite enforces expiry (1 hr); invalid/expired → "Reset link is invalid or expired" |
| `resendVerificationOtp(email)` | **Renamed** `resendVerificationEmail(email) → { success, status: "invalid"\|"sent" }` — same `sendVerificationEmail` path (Appwrite rate-limits abuse) |
| `verifyEmail(token)` (magic link) | Same `updateVerification` path as above (route kept as the verify page) |
| `completeOnboarding(input)` | `requirePrincipal()` → `updateRow(users)` (name/category/platform/catalogSize/onboarded) + `admin.users.updateLabels` (add `BRAND` if missing) + revalidate 5 paths. No JWT refresh needed — session reads DB row each request |
| `logout()` | **D4 (deviation):** kept as server action — session-client `account.deleteSession({ sessionId: "current" })` + `cookies().delete(SESSION_COOKIE)` + `redirect("/")` (server actions are safer for an SSR-first auth flow; the `useSignOut` hook route is also available) |

### 4.5 Suspended users

- Login itself is NOT blocked at Appwrite level (Appwrite has no custom status hook); `requirePrincipal()` blocks every protected page/action/API handler when `users.status === 'SUSPENDED'` — identical behavior to today.
- `adminSetUserStatus` sets `users.status` + `suspendedAt` + `statusReason` (same fields).

### 4.6 Stale sessions / `clear-session`

Delete `src/app/api/auth/clear-session/route.ts`. `StaleSessionError` now occurs when the session is valid but no `users` row exists — `requirePrincipalOrRedirect` redirects to `/auth` (session cookie persists; Appwrite itself will expire it). Acceptable: users row always created at signup.

---

## 5. Storage migration

### 5.1 Buckets (Phase 0, console)

| Bucket | Files | Max size | Extensions | File security | Permissions |
|---|---|---|---|---|---|
| `models` | GLB/USDZ | 150 MB | none (blob) | **ON** | bucket: `create: role:label:ADMIN`, `read: role:label:ADMIN`; per-file `read:any` granted on publish |
| `reference-images` | images | 16 MB | `jpg png webp gif avif` | **ON** | bucket: `create: role:label:BRAND`, `read: role:label:BRAND`; per-file `read:any` granted on publish |

- Users receive label `BRAND` at signup (admin client `users.updateLabels`), `ADMIN` from `sync-admin`. Labels are the permission bridge (storage + tablesDB `Role.label()`).
- Encryption: bucket-level encryption ON for `reference-images` (small files); models bucket: encryption skipped >20 MB, so leave OFF (files >20 MB cannot be encrypted per Appwrite docs).

### 5.2 Upload flow (replaces FileRouter + `onUploadComplete`)

```
1. Client: storage.createFile({ bucketId, fileId: ID.unique(), file })
   (SDK auto-chunks >5 MB; onProgress → progress bar in upload tiles)
2. Client: server action recordAssetUpload({ fileId, type, originalName, mimeType, size })
3. Server: requirePrincipal({ roles })  — BRAND for reference, ADMIN for models
4. Server: getFile metadata (admin client) → createRow(assets, { id: fileId, status: READY,
   provider: "appwrite", url: buildFileUrl(bucketId, fileId), ownerId, ... })
5. Returns { asset } — same shape consumers expect
```

- `buildFileUrl(bucketId, fileId)` = `storage.getFileView({ bucketId, fileId })` URL (Appwrite view endpoint) — stored in `assets.url`, and used as the CDN-agnostic read URL.
- `fileId` = `asset.id` — **single cross-storage identifier** (replaces UUID/UT-key/GDrive-name tri-tracker in `file-storage-architecture.md` §12). `naming.ts` utilities are deleted; a `slugify()` stays for `originalName` only.

### 5.3 Serving (simplification vs today)

| Asset state | Read path |
|---|---|
| PUBLISHED project assets | **Direct Appwrite URL** — SDK config endpoint returns `assets.url` (file granted `read:any` at publish via `storage.updateFile`). Embed `<model-viewer>`, lightboxes, thumbnails hit Appwrite CDN directly. No Vercel proxy, no fallback |
| Non-published (PENDING/REVISIONS/COMPLETED) | Thin proxy `GET /api/v1/assets/[assetId]/file` — `requirePrincipal` (PUBLISHED bypass removed — that case uses direct URLs) → admin-client stream (`storage.getFileDownload` bytes) → response with stored `mimeType`/`originalName`. Cache-Control unchanged. **Drop** `asset-delivery.ts`, `gdrive-client.ts`, `gdrive-adapter.ts`, `storage/types.ts` |
| ARCHIVED (replaced models) | Proxy route only (admin/brand reads); file remains in Appwrite bucket (deletion only on explicit cleanup) |

- Publish transition: `brandPublishProject` adds `read:any` to the project's live GLB/USDZ files (and reference images) via admin-client `storage.updateFile`.
- Un-publish transition (`brandSendForRevisions` on PUBLISHED): revoke `read:any` from files (reset to owner/admin-only) — embed stops serving immediately.
- `<Image unoptimized>` pattern: **remains** for non-published thumbnails (proxy needs cookies); published assets can use the Appwrite URL with `unoptimized` as-is (no `/_next/image` optimization for GLB/3D anyway).

### 5.4 Deletion & archival

- `adminSubmitProject` (transaction): flip prior READY models → ARCHIVED, link new ones, fire-and-forget `storage.deleteFile(previous fileIds)` post-commit (errors logged, never thrown) — mirrors current UT-delete behavior. Appwrite bucket keeps no backup copy — that's the point of the migration.
- Reference-image orphan cleanup (existing Open Question §2 in `file-storage-architecture.md`): optional; out of scope.

---

## 6. Database access layer — `src/lib/db.ts`

New server-only module wrapping `node-appwrite` TablesDB with typed helpers, used by every action. Pattern (from the appwrite-typescript skill):

```ts
// list with filter + sort + pagination (object-param style; limit max 100, default 25)
tablesDB.listRows<RowShape>({ databaseId, tableId, queries: [Query.equal('brandId', uid), Query.orderDesc('$createdAt'), Query.limit(25)] })
// single row
tablesDB.getRow({ databaseId, tableId, rowId })
// atomic counters (quota!) — decrementRowColumn has `min`; incrementRowColumn only has `max`
tablesDB.decrementRowColumn({ databaseId, tableId, rowId, column: 'usageLimits', value: 1, min: 0 })
```

- List/mutate responses are `RowList<Row> = { total, rows }` — `rows.length === 0` is the throw guard (no `documents` key, no thrown error on empty match).
- **Method names:** `updateRows({ queries, data })` / `deleteRows({ queries })` — there are NO `bulkUpdate`/`bulkDelete` methods (verified in `node-appwrite@26.2.0` dist types). Both return matched rows. **`updateRows`/`deleteRows` with no queries match ALL rows — never call without queries.**
- `Query.equal("$id", [ids])` is IN semantics; `Query.or([...])` takes one array; `Query.isNull(col)` exists; `Query.between(col, start, end)`.

### 6.1 Transactions (replaces `prisma.$transaction` + atomic `updateMany`)

TablesDB transactions: `createTransaction()` → stage ops (pass `transactionId` to `createRow/updateRows/deleteRows/decrementRowColumn`, and `listRows`/`getRow` for uncommitted reads) → `updateTransaction({ transactionId, commit: true })` (or `rollback: true`). Commit replays staged ops inside a real DB transaction; **if any staged row changed externally, commit fails with a conflict** — this is the TOCTOU guard replacement. Implemented as `runTransaction(fn)` in `src/lib/db.ts` (create → stage → commit, best-effort rollback on error).

| Current Prisma pattern | New pattern |
|---|---|
| `prisma.$transaction(async (tx) => { ... })` (Serializable) | `const tx = await tablesDB.createTransaction(); try { stage…; await tablesDB.updateTransaction({ transactionId, commit: true }) } catch { rollback }` |
| `updateMany({ where: { status: { in: [PENDING, REVISIONS] } }, data: { status: COMPLETED } })` | Stage `updateRows` (queries: `Query.or([equal(status, PENDING), equal(status, REVISIONS)])` — or AND of two `equal` calls) inside transaction; `rows.length === 0` → conflict "Project is no longer available to submit"; commit-conflict detection catches concurrent double-submit |
| Quota check (`Serializable`: count < usageLimits) | Transaction: stage `decrementRowColumn(users, usageLimits, value: 1, min: 0)` → verify staged row `usageLimits >= 0` before commit → else rollback + throw "Usage limit exceeded" (friendly message) |
| `create + link` (project + assets) | Stage `createRow(projects, ID.unique())` + staged `updateRows` on each asset (set `projectId`) → commit |

Limit: 1,000 ops/transaction on this plan (Pro group) — far above our max (~10).

### 6.2 Analytics aggregates (no `groupBy` in TablesDB)

| Current query | New approach |
|---|---|
| `getPlatformKPIs` counts | `listRows(..., total: true)` per filtered query (users by status, projects by status ×4, events count) — parallel `Promise.all` |
| `getSignupsSeries` (monthly) | `listRows(users, Query.between(createdAt, monthStart, monthEnd))` per month + JS `labels`/`counts` |
| `getTopBrands` | `listRows(projects, select brandId)` → JS count by `brandId` → top N (fetch user rows by id) |
| `getProjectLiveness` (`_max createdAt`) | per project: `listRows(events, equal(projectId), orderDesc(createdAt), limit(1))` → first row's `createdAt` |
| `adminGetUsers` (search/filter/pagination) | `listRows(users, [equal(role), equal(status), orderDesc('$createdAt'), limit(50), offset])` for role/status filters + pagination; **search is JS-side** (case-insensitive substring over `email`/`name` on the filtered page) — fulltext search in TablesDB requires a fulltext index, so it was deliberately avoided. `total` from filtered length |

All fine at pre-launch scale (documented risk: count queries cost 1 read op per row returned on `total`).

---

## 7. API routes & actions — file-by-file

### Create
| File | Purpose |
|---|---|
| `src/lib/db.ts` | TablesDB helpers + transaction wrapper (see §6) |
| `src/lib/appwrite.ts` | client factories + constants (§4.2) |
| `src/lib/use-appwrite-upload.ts` | upload hook (§4.2/§5.2) |
| `src/app/api/appwrite/[...appwrite]/route.ts` | SSR auth handlers (§4.2) |
| `src/app/providers.tsx` | AppwriteProvider wrapper (§4.2) |
| `src/app/actions/record-asset.ts` | `recordAssetUpload(fileId, type, ...)` (§5.2) |
| `scripts/seed-appwrite.ts` | seed (§8) |

### Rewrite (Prisma → TablesDB / Appwrite)
| File | Notes |
|---|---|
| `src/app/actions/auth.ts` | §4.4 mapping |
| `src/app/actions/project.ts` | `createProject` (quota tx, asset verify via `listRows(assets, equal(id, assetIds))` + READY + owner), `brandPublishProject` (tx + file `read:any` grant + revalidate), `brandSendForRevisions` (tx: status + revision_requests row + revoke `read:any` if was PUBLISHED), `getUserProjects` (list + asset fetch + derived shape identical) |
| `src/app/actions/admin.ts` | `getAllTasks` (same derived shape), `adminSubmitProject` (tx: status flip via `updateRows` + archive + link + post-commit `utapi.deleteFiles` of legacy UT keys) |
| `src/app/actions/admin-users.ts` | `adminGetUsers/adminGetUser/adminUpdateUser/adminSetUserStatus/adminDeleteUser` — row CRUD + `users.delete` (Appwrite) on delete-user; self-mutation guards unchanged |
| `src/app/actions/admin-analytics.ts` | `getPlatformKPIs/getSignupsSeries/getTopBrands` per §6.2 |
| `src/app/actions/analytics.ts` | `getProjectLiveness` per §6.2; brand-scoped queries unchanged |
| `src/app/api/notifications/route.ts` | `getRecentProjectActivity()` → `listRows(projects, equal(brandId), orderDesc(createdAt), limit(10))` |
| `src/app/api/sdk/v1/config/[projectId]/route.ts` | emits `{ assetUrls: { glb, usdz }, sdkConfig }` — for PUBLISHED use **direct Appwrite URLs** (drop proxy URL composition); 404 rules unchanged |
| `src/app/api/sdk/v1/events/route.ts` | validates body + PUBLISHED check via admin client, `createRow(analytics_events)` with project's `brandId`; CORS unchanged |
| `src/app/api/v1/assets/[assetId]/file/route.ts` | thin authenticated proxy (admin-client stream), no fallback (§5.3); response headers preserved (`Content-Type`, `Content-Disposition`, `Cache-Control`) |
| `src/app/embed/[projectId]/route.ts` | no change (reads config endpoint; 404 rules unchanged) |
| `src/lib/auth-guards.ts`, `src/proxy.ts`, `src/app/layout.tsx` | §4.3 |
| `src/app/api/uploadthing/route.ts` + `core.ts` | **delete** (replaced by record-asset action + direct upload) |

### Delete
| File |
|---|
| `src/auth.ts`, `src/auth.config.ts` |
| `src/app/api/auth/clear-session/route.ts` |
| `src/app/api/auth/[...nextauth]/route.ts` |
| `src/app/api/uploadthing/` (route + core) |
| `src/app/api/admin/assets/[assetId]/gdrive-download/route.ts` |
| `src/lib/password.ts`, `src/lib/emails.ts`, `src/lib/mail.ts`, `src/lib/uploadthing.ts`, `src/lib/uploadthing-server.ts` |
| `src/lib/hooks/use-presigned-upload.ts` |
| `src/lib/storage/` (types, gdrive-adapter, gdrive-client, asset-delivery, naming, index) |
| `prisma/` (schema, migrations, seed, generated client) |
| `scripts/get-gdrive-refresh-token.ts`, `scripts/sync-admin.ts` (rewritten in place) |

---

## 8. Seed & admin bootstrap

### `scripts/seed-appwrite.ts` (replaces `prisma/seed.ts`)
- Admin from env (`ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`): admin-client `users.create` (upsert by email lookup), label `ADMIN`, `users` row (role ADMIN, onboarded true, usageLimits 9999).
- BRAND `brand@example.com`/`brand123`: label `BRAND`, `users` row (usageLimits 10, name "Acme Furniture Co.").
- 3 demo projects (Velvet Sheen Armchair PUBLISHED / Nordic Oak Table COMPLETED / Eames Lounge Replica PENDING) with `assets` rows `provider: "external"` (Khronos GLB + Unsplash URLs) — no storage files, mirrors current seed. Skip-on-existence (check `users` email + project names).
- **Run:** `npm run seed:appwrite` (new script; drop `prisma` seed config from package.json).

### `scripts/sync-admin.ts` (rewrite)
- Same semantics: upsert env admin (create or promote — set label `ADMIN` + `users.role`), refresh password via `users.updatePassword` (Appwrite hashes), delete stray ADMIN users whose email ≠ env email (Appwrite `users.delete` + row delete). Idempotent.

---

## 9. Environment & config

### `.env.example` (replace)
```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="<PROJECT_ID>"   # 6a8562a20037b62075e1 (Peka.ar)
APPWRITE_API_KEY="<server API key>"              # scopes: users.read/write, sessions.write, databases.read/write, storage.read/write
NEXT_PUBLIC_APP_URL="<app URL>"                  # verification/recovery redirects + embed code
ADMIN_EMAIL="<permanent admin email>"
ADMIN_PASSWORD="<permanent admin password>"
ADMIN_NAME="Studio Admin"
```
Removed: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `UPLOADTHING_TOKEN`, `GOOGLE_OAUTH_*`, `GDRIVE_BACKUP_FOLDER_ID`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `STRIPE_*`.

### `package.json`
- Remove: `@prisma/adapter-pg`, `@prisma/client`, `pg`, `@types/pg`, `bcryptjs`, `@types/bcryptjs`, `next-auth`, `nodemailer`, `@types/nodemailer`, `googleapis`, `uploadthing`, `@uploadthing/react`, `prisma` (dev), `postinstall: prisma generate`.
- Add: `appwrite`, `node-appwrite`, `@appwrite.io/react`, `@tanstack/react-query`, `@types/node` stays.
- Scripts: `sync-admin` stays (`tsx scripts/sync-admin.ts`), add `seed:appwrite`.

### `next.config.mjs`
- `images.remotePatterns`: replace `*.ufs.sh` with the Appwrite file host (`fra.cloud.appwrite.io` — view/preview URLs). `images.unsplash.com` stays (seed data). All proxy-image consumers keep `unoptimized`.

### `tsconfig.json`
- Remove `@/generated/prisma/client` path alias.

---

## 10. Implementation order (phases)

| Phase | Work | Gate |
|---|---|---|
| **0. Console setup** | DONE (2026-08-19, see §0 log): project kept as "Peka.ar" (rebrand planned, no rename); API key `studiov-server`; web platform for prod host; TablesDB `studiov` + 5 tables + indexes; buckets `models` + `reference-images`; Gmail SMTP (sender "Peka.ar") | Console walkthrough confirmed (log in §0) |
| **1. Foundations** | DONE (2026-08-19, log above): deps; `lib/appwrite-config.ts` + `lib/appwrite.ts`; SSR handler route; `providers.tsx`; `layout.tsx`; `proxy.ts` rewrite; guards rewrite (pulled from Phase 2); NextAuth files deleted; form/layout `useSession`→`useAuth` swaps | `npm run build` passes with no NextAuth imports (log in §0) |
| **2. Auth** | DONE (2026-08-19, log above): `auth-guards.ts` rewrite (landed in Phase 1); `actions/auth.ts` rewrite; auth forms (`SignInForm`/`SignUpForm`/`ForgotPasswordForm`); verify + reset pages; onboarding action; `OtpInput.tsx` deleted | Signup → verify email → login → onboarding → dashboard works in dev |
| **3. Data layer** | DONE (2026-08-19, log above): `lib/db.ts`; project/admin/admin-users/admin-analytics/analytics actions; notifications API; client type tweaks | `npm run lint` 0 errors + `npm run build` green (log in §0) |
| **4. Storage** | NEXT UP: buckets (Phase 0 already); upload hook; `record-asset.ts`; asset proxy route; SDK config/events; publish/unpublish file-permission grants | Upload ref images (BRAND) + GLB/USDZ (ADMIN); publish → embed loads via direct URL |
| **5. Seed & scripts** | DONE (2026-08-19, log above): `seed-appwrite.ts` (written, not run); `sync-admin.ts` rewrite (verified idempotent); remaining Prisma pages migrated (dashboard/integrations/analytics/notifications); legacy files + env/config cleanup (§7/§9) | `npm run lint` 0 errors + `npm run build` green; `npm run sync-admin` idempotent (log in §0). `npm run seed:appwrite` pending user opt-in |
| **6. Verification** | NEXT UP: full dev smoke test: signup → OTP-link verify → login → onboarding → New Task (upload refs) → admin claim → GLB upload → submit → brand review → approve & publish → `/embed` + SDK config + analytics events; also run `npm run seed:appwrite` | All flows green |
| **7. Specs update** | see §11 | `npm run lint` + `npm run build` still green |

---

## 11. Specs update (per AGENTS.md golden rule)

Rewrite/update after implementation:
- `specs/WEBSITE.md` — §2 stack (Appwrite SDKs), §3 folder layout, §4/§5 route map + API routes, §7 auth flows, §8 action signatures, §9 data model (TablesDB schema), §10 file upload workflow, §13 env vars.
- `specs/pages/auth.md` — link-based verification, recovery flow, handlers, guards.
- `specs/pages/tasks.md` + `specs/pages/admin.md` — upload hook swap, direct-URL reads, archival via file delete.
- `specs/pages/embed.md` — direct Appwrite URLs in SDK config.
- `specs/file-storage-architecture.md` — rewrite: Appwrite storage architecture, bucket config, serving matrix (§5.3), identifier model (`fileId` single-tracker), migration history append (this record).
- `specs/deployment.md` — Appwrite env vars + console setup checklist.
- `specs/auth-stabilization.md` — annotate as superseded by Appwrite auth.
- `.env.example` (root), `design.md` only if visuals change (they shouldn't).
- New spec if a cross-cutting Appwrite subsystem emerges (e.g., `specs/workflows/auth.md` rewrite is enough — no new file needed).
- Create `specs/appwrite-architecture.md` if a future task needs a deep-dive on the TablesDB/transaction patterns (§6) — optional, `WEBSITE.md` §14 coverage may suffice.

---

## 12. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Org billing `draft` status blocks usage | High | Resolve in console during Phase 0 before any code work; plan is applied (`auto-1`, price 0, `requiresPaymentMethod: false`) — likely just un-finalized org setup |
| TablesDB transactions: commit-time conflict detection, no serializable isolation | Low | Staged ops replayed in a real DB txn; conflict on concurrent double-submit; verify-after-stage pattern for quota; low concurrency (internal tool) |
| `updateRows` conditional flips return matched rows (no thrown error on 0 matches) | Medium | `rows.length === 0` throw-guard pattern; commit-conflict detection for concurrent double-submit (resolved in Phase 3) |
| No groupBy/count aggregates | Low | `listRows` totals + JS aggregation; fine at pre-launch scale; revisit with a Function if data grows |
| Appwrite email deliverability / rate limits | Low | Custom SMTP (Gmail) via console; verification/recovery emails only; monitor project logs |
| Verification is link-based (UX change from 6-digit OTP) | Low | Accepted UX change (user-approved); "check your inbox" screen; optional later: custom OTP via Messaging templates |
| `Role.label` requires label sync on every user creation | Low | Label set at signup in `registerUser` (admin client) and in `sync-admin`; `completeOnboarding` re-asserts |
| Public bucket files (read:any) leak via URL | Low | Only granted at publish; unguessable file IDs; revocation on send-for-revisions; same trust model as today's UT public URLs |
| Edge middleware can't verify sessions | Low | Cookie-presence gating only; real auth in `requirePrincipal` per request (status quo) |
| 150 GB bucket vs ~2 GB UT — no cap anxiety | — | Improvement; monitor dashboard usage |

---

## 13. Out of scope (future tasks)

- Stripe billing (was optional pre-launch; env vars removed).
- Reference-image deletion UI (pre-existing Open Question §2).
- Appwrite Functions usage (e.g., scheduled backup, retry sweeper) — plan has 3.5M executions available.
- Custom OTP-code verification email via Messaging.
- Data migration from Supabase (decision: fresh seed).

---

## 14. HANDOFF — Phase 1 (foundations) — start here in the next session

> Read `tasks/appwrite-migration.md` §0 log first (above), then `specs/WEBSITE.md`, then the source files listed in §10 below. The Appwrite TypeScript skill lives at `C:\Users\am\.agents\skills\appwrite-typescript\SKILL.md` (NOT in repo `.agents/skills/` — that dir only has tailwind-4-docs, vercel-optimize, vercel-react-best-practices, web-design-guidelines).

### 14.1 Live console facts (do not re-derive)

- Endpoint `https://fra.cloud.appwrite.io/v1` · Project ID `6a8562a20037b62075e1` ("Peka.ar") · DB `studiov` · tables `users|projects|assets|revision_requests|analytics_events` · buckets `models|reference-images`.
- API key secret: **already written into `.env`** as `APPWRITE_API_KEY` (gitignored). `.env` also has `NEXT_PUBLIC_APPWRITE_ENDPOINT` + `NEXT_PUBLIC_APPWRITE_PROJECT_ID`. Legacy vars (`DATABASE_URL`, `UPLOADTHING_TOKEN`, `GMAIL_*`, `GOOGLE_*`, `AUTH_SECRET`, `AUTH_TRUST_HOST`) still present — remove in Phase 5.
- Session cookie name: `appwrite-session-6a8562a20037b62075e1` (package default — see Phase 1 log; the `a_session_` convention from §14.1 was superseded).
- Permission string format: `create("label:ADMIN")` style (see §0). `Role.label()` exists in both `appwrite` and `node-appwrite` SDKs.
- Bucket `models` = ADMIN-label create; `reference-images` = BRAND-label create. File `read("any")` is added at publish, revoked at unpublish (Phase 4).
- TablesDB rows: read via `Query` helpers; `$createdAt`/`$updatedAt` system columns are queryable and indexable. `getRow`/`listRows` shapes: `Models.Document` (server: `node-appwrite`).

### 14.2 Phase 1 scope (from §10)

1. **Deps:** `npm install appwrite node-appwrite @appwrite.io/react @tanstack/react-query`. Do NOT uninstall legacy packages yet — the build must keep compiling until Phase 5 (legacy files deleted last).
2. **`src/lib/appwrite.ts`** (new): `APPWRITE_CONFIG` from the 3 env vars above; `createAdminClient()` (singleton, `Client().setEndpoint().setProject().setKey()`); `createSessionClient(sessionSecret)` (fresh per request, `.setSession(secret)`, forward UA via `setForwardedUserAgent(req.headers['user-agent'])`); export `SESSION_COOKIE = 'a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID`.
3. **`src/app/api/appwrite/[...appwrite]/route.ts`** (new): `createAppwriteHandlers({ endpoint, projectId, apiKey, basePath: "/api/appwrite", redirects: { success: "/dashboard", failure: "/auth" } })` from `@appwrite.io/react/nextjs` (verify exact export path against the installed package — historically `@appwrite.io/react` + `createNextServerHelpers`/`createAppwriteHandlers` from `@appwrite.io/react/nextjs`; check `node_modules/@appwrite.io/react/dist` if type-check fails). API key needs scopes users.read/write + sessions.write (already granted).
4. **`src/app/providers.tsx`** (new, `"use client"`): wrap children in `<AppwriteProvider endpoint projectId ssr={{ session, basePath: "/api/appwrite" }}>` — keeps the existing `ThemeProvider` nesting. Read `session` (cookie) in the server layout and pass it down.
5. **`src/app/layout.tsx`**: read `readSessionCookie()` from `createNextServerHelpers({ endpoint, projectId })`, pass to `<Providers session={...}>`.
6. **`src/proxy.ts`** (rewrite): Edge middleware can only check cookie **presence** (no API calls in edge runtime): `const hasSession = cookies().has(SESSION_COOKIE)` — replace `req.auth` usage. Keep the existing `protectedRoutes` table (see `specs/WEBSITE.md` §5 or current file) and redirect logic; role/onboarded gating stays in `requirePrincipal` (server-side, per request). `matcher` config unchanged.
7. **Delete NextAuth files:** `src/auth.ts`, `src/auth.config.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/auth/clear-session/route.ts`. Any imports of `next-auth` anywhere else (grep `next-auth` across `src/`) must be removed in the same pass.
8. **Gate:** `npm run build` passes with zero `next-auth`/`prisma` imports.

### 14.3 Things that will bite

- `@appwrite.io/react` is the **client** hooks package (`useAuth`, `useAppwrite`, `useSignUp`…); `node-appwrite` is the server SDK. Do not mix imports.
- The SSR handler route + `createNextServerHelpers` are what read/write the session cookie server-side; the plain `appwrite` client (`new Client().setEndpoint().setProject()`) is used in browser components for `Storage` uploads later (Phase 4).
- `proxy.ts` currently imports `auth()` from `src/auth.ts` — after deletion, import nothing from `next-auth`; use `next/headers` `cookies()` directly. Edge runtime file: no `node-appwrite` imports allowed there.
- Keep `src/lib/auth-guards.ts` untouched in Phase 1 (rewritten in Phase 2) — but it imports `auth.ts` which will be deleted, so either rewrite it minimally now (swap `auth()` → session-cookie check is NOT possible edge-free; simplest: temporarily keep `src/auth.ts`'s re-export or move guards rewrite into Phase 1). Recommendation: do the `auth-guards.ts` rewrite (Phase 2 spec §4.3) together with the Phase 1 delete pass so the build compiles.
- `.env` already contains the Appwrite vars (see §14.1) — nothing to add until Phase 5 env cleanup.
- Do NOT commit the API key; `.env` is gitignored.