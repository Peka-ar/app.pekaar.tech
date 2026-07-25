# /tasks — Brand + Admin Pipeline

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md) — top-level reference. For admin-only concerns, see [`./admin.md`](./admin.md).

`/tasks` is the brand's primary work surface. Admins also land here (the page is shared) but the modal flows are role-aware. This spec documents the **brand** experience; the admin board at `/admin/tasks` is documented in [`./admin.md`](./admin.md).

The lifecycle is now a 4-state machine: `PENDING → COMPLETED → PUBLISHED`, with `REVISIONS` as a re-entrant branch off `COMPLETED` and `PUBLISHED`. Every status has its own modal.

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
  assetUrls: { glb: string; usdz?: string } | null;  // derived: MODEL_GLB / MODEL_USDZ
  revisionRequests?: { id: string; note: string; createdAt: Date | string }[];
};
```

**Helper selectors** (`TasksClient.tsx:78`–`120`): `getThumbnail`, `getSku`, `getProductCategory`, `getStorefrontPlatform`, `getCatalogSize`, `getInitials`, `getCreatedDate`, `getAssets` (`{ glb?, usdz? }`), `getDimensions`, `getViewerProduct` (builds a `Product` from the GLB url + dimensions for `ThreeDConfigurator`).

---

## Layout shell

`TasksClient` renders inside `DashboardLayout` (`src/components/dashboard/DashboardLayout.tsx:1`) with `title="Tasks Pipeline"`. The "New Task" action button is **only shown for BRAND users** (`TasksClient.tsx:269` — gated on `role !== "ADMIN"`). The shell provides the fixed sidebar, the user profile + `logout` form, the sticky header with `ThemeToggle` + `NotificationBell`, and `MobileNavDrawer`.

Below the header, `TasksClient` renders a **toolbar**:
- **Search input** (`Input` with `Search` icon) — filters by `name`, `sku`, or `id` (case-insensitive).
- **Status filter** (`Select` with `Filter` icon) — `all` or one of the four statuses, labelled via `BRAND_LABEL` (so the dropdown shows "Processing", "Revisions", "Review", "Published").
- **View toggle** (pill segmented control) — `List` ↔ `Board`. Defaults to `board` on desktop (`useMediaQuery('(min-width: 768px)')`), `list` on mobile.

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

**Job card**: thumbnail (first REFERENCE_IMAGE via `next/image`), job id mono pill, status icon, product name, and (for ADMIN only) a `Category:` line. Footer: brand initials avatar + SKU + created date. `COMPLETED` cards append a full-width **"Review Model"** button that opens the Review modal.

**Card click routing** (`handleCardClick`, `TasksClient.tsx:160`):
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
3. **Reference Images** — dashed dropzone. Max **5 images** (`MAX_IMAGES = 5`). Each upload calls `uploadFile(file, "REFERENCE_IMAGE")` via `usePresignedUpload("referenceImageUploader")` and appends the returned `Asset` to `uploadedAssets`. Thumbnails show in a wrap grid with remove buttons + a click-to-enlarge lightbox (fixed `z-[100]` black overlay).

**Submit handler** `submitNewJob`:
1. Validates `uploadedAssets.length > 0`.
2. Reads form fields; validates all dimensions > 0.
3. Calls `createProject(name, uploadedAssets.map(a => a.id), sku, instructions, { width, height, depth, unit: 'cm' })`.
4. On success: clears `uploadedAssets`, resets upload state, `router.refresh()` inside `startTransition`.
5. On error: surfaces the error message in a red banner.

**Server side** (`src/app/actions/project.ts:8`): `createProject` requires `Role.BRAND`, runs a `Serializable` transaction — quota check (`projectCount < usageLimits`), verifies all `assetIds` are `READY` + owned by the caller, creates the project as `PENDING`, links assets via `asset.updateMany({ data: { projectId } })`. Revalidates `/tasks`, `/dashboard`, `/admin/tasks`.

> File upload mechanics are in `../file-storage-architecture.md`.

---

## Modal 2 — Processing (PENDING read-only)

`TasksClient.tsx:721`. Opened by clicking a PENDING card. `Modal` size `lg`, variant `dialog`. No footer actions — read-only.

Shows: product info, dimensions, reference images grid, plus an amber banner: "Your project is in the production queue. You will be notified when the 3D model is ready for your review."

---

## Modal 3 — Revisions (REVISIONS read-only)

`TasksClient.tsx:794`. Opened by clicking a REVISIONS card. `Modal` size `lg`, variant `dialog`. No footer actions.

Shows: an amber banner ("Production team is making changes") + the brand's full revision notes history. Each `RevisionRequest` renders as a card with author ("You"), timestamp, and the note text. Newest first.

---

## Modal 4 — Review (COMPLETED — Approve or Request Changes)

`TasksClient.tsx:868`. Opened by clicking a COMPLETED card or its "Review Model" button. `Modal` props: `size="full"`, `variant="takeover"`. Header action (BRAND only):
- **Request Changes** (secondary button) — toggles the sub-form in the left rail.
- **Approve & Publish** (primary button) — calls `brandPublishProject(jobId)`.

### Side-by-side layout (`grid-cols-[420px_1fr]`, `lg+`)

The body is a 2-column CSS grid. The left column (`aside`) is a fixed-width 420px rail with its own `overflow-y-auto`; the right column (`main`) hosts the 3D viewer and scrolls independently. On screens narrower than `lg` the rail stacks above the viewer (`grid-cols-1`).

**Left rail** (always visible, no accordion):
- Project metadata grid: Name, SKU, Created, Brand.
- Additional instructions (`whitespace-pre-wrap`) if `instructions` is non-empty.
- Physical Dimensions (W / H / D cards) with unit fallback `cm`.
- Reference Images — 2-column grid, clickable (`cursor-zoom-in`) to open the lightbox. `failedRefImages` Set tracks `<Image onError>`; broken assets render a placeholder with `ImageIcon` and `title="Image unavailable"`.
- Request Changes sub-form (BRAND only, when toggled): textarea + Cancel + "Send Request" button. `sendForRevisions` calls `brandSendForRevisions(reviewJob.id, note)`. Disabled until note has content.

**Right pane**:
- If `reviewViewerProduct` is truthy, mount `<ThreeDConfigurator key="review-viewer" product={reviewViewerProduct} />` where `reviewViewerProduct` is a `useMemo` of `getViewerProduct(reviewJob)` keyed on `reviewJob`. Memoizing the product reference prevents a new object literal per render.
- The viewer is **always mounted** while the modal is open. It is not paused/unmounted when the textarea is focused — the original "viewer pause" hack was removed because the underlying issue was a focus-stealing effect in `Modal` (fixed in `src/components/ui/Modal.tsx:78-105`). Once a user has rotated/panned/zoomed the model, the camera state is preserved across re-renders; the configurator only resets the camera on a fresh `product.src` *and* only if the user has not yet interacted (see `src/components/ThreeDConfigurator.tsx:42-46`).
- If no GLB is available, render "No GLB asset is available for review."

ADMIN role does not see the sub-form, but the metadata rail + viewer still render.

---

## Modal 5 — Published (PUBLISHED — View 3D or Send for Revisions)

`TasksClient.tsx:1045`. Opened by clicking a PUBLISHED card. `Modal` props: `size="full"`, `variant="takeover"`. Header action (BRAND only):
- **Send for Revisions** (secondary button) — toggles the sub-form in the left rail.

Same side-by-side layout as the Review modal: 420px metadata rail (Name, SKU, Created, Brand, instructions, dimensions, clickable reference images with `failedRefImages` fallback) + always-mounted 3D viewer on the right (camera state preserved after user interaction; same no-reset policy as the Review modal).

The sub-form copy differs: "This will remove the model from your live embed. The production team will make the requested changes and resubmit." `sendForRevisions` on a PUBLISHED project also calls `revalidatePath('/embed/[id]')` so the embed page stops serving the model.

`publishedViewerProduct` is a `useMemo` of `getViewerProduct(publishedJob)` keyed on `publishedJob`, same pattern as the Review modal.

ADMIN role does not see the sub-form.

---

## Lightbox

`TasksClient.tsx:1212`. Click on an uploaded reference image thumbnail (anywhere in the wizard, Review modal, or Published modal reference image grids) opens a fixed `z-[100]` black overlay (`cursor-zoom-out`) with the image at `max-w-4xl max-h-[90vh]`. Click anywhere to close.

---

## Server side — actions

`src/app/actions/project.ts`:
- **`createProject`** — BRAND only. Serializable transaction. Quota + asset check. Creates PENDING project, links assets. Revalidates `/tasks`, `/dashboard`, `/admin/tasks`.
- **`brandPublishProject`** — BRAND owner only. Verifies ownership + `status === COMPLETED`. Atomic `updateMany` → sets `PUBLISHED`. Revalidates `/tasks`, `/dashboard`, `/embed/[id]`, `/admin/tasks`.
- **`brandSendForRevisions`** — BRAND owner only. Verifies ownership, non-empty note, `status ∈ {COMPLETED, PUBLISHED}`. Serializable transaction: atomic `updateMany` to REVISIONS + create `RevisionRequest { projectId, note, requestedBy }` row. Revalidates `/tasks`, `/dashboard`, `/admin/tasks`. If was PUBLISHED, additionally revalidates `/embed/[id]`.
- **`getUserProjects`** — caller's projects (newest first) with assets + brand + revisionRequests (newest first). Derived `referenceUrls`, `assetUrls { glb, usdz }`.

`src/app/actions/admin.ts`:
- **`getAllTasks`** — ADMIN only. All projects (newest first) with brand + assets + sdkConfig + revisionRequests (with requester name/email).
- **`adminSubmitProject`** — ADMIN only. Verifies GLB (and USDZ) are READY models. Atomic `updateMany` requiring `status ∈ {PENDING, REVISIONS}` → sets `COMPLETED`. Same action covers both initial submit and re-submit after revisions.

---

## File & line index

| Element | Location |
|---|---|
| `TasksClient` component | `src/app/tasks/TasksClient.tsx:112` |
| `COLUMNS` array | `src/app/tasks/TasksClient.tsx:69` |
| `TaskJob` type | `src/app/tasks/TasksClient.tsx:49` |
| `handleCardClick` (status → modal routing) | `src/app/tasks/TasksClient.tsx:160` |
| `publishJob` handler | `src/app/tasks/TasksClient.tsx:178` |
| `sendForRevisions` handler | `src/app/tasks/TasksClient.tsx:193` |
| `submitNewJob` handler | `src/app/tasks/TasksClient.tsx:210` |
| `handleImageUpload` | `src/app/tasks/TasksClient.tsx:256` |
| Processing modal | `src/app/tasks/TasksClient.tsx:738` |
| Revisions modal | `src/app/tasks/TasksClient.tsx:822` |
| Review modal | `src/app/tasks/TasksClient.tsx:868` |
| Published modal | `src/app/tasks/TasksClient.tsx:1045` |
| Lightbox | `src/app/tasks/TasksClient.tsx:1212` |
| `BRAND_LABEL` / `getStatusLabel` | `src/lib/status.ts` |
| `createProject` action | `src/app/actions/project.ts:8` |
| `brandPublishProject` action | `src/app/actions/project.ts:60` |
| `brandSendForRevisions` action | `src/app/actions/project.ts:89` |
| `getUserProjects` action | `src/app/actions/project.ts:135` |
| `adminSubmitProject` action | `src/app/actions/admin.ts:46` |
| `getAllTasks` action | `src/app/actions/admin.ts:8` |

## See also

- [`./admin.md`](./admin.md) — admin-only `/admin/tasks` board and modal flows.
- [`../file-storage-architecture.md`](../file-storage-architecture.md) — UploadThing + GDrive + `usePresignedUpload` hook.
- [`../WEBSITE.md`](../WEBSITE.md) §6, §9, §10 — full state machine, data model, action reference.
