# File Storage Architecture

> **Parent:** [`./WEBSITE.md`](./WEBSITE.md) — deep dive on file handling: uploads, delivery, permissions, archival.

## Overview

Peka AR stores three kinds of assets — **reference images** (brand-uploaded product photos), **GLB** and **USDZ** 3D models — in **Appwrite Storage** (project `6a8562a20037b62075e1`, region `fra`). Files upload **browser-direct** to Appwrite (bypassing the SSR host's request body limit — essential for 100 MB+ GLB files), are recorded as rows in the TablesDB `assets` table, and are served through two paths:

- **In-app reads** (thumbnails, review modals, "Previous models") — auth-gated proxy `GET /api/v1/assets/[assetId]/file`, which streams bytes from Appwrite with the server API key.
- **Published embeds** (third-party storefronts) — direct CDN URLs (the Appwrite `/view` endpoint) made publicly readable by granting `read:any` on the storage file at publish time.

Legacy seed/hero rows carry `provider: "external"` (GitHub/Unsplash URLs) — read-only data, fetched verbatim by the proxy.

## Architecture decisions

### 1. Two buckets, label-gated

| Bucket | ID | Max file | Extension gate | Create perm | Read perm |
|---|---|---|---|---|---|
| Models | `models` | 150 MB | glb/usdz (enforced by `ensure-backend`) | `label:ADMIN` | `label:ADMIN` |
| Reference images | `reference-images` | 16 MB | jpg png webp gif avif | `label:BRAND` | `label:BRAND` |

- Browser uploads are authenticated by the **session cookie** via the `@appwrite.io/react` client; the bucket `create` permission gates the role.
- File-level `read:any` is only ever granted on **published projects' GLB/USDZ files** (see §4). Reference images never get `read:any`.
- `assets.url` stores the absolute `/view` URL, built server-side via `buildFileUrl` (`src/lib/appwrite-config.ts`). **The `?project=<id>` param is required**: Appwrite rejects anonymous `/view` requests without project context (404 even for `read("any")` files). The SDK config endpoint re-derives the URL on-the-fly, so the stored `url` is a convenience cache, not authoritative.

### 2. Browser-direct uploads

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

- **`fileId` = assets row `$id`** — a single identifier across storage and database (client generates it with `ID.unique()`; the action reuses it as the row id). `recordAssetUpload` is **idempotent by `rowId = fileId`** — a retried call or a lost response reuses the existing row (ownership-checked) instead of duplicating.
- The server never proxies upload bytes. `serverActions.bodySizeLimit: '16mb'` in `next.config.mjs` is a general action-payload cap, unrelated to uploads.
- The client SDK `createFile` `onProgress` receives **percent** (`{ progress: 0-100 }`), unlike the server SDK's bytes-based progress.
- **Client session requirement:** uploads are browser-direct, so the client SDK must hold the session. The `@appwrite.io/react` SSR sign-in only sets the httpOnly cookie; a **soft-navigation** sign-in leaves the provider's client `session = null`, so `storage.createFile` goes out as a guest and fails the label-gated `create`. `SignInForm` therefore calls `client.setSession(sessionSecret)` (secret returned by `getSessionPrincipal`) before navigating — see `pages/auth.md` §Sign In.

### 3. The `assets` row (canonical file record)

`AssetsRow` in `src/server/db/client.ts`:

```
$id           = storage fileId          (single identifier, set by client ID.unique())
projectId     string | null             (null until linked by createProject / adminSubmitProject)
ownerId       string                    (principal.userId at upload time)
type          "REFERENCE_IMAGE" | "MODEL_GLB" | "MODEL_USDZ"
status        "READY" | "ARCHIVED"      (rows never enter UPLOADING/PUBLISHED/DELETED)
provider      "appwrite"                (legacy seed rows: "external")
fileId        string | null             (null for seed rows)
url           string                    (absolute Appwrite /view URL; legacy rows keep external URLs)
originalName / mimeType / size / checksum
```

New rows are created by `recordAssetUpload` with `projectId: null`, `status: "READY"`. `projectId` is set later by `createProject` (reference images) or `adminSubmitProject` (models).

### 4. Public access model (publish grant / unpublish revoke)

Bucket-level `read` is label-scoped, so the **proxy route is the only in-app delivery path**. Public embed reads go through **file-level `read:any`**:

- **Publish** (`brandPublishProjectService` in `src/server/services/project.service.ts`): grant FIRST, flip status after.
  1. `listAppwriteModelAssetsForProject(projectId)` — READY, `provider === "appwrite"`, GLB/USDZ rows with `fileId`.
  2. `setFilePublicWithRetry(asset, true)` (`src/server/storage.ts`) — admin-client `storage.updateFile` with `permissions: [read(any)]`, 3 attempts / 250ms exp backoff.
  3. Guarded `updateRows` → `PUBLISHED`. If the flip fails: best-effort revoke + throw. **Invariant: `PUBLISHED ⇒ files publicly readable`.**
- **Unpublish** (`brandSendForRevisionsService` when `wasPublished`): flip status in the tx, then `setFilePublicWithRetry(asset, false)` → `permissions: []` (node-appwrite only sends `permissions` when defined, so `[]` clears file-level perms). Failures logged only — residual drift is covered by the nightly reconciliation sweep (`backend-architecture.md` §11).
- Both revalidate `/embed/[id]`.
- `Permission`/`Role` are imported from `node-appwrite` aliased as `AppwriteRole` (`src/server/storage.ts`) to avoid clashing with the local `Role` enum.

### 5. Asset delivery route — `GET /api/v1/assets/[assetId]/file`

**Always auth-gated** (no public bypass):

1. `getRowSafe(assets, id)` → 404 if missing or `status ∉ {READY, PUBLISHED, ARCHIVED}`.
2. `requirePrincipal({ roles: [ADMIN, BRAND] })`. BRAND passes if `asset.ownerId === principal.userId` **OR** the linked project's `brandId` — unlinked uploads (rows created before `createProject` runs) are viewable by their owner.
3. Delivery (`fetchAssetStream`): `provider === "appwrite"` → `fetch("{endpoint}/storage/buckets/{bucket}/files/{fileId}/download")` with `X-Appwrite-Project` + `X-Appwrite-Key` headers, **streaming `res.body`** (zero buffering — critical for 128 MB GLBs). Legacy/external providers → plain `fetch(asset.url)`.
4. Headers: stored `mimeType` (type-default fallback), `Content-Disposition: inline; filename=…`, `Cache-Control: private, max-age=60`, upstream `Content-Length` when present.

No 302 fast path — the proxy always streams so auth and source detection stay server-side. One SSR-host egress hop per read; embed reads hit the CDN directly.

**Consumers:** all `TasksClient`/`AdminTasksClient` thumbnails, lightboxes, and View links; derived `referenceUrls`/`assetUrls`/`archivedAssetUrls` in `src/lib/project-augment.ts` (`proxyUrl` helper). **`<Image unoptimized>` is the required pattern** for proxy reads — the optimizer's anonymous fetch would 401 (see `WEBSITE.md` §5).

### 6. SDK config / embed — direct CDN URLs

- `GET /api/sdk/v1/config/[projectId]`: PUBLISHED-only; URLs derived on-the-fly by `resolveAssetUrl` — `buildFileUrl(bucketForAssetType(type), fileId)` for appwrite rows (always carries `?project=`), falling back to stored `url` for legacy/external rows. Publicly readable because read:any was granted at publish.
- `public/embed-viewer.html` sets `APP_URL = ""`, so absolute CDN URLs pass through unchanged.
- Full embed spec: `pages/embed.md`.

### 7. SDK events route

`POST /api/sdk/v1/events`: validates `eventType ∈ {VIEW, INTERACTION, AR_LAUNCH}` + `sessionId` + `projectId`, PUBLISHED guard, `createRow(analytics_events, …)` → `201 { success, eventId }`.

### 8. The upload hook — `useAppwriteUpload`

`src/lib/use-appwrite-upload.ts` (`"use client"`):

```ts
useAppwriteUpload({ bucketId, maxSizeMB, allowedExtensions? })
  → { upload(file, type): Promise<UploadedAsset | null>, isUploading, progress: 0-100, error, reset }
```

- Uses the pre-built `storage` service from `useAppwrite()` (the provider attaches the session cookie).
- Client-side validation: size ≤ `maxSizeMB`, extension ∈ `allowedExtensions`.
- `storage.createFile({ bucketId, fileId: ID.unique(), file, onProgress })`, then `recordAssetUpload({ fileId, type })`.
- Error mapping: 403 permission, 413 too large, 429 rate limit, 400 bucket rejection. On failure, best-effort `storage.deleteFile` orphan cleanup.
- Returns `RecordedAsset`: `{ id, url, type, status, mimeType, size, originalName }`.

Consumers: `TasksClient` (reference-images, 16 MB) and `AdminTasksClient` (two instances — glb + usdz, 128 MB each, bucket `models`).

### 9. `recordAssetUpload` server action

`src/app/actions/record-asset.ts` — role per type (REFERENCE_IMAGE → BRAND; models → ADMIN, mirroring bucket `create` perms). Admin-client `storage.getFile` for metadata (validates existence); `mimeType = file.mimeType || defaultMimeTypeForAssetType(type)` (browsers send empty types for GLB/USDZ); idempotent `createRow(assets, { rowId: fileId, … })`.

### 10. Archival

`adminSubmitProject` archives prior READY GLB/USDZ rows in the same transaction (projectId preserved for "Previous models") and links the new rows. **Archived files are always kept in Appwrite Storage** (user decision) — viewable via the proxy, and via their read:any grant while the project stays published. No quota impact on re-upload.

### 11. File validation rules

| Asset type | Gate | Max size | MIME enforcement |
|---|---|---|---|
| `REFERENCE_IMAGE` | bucket extension gate + client `allowedExtensions` | 16 MB | Bucket-level (antivirus ON) |
| `MODEL_GLB` | client `["glb"]` | 128 MB (hook) / 150 MB (bucket) | Weak — picker filters by extension; mime defaults to `model/gltf-binary` |
| `MODEL_USDZ` | client `["usdz"]` | same | Weak — defaults to `model/vnd.usdz+zip` |

### 12. Environment variables

| Var | Used for |
|---|---|
| `APPWRITE_API_KEY` (local) / `STUDIOV_API_KEY` (Sites) | Server-side proxy streaming, `getFile`, `updateFile` (permissions) |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` / `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Client + server endpoint/project |

## Data flow

### Brand uploads reference images
1. "New Task" modal → `upload(file, "REFERENCE_IMAGE")` → browser `storage.createFile` (`label:BRAND` create perm) → `recordAssetUpload` → READY `assets` row (`$id` = fileId).
2. Hook returns `RecordedAsset`; client stores it in `uploadedAssets` (max 5).
3. "Queue Generation" → `createProject(...)` — tx: quota decrement, verify assets READY + owned, create PENDING project, link assets.

### Admin uploads 3D model
1. `/admin/tasks` management modal (PENDING or REVISIONS project).
2. GLB upload (+ optional USDZ). "Replace GLB/USDZ file" dropzone when a READY model is already linked.
3. "Submit for Review" → `adminSubmitProject` — tx: status flip, archive prior models (files kept), link new rows.

### Brand reviews and publishes
1. Review modal → `ThreeDConfigurator` loads the GLB **via the proxy** (session-authenticated).
2. "Approve & Publish" → grant `read:any` first, then flip → `PUBLISHED`.
3. "Request Changes" → flip → REVISIONS + revision row; if wasPublished, revoke `read:any` + revalidate embed.

### Embed serves 3D model (public)
1. Storefront iframe → `GET /embed/{projectId}` → PUBLISHED + GLB gates → HTML template.
2. Viewer fetches `GET /api/sdk/v1/config/{projectId}` → `assetUrls.glb` (CDN URL with `?project=`, read:any) → `<model-viewer>`.
3. Viewer posts `VIEW`/`INTERACTION`/`AR_LAUNCH` to `/api/sdk/v1/events`.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Storage file perms desync from row status | Low | Grant-before-flip + best-effort revoke; nightly reconciliation sweep. Row status remains the in-app gate. |
| Session cookie expiry during a large upload | Low | `createFile` fails mid-upload → best-effort `deleteFile` orphan cleanup; user retries. |
| Every in-app read proxied through the SSR host egress | Low-Medium at scale | `private, max-age=60` on the proxy; embed reads hit the CDN directly. Revisit if bandwidth grows. |
| 150 GB storage cap (free plan) | Low | Archived files kept intentionally — monitor usage; TTL job is a future task if the cap matters. |
| GLB/USDZ MIME not validated server-side | Low | Picker filters by extension; only ADMIN uploads models. |
| Legacy `external` URLs go stale | Low | Proxy fetches the stored URL verbatim; legacy rows are read-only. |
| Server action returns a raw Appwrite row | Medium (broken UX) | **Never return an Appwrite row from a server action** — always project to a plain object first (`Models.Row` metadata breaks Next.js Server→Client serialization). |

## Open questions

1. **Asset status on publish:** rows stay `READY` after publish (files get read:any). The `PUBLISHED` row status is defined but unused — revisit if analytics need to distinguish.
2. **Orphan cleanup:** removing an image from `uploadedAssets` in the New Task modal only clears client state — the storage file + `assets` row remain. Future task.
3. **Archived-file retention:** kept forever per user decision; a TTL/cleanup job is a future task if the storage cap ever matters.

## References

- `../WEBSITE.md` §10 upload flow · §5 API routes · §8 server actions
- `../pages/tasks.md` — New Task / Review / Published modals (upload consumers + thumbnails)
- `../pages/admin.md` §3 — admin modal: "Replace" copy, "Previous models" collapsible
- `../pages/embed.md` — embed viewer + SDK endpoints
- `deployment.md` — Appwrite Sites env vars + hosting handbook
