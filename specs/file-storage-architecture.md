# File Storage Architecture Spec

> **Current state:** Appwrite Storage is the sole file provider. UploadThing and Google Drive are fully removed (Phase 5) — no legacy cleanup code, gdrive-download route, or UT env vars remain. Only historical **rows** (`provider: "uploadthing"`/`"external"`) persist as read-only seed/legacy data. This document is the single source of truth for the file handling system's current design. Earlier architectures (Filebase, UploadThing + GDrive) are preserved in §14 Migration history.

## Overview

STUDIO.V stores three kinds of assets — **reference images** (brand-uploaded product photos), **GLB** 3D models, and **USDZ** 3D models — in **Appwrite Storage** (project `6a8562a20037b62075e1`, region `fra`, endpoint `https://fra.cloud.appwrite.io/v1`). Files upload **browser-direct** to Appwrite (bypassing Vercel's serverless body limit — essential for 100 MB+ GLB files), are recorded as rows in the TablesDB `assets` table, and are served through two paths:

- **In-app reads** (thumbnails, review modals, "Previous models") — auth-gated proxy `GET /api/v1/assets/[assetId]/file` which streams bytes from Appwrite with the server API key.
- **Published embeds** (third-party storefronts) — direct CDN URLs (`assets.url`, the Appwrite `/view` endpoint) made publicly readable by granting `read:any` on the storage file at publish time.

## Architecture decisions

### 1. Appwrite Storage as the sole provider

Two buckets (console config, Phase 0 of `tasks/appwrite-migration.md`):

| Bucket | ID | Max file | Extension gate | Create perm | Read perm | Encryption | Antivirus |
|---|---|---|---|---|---|---|---|
| Models | `models` | 150 MB | none | `label:ADMIN` | `label:ADMIN` | OFF (>20 MB skip) | OFF |
| Reference images | `reference-images` | 16 MB | `jpg png webp gif avif` | `label:BRAND` | `label:BRAND` | ON | ON |

- Browser uploads are authenticated by the **session cookie** (`appwrite-session-6a8562a20037b62075e1`) via the `@appwrite.io/react` client; the bucket `create` permission gates the role.
- File-level `read:any` is only ever granted on **published projects' GLB/USDZ files** (see §4). Reference images never get `read:any`.
- `assets.url` stores the absolute `/view` URL: `${APPWRITE_ENDPOINT}/storage/buckets/{bucketId}/files/{fileId}/view?project=${APPWRITE_PROJECT_ID}`, built server-side via `buildFileUrl` (`src/lib/appwrite-config.ts:13`) — the server SDK's `getFileView` returns bytes, not a URL. **The `?project=` param is required**: Appwrite rejects anonymous `/view` requests without project context (404 even for `read("any")` files — verified 2026-08-30, Phase 6 bug 3). The SDK config endpoint re-derives the URL on-the-fly for `provider === "appwrite"` rows (see §6), so the stored `url` is a convenience cache, not the authoritative URL for published assets.

### 2. Browser-direct uploads (bypass Vercel's body limit)

```
Client (useAppwriteUpload)            Appwrite Storage              Next.js (recordAssetUpload)
   │                                      │                                │
   │── storage.createFile({bucketId,     │                                │
   │     fileId: ID.unique(), file,      │  (browser → Appwrite direct,    │
   │     onProgress }) ─────────────────→│   session-authenticated)        │
   │   ← progress { 0-100 } ─────────────│                                │
   │                                      │                                │
   │── recordAssetUpload({fileId, type}) ────────────────────────────────→│── requirePrincipal(by type)
   │                                      │                                │── storage.getFile (admin client)
   │                                      │                                │── TablesDB createRow(assets, rowId: fileId)
   │←── { asset } ────────────────────────│                                │
```

- **`fileId` = assets row `$id`** — a single identifier across storage and the database. The client generates it with `ID.unique()`; `recordAssetUpload` reuses it as the row id (`src/app/actions/record-asset.ts:53`).
- The server never proxies upload bytes. The `serverActions.bodySizeLimit: '16mb'` limit remains in `next.config.mjs` for the (small) action payloads — it is a general Next.js server-action cap, unrelated to file uploads (browser-direct to Appwrite).
- The client SDK `createFile` `onProgress` receives `UploadProgress = { progress: 0-100 }` (percent), unlike the server SDK's `{ progress, bytesUploaded, bytesTotal }`.
- **Client-side session requirement (Phase 6 bug 1):** uploads are browser-direct to `fra.cloud.appwrite.io`, so the client SDK must hold the session. The `@appwrite.io/react` SSR sign-in only sets the httpOnly cookie (and returns `{ user }`); the provider's client is built per page load with `setSession(ssr.session)` from the root-layout prop. A **soft-navigation** sign-in keeps that prop `null`, so `storage.createFile` would go out as a guest and fail the label-gated bucket `create`. `SignInForm` therefore calls `client.setSession(sessionSecret)` (secret returned by `getSessionPrincipal`, `auth.ts:203`) before navigating — see `pages/auth.md` §2.

### 3. The `assets` TablesDB row (canonical file record)

`AssetsRow` (`src/lib/db.ts:84`) — mirrors the old Prisma `Asset` model, minus storage-provider fields:

```
$id           = storage fileId          (single identifier, set by client ID.unique())
projectId     string | null             (null until linked by createProject / adminSubmitProject)
ownerId       string                    (principal.userId at upload time)
type          "REFERENCE_IMAGE" | "MODEL_GLB" | "MODEL_USDZ"
status        "READY" | "ARCHIVED"      (rows never enter UPLOADING/PUBLISHED/DELETED)
provider      "appwrite"                (legacy: "uploadthing" | "external" for seed rows)
fileId        string | null             (storage file id; null for seed rows — the old `key`/`gdriveFileId` columns are gone)
url           string                    (absolute Appwrite /view URL; legacy rows keep their ufs.sh / external URL)
originalName  string
mimeType      string                    (falls back to type default: model/gltf-binary | model/vnd.usdz+zip)
size          number                    (file.sizeOriginal)
checksum      string | null             (file.signature — MD5)
```

New rows are created by `recordAssetUpload` with `projectId: null`, `status: "READY"`, `provider: "appwrite"` (`src/app/actions/record-asset.ts:50-66`). `projectId` is set later by `createProject` (reference images) or `adminSubmitProject` (models).

### 4. Public access model (publish grant / unpublish revoke)

Bucket-level `read` is label-scoped, so the **proxy route is the only in-app delivery path** (it fetches with the server API key, `APPWRITE_API_KEY` in `.env`). Public embed reads go through **file-level `read:any`**:

- **Publish** (`brandPublishProject`, `src/app/actions/project.ts:117`): grant FIRST, flip status after:
  1. `listAppwriteModelAssets(projectId)` (`project.ts:230`) — READY, `provider === "appwrite"`, GLB/USDZ rows with `fileId` (query: `equal(projectId)` + `Query.or([equal(type, GLB), equal(type, USDZ)])` + `equal(status, READY)` + `equal(provider, "appwrite")`).
  2. `setFilePublic(a, true)` (`project.ts:243`) — admin-client `storage.updateFile({ bucketId, fileId, permissions: [read(any)] })`, allSettled, failures logged only.
  3. Guarded `updateRows` → `PUBLISHED`. If the flip fails: best-effort revoke + throw. Invariant: `PUBLISHED ⇒ files publicly readable`.
- **Unpublish** (`brandSendForRevisions` when `wasPublished`, `project.ts:213-226`): flip status to `REVISIONS` in the transaction, then `setFilePublic(a, false)` → `permissions: []` (node-appwrite v26 `updateFile` only sends `permissions` when defined, so `[]` clears file-level perms). Failures logged only.
- `revalidatePath('/embed/[id]')` on both, so the embed gate and cached config refresh.
- **Reference images never receive `read:any`.** `Permission`/`Role` are imported from `node-appwrite` aliased as `AppwriteRole` (`project.ts:3`) to avoid clashing with the local `Role` enum from `@/lib/auth-guards`.

### 5. Asset delivery route — `GET /api/v1/assets/[assetId]/file`

`src/app/api/v1/assets/[assetId]/file/route.ts:1` — TablesDB-backed, **always auth-gated** (no public bypass):

1. `getRowSafe(assets, id)` → 404 `{ error: "asset unavailable" }` if missing or `status ∉ {READY, PUBLISHED, ARCHIVED}`.
2. `requirePrincipal({ roles: [ADMIN, BRAND] })` → 401 `unauthorized` (Unauthenticated/Stale) / 403 `forbidden` (Forbidden). BRAND passes if `asset.ownerId === principal.userId` **OR** the linked project's `brandId` (`route.ts:29-41`) — unlinked uploads (rows created before `createProject` runs) are viewable by their owner, fixing the old Prisma route's 404-on-unlinked-assets bug.
3. Delivery (`fetchAssetStream`, `route.ts:72`):
   - `provider === "appwrite"` → `fetch("{endpoint}/storage/buckets/{bucket}/files/{fileId}/download")` with `X-Appwrite-Project` + `X-Appwrite-Key` headers; **streams `res.body`** (web stream, zero buffering — critical for 128 MB GLBs).
   - `provider ∈ {external, uploadthing}` (seed / legacy rows) → plain `fetch(asset.url)`.
4. Response headers: stored `mimeType` (type-default fallback), `Content-Disposition: inline; filename="<encoded originalName>"`, `Cache-Control: private, max-age=60`, upstream `Content-Length` when present. A log line records every hit (`route.ts:66`).

No 302 fast path — the proxy always streams so auth and source detection stay server-side. One Vercel egress hop per read.

**Consumers (all point at the proxy):** `TasksClient.tsx` thumbnails/lightbox (`:81, :93, :729, :821, :993, :1166, :1253`), `AdminTasksClient.tsx` thumbnails + "Current GLB/USDZ View" links (`:81, :253, :383, :453, :510`), "Previous models" entries (archived rows), `getUserProjects`/`getAllTasks` derived `referenceUrls`/`assetUrls`/`archivedAssetUrls` (`src/lib/project-augment.ts:61` `proxyUrl` helper). `<Image unoptimized>` remains the pattern for thumbnail reads (the optimizer's anonymous fetch would 401).

### 6. SDK config / embed — direct CDN URLs

- `GET /api/sdk/v1/config/[projectId]` (`src/app/api/sdk/v1/config/[projectId]/route.ts:1`): TablesDB-backed, PUBLISHED-only, returns `{ assetUrls: { glb, usdz }, sdkConfig }`. URLs are derived on-the-fly by `resolveAssetUrl(asset)` (`route.ts:6`) — `buildFileUrl(bucketForAssetType(type), fileId)` for `provider === "appwrite"` rows (so the `?project=` param is always present, independent of when the row was created), falling back to the stored `url` for external/legacy rows. Publicly readable because read:any was granted at publish. Fallback: first non-READY row per type if no READY exists. `Cache-Control: public, s-maxage=60, stale-while-revalidate=86400`.
- `public/embed-viewer.html:143` sets `APP_URL = ""`, so absolute URLs pass through unchanged (`APP_URL + cfg.assetUrls.glb`).
- `GET /embed/[projectId]` (`src/app/embed/[projectId]/route.ts:1`): TablesDB hasGlb check (required — the old Prisma gate couldn't see TablesDB rows, breaking publish→embed), serves the HTML template with `{PROJECT_ID}` replaced. No cache (no-store).

### 7. SDK events route

`POST /api/sdk/v1/events` (`src/app/api/sdk/v1/events/route.ts:1`): validates `eventType ∈ {VIEW, INTERACTION, AR_LAUNCH}` + `sessionId` + `projectId`, PUBLISHED guard, then `createRow(analytics_events, { rowId: ID.unique(), data: { eventType, sessionId, projectId, brandId: project.brandId } })` → 201 `{ success, eventId }`.

### 8. The upload hook — `useAppwriteUpload`

`src/lib/use-appwrite-upload.ts:40` (`"use client"`):

```ts
useAppwriteUpload({ bucketId, maxSizeMB, allowedExtensions? })
  → { upload(file, type): Promise<UploadedAsset | null>, isUploading, progress: 0-100, error, reset }
```

- Uses the pre-built `storage` service from `useAppwrite()` (the `@appwrite.io/react` provider constructs `new Storage(client)` with the session cookie attached — `node_modules/@appwrite.io/react/dist/esm/index.js:25`).
- Client-side validation: size ≤ `maxSizeMB`, extension ∈ `allowedExtensions` (if provided).
- `storage.createFile({ bucketId, fileId: ID.unique(), file, onProgress: (p) => setProgress(p.progress) })`, then `recordAssetUpload({ fileId, type })`.
- Errors: `AppwriteException` 403 → permission, 413 → too large, 429 → rate limit, 400 → bucket rejection; otherwise the message. On failure, best-effort `storage.deleteFile` orphan cleanup.
- Returns `RecordedAsset` (`record-asset.ts:15`): `{ id, url, type, status, mimeType, size, originalName }` — **no `key`**.

Consumers:
- `src/app/tasks/TasksClient.tsx:169` — `bucketId: APPWRITE_REFERENCE_IMAGES_BUCKET_ID`, 16 MB, `["jpg","jpeg","png","webp","gif","avif"]`; `upload(file, "REFERENCE_IMAGE")`.
- `src/app/admin/tasks/AdminTasksClient.tsx:113,119` — two instances, `bucketId: APPWRITE_MODELS_BUCKET_ID`, 128 MB, `["glb"]` / `["usdz"]`; `upload(file, "MODEL_GLB")` / `upload(file, "MODEL_USDZ")`.

### 9. `recordAssetUpload` server action

`src/app/actions/record-asset.ts:23` — `recordAssetUpload({ fileId, type }) → { asset: RecordedAsset }`:
- Role per type: `REFERENCE_IMAGE` → `[Role.BRAND]`; `MODEL_GLB`/`MODEL_USDZ` → `[Role.ADMIN]` (mirrors the bucket `create` perms).
- Admin-client `storage.getFile({ bucketId, fileId })` (validates existence + size metadata).
- `mimeType = file.mimeType || defaultMimeTypeForAssetType(type) || "application/octet-stream"` (browsers send empty types for GLB/USDZ).
- `createRow(assets, { rowId: fileId, data: { projectId: null, ownerId, type, status: READY, provider: "appwrite", fileId, url: buildFileUrl(...), originalName, mimeType, size: file.sizeOriginal, checksum: file.signature } })`.

### 10. Archival

`adminSubmitProject` (`src/app/actions/admin.ts`, transaction): archives prior READY GLB/USDZ rows (projectId link preserved for "Previous models"), links the new rows. **No post-commit cleanup** — archived files are always **kept** in Appwrite Storage (user decision). Archived models stay viewable via the proxy ("Previous models" list) and, while the project is published, via their read:any grant. The legacy `utapi.deleteFiles` branch was removed with the UploadThing package in Phase 5.

### 11. File validation rules

| Asset type | Gate | Max size | MIME enforcement |
|---|---|---|---|
| `REFERENCE_IMAGE` | console bucket extension gate `jpg png webp gif avif` + client `allowedExtensions` | 16 MB (console max-file) | Bucket-level (antivirus ON) |
| `MODEL_GLB` | client `["glb"]` | 128 MB (hook) / 150 MB (console max-file) | Weak — picker filters by extension; `recordAssetUpload` defaults mime to `model/gltf-binary` |
| `MODEL_USDZ` | client `["usdz"]` | same | Weak — defaults to `model/vnd.usdz+zip` |

### 12. `next.config.mjs`

`images.remotePatterns`: `images.unsplash.com` (seed) + `fra.cloud.appwrite.io` (direct Appwrite CDN reads — glb/usdz loads go through the proxy, but future `<Image>`-served refs may hit the CDN). `serverActions.bodySizeLimit: '16mb'` (general server-action payload cap — unrelated to UploadThing, which is gone) kept for action payloads.

### 13. Environment variables

| Var | Used for | Location |
|---|---|---|
| `APPWRITE_API_KEY` | Server-side proxy streaming, `getFile`, `updateFile` (perms) | `.env` (gitignored), read via `src/lib/appwrite.ts:8` |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Client + server endpoint | public |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Client + server project | public |

> Removed in Phase 5: `UPLOADTHING_TOKEN`, `GOOGLE_OAUTH_*`, `GDRIVE_BACKUP_FOLDER_ID` — no longer in `.env` or `.env.example`.

## Data flow

### Brand uploads reference images
1. Brand opens "New Task" modal in `TasksClient.tsx` → `useAppwriteUpload(...).upload(file, "REFERENCE_IMAGE")`.
2. Browser `storage.createFile` (session cookie, `label:BRAND` create perm) → `recordAssetUpload` → TablesDB `assets` row (READY, `provider: "appwrite"`, `$id` = fileId).
3. Hook returns `RecordedAsset`; client stores it in `uploadedAssets` (max 5).
4. "Queue Generation" → `createProject(name, assetIds, sku, instructions, dimensions)` — tx: quota decrement (`usageLimits`), verify asset rows READY + owned, create PENDING project, link assets (`projectId` set, `isNull` guard).

### Admin uploads 3D model
1. Admin opens a PENDING or REVISIONS project from `/admin/tasks` → Management modal.
2. Uploads GLB → `upload(file, "MODEL_GLB")` (same flow; `label:ADMIN` create perm). Optional USDZ → `MODEL_USDZ`. "Replace GLB/USDZ file" dropzone label when a READY model is already linked.
3. "Submit for Review" → `adminSubmitProject` — tx: status flip (`PENDING|REVISIONS` → `COMPLETED`), archive prior READY models (files **always kept** — no post-commit cleanup), link new rows.

### Brand reviews and publishes
1. Brand opens a COMPLETED card → Review modal → `ThreeDConfigurator` loads the GLB **via the proxy** (session-authenticated).
2. "Approve & Publish" → `brandPublishProject`: **grant `read:any` on GLB/USDZ storage files first**, then guarded flip → `PUBLISHED`. Embed becomes publicly loadable.
3. "Request Changes" → `brandSendForRevisions(projectId, note)`: flip → `REVISIONS` + revision row; if `wasPublished`, **revoke** `read:any` (`permissions: []`) + revalidate embed.

### Embed serves 3D model (public)
1. Storefront loads iframe → `GET /embed/{projectId}` → TablesDB gate → HTML template.
2. `embed-viewer.html` fetches `GET /api/sdk/v1/config/{projectId}` → `assetUrls.glb` = absolute Appwrite `/view` URL with `?project=` (read:any + project param required for anonymous fetch — Phase 6 bug 3) → `<model-viewer src=...>`; optional `ios-src` usdz.
3. Viewer posts events to `POST /api/sdk/v1/events` → TablesDB `analytics_events`.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Storage file perms desync from row status (grant succeeded but flip failed, etc.) | Low | Grant-before-flip + best-effort revoke on flip failure; revoke failures logged. Row status remains the in-app gate. |
| Session cookie expiry during a large browser upload | Low | `createFile` fails mid-upload → orphan cleanup via best-effort `deleteFile`; user retries. |
| Every in-app read proxied through Vercel egress | Low-Medium at scale | `Cache-Control: private, max-age=60` on the proxy; embed reads hit the CDN directly (no Vercel hop). Revisit if bandwidth cost grows. |
| 150 GB storage cap (plan `auto-1`, pro group, $0) | Low | ~150 models at 10–50 MB = 1.5–7.5 GB. Archived files are kept intentionally — monitor usage. |
| GLB/USDZ MIME not validated server-side | Low | File picker filters by extension; only ADMIN uploads models. Optional: post-upload MIME check + delete. |
| Seed/legacy `external`/`uploadthing` URLs go stale | Low | Proxy falls back to the stored URL only; legacy rows are read-only historical data. |
| Server action returns raw Appwrite row → "Only plain objects…" error in the client console | Medium (broken UX) | **Never return an Appwrite row object from a server action.** Always project to a plain object first (e.g. `return { success: true, projectId: created.$id }`). `Models.Row` instances carry `$permissions`/`$sequence`/etc. whose prototypes/metadata break Next.js's Server→Client serialization. Bug found and fixed in `createProject` after Phase 4 gate. |

## Open questions

1. **Asset status on publish:** rows stay `READY` after publish (files get read:any). A `PUBLISHED` row status is defined but unused — revisit if analytics need to distinguish.
2. **File deletion UI / orphan cleanup:** removing an image from `uploadedAssets` in the New Task modal only removes it from client state — the storage file + `assets` row remain (pre-existing behavior). Future task.
3. **Archived-file retention:** per user decision, archived model files are kept forever in Appwrite Storage. A TTL/cleanup job is a future task if the plan's 150 GB cap ever matters.
4. **Bandwidth:** plan allows 2,000 GB/month. The proxy path adds one Vercel hop per in-app read; direct CDN URLs already cover the embed path.

## Migration history

### Migration 1 — Cloudflare R2 → Filebase (July 2026, COMPLETE then reverted)
See `tasks/plan.md`. Reverted because Filebase's free tier only supports private buckets, breaking anonymous embed reads.

### Migration 2 — Filebase → UploadThing (July 2026, superseded)
Reverted the Filebase presigned-URL architecture back to UploadThing (`*.ufs.sh` public CDN) + Google Drive backup. See `tasks/revert-to-uploadthing.md`. Removed from the active path in Migration 3; legacy code + env vars fully deleted in Phase 5.

### Migration 3 — UploadThing + GDrive → Appwrite Storage (August 2026, CURRENT)
Full replacement (Phase 4 of `tasks/appwrite-migration.md`): browser-direct uploads to Appwrite buckets, `assets` rows in TablesDB (row `$id` = storage fileId), auth-gated streaming proxy for in-app reads, direct CDN URLs for published embeds via publish-time `read:any` grants. **Phase 5 completed the removal:** `utapi` cleanup branch deleted from `adminSubmitProject`, `src/lib/uploadthing-server.ts` + gdrive-download route + `prisma/` deleted, `UPLOADTHING_TOKEN`/`GOOGLE_OAUTH_*`/`GDRIVE_*` env vars stripped.

**Files created:** `src/app/actions/record-asset.ts`, `src/lib/use-appwrite-upload.ts`.
**Files rewritten:** `src/app/api/v1/assets/[assetId]/file/route.ts` (TablesDB + streaming), `src/app/api/sdk/v1/config/[projectId]/route.ts` + `src/app/api/sdk/v1/events/route.ts` + `src/app/embed/[projectId]/route.ts` (TablesDB), `src/app/actions/project.ts` (grant/revoke), `src/app/actions/admin.ts` (archival; the legacy provider-split cleanup branch was removed in Phase 5), `src/lib/appwrite-config.ts` (bucket id, `buildFileUrl`, `bucketForAssetType`, mime defaults), `src/app/tasks/TasksClient.tsx` + `src/app/admin/tasks/AdminTasksClient.tsx` (hook swap, GDrive copy/link removal), `next.config.mjs` (remote patterns).
**Files deleted:** `src/app/api/uploadthing/` (route + core), `src/lib/hooks/use-presigned-upload.ts`, `src/lib/uploadthing.ts`, `src/lib/storage/` (types, gdrive-adapter, gdrive-client, asset-delivery, naming, index). **Phase 5 deletions:** `src/lib/uploadthing-server.ts`, `src/app/api/admin/assets/[assetId]/gdrive-download/route.ts`, `prisma/`, `scripts/get-gdrive-refresh-token.ts`, `scripts/get-published-id.ts`.

## References

- `../WEBSITE.md` §10 File upload workflow · §5 API routes · §6 Model replacement lifecycle · §8 server actions
- `../pages/tasks.md` — New Task / Review / Published modals (upload consumers + thumbnails)
- `../pages/admin.md` §3 — Admin modal: "Replace" copy, "Previous models" collapsible
- `tasks/appwrite-migration.md` §0 Phase 4 — the migration record with SDK-level corrections
- `deployment.md` — Vercel env var setup