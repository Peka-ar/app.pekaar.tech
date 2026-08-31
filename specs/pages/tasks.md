# /tasks — Brand + Admin Pipeline

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md) — top-level reference. For admin-only concerns, see [`./admin.md`](./admin.md).

`/tasks` is the brand's primary work surface. Admins also land here (the page is shared) but the modal flows are role-aware. This spec documents the **brand** experience; the admin board at `/admin/tasks` is documented in [`./admin.md`](./admin.md).

The lifecycle is now a 4-state machine: `PENDING → COMPLETED → PUBLISHED`, with `REVISIONS` as a **non-re-entrant** branch off `COMPLETED` and `PUBLISHED` (a project already in `REVISIONS` must be resubmitted before another revision request — see `../backend-architecture.md` §3). Every status has its own modal.

---

## Data model

`TaskJob` (the shape `TasksClient` receives from the server) is defined in `src/app/tasks/TasksClient.tsx:49`:

```ts
type TaskJob = {
  id: string;
  name: string;
  sku: string | null;
  instructions: string | null;
  dimensions: unknown;                 // { width, height, depth, length?, unit? }
  status: ProjectStatus;                // PENDING | REVISIONS | COMPLETED | PUBLISHED
  assets: TaskAsset[];                  // { id, type, url, originalName, mimeType, size, status }
  createdAt: Date | string;
  brand: TaskBrand;                     // { id, name, email, role, productCategory?, storefrontPlatform?, catalogSize? }
  referenceUrls: string[];              // derived: REFERENCE_IMAGE asset urls
  assetUrls: { glb: string; usdz?: string } | null;  // derived: proxy URL `/api/v1/assets/{id}/file` for live MODEL_GLB / MODEL_USDZ — auth-gated streaming proxy, see ../WEBSITE.md §5
  revisionRequests?: { id: string; note: string; createdAt: Date | string }[];
};
```

**Helper selectors** (`TasksClient.tsx:78`–`120`): `getThumbnail` (composes the proxy URL `/api/v1/assets/{id}/file` from the first REFERENCE_IMAGE asset's `id`), `getSku`, `getProductCategory`, `getStorefrontPlatform`, `getCatalogSize`, `getInitials`, `getCreatedDate`, `getAssets` (reads `project.assetUrls.glb`/`usdz` — already proxied by `getUserProjects`), `getDimensions`, `getViewerProduct` (builds a `Product` from the GLB url + optional USDZ url + dimensions for `ThreeDConfigurator`; `product.src` is the proxy URL and `product.usdz` (when present) is the proxy USDZ URL passed to the `<model-viewer>` `ios-src` attribute so iOS Quick Look uses the higher-fidelity uploaded USDZ). Every `getThumbnail()`/`<Image>` consumer that points at the proxy carries the **`unoptimized` prop** — see Modal 1 / Modal 4 / Lightbox sections, and `file-storage-architecture.md` §4b for why.

---

## Layout shell

`TasksClient` renders inside `DashboardLayout` (`src/components/dashboard/DashboardLayout.tsx:1`) with `title="Tasks Pipeline"`. The "New Task" action button is **only shown for BRAND users** (`TasksClient.tsx:306` — gated on `role !== "ADMIN"` at `:316`); it is hidden below `sm` in the sticky header so the mobile action bar stays uncluttered. The shell provides the fixed sidebar (≥768px), the user profile + `logout` form, the sticky header with `ThemeToggle` + `NotificationBell`, and `MobileNavDrawer`. The drawer is mounted once per page via `createPortal` so its slide-out transition can play; when closed, the wrapper carries `pointer-events-none opacity-0` and `inert` so the underlying black 50%-opacity scrim does not intercept taps on mobile (`src/components/dashboard/MobileNavDrawer.tsx:104`).

Below the header, `TasksClient` renders a **toolbar** (`TasksClient.tsx:313`):
- **Search input** (`Input` with `Search` icon) — filters by `name`, `sku`, or `id` (case-insensitive).
- **Status filter** (`Select` with `Filter` icon) — `all` or one of the four statuses, labelled via `BRAND_LABEL` (so the dropdown shows "Processing", "Revisions", "Review", "Published").
- **View toggle** (pill segmented control) — `List` ↔ `Board`. Defaults to `board` on desktop (`useMediaQuery('(min-width: 768px)')`), `list` on mobile.

On mobile the toolbar stacks: search input is full-width, status filter + view toggle share a second row that wraps if needed. Cell padding in the list-view table is `px-3 py-3 sm:px-6 sm:py-4` to fit narrow phones.

Filtering runs client-side over `initialJobs` — no server round-trip.

---

## Board view (desktop)

`TasksClient.tsx`. Four columns rendered from `COLUMNS`:

| `ProjectStatus` | Brand label | Icon |
|---|---|---|
| `PENDING` | Processing | `Clock` (amber) |
| `REVISIONS` | Revisions | `MessageSquareWarning` (amber) |
| `COMPLETED` | Review | `Eye` |
| `PUBLISHED` | Published | `CheckCircle2` (emerald) |

Each column is a fixed-width (`w-80`) scrollable panel with a header (icon + label + count badge) and a list of job cards. Empty columns show a dashed "Empty" placeholder.

**Job card**: thumbnail (first REFERENCE_IMAGE via `<Image src={getThumbnail(job)} unoptimized>` — proxy URL composed from `asset.id`, `unoptimized` because the proxy is cookie-gated), job id mono pill, status icon, product name, and (for ADMIN only) a `Category:` line. Footer: brand initials avatar + SKU + created date. `COMPLETED` cards append a full-width **"Review Model"** button that opens the Review modal.

**Card click routing** (`handleCardClick`, `TasksClient.tsx:191`):
- `PENDING` → `setProcessingJob(job)` → Processing modal (read-only, "Awaiting production")
- `REVISIONS` → `setRevisionsJob(job)` → Revisions modal (read-only, shows the brand's revision notes)
- `COMPLETED` → `setReviewJob(job)` → Review modal (with 3D viewer + Approve / Request Changes)
- `PUBLISHED` → `setPublishedJob(job)` → Published viewer (with 3D viewer + Send for Revisions)

---

## List view (mobile / toggle)

A `Card`-wrapped table with columns: Job ID, Product (thumbnail + name + SKU), Status (`Badge` whose label comes from `BRAND_LABEL[job.status]`), Created, Actions. The Actions cell routes by status: `COMPLETED` shows a "Review" pill, `PUBLISHED` shows "View 3D", others show "Details".

---

## Modal 1 — New Task (BRAND creates a project)

`TasksClient.tsx:589`, opened by the "New Task" action button (BRAND only). `Modal` size `xl`, variant `dialog`. Footer: Cancel + **"Create Task"** (submits `form id="new-job-form"`).

**Form sections:**
1. **Product Details** — `productName` (required), `productSku` (required), `additionalInstructions` (optional textarea).
2. **Physical Dimensions (CM)** — `dimWidth`, `dimHeight`, `dimDepth` (all required, `min="1"`).
3. **Reference Images** — dashed dropzone. Max **5 images** (`MAX_IMAGES = 5`). Each upload calls `uploadFile(file, "REFERENCE_IMAGE")` via `useAppwriteUpload({ bucketId: "reference-images", maxSizeMB: 16, allowedExtensions: [...] })` (`src/lib/use-appwrite-upload.ts`) and appends the returned `RecordedAsset` to `uploadedAssets`. Thumbnails show in a wrap grid with `<Image src="/api/v1/assets/{asset.id}/file" unoptimized>` (auth-gated proxy; `unoptimized` because the proxy is cookie-gated), remove buttons, and a click-to-enlarge lightbox (fixed `z-[100]` black overlay) whose `<Image>` reads `lightboxUrl` — itself a proxy URL by construction, also `unoptimized`.

**Submit handler** `submitNewJob`:
1. Validates `uploadedAssets.length > 0`.
2. Reads form fields; validates all dimensions > 0.
3. Calls `createProject(name, uploadedAssets.map(a => a.id), sku, instructions, { width, height, depth, unit: 'cm' })`.
4. On success: clears `uploadedAssets`, resets upload state, `router.refresh()` inside `startTransition`.
5. On error: surfaces the error message in a red banner.

**Server side** (`src/app/actions/project.ts:8`): `createProject` requires `Role.BRAND` and returns an `ActionResult`; the real work is in `createProjectService` (`src/server/services/project.service.ts`), which runs a TablesDB `runTransaction` — atomic quota decrement (`decrementRowColumn(users, usageLimits, value: 1, min: 0)`), verifies all `assetIds` are `READY` + owned by the caller (`listRows` total check + `isNull("projectId")` guard), creates the project as `PENDING` (`createRow`), links assets via staged `updateRows`. The action maps failures to `{ ok: false, code, message }` via `toActionResult`; the client branches on `result.ok` and renders `result.message` in the error banner (no raw Appwrite rows cross the wire).

> File upload mechanics are in `../file-storage-architecture.md`.

---

## Modal 2 — Processing (PENDING read-only)

`TasksClient.tsx:777`. Opened by clicking a PENDING card. `Modal` size `lg`, variant `dialog`. No footer actions — read-only.

Shows: product info, dimensions, reference images grid, plus an amber banner: "Your project is in the production queue. You will be notified when the 3D model is ready for your review."

---

## Modal 3 — Revisions (REVISIONS read-only)

`TasksClient.tsx:865`. Opened by clicking a REVISIONS card. `Modal` size `lg`, variant `dialog`. No footer actions.

Shows: an amber banner ("Production team is making changes") + the brand's full revision notes history. Each `RevisionRequest` renders as a card with author ("You"), timestamp, and the note text. Newest first.

---

## Modal 4 — Review (COMPLETED — Approve or Request Changes)

`TasksClient.tsx:932`. Opened by clicking a COMPLETED card or its "Review Model" button. `Modal` props: `size="full"`, `variant="takeover"`. Header action (BRAND only):
- **Request Changes** (secondary button) — toggles the sub-form in the left rail.
- **Approve & Publish** (primary button) — calls `brandPublishProject(jobId)`.

### Side-by-side layout (`grid-cols-[420px_1fr]`, `lg+`)

The body is a 2-column CSS grid. The left column (`aside`) is a fixed-width 420px rail with its own `overflow-y-auto`; the right column (`main`) hosts the 3D viewer and scrolls independently. On screens narrower than `lg` the rail stacks above the viewer (`grid-cols-1`).

**Left rail** (always visible, no accordion):
- Project metadata grid: Name, SKU, Created, Brand.
- Additional instructions (`whitespace-pre-wrap`) if `instructions` is non-empty.
- Physical Dimensions (W / H / D cards) with unit fallback `cm`.
- Reference Images — 2-column grid (`<Image src="/api/v1/assets/{asset.id}/file" unoptimized>` — auth-gated proxy URL; `unoptimized` because the proxy is cookie-gated, see `file-storage-architecture.md` §5), clickable (`cursor-zoom-in`) to open the lightbox. `failedRefImages` Set tracks `<Image onError>`; broken assets render a placeholder with `ImageIcon` and `title="Image unavailable"`.
- Request Changes sub-form (BRAND only, when toggled): textarea + Cancel + "Send Request" button. `sendForRevisions` calls `brandSendForRevisions(reviewJob.id, note)`. Disabled until note has content.

**Right pane**:
- If `reviewViewerProduct` is truthy, mount `<ThreeDConfigurator key="review-viewer" product={reviewViewerProduct} />` where `reviewViewerProduct` is a `useMemo` of `getViewerProduct(reviewJob)` keyed on `reviewJob`. Memoizing the product reference prevents a new object literal per render.
- The viewer is **always mounted** while the modal is open. It is not paused/unmounted when the textarea is focused — the original "viewer pause" hack was removed because the underlying issue was a focus-stealing effect in `Modal` (fixed in `src/components/ui/Modal.tsx:78-105`). Once a user has rotated/panned/zoomed the model, the camera state is preserved across re-renders; the configurator only resets the camera on a fresh `product.src` *and* only if the user has not yet interacted (see `src/components/ThreeDConfigurator.tsx:42-46`).
- The viewer exposes the **"View in your space"** AR button (bottom-right pill, `Smartphone` icon, `slot="ar-button"`) whenever the device supports AR — `canActivateAR` is true on Android Chrome (WebXR), other Android browsers (Scene Viewer app), and iOS Safari (Quick Look); the button is hidden on desktop. `product.usdz` is forwarded as `ios-src` when present for higher-fidelity Quick Look. See `src/components/ThreeDConfigurator.tsx:121-131` and `../pages/embed.md` §"AR button".
- Below the viewer, a thin border-top + small mono caption **"Model last updated <relative>"** appears when the project has any `READY` MODEL_GLB/USDZ — `getLatestModelUpdatedAt()` picks the newest `updatedAt` and `formatRelativeShort()` renders "just now" / "Nm ago" / "Nh ago" / "Nd ago" / `<locale date>`. Tells the brand at-a-glance whether they're looking at the most recent resubmission. The viewer's GLB src is the proxy URL `/api/v1/assets/{id}/file` (`getViewerProduct()` reads `assetUrls.glb` which is rewritten to the proxy in `getUserProjects`), streamed from Appwrite Storage with the server API key — no public file access needed.
- If no GLB is available, render "No GLB asset is available for review."

ADMIN role does not see the sub-form, but the metadata rail + viewer still render.

---

## Modal 5 — Published (PUBLISHED — View 3D or Send for Revisions)

`TasksClient.tsx:1111`. Opened by clicking a PUBLISHED card. `Modal` props: `size="full"`, `variant="takeover"`. Header action (BRAND only):
- **Send for Revisions** (secondary button) — toggles the sub-form in the left rail.

Same side-by-side layout as the Review modal: 420px metadata rail (Name, SKU, Created, Brand, instructions, dimensions, clickable reference images with `failedRefImages` fallback) + always-mounted 3D viewer on the right (camera state preserved after user interaction; same no-reset policy as the Review modal). The viewer exposes the same **"View in your space"** AR button as the Review modal (see above). The "Model last updated <relative>" caption renders under the viewer using the same `getLatestModelUpdatedAt()` helper as the Review modal.

The sub-form copy differs: "This will remove the model from your live embed. The production team will make the requested changes and resubmit." `sendForRevisions` on a PUBLISHED project also calls `revalidatePath('/embed/[id]')` so the embed page stops serving the model.

`publishedViewerProduct` is a `useMemo` of `getViewerProduct(publishedJob)` keyed on `publishedJob`, same pattern as the Review modal.

ADMIN role does not see the sub-form.

---

## Lightbox

`TasksClient.tsx:1266`. Click on an uploaded reference image thumbnail (anywhere in the wizard, Review modal, or Published modal reference image grids) opens a fixed `z-[100]` black overlay (`cursor-zoom-out`) with the image at `max-w-4xl max-h-[90vh]`. Click anywhere to close. The lightbox `<Image>` reads `lightboxUrl` and carries the `unoptimized` prop (proxy is cookie-gated).

---

## Server side — actions

`src/app/actions/project.ts` — thin adapters over `src/server/services/project.service.ts` (all three mutations return `ActionResult<...>`; clients check `result.ok` and surface `result.message`):
- **`createProject`** — BRAND only. Service: TablesDB transaction — atomic quota decrement (`usageLimits` = remaining budget), asset ownership/READY/`isNull("projectId")` check. Creates PENDING project, links assets. Returns `ActionResult<{ projectId, remaining }>` — only a plain object, never the raw Appwrite row. On `ok` revalidates `/tasks`, `/dashboard`, `/admin/tasks`. Failures: `QUOTA_EXCEEDED` "Usage limit exceeded…", `STATE_CONFLICT` "One or more assets not found, not ready, or already attached…".
- **`brandPublishProject`** — BRAND owner only. Service: **fail-closed publish** — grants `read:any` on every READY GLB/USDZ storage file BEFORE the status flip; any grant failure revokes already-granted files and aborts. Guarded `updateRows` requiring ownership + `status === COMPLETED` → sets `PUBLISHED` (0 matched → `STATE_CONFLICT`). On `ok` revalidates `/tasks`, `/dashboard`, `/embed/[id]`, `/admin/tasks`.
- **`brandSendForRevisions`** — BRAND owner only. Service: verifies ownership, non-empty note, status via the state machine (`{COMPLETED, PUBLISHED}` — not re-entrant). TablesDB transaction: in-tx precondition check (`getRowSafe(projects, id, txId)` — ownership + status) then staged `updateRow` by rowId → REVISIONS + `createRow(revision_requests)`. On `ok` revalidates `/tasks`, `/dashboard`, `/admin/tasks`; if was PUBLISHED, revokes `read:any` on model files (`setFilePublicWithRetry`) + revalidates `/embed/[id]`.
- **`getUserProjects`** — caller's projects (newest first) with assets + brand + revisionRequests (newest first), via batched TablesDB queries + `buildTaskJob()`. Derived `referenceUrls`, `assetUrls { glb, usdz }`. Throws (read).

`src/app/actions/admin.ts` — thin adapter over `project.service.ts`:
- **`getAllTasks`** — ADMIN only. All projects (newest first) with brand + assets + sdkConfig + revisionRequests (with requester name/email), via batched TablesDB queries + `buildTaskJob()`. Throws (read).
- **`adminSubmitProject`** — ADMIN only, returns `ActionResult<{ success: true }>`. Service: verifies GLB (and USDZ) are READY models. TablesDB `runTransaction`: in-tx precondition check (`getRowSafe(projects, id, txId)` requires `status ∈ {PENDING, REVISIONS}`; failure → "Project is no longer available to submit") + **in-tx per-asset link verification** (each new model re-read inside the tx must be READY + `projectId === null`), then staged `updateRow` by rowId → sets `COMPLETED`; archives any pre-existing `READY` MODEL_GLB/USDZ on the project (excluding the new asset ids) to `AssetStatus.ARCHIVED` (keeps `projectId`); links the new GLB/USDZ. **No post-commit cleanup** — archived files are always kept (archived models stay viewable via the proxy; the legacy `utapi.deleteFiles` branch was removed in Phase 5). Same action covers initial submit (PENDING → COMPLETED) and re-submit after revisions (REVISIONS → COMPLETED). See `pages/admin.md` §3 for the UI side and `file-storage-architecture.md` §10 for the storage view.

---

## File & line index

| Element | Location |
|---|---|
| `TasksClient` component | `src/app/tasks/TasksClient.tsx:139` |
| `COLUMNS` array | `src/app/tasks/TasksClient.tsx:71` |
| `TaskJob` type | `src/app/tasks/TasksClient.tsx:55` |
| `handleCardClick` (status → modal routing) | `src/app/tasks/TasksClient.tsx:191` |
| `publishJob` handler | `src/app/tasks/TasksClient.tsx:209` |
| `sendForRevisions` handler | `src/app/tasks/TasksClient.tsx:225` |
| `submitNewJob` handler | `src/app/tasks/TasksClient.tsx:243` |
| `handleImageUpload` | `src/app/tasks/TasksClient.tsx:288` |
| `MobileNavDrawer` (closed = invisible) | `src/components/dashboard/MobileNavDrawer.tsx:1` |
| Processing modal | `src/app/tasks/TasksClient.tsx:777` |
| Revisions modal | `src/app/tasks/TasksClient.tsx:865` |
| Review modal | `src/app/tasks/TasksClient.tsx:932` |
| Published modal | `src/app/tasks/TasksClient.tsx:1111` |
| Lightbox | `src/app/tasks/TasksClient.tsx:1266` |
| `BRAND_LABEL` / `getStatusLabel` | `src/lib/status.ts` |
| `createProject` action | `src/app/actions/project.ts:15` |
| `brandPublishProject` action | `src/app/actions/project.ts:31` |
| `brandSendForRevisions` action | `src/app/actions/project.ts:42` |
| `getUserProjects` action | `src/app/actions/project.ts:60` |
| `adminSubmitProject` action | `src/app/actions/admin.ts:15` |
| `getAllTasks` action | `src/app/actions/admin.ts:26` |

## See also

- [`./admin.md`](./admin.md) — admin-only `/admin/tasks` board and modal flows.
- [`../file-storage-architecture.md`](../file-storage-architecture.md) — Appwrite Storage + `useAppwriteUpload` hook.
- [`../WEBSITE.md`](../WEBSITE.md) §6, §9, §10 — full state machine, data model, action reference.
