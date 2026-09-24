# /tasks — Brand + Admin Pipeline

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md) — top-level reference. For the admin board, see [`./admin.md`](./admin.md).

`/tasks` is the brand's primary work surface. Admins also land here (the page is shared) but the modal flows are role-aware. This spec documents the **brand** experience; the admin board at `/admin/tasks` is documented in [`./admin.md`](./admin.md).

The lifecycle is a 4-state machine: `PENDING → COMPLETED → PUBLISHED`, with `REVISIONS` as a **non-re-entrant** branch off `COMPLETED` and `PUBLISHED` (see `../backend-architecture.md` §5). Every status has its own drawer.

---

## Data model

`TaskJob` (the shape `TasksClient` receives from the server) is defined in `src/components/tasks/types.ts` (shared with `/admin/tasks`):

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
  // Generation fields (Fast / AI pipeline)
  generationMode?: "PREMIUM" | "FAST" | null;
  generationStatus?: string | null;
  generationError?: string | null;
  generationStartedAt?: string | null;
  generationCompletedAt?: string | null;
  generationViews?: string | null;     // JSON map of view → assetId
  generationJobId?: string | null;
  generationRunId?: string | null;
  generationAssetId?: string | null;
};
```

Shared board primitives live in `src/components/tasks/` and are used by both `/tasks` and `/admin/tasks`: `TaskDrawer` (right slide-over detail panel), `TaskCard` + `TaskColumn` (board), `TaskToolbar` (search + status filter + count + List↔Board toggle), `StatusBanner` (per-status banners), `TaskDetailParts` (`ReferenceGrid`, `RevisionTimeline`, `Lightbox`, `MetaGrid`/`MetaItem`, `DimensionEditor`), and `types.ts` (`TaskJob` + selectors — `getThumbnail`, `getSku`, `getDimensions`, `formatRelativeShort`, `getLatestModelUpdatedAt` — moved out of the clients so both share them).

`TaskDrawer` replaces the old centered `Modal` for every task-detail view: sticky header (title + status `Badge` + close), single scroll body, sticky footer for contextual actions. Full-screen sheet on mobile, `sm:max-w-xl` slide-over with `sm:m-3` rounding on desktop. Same focus contract as `Modal` (focus close on open, Esc, Tab trap, restore trigger focus, body scroll lock).

**Every `<Image>` that points at the asset proxy carries `unoptimized`** (proxy is cookie-gated — see `../file-storage-architecture.md` §5). This applies to thumbnails, reference grids, and the lightbox.

---

## Layout shell

`TasksClient` renders inside `DashboardLayout` with `title="Tasks Pipeline"`. The shell provides the fixed sidebar (≥768px), a mobile-only top bar below `md` (hamburger + wordmark), and `MobileNavDrawer` — there is no top header on desktop. The "New Task" action button is **BRAND-only** and passed as the shell's `action` prop, which renders it right-aligned above the toolbar at the top of `<main>`, hidden below `sm`.

**Drawer gotcha:** the drawer is mounted once per page via `createPortal` so its slide-out transition can play; when closed, the wrapper carries `pointer-events-none opacity-0` **and `inert`** so the scrim never intercepts taps on mobile (`src/components/dashboard/MobileNavDrawer.tsx`).

Toolbar (`TaskToolbar`, shared with `/admin/tasks` minus the view toggle): search (name/sku/id), status filter labeled via `BRAND_LABEL` (or `ADMIN_LABEL` when an admin views `/tasks`), task-count pill, List↔Board toggle (defaults: board on desktop, list on mobile). Client-side filtering over `initialJobs`, no server round-trip.

---

## Board view (desktop)

Four columns (`COLUMNS`), responsive grid (`sm:2`, `xl:4`) that fills the page width — normal-flow page scroll, no fixed `100vh` clip. Shared `TaskColumn` (tinted icon well + mono label + tabular-nums count, dashed empty tile) + `TaskCard` (16px thumbnail with `oklch` ring, `flex-1 truncate` id chip with the status badge in a `shrink-0` slot so long ids clip the id never the badge, one-line title, brand · SKU · relative-date meta row).

| `ProjectStatus` | Brand label | Icon |
|---|---|---|
| `PENDING` | Processing | `Clock` |
| `REVISIONS` | Revisions | `MessageSquareWarning` |
| `COMPLETED` | Review | `Eye` |
| `PUBLISHED` | Published | `CheckCircle2` |

**Job card** (`TaskCard`): thumbnail (first REFERENCE_IMAGE, `unoptimized` with `onError` fallback to sage placeholder), product name, status `Badge` from `PROJECT_STATUS_META`, one meta line (`brandName · productCategory · date`). Cards are clickable buttons with `active:scale-[0.98]`, hover shadow+ring. Entrance stagger via `enterDelay` (capped at 8×30ms) using `task-card-enter` animation. Reduced motion kills the animation globally.

**Card click routing** (`handleCardClick`): each status opens its own drawer — PENDING → Processing (read-only), REVISIONS → Revisions (read-only, revision notes), COMPLETED → Review (viewer + approve/request-changes), PUBLISHED → Published (viewer + send-for-revisions).

## Board view

Fluid CSS Grid: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` with `minmax(0, 1fr)` tracks (no fixed column widths). At `xl+`, columns get internal scroll via `.task-column-scroll` with `max-h-[var(--board-h)]` (`--board-h: calc(100dvh - 250px)` with `min-h-28` floor). Thin custom scrollbar (`--scrollbar-w: 5px`). Below `xl`, columns stack vertically with normal page scroll.

Each column has a contextual empty state with icon + description (e.g. "Projects you send back for changes appear here."). Columns have `shadow-[var(--shadow-1)]` elevation on sage ground.

## List view (mobile / toggle)

Card-wrapped table (`th-mono` headers, hairline rows): Job ID (truncated with `tabular-nums`), Product (thumbnail + name + subtitle), Status badge, Created (`hidden sm:table-cell`), Actions (`hidden sm:table-cell`). Actions routes by status: COMPLETED → "Review", PUBLISHED → "View 3D", others → "Details". On mobile (< `sm`), CREATED and ACTIONS columns are hidden.

---

## Drawer system — design contract

All drawers use `TaskDrawer` (`src/components/tasks/TaskDrawer.tsx`): panel slides from the right (`sm:max-w-[640px]`, `sm:m-4 sm:rounded-[24px]`), full-bleed sheet on mobile with `env(safe-area-inset-bottom)`. Backdrop blur, frosted sticky header/footer. Exit animation: `cubic-bezier(0.32, 0.72, 0, 1)` 360ms with deferred unmount. Body scroll locked, focus trapped, Esc closes.

Drawer body renders on soft sage ground (`--color-canvas-soft`). Content uses white grouped `SectionCard` sections with `SectionHeading` (icon + label). Content settles with `drawer-content` animation (320ms, 120ms delay).

Shared detail primitives (`src/components/tasks/TaskDetailParts.tsx`): `SectionCard`, `SectionHeading` (optional `action` slot, right-aligned in the heading row), `MetaGrid`, `MetaItem`, `DimensionEditor` (compact 3-cell row + inline edit form — see below), `ReferenceGrid` (labeled empty states, per-tile unavailable state), `RevisionNotesCard`, `Lightbox` (z-[100], `lightbox-enter`/`lightbox-zoom` animations), `StatusBanner` (inline styles, per-role subtexts).

**Dimension editing** (`DimensionEditor`): every drawer on both boards shows the dimensions card with a pencil `action` button in its `SectionHeading`. Clicking swaps the tiles in place for three number inputs (W/H/D, prefilled — legacy `length` seeds the depth field) + Cancel/Save, mirroring the inline "Request Changes" sub-form pattern. Save calls `updateProjectDimensions` (BRAND owner or ADMIN, **any status**) then `router.refresh()`; failures render `result.message` above the fields. Unit is fixed `cm` (matches the create wizard). The card notes the values "apply to the 3D review and live embeds".

---

## Modal — New Task (BRAND creates a project)

Opened by the "New Task" button (BRAND only; also from the empty-board CTA). `Modal` size `2xl` (`max-w-2xl`, 672px) with a 3-step wizard flow (Details → Dimensions → Photos, progress dots in the footer, Back/Continue, Create on the last step).

**Height contract:** the modal panel is height-constrained (`max-h-[calc(100dvh-32px)]`, flex column, `shrink-0` header/footer, scrollable body) — long step content scrolls inside the body while header and footer stay pinned, so the Create button is never pushed off-screen on short viewports. (An unconstrained panel grows past the viewport while body scroll is locked — footer unreachable. See `../WEBSITE.md` §15.)

1. **Product Details** — `productName` (required), `productSku` (required), `additionalInstructions` (optional).
2. **Physical Dimensions (CM)** — width/height/depth (required, `min="1"`).
3. **Reference Images + Generation Mode** — dashed dropzone, max **5 images**. Each upload calls `uploadFile(file, "REFERENCE_IMAGE")` via `useAppwriteUpload({ bucketId: "reference-images", maxSizeMB: 16 })`. Thumbnails (`unoptimized`) with remove buttons + click-to-enlarge lightbox.

**Generation mode selector** (on the Photos step): radio-style toggle between "Artist" and "AI pipeline" (both option subtitles at `text-xs`). Artist = artist-finished (10 credits); AI pipeline = fast generation (~5-10 min, 2 credits). Default is Artist (enum `PREMIUM`).

**FAST mode view tagging**: when AI pipeline is selected, show 4 view slots (Front required, Left/Back/Right optional) in a 2-column grid at ≥`sm` (single column on mobile). Each slot has a dropdown assigning one uploaded image (an image can hold only one tag). Views are sent to the server as a **partial** JSON map — only tagged views are included.

**Submit** validates `uploadedAssets.length > 0` + all dimensions > 0 + (FAST) front tagged, then `createProject(name, assetIds, sku, instructions, dimensions, mode, views)`. For FAST mode, the server also checks credits (2) and kicks off the Modal API job. Success → clear state + `router.refresh()` inside `startTransition`; failure → error banner with `result.message`.

Server side: `createProject` (BRAND) runs a TablesDB tx — atomic quota decrement, asset ownership/READY/`isNull(projectId)` check, PENDING project, link assets. Full contract: `../WEBSITE.md` §8. `generationViews` is a partial record — see the Zod gotcha in `../generation-architecture.md`.

> Upload mechanics: `../file-storage-architecture.md`.

---

## Drawer — Processing (PENDING — read-only details + Delete Task)

`StatusBanner` (inline styles, "In the production queue" subtext) + `SectionCard` with Project Details (`SectionHeading` + `MetaGrid`: name, SKU, brand, created) + `DimensionEditor` + `SectionCard` with Reference Images (`SectionHeading` + `ReferenceGrid`).

**Delete Task (BRAND only):** the drawer footer always shows a destructive "Delete Task" button for brands (side-by-side with the FAST primary action when present; hidden on `/admin/tasks`). It `window.confirm`s ("…Credits will not be refunded."), then calls `deletePendingProject` — in-tx PENDING + ownership precondition, cascade-deletes the project, linked asset/revision/analytics rows, and best-effort removes storage files. **Credits are never refunded.** Success closes the drawer + `router.refresh()`; failure renders `result.message` in the drawer's error banner. The Hunyuan job itself cannot be cancelled (no cancel API) — its result is discarded when the project row is gone; a post-commit re-sweep catches any asset a racing finalize re-creates.

**AI pipeline mode**: when `generationMode === "FAST"`, the Processing drawer shows a generation status banner with current status (SUBMITTED/RUNNING/FINALIZING), elapsed time, and a "Check Status" button that polls the generation endpoint. On SUCCEEDED, the drawer auto-refreshes. On FAILED, shows error message + "Regenerate" button (1 credit).

**Auto-poll on load**: `page.tsx` computes `autoPoll` server-side (`generationMode === "FAST"` and status ∈ {SUBMITTED, RUNNING, FINALIZING}) and passes it to `TasksClient`, whose mount-only `useEffect` (StrictMode-guarded by a ref) calls `pollActiveGenerations()` once and `router.refresh()`es if `polled > 0`. When nothing is active the effect never fires — zero extra calls. One-shot on load/reload by design; a task finishing mid-session still needs the button or a reload. Batch and button share the `poll-gen:{userId}` 30/min bucket (one batch call = one unit). `page.tsx` sets `maxDuration = 300` — a batch poll runs `pollAndFinalize` (GLB download+upload, 60s+).

**Server side**: `pollGeneration` action calls `pollAndFinalize` from `generation.service.ts` (ownership: brand → own project only, admin → any; generic 404, no id enumeration). `regenerateGeneration` action verifies ownership **before** deducting the credit and calls `regenerateFastGeneration` (admin passes `skipOwnershipCheck`). `pollActiveGenerations` batch action re-scopes server-side (brand: own, admin: latest 10) — no client-provided ids — and runs `pollAndFinalize` under `Promise.allSettled`; claim guards make overlapping polls idempotent. FAILED is excluded from auto-poll (Regenerate is the path).

## Drawer — Revisions (REVISIONS, read-only)

`StatusBanner` (amber, "Brand has requested changes") + `RevisionNotesCard` (newest-first notes with timestamps) + `SectionCard` with Reference Images + `DimensionEditor`.

---

## Drawer — Review (COMPLETED — Approve or Request Changes)

`TaskDrawer` with sticky footer actions (BRAND only): **Request Changes** (toggles sub-form) and **Approve & Publish** → `brandPublishProject(jobId)`.

**Stacked layout**: `StatusBanner` → 3D viewer (`<ThreeDConfigurator product={reviewViewerProduct} heightClassName="relative w-full h-[340px] min-h-0 sm:h-[420px]" />`, always mounted, memoized product) + "Model last updated" caption → `SectionCard` with Project Details + `DimensionEditor` + `SectionCard` with Reference Images (2-col) → Request Changes sub-form (`SectionCard` with textarea + "Send Request" → `brandSendForRevisions`).

- AR button appears when `canActivateAR` is truthy; hidden on desktop.
- No GLB → "No GLB asset is available for review." in a `SectionCard`.
- ADMIN sees the rail + viewer but not the sub-form.

---

## Drawer — Published (PUBLISHED — View 3D or Send for Revisions)

Same layout as Review: `StatusBanner` → viewer + "Model last updated" caption → `SectionCard` with Project Details + `DimensionEditor` + `SectionCard` with Reference Images. Sticky footer (BRAND only): **Send for Revisions** — sub-form warns "This will remove the model from your live embed." `brandSendForRevisions` revokes storage grants + revalidates embed.

---

## Lightbox

Click on any reference image thumbnail → shared `Lightbox` in `TaskDetailParts`: fixed `z-[100]` black overlay, image at `max-w-4xl max-h-[90vh]`, close button + Esc + click-outside to close. The lightbox `<Image>` carries `unoptimized` (proxy URL).

---

## Server side — actions

All in `src/app/actions/project.ts` / `admin.ts`, thin adapters over `project.service.ts`. Full reference: `../WEBSITE.md` §8. Page-relevant invariants:

- **`createProject`** — BRAND; tx with atomic quota decrement + asset checks; for FAST mode, kicks off Modal API job after transaction. Returns plain object only.
- **`brandPublishProject`** — BRAND owner; **fail-closed publish**: `read:any` on every READY GLB/USDZ storage file *before* the status flip; any grant failure revokes and aborts.
- **`brandSendForRevisions`** — BRAND owner; in-tx precondition (ownership + status ∈ {COMPLETED, PUBLISHED} — not re-entrant from REVISIONS); if was PUBLISHED, revoke grants + revalidate embed.
- **`getUserProjects`** — caller's projects, derived `referenceUrls`/`assetUrls` (proxy-rewritten in `src/lib/project-augment.ts`).
- **`updateProjectDimensions`** — BRAND owner or ADMIN (generic 404 for missing/foreign projects), **any status**; single-row write of the `dimensions` JSON; revalidates `/tasks`, `/dashboard`, `/admin/tasks`.
- **`deletePendingProject`** — BRAND owner; PENDING-only (in-tx `ConflictError` otherwise); row cascade in one tx + best-effort storage deletes; **no credit refund**; revalidates `/tasks`, `/dashboard`, `/admin/tasks`.
- **`pollGeneration`** — BRAND/ADMIN; polls and finalizes a FAST generation (own project only for BRAND; generic 404 otherwise). Returns `{ generationStatus, generationError?, generationCompletedAt? }`.
- **`pollActiveGenerations`** — BRAND/ADMIN; auto-poll-on-load batch. Server-scoped query (BRAND: own; ADMIN: latest 10) for non-terminal FAST generations → `Promise.allSettled(pollAndFinalize)`; returns `{ polled }` (0 → client skips refresh). Shares the `poll-gen:` 30/min limit with `pollGeneration`.
- **`regenerateGeneration`** — BRAND/ADMIN; re-submits a FAILED/SUCCEEDED FAST generation (1 credit). Ownership checked before the credit deduction; admin skips the service-level brand check.
- **`adminSubmitProject`** — ADMIN; tx with in-tx status precondition + per-asset link verification; archives prior READY models (kept in storage, no quota impact). See `./admin.md` §3.

---

## See also

- [`./admin.md`](./admin.md) — admin board and drawer flows.
- [`../file-storage-architecture.md`](../file-storage-architecture.md) — Appwrite Storage + `useAppwriteUpload`.
- [`../backend-architecture.md`](../backend-architecture.md) §5 — state machine rules.
