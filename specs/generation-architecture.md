# Generation Architecture

> Parent: `../WEBSITE.md`

Two-tier generation: **Premium** (artist-finished, admin-managed) and **Fast** (AI Draft, automated via Hunyuan3D Modal API).

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

## Project columns (9 new on `projects` table)

| Column | Type | Purpose |
|---|---|---|
| `generationMode` | string(20) | `PREMIUM` or `FAST` (null = Premium legacy) |
| `generationStatus` | string(20) | Current generation state |
| `generationJobId` | string(255) | Hunyuan3D Modal job ID |
| `generationRunId` | string(255) | Modal run ID (set after success) |
| `generationAssetId` | string(36) | Asset row ID of the generated GLB |
| `generationError` | string(2000) | Last error message (if FAILED) |
| `generationViews` | string(2000) | JSON map: `{front: assetId, left?: assetId, ...}` |
| `generationStartedAt` | string(30) | ISO timestamp when job started |
| `generationCompletedAt` | string(30) | ISO timestamp when job finished |

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
- `validateViews(tags)` — enforces front required, max 4, no duplicates.

### API client (`client.ts`)

- `getHy3dConfig(fallbackIndex)` — reads `HY3D_API_URL`, `HY3D_API_URL_2`, `HY3D_API_TOKEN` from env.
- `submitJob(config, params)` — POST `/jobs` with FormData. **Never retried** (double-bill risk).
- `pollJob(config, jobId)` — GET `/jobs/{id}` → running/succeeded/failed/expired.
- `downloadArtifact(config, runId, path)` — GET `/runs/{runId}/files/{path}` with 3 retries.
- `withFailover(fn)` — tries primary config, falls back to secondary on network/auth errors.

### Error types

- `Hy3dNotConfiguredError` — HY3D_API_TOKEN or URL not set.
- `Hy3dSubmissionError` — POST /jobs failed (422 validation, 401 auth).
- `Hy3dTransientError` — transient HTTP error on poll/download.
- `Hy3dExpiredError` — job unknown or results expired (7-day retention).

## Generation service (`src/server/services/generation.service.ts`)

### startFastGeneration

1. Verify project is FAST mode + PENDING/REVISIONS status.
2. Set `generationStatus: SUBMITTED`, normalize images, build manifest, submit to Modal.
3. On success: set `generationStatus: RUNNING` + `generationJobId`.
4. On failure: set `generationStatus: FAILED` + `generationError`.

**Credit handling**: The service does NOT deduct credits. Credit logic lives in callers only:
- `createProjectService` deducts 2 credits inside a transaction before calling this. On failure, `refundCredits` returns them.
- `adminRegenerateGeneration` bypasses credits entirely (admin override).

### pollAndFinalize

1. Skip if already terminal (SUCCEEDED/FAILED/FINALIZING).
2. Job timeout check (15 min).
3. Poll Modal → running (return), failed (set FAILED), succeeded → finalize.
4. **Finalize**: claim via `RUNNING → FINALIZING` guard (single-row update, check affected rows).
5. Download GLB, upload to storage with `read:any`, create asset row, link via `generationAssetId`.
6. Reconcile publish permissions.

### regenerateFastGeneration

1. Verify FAST mode + SUCCEEDED/FAILED generation status.
2. Verify regenerable state (PENDING or COMPLETED).
3. Re-normalize views, re-submit to Modal.
4. Reset generation state to RUNNING.

**Credit handling**: The service does NOT deduct credits. Callers handle deduction:
- `regenerateGeneration` (brand/admin action) deducts 1 credit, refunds on failure.
- `adminRegenerateGeneration` bypasses credits (admin override).

### refundCredits

Helper to return credits to a user. Called by callers when Modal API submission fails, so brands are only charged for successfully started jobs.

### finalizeStaleGenerations (cron sweep)

Called by `/api/cron/maintenance` nightly. Finds all projects in RUNNING/SUBMITTED status, polls/finalizes each. Idempotent. Does NOT handle credits.

## State machine update (`src/server/domain/project-state-machine.ts`)

Added 4th transition: `PENDING|REVISIONS → COMPLETED by SYSTEM_ACTOR`. This allows the Modal API job completion to auto-flip the project to COMPLETED without an admin step.

## Credits

| Action | Credits | Enforcement |
|---|---|---|
| Create Premium project | 10 | `decrementRowColumn(value=10, min=0)` inside transaction in `createProjectService` |
| Create Fast project | 2 | `decrementRowColumn(value=2, min=0)` inside transaction in `createProjectService`. On Modal submission failure, `refundCredits` returns the 2 credits. |
| Regenerate (Fast, brand) | 1 | `updateRow` in `regenerateGeneration` action before calling service. On failure, `refundCredits` returns the 1 credit. |
| Regenerate (Fast, admin) | 0 | Admin bypass — no credit deduction, `skipOwnershipCheck: true`. |

Default new-brand credit allocation: **8** (down from 10). Existing users backfilled to 8.

Premium is **paid-only** for default brands (8 < 10). Admin override can grant more.

**Credit flow principle**: generation service functions (`startFastGeneration`, `regenerateFastGeneration`) never handle credits. Callers are responsible for check + deduct + refund-on-failure. This keeps credit logic in the action layer where auth context is available.

## API route

`GET /api/v1/generation/[projectId]` — auth-gated poll+finalize. Returns `{ generationStatus, generationError?, generationCompletedAt? }`. Brand, admin, or cron can call this.

## UI

- **New Task wizard**: Mode selector (Premium/AI Draft) on Photos step. FAST mode shows 4 tagged view slots (Front required, Left/Back/Right optional) with image assignment dropdowns.
- **Task cards**: "AI Draft" badge on FAST projects.
- **Processing drawer**: Generation status banner for FAST projects, "Check Status" poll button, "Regenerate" button on FAILED (brand: 1 credit).
- **Admin drawer**: Generation status + timing info for FAST projects, "Regenerate" button on FAILED/SUCCEEDED (admin: no credit cost).

## Gotchas

- Modal call-output retention is **7 days**; finalize must happen within that window.
- `POST /jobs` must never be retried — a lost response could mean the request landed; retrying double-bills GPU time.
- Appwrite `getFilePreview` only works on images < 10 MB; larger files fail with a clear error.
- `updateRows` in a transaction returns `{total:0}` — use single-row updates for claims.
- All generation env vars are optional — the app works without them; Fast mode surfaces a clear error when invoked without config.
- `Buffer.from(uint8array)` is required for Blob/File constructors in Node 24 (SharedArrayBuffer incompatibility).
- **Credit deduction is caller-owned**: `startFastGeneration` and `regenerateFastGeneration` never touch credits. Callers (project service, action layer) handle check + deduct + refund. This prevents double-deduction and keeps auth context where it belongs.
- **Admin bypass**: `adminRegenerateGeneration` uses `skipOwnershipCheck: true` and skips credit deduction entirely — admin can regenerate any FAST project without cost.
