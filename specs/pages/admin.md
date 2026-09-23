# `/admin/*` — Admin Panel

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md)

The admin panel provides platform-wide management tools for ADMIN users. Four pages share `AdminLayout`, enforce strict `Role.ADMIN` gating, and call dedicated server actions (`admin.ts`, `admin-users.ts`, `admin-analytics.ts`).

---

## Routes & auth overview

| Route | Client component | Purpose |
|---|---|---|
| `/admin/dashboard` | none (inline server component) | KPI cards, Projects by Status, signups bar chart, top 10 brands |
| `/admin/users` | `AdminUsersClient.tsx` | User search/filter/list, detail drawer with role/status/limits management |
| `/admin/tasks` | `AdminTasksClient.tsx` | All-project Kanban board, 3D upload + submit for review |
| `/admin/requests` | `AdminRequestsClient.tsx` | Contact request inbox (NEW/CONTACTED/RESOLVED) |
| `/admin/analytics` | none (inline server component) | Platform KPI cards, signups series, Projects by Status, Top Brands |

All four routes are protected by `requirePrincipalOrRedirect()` in the server entry (admin pages pass `{ roles: [Role.ADMIN] }`); each server action calls `requirePrincipal({ roles: [Role.ADMIN] })`. **This is the only role gate** — the edge proxy cannot verify roles (see `../pages/auth.md` §Security properties).

**Layout:** `AdminLayout` (`src/components/admin/AdminLayout.tsx`) is a single client component rendered under the root `AppwriteProvider` (required: `AdminMobileNavDrawer` re-uses the dashboard `MobileNavDrawer`, which calls `useAuth()` from `@appwrite.io/react` — the provider comes from the root `src/app/layout.tsx`). The layout provides the left sidebar nav (Dashboard, Users, Tasks Management, **Notifications** → `/notifications`, Analytics), the `title` prop rendered as an `sr-only` h1 (the sidebar's active item communicates location, each page supplies its own visible content headings), **no top header on desktop** — a mobile-only top bar (below `md`, hamburger + wordmark) opens the mobile drawer — and the content `<main>`. An optional `action` prop renders right-aligned above the page content (desktop only). Segment `loading.tsx` covers RSC navigation to all `/admin/*` routes.

---

## 1. Admin Dashboard — `/admin/dashboard`

`AdminDashboardContent` (async, inside `<Suspense>`) calls four actions in parallel:

- `getPlatformKPIs()` → totals, suspended, `projectsByStatus`, month counts
- `getSignupsSeries(12)` → `{ labels, counts }` (single `listAllRows(users)` + JS month buckets)
- `getProjectsByMonth(12)`
- `getTopBrands(10)` → `{ id, name, email, status, createdAt, _count: { projects } }[]`

Sections: header (eyebrow "Platform overview" + title + subcopy, right-side `Manage Tasks` primary → `/admin/tasks` + `View Users` tertiary → `/admin/users`) → 4 KPI cards (Total Users, Total Projects, Active Users, Events This Month — fixed wells accent-pale/sky/butter/forest, staggered `animate-in fade-in` ~100ms via a wrapper div since `Card` takes no `style` prop, `hover:shadow-[var(--shadow-1)]`) → **status strip** (4 static white `24px` tiles from `getPlatformKPIs().projectsByStatus` — every status shown even at 0 — badge + tabular-nums count) → Projects by Month + Signups by Month charts (shared `ChartBars` with accent-pale header-total pills, per-bar `role="img"` values, and compact zero-state panels) → Top Brands table (avatar wells round-robin accent-pale/sky/butter/forest, `strokeWidth={2}` icons, tabular-nums counts). Loading: `AdminDashboardSkeleton` (mirrors header + KPIs + strip + charts + table); error: `AdminDashboardError` ("use client", Retry button → `router.refresh()`).

## 2. Admin Users — `/admin/users`

No initial data server-side — `AdminUsersClient` loads on mount via `adminGetUsers()`.

- **Toolbar:** search (name/email, 300ms debounce), Role + Status filters, total count.
- **Table:** Email, Name, Role, Status, Created (`formatDistanceToNow`), Usage Limits; rows clickable → detail drawer; pagination at 50/page. **Keyboard path:** the Email cell renders a real `<button>` (accessible name `View details for <email>`) that opens the same drawer — the `<tr>` itself is never focusable; pointer clicks on the rest of the row reuse the same handler.
- **Detail modal:** header (email + status + suspension reason banner), info grid, stats cards (projects/assets/events counts), recent projects (last 5), and the actions card:
  - Role update, Usage Limits update, Subscription Tier update → `adminSetUserTier` (enum-validated, single path for tier+credits changes; free-text tier removed from `adminUpdateUser`)
  - Suspend (prompts for reason) / Activate → `adminSetUserStatus`
  - Delete → `adminDeleteUser`

All mutations return `ActionResult`; the client renders `result.message` in an inline error banner (success closes the modal + `router.refresh()`).

**Self-protection invariant:** all mutation actions throw `ForbiddenError` ("Cannot update/suspend/delete your own account") when `id === principal.userId`.

**Search is a JS case-insensitive substring filter** over email/name (deliberately no fulltext index).

## 3. Admin Tasks — `/admin/tasks`

Server entry: `requirePrincipalOrRedirect({ roles: [Role.ADMIN] })` + `getAllTasks()` (all projects) → `AdminTasksClient` with `initialTasks` + `principal`. **Board-only** (no list toggle), 4 columns:

| `ProjectStatus` | Label | Icon |
|---|---|---|
| `PENDING` | Queued | `PackageCheck` |
| `REVISIONS` | Revisions Required | `MessageSquareWarning` |
| `COMPLETED` | Completed | `Check` |
| `PUBLISHED` | Live | `CheckCircle2` |

The Live column exists so PUBLISHED projects stay reachable — they open the drawer read-only (no submit). There is no claim/assign concept — every PENDING project is implicitly any admin's.

**Board layout:** fluid CSS Grid (`sm:grid-cols-2 xl:grid-cols-4`) of shared `TaskColumn` + `TaskCard` (see `./tasks.md` — same primitives). At `xl+`, columns get internal scroll via `.task-column-scroll` with `max-h-[var(--board-h)]`; below `xl`, columns stack vertically with normal page scroll. Toolbar is the shared `TaskToolbar` (search + status filter + task-count pill, no view toggle) in a white `24px` rounded card with `shadow-[var(--shadow-1)]`. Column headers carry a status-tinted icon well (Queued → sky, Revisions → warning tint, Completed → accent-pale, Live → forest) + mono label + tabular-nums count. Cards use concentric radii (outer `24px`, thumbnail `rounded-2xl` + `1px oklch(0 0 0 / 0.1)` ring outline), `active:scale-[0.98]`, and `transition-[box-shadow,transform]`; product name + status badge + meta line. Empty columns show a contextual dashed tile with the column's tinted icon + description; an entirely empty board shows a page-level empty state. Card entrance stagger via `enterDelay` (capped at 8×30ms).

**Drawer contract:** the management drawer is the shared `TaskDrawer` (`src/components/tasks/TaskDrawer.tsx`) — 640px panel, sage ground, white `SectionCard` grouped sections, frosted sticky header/footer. Same focus contract: focus close on open, Esc, Tab trap, restore trigger focus, body scroll lock. Exit animation: `cubic-bezier(0.32, 0.72, 0, 1)` 360ms with deferred unmount. Content settles with `drawer-content` animation. Shared detail primitives: `SectionCard`, `SectionHeading` (optional `action` slot), `MetaGrid`, `MetaItem`, `DimensionEditor`, `ReferenceGrid`, `RevisionNotesCard`.

**Management drawer** sections (all use `SectionCard` + `SectionHeading` on sage ground):

1. **Project Info** — `SectionCard` with `MetaGrid`: name, SKU, brand, created, instructions, reference images (proxy URLs, `unoptimized`, `ReferenceGrid` with `failedRefImages` onError fallback + per-tile unavailable state), plus a standalone `DimensionEditor` card (inline-editable W/H/D — ADMIN can correct dimensions on any status; see `./tasks.md` §Drawer system), GLB/USDZ View links (proxy, inline disposition).
2. **Generation Status** (FAST mode) — `SectionCard` with generation status badge (SUBMITTED/RUNNING/FINALIZING/SUCCEEDED/FAILED), timing info (started, completed), error message (if failed), and generation views mapping. Shows AI pipeline badge on task cards when `generationMode === "FAST"`.
3. **Brand Revision Notes** (REVISIONS) — `RevisionNotesCard` (all `revisionRequests` newest-first) + `SectionCard` with Reference Images.
4. **Published banner** (PUBLISHED) — `StatusBanner` ("Live on the brand's storefront").
5. **3D Model Upload** (status ∈ {PENDING, REVISIONS}) — `SectionCard` with GLB upload (required) + USDZ (optional), each via `useAppwriteUpload({ bucketId: "models", maxSizeMB: 128, allowedExtensions: ["glb"]/["usdz"] })` with **live progress bars** (client SDK `onProgress` is percent 0-100). When a READY model exists, the tile shows a **Current** caption card above a dropzone labeled **"Replace GLB/USDZ file"**; a freshly-uploaded file shows as an inline **New** card with an X to cancel. Footer helper caption: "Upload a GLB file to enable submission." **"Submit for Review"** → `adminSubmitProject(id, glbAssetId, usdzAssetId?)` — disabled until GLB is uploaded.
6. **Previous Models** (when `archivedAssetUrls` has entries) — `SectionCard` with `<details>` collapsible listing archived models (filename, type, size, archive date) in soft wells. Archived files stay in Appwrite Storage and remain viewable through the proxy.
7. **Submitted banner** (COMPLETED) — `StatusBanner` restyled.

**Transaction contract** (`adminSubmitProjectService`):

```
runTransaction (TablesDB):
  (a) getRowSafe(projects, id, txId) — status ∈ {PENDING, REVISIONS} → updateRow → COMPLETED
  (b) archive prior READY MODEL_GLB/USDZ on the project (projectId kept)
  (c) link new models — updateRows(projectId, $id ∈ newIds, projectId === null)
```

**Gotchas:**
- **A staged (in-transaction) bulk `updateRows` always returns `{ total: 0, rows: [] }`** regardless of matches — the response only reflects executed operations at commit. Preconditions are therefore enforced by in-tx `getRowSafe` reads + single-row `updateRow`, never by checking a staged bulk-update response.
- Step (c) re-reads each new model **inside the tx** and requires READY + `projectId === null` — prevents flipping to COMPLETED with a model that silently failed to link.
- **No post-commit cleanup** — archived files are always kept in storage (user decision).

The same action covers initial submit (PENDING → COMPLETED) and resubmit after revisions (REVISIONS → COMPLETED). On `{ ok: false }` the client renders `result.message` above the Submit button.

## 4. Admin Analytics — `/admin/analytics`

Entirely an async server component (no client component): `getPlatformKPIs()` + `getSignupsSeries(12)` + `getTopBrands(10)` via `Promise.all`. Header has an eyebrow ("Platform analytics") + `page-title` + subcopy. Sections: KPI cards (same fixed accent-pale/sky/butter/forest wells + stagger as the admin dashboard, `strokeWidth={2}` icons) → signups chart (accent-pale header-total pill) → Projects by Status table (each row adds a share bar — forest fill on a sage track, `role="img"` + `aria-label`, hidden below `sm`) → Top Brands table → notes card linking to `/analytics`. The inline signups bars use `transition-[background-color]` (never `transition-all`) with `aria-hidden` tooltips + tabular-nums values.

---

## 5. Contact Requests — `/admin/requests`

No initial data server-side — `AdminRequestsClient` loads on mount via `adminListContactRequests()`.

- **Toolbar:** status filter (All / NEW / CONTACTED / RESOLVED), total count, refresh button, Delete icon.
- **Table:** Email, Name, Company, Interested Tier (badge), Status (badge), Created; rows clickable → expandable message row.
- **Expandable row:** full message body + status transition buttons (NEW→CONTACTED, CONTACTED→RESOLVED). Current status is disabled.
- **Delete:** clicking Delete shows a confirm checkbox row; confirm calls `adminDeleteContactRequest`.
- **Actions:** all mutations return `ActionResult`; errors render inline; success refreshes the list + count.

**Auth + rate limit** are on the authenticated `submitPlanRequest` action (session, 5/h/userId — `subscription-architecture.md` §6), not on admin reads.

---

## Server actions

Thin adapters over `src/server/services/*.service.ts`; full reference in `../WEBSITE.md` §8.

- **`src/app/actions/admin.ts`** — `getAllTasks` (throws), `adminSubmitProject` → `ActionResult`
- **`src/app/actions/admin-users.ts`** — `adminGetUsers`, `adminGetUser` (throws); `adminUpdateUser`, `adminSetUserStatus`, `adminDeleteUser` → `ActionResult`. `adminDeleteUser` runs an **explicit cascade transaction** (TablesDB has no FK cascades): deletes the user's projects, assets (owned ∪ linked), events, revision_requests, users row, and the Appwrite auth user.
- **`src/app/actions/admin-analytics.ts`** — `getPlatformKPIs`, `getSignupsSeries`, `getProjectsByMonth`, `getTopBrands` (throws)
- **`src/app/actions/subscription.ts`** — `adminSetUserTier`, `adminListContactRequests`, `adminUpdateContactRequest`, `adminDeleteContactRequest` → `ActionResult`
