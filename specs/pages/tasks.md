# /tasks — Brand + Admin Pipeline

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md) — top-level reference. For the admin board, see [`./admin.md`](./admin.md).

`/tasks` is the brand's primary work surface. Admins also land here (the page is shared) but the modal flows are role-aware. This spec documents the **brand** experience; the admin board at `/admin/tasks` is documented in [`./admin.md`](./admin.md).

The lifecycle is a 4-state machine: `PENDING → COMPLETED → PUBLISHED`, with `REVISIONS` as a **non-re-entrant** branch off `COMPLETED` and `PUBLISHED` (see `../backend-architecture.md` §5). Every status has its own modal.

---

## Data model

`TaskJob` (the shape `TasksClient` receives from the server) is defined in `src/app/tasks/TasksClient.tsx`:

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
  assetUrls: { glb: string; usdz?: string } | null;  // derived: proxy URL /api/v1/assets/{id}/file for live MODEL_GLB / MODEL_USDZ
  revisionRequests?: { id, note, createdAt }[];
};
```

Helper selectors live alongside the type (`getThumbnail`, `getAssets`, `getDimensions`, `getViewerProduct`, …). `getViewerProduct` builds a `Product` for `ThreeDConfigurator`; `product.src` is the proxy GLB URL and `product.usdz` (when present) is the proxy USDZ URL passed as `<model-viewer ios-src>` for iOS Quick Look fidelity.

**Every `<Image>` that points at the asset proxy carries `unoptimized`** (proxy is cookie-gated — see `../file-storage-architecture.md` §5). This applies to thumbnails, reference grids, and the lightbox.

---

## Layout shell

`TasksClient` renders inside `DashboardLayout` with `title="Tasks Pipeline"`. The "New Task" action button is **BRAND-only** and hidden below `sm` in the sticky header. The shell provides the fixed sidebar (≥768px), sticky header with `NotificationBell`, and `MobileNavDrawer`.

**Drawer gotcha:** the drawer is mounted once per page via `createPortal` so its slide-out transition can play; when closed, the wrapper carries `pointer-events-none opacity-0` **and `inert`** so the scrim never intercepts taps on mobile (`src/components/dashboard/MobileNavDrawer.tsx`).

Toolbar (client-side filtering over `initialJobs`, no server round-trip): search (name/sku/id), status filter labeled via `BRAND_LABEL`, List↔Board toggle (defaults: board on desktop, list on mobile).

---

## Board view (desktop)

Four columns (`COLUMNS`), fixed-width `w-80` wells:

| `ProjectStatus` | Brand label | Icon |
|---|---|---|
| `PENDING` | Processing | `Clock` |
| `REVISIONS` | Revisions | `MessageSquareWarning` |
| `COMPLETED` | Review | `Eye` |
| `PUBLISHED` | Published | `CheckCircle2` |

**Job card:** thumbnail (first REFERENCE_IMAGE, `unoptimized`), job id pill, status `Badge` from `PROJECT_STATUS_META` + `BRAND_LABEL`, product name, footer with brand initials + SKU + created date. `COMPLETED` cards append a "Review Model" button opening the Review modal.

**Card click routing** (`handleCardClick`): each status opens its own modal — PENDING → Processing (read-only), REVISIONS → Revisions (read-only, revision notes), COMPLETED → Review (viewer + approve/request-changes), PUBLISHED → Published (viewer + send-for-revisions).

## List view (mobile / toggle)

Card-wrapped table (`th-mono` headers, hairline rows): Job ID, Product, Status badge, Created, Actions. The Actions cell routes by status: COMPLETED → "Review", PUBLISHED → "View 3D", others → "Details".

---

## Modal 1 — New Task (BRAND creates a project)

Opened by the "New Task" button (BRAND only). `Modal` size `xl`.

1. **Product Details** — `productName` (required), `productSku` (required), `additionalInstructions` (optional).
2. **Physical Dimensions (CM)** — width/height/depth (required, `min="1"`).
3. **Reference Images** — dashed dropzone, max **5 images**. Each upload calls `uploadFile(file, "REFERENCE_IMAGE")` via `useAppwriteUpload({ bucketId: "reference-images", maxSizeMB: 16 })` and appends the `RecordedAsset` to `uploadedAssets`. Thumbnails (`unoptimized`) with remove buttons + click-to-enlarge lightbox.

**Submit** validates `uploadedAssets.length > 0` + all dimensions > 0, then `createProject(name, assetIds, sku, instructions, dimensions)`. Success → clear state + `router.refresh()` inside `startTransition`; failure → error banner with `result.message`.

Server side: `createProject` (BRAND) runs a TablesDB tx — atomic quota decrement, asset ownership/READY/`isNull(projectId)` check, PENDING project, link assets. Full contract: `../WEBSITE.md` §8.

> Upload mechanics: `../file-storage-architecture.md`.

---

## Modal 2 — Processing (PENDING, read-only)

Product info, dimensions, reference images grid, amber banner: "Your project is in the production queue."

## Modal 3 — Revisions (REVISIONS, read-only)

Amber banner + the brand's full revision notes history — each `RevisionRequest` as a card with author, timestamp, note. Newest first.

---

## Modal 4 — Review (COMPLETED — Approve or Request Changes)

`Modal` size `full`, variant `takeover`. Header actions (BRAND only): **Request Changes** (toggles sub-form) and **Approve & Publish** → `brandPublishProject(jobId)`.

**Side-by-side layout:** 420px left rail (own scroll) + 3D viewer (right, independent scroll); stacks below `lg`.

- **Left rail:** metadata grid, instructions, dimensions, reference images (clickable → lightbox; `failedRefImages` Set tracks `<Image onError>` and renders a placeholder for broken assets), and the Request Changes sub-form — textarea + "Send Request" → `brandSendForRevisions(reviewJob.id, note)`, disabled until note has content.
- **Right pane:** `<ThreeDConfigurator product={reviewViewerProduct} />` where the product is a `useMemo` of `getViewerProduct(reviewJob)` (memoized so a new object literal doesn't remount per render).
  - **The viewer is always mounted** while the modal is open — it is never paused/unmounted when the textarea is focused. (An earlier pause-on-focus workaround is gone; the real fix was the `Modal` focus-effect split — see `../WEBSITE.md` §15.)
  - Camera state is preserved across re-renders once the user has interacted; the configurator only resets on a fresh `product.src` if the user hasn't interacted.
  - **"View in your space"** AR button appears when `canActivateAR` is truthy (Android Chrome → WebXR; other Android → Scene Viewer; iOS → Quick Look using `ios-src` when present); hidden on desktop.
  - "Model last updated \<relative\>" caption under the viewer when the project has any READY model — tells the brand whether they're looking at the latest resubmission.
  - No GLB → "No GLB asset is available for review."

ADMIN sees the rail + viewer but not the sub-form.

---

## Modal 5 — Published (PUBLISHED — View 3D or Send for Revisions)

Same takeover layout as Review (rail + always-mounted viewer + AR button + last-updated caption). Header action (BRAND only): **Send for Revisions** — sub-form copy warns "This will remove the model from your live embed." `brandSendForRevisions` on a PUBLISHED project revokes the storage `read:any` grants and revalidates `/embed/[id]`, so the embed stops serving immediately.

---

## Lightbox

Click on any reference image thumbnail → fixed `z-[100]` black overlay, image at `max-w-4xl max-h-[90vh]`, click anywhere to close. The lightbox `<Image>` carries `unoptimized` (proxy URL).

---

## Server side — actions

All in `src/app/actions/project.ts` / `admin.ts`, thin adapters over `project.service.ts`. Full reference: `../WEBSITE.md` §8. Page-relevant invariants:

- **`createProject`** — BRAND; tx with atomic quota decrement + asset checks; returns plain object only.
- **`brandPublishProject`** — BRAND owner; **fail-closed publish**: `read:any` on every READY GLB/USDZ storage file *before* the status flip; any grant failure revokes and aborts.
- **`brandSendForRevisions`** — BRAND owner; in-tx precondition (ownership + status ∈ {COMPLETED, PUBLISHED} — not re-entrant from REVISIONS); if was PUBLISHED, revoke grants + revalidate embed.
- **`getUserProjects`** — caller's projects, derived `referenceUrls`/`assetUrls` (proxy-rewritten in `src/lib/project-augment.ts`).
- **`adminSubmitProject`** — ADMIN; tx with in-tx status precondition + per-asset link verification; archives prior READY models (kept in storage, no quota impact). See `./admin.md` §3.

---

## See also

- [`./admin.md`](./admin.md) — admin board and modal flows.
- [`../file-storage-architecture.md`](../file-storage-architecture.md) — Appwrite Storage + `useAppwriteUpload`.
- [`../backend-architecture.md`](../backend-architecture.md) §5 — state machine rules.
