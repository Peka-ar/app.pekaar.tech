# Generation Architecture

> Parent: `../WEBSITE.md`

Two-tier generation: **Artist** (enum `PREMIUM`; artist-finished, admin-managed) and **Fast** (enum `FAST`, labeled **"AI pipeline"**; automated via Hunyuan3D Modal API). Labels are display-only — enum values remain `PREMIUM`/`FAST`.

## Generation modes

| Mode | Credits | Timeline | Flow |
|---|---|---|---|
| `PREMIUM` | 10 | Hours (artist) | Brand → PENDING → Admin submits GLB/USDZ → COMPLETED → Brand publishes |
| `FAST` | 2 | ~5-10 min (AI) | Brand → PENDING → Modal API job → COMPLETED → Brand publishes |

**Regenerate** (Fast only): 1 credit. Available on SUCCEEDED or FAILED generation status.

## Enums (src/lib/enums.ts)

- `GenerationMode`: `PREMIUM | FAST`
- `GenerationStatus`: `SUBMITTED | RUNNING | FINALIZING | SUCCEEDED | FAILED`
- `ReferenceView`: `front | left | back | right`

## Generation columns (`projects` table)

11 columns now: `generationMode`, `generationStatus`, `generationJobId`, `generationRunId`, `generationAssetId`, `generationError`, `generationViews`, `generationStartedAt`, `generationCompletedAt`, `generationCreditCost`, **`generationClaimedAt`** (datetime string; set when a poll/cron claims FINALIZING — enables crash recovery of stuck rows).

## Image normalization

All inputs go through Appwrite `storage.getFilePreview` to produce a normalized JPEG:
- `width: 1536`, `quality: 90`, `output: "jpg"`
- Input must be < 10 MB (Appwrite preview limitation); server-side check with clear error.

## Hunyuan3D Modal API (`src/server/hunyuan/`)

### Manifest builder (`manifest.ts`)

Pure functions — no I/O, fully unit-tested.

- `MODEL_NAME = "model"` — constant model name for all submissions.
- Single mode (1 view): `files=[{filename:"model.jpg"}]`, no manifest needed.
- Multiview (2-4 views): staged filenames `model__front.jpg`, `model__left.jpg`, etc. Manifest: `{"models":[{"name":"model","views":{"front":"model__front.jpg",...}}]}`.
- `findGlbPath(files, name)` — picks the `_textured.glb` from job output.
- `validateViews(tags)` — enforces front required, max 4, no duplicates (rejects repeated tags), no unknown tags.
- `GENERATION_QUALITY = "max"` — AI pipeline runs at Modal `quality: "max"` (9 views, 25 texture steps) for best output; `remove_bg: true` is always sent.

### API client (`client.ts`)

- `getHy3dConfig(fallbackIndex)` — reads `HY3D_API_URL`, `HY3D_API_URL_2`, `HY3D_API_TOKEN` from env.
- `submitJob(config, params)` — POST `/jobs` with FormData. **Never retried** (double-bill risk). Uses `AbortSignal.timeout(60s)`. Failover to fallback URL only on errors proving the request never landed (ENOTFOUND/ECONNREFUSED); timeouts or resets mid-request are NOT safe to retry.
- `pollJob(config, jobId)` — GET `/jobs/{id}` → running/succeeded/failed/expired. Uses `AbortSignal.timeout(15s)`.
- `downloadArtifact(config, runId, path)` — GET `/runs/{runId}/files/{path}` with 3 retries. Job `files[].path` values from `GET /jobs/{id}` are OUTPUT_ROOT-relative and already include the `{runId}/` prefix — `toRunRelativePath(runId, path)` strips it (idempotent) before building the URL, otherwise the API 404s on a doubled run id (`runs/{runId}/files/{runId}/...`). **Rejects paths with `..`, `.`, or empty segments** (traversal guard). Uses `AbortSignal.timeout(180s)`.
- `withFailover(fn, opts?)` — tries primary config, falls back to secondary on network/auth errors. For non-idempotent calls (`submitJob`), pass `canFailover: isSafeToResubmit` to restrict failover to connection-refused-class errors only.

### Error types

- `Hy3dNotConfiguredError` — HY3D_API_TOKEN or URL not set.
- `Hy3dSubmissionError` — POST /jobs failed (422 validation, 401 auth).
- `Hy3dTransientError` — transient HTTP error on poll/download.
- `Hy3dExpiredError` — job unknown or results expired (7-day retention).

## Generation service (`src/server/services/generation.service.ts`)

### startFastGeneration

1. Verify project is FAST mode + PENDING/REVISIONS status.
2. Set `generationStatus: SUBMITTED` + record `generationCreditCost` (the caller-charged amount).
3. Normalize images, build manifest, submit to Modal — any failure here sets `FAILED` + `generationError` and rethrows (never leaves the row stuck in `SUBMITTED`).
4. On success: set `generationStatus: RUNNING` + `generationJobId`.
5. On submission failure: set `generationStatus: FAILED` + `generationError`, rethrow. Caller (`createProjectService`) refunds the exact `creditCost`.

**Credit handling**: The service does NOT deduct credits. Credit logic lives in callers only:
- `createProjectService` deducts 2 credits inside a transaction before calling this. On failure, `refundCredits` returns them.
- `adminRegenerateGeneration` bypasses credits entirely (admin override).

### pollAndFinalize

1. Skip if already terminal (SUCCEEDED/FAILED). FINALIZING rows are **not** skipped — they may be stale and need re-claiming.
2. Job timeout check (30 min from `generationStartedAt`, falls back to `$createdAt`; `quality: "max"` jobs take ~15 min wall).
3. Stale `SUBMITTED` with no `generationJobId` past timeout → FAILED + refund (guarded write, only one caller refunds).
4. Poll Modal → running (return), failed (set FAILED + refund), succeeded → finalize.
5. **Claim**: atomic updateRows guard on RUNNING|SUBMITTED → FINALIZING; also sets `generationClaimedAt`. If claim fails (already claimed), attempt **re-claim of stale FINALIZING** (`claimedAt` older than 10 min or null) via two updateRows calls. Only the winner proceeds; losers return current state without refund.
6. **Archive-on-claim**: prior READY GLB/USDZ rows for the project flip to ARCHIVED before creating a new asset row (prevents orphan models + wrong-model-after-publish bug).
7. Download GLB (timing logs: `downloading GLB` / `GLB downloaded` with bytes+ms), upload to storage with `permissions: []` (private until publish — the publish flow grants `read("any")`, nightly reconcile enforces public-only-on-PUBLISHED; timing logs: `uploading GLB to storage` / `GLB uploaded`), create asset row matching `AssetsRow` (`type: MODEL_GLB`, `status: READY`, `provider: appwrite`, `fileId`, `originalName`, `mimeType`, `size`), link via `generationAssetId`.
8. Set `generationRunId` from Modal's `run_id`.
9. Flip `status → COMPLETED` via `SYSTEM_ACTOR` transition when allowed (brand then publishes). The final link update is wrapped in try/catch — on throw: cleanup asset row + storage file, guarded-FAILED + refund.
10. On any finalize failure (no GLB, download, upload, asset row, final link), set FAILED + refund `generationCreditCost` (guarded write; only one caller refunds).
11. Storage file is deleted if asset-row creation fails after upload (no orphan); final-link failures also delete both asset row and storage file.

**Refunds**: every failure path uses `refundCreditsLogged` (never throws; logs success at debug level, logs error on failure). Credit deduction retries up to 3 times with backoff; no read-modify-write fallbacks (lost-update risk). Guarded writes ensure only one caller refunds per failure event.

### regenerateFastGeneration

1. Verify FAST mode + SUCCEEDED/FAILED generation status.
2. Verify regenerable state (PENDING or COMPLETED).
3. Re-normalize views, re-submit to Modal — failures set FAILED + rethrow (caller refunds 1 credit).
4. Reset generation state to RUNNING + record `generationCreditCost: 1`.

**Credit handling**: The service does NOT deduct credits. Callers handle deduction:
- `regenerateGeneration` (brand/admin action) deducts 1 credit, refunds on failure.
- `adminRegenerateGeneration` bypasses credits (admin override).

### refundCredits

Helper to return credits to a user. Called by callers when Modal API submission fails, so brands are only charged for successfully started jobs.

### finalizeStaleGenerations (cron sweep)

Called by `/api/cron/maintenance` nightly. Scans **three classes** of projects: RUNNING, SUBMITTED, and FINALIZING rows with `generationClaimedAt` older than 10 min or null (stale crash-recovery). Calls `pollAndFinalize` for each — the claim guard handles re-claiming stale FINALIZING rows. Idempotent; refunds logged, never thrown.

## State machine update (`src/server/domain/project-state-machine.ts`)

Added 4th transition: `PENDING|REVISIONS → COMPLETED by SYSTEM_ACTOR`. `pollAndFinalize` invokes this on successful finalize so the project flips to `COMPLETED` automatically — the brand then publishes (`COMPLETED → PUBLISHED by BRAND`). `canTransition` guards the flip; already-`COMPLETED` projects are left alone.

## Credits

| Action | Credits | Enforcement |
|---|---|---|
| Create Premium project | 10 | `decrementRowColumn(value=10, min=0)` inside transaction in `createProjectService` |
| Create Fast project | 2 | `decrementRowColumn(value=2, min=0)` inside transaction in `createProjectService`. Any failure (start, poll, finalize) refunds the exact `generationCreditCost` (2). |
| Regenerate (Fast, brand) | 1 | `decrementRowColumn(value=1, min=0)` in `regenerateGeneration` action before calling service. On failure, `refundCredits` returns the 1 credit. Poll/finalize failure refunds `generationCreditCost` (1). |
| Regenerate (Fast, admin) | 0 | Admin bypass — no credit deduction, `skipOwnershipCheck: true`. |

Default new-brand credit allocation: **8** (down from 10). Existing users backfilled to 8.

Premium is **paid-only** for default brands (8 < 10). Admin override can grant more.

**Credit flow principle**: generation service functions (`startFastGeneration`, `regenerateFastGeneration`) never handle credits. Callers are responsible for check + deduct + refund-on-failure. This keeps credit logic in the action layer where auth context is available. `pollAndFinalize` refunds `generationCreditCost` (the amount actually charged for this attempt) on every failure path.

## API route

`GET /api/v1/generation/[projectId]` — auth-gated poll+finalize. Returns `{ generationStatus, generationError?, generationCompletedAt? }`. Ownership enforced: brand owner or admin only; others get 404.

## UI

- **New Task wizard**: Mode selector (Artist / AI pipeline) on Photos step. FAST mode shows 4 tagged view slots (Front required, Left/Back/Right optional) with image assignment dropdowns.
- **Task cards**: "AI pipeline" badge on FAST projects.
- **Processing drawer**: Generation status banner for FAST projects, "Check Status" poll button, "Regenerate" button on FAILED (brand: 1 credit).
- **Admin drawer**: Generation status + timing info for FAST projects, "Regenerate" button on FAILED/SUCCEEDED (admin: no credit cost).

## Gotchas

- **Deleting a PENDING project does not cancel the Modal job** — `deletePendingProjectService` (project delete) removes the row, but the Hunyuan client has no cancel API; the job finishes and its result is discarded (`pollAndFinalize` gets `NotFoundError` on the missing project). A post-commit re-sweep in the delete service removes any asset row a racing finalize re-creates with the dead projectId. **Credits are never refunded on delete.**
- **`generationViews` must be a partial record** (`z.partialRecord(z.enum(REFERENCE_VIEW_TAGS), appwriteId)` in `createProjectSchema`): the client only sends tagged views (Front required, Left/Back/Right optional). Zod v4 `z.record(z.enum(...))` is exhaustive and requires all keys — use `z.partialRecord` instead. Empty maps / missing `front` are caught by explicit refinements with friendly messages.
- **`projects` must carry the 10 generation columns** (`generationMode`, `generationStatus`, `generationJobId`, `generationRunId`, `generationAssetId`, `generationError`, `generationViews`, `generationStartedAt`, `generationCompletedAt`, `generationCreditCost` — see `src/server/db/ensure.ts`). Without them Appwrite rejects `createRow` with `Unknown attribute: "generationMode"` (surfaced as `[action] unexpected failure` until this fix). Provision with `npm run ensure-backend`; the New Task path also auto-heals on the first Unknown-attribute, so a cold DB recovers on the next attempt.
- **Asset status is case-sensitive and uppercase**: `AssetStatus.READY = "READY"`. `normalizeImage` must compare `asset.status !== AssetStatus.READY` — comparing to lowercase `"ready"` fails for every legitimate asset (this was the root cause of `Asset … is not ready`). Generated asset rows must also use `AssetType.MODEL_GLB` / `AssetStatus.READY` / `provider: "appwrite"` / `fileId` / `originalName` / `mimeType` / `size` so `listAppwriteModelAssets` and reconcile can find them.
- **AI pipeline runs at Modal `quality: "max"` + `remove_bg: true`** — `GENERATION_QUALITY` in `manifest.ts` is `"max"` (9 views, 25 texture steps), not `"balanced"`. Both `startFastGeneration` and `regenerateFastGeneration` always send `remove_bg: true`.
- **Normalize failure must set FAILED**: `startFastGeneration` and `regenerateFastGeneration` wrap normalization + manifest in try/catch that sets `generationStatus: FAILED` + `generationError` and rethrows — otherwise the row stays stuck in `SUBMITTED` with no job forever.
- **Claim guard accepts RUNNING *or* SUBMITTED**: `withFailover` can return `succeeded` before the `SUBMITTED → RUNNING` flip lands, so the finalize claim queries both statuses. Claiming only `RUNNING` would miss that race.
- **Refund uses `generationCreditCost`**: every `pollAndFinalize` failure path refunds `project.generationCreditCost` (2 for create, 1 for regenerate), not a hard-coded 2 — otherwise a regenerate poll-failure would net the brand +1 credit. `refundCredits` prefers `incrementRowColumn` (atomic) with a read-modify-write fallback.
- **Modal call-output retention is 7 days**; finalize must happen within that window.
- **`POST /jobs` must never be retried** — a lost response could mean the request landed; retrying double-bills GPU time.
- **`GET /jobs` returns 401 on bad token** (not transient); `404` means unknown/expired job → `Hy3dExpiredError`. `withFailover` does not retry on `Hy3dSubmissionError` or `Hy3dExpiredError`.
- **`HY3D_API_URL_2` unset makes failover a no-op** — `getHy3dConfig(1)` throws `Hy3dNotConfiguredError` when the fallback URL is absent rather than silently reusing the primary.
- Appwrite `getFilePreview` only works on images < 10 MB; larger files fail with a clear error.
- **Normalized output must be ≤ 8 MB** (Modal `MAX_FILE_MB`); `normalizeImage` checks the preview byte length before submitting.
- `updateRows` in a transaction returns `{total:0}` — use single-row updates for claims.
- All generation env vars are optional — the app works without them; Fast mode surfaces a clear error when invoked without config.
- `Buffer.from(uint8array)` is required for Blob/File constructors in Node 24 (SharedArrayBuffer incompatibility).
- **Credit deduction is caller-owned**: `startFastGeneration` and `regenerateFastGeneration` never touch credits. Callers (project service, action layer) handle check + deduct + refund. This prevents double-deduction and keeps auth context where it belongs. The service only *records* the charge in `generationCreditCost` for later refund.
- **Admin bypass**: `adminRegenerateGeneration` uses `skipOwnershipCheck: true` and skips credit deduction entirely — admin can regenerate any FAST project without cost.
- **Reconcile removed from finalize hot path**: `pollAndFinalize` no longer calls the full `reconcileStoragePermissions()` sweep after success (it was an unbounded `getFile`-per-asset scan on every generation). Generated GLBs upload with `permissions: []` (private); the publish flow grants `read("any")` and the nightly cron reconciles public-only-on-PUBLISHED. Raw strings like `"read:any"` are invalid Appwrite permission values — use `read("any")` / the helpers in `src/server/storage.ts`.
- **`projects` has no `updatedAt` column**: never write `updatedAt` in a row update (TablesDB auto-maintains `$updatedAt`). Doing so throws `row_invalid_structure` at the last step of finalize — after the storage upload and asset-row creation. The final link update is now wrapped in try/catch (cleans up the asset row + storage file and takes the guarded-FAILED path), and a crashed FINALIZING row is recovered by the nightly sweep via the stale-claim re-claim.
- **Orphan cleanup**: if `createRow` for the generated asset fails after `storage.createFile` succeeded, the file is deleted before returning FAILED — no orphaned GLB in the `models` bucket.
