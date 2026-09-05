# `/admin/*` — Admin Panel

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md)

The admin panel provides platform-wide management tools for ADMIN users. Four pages share `AdminLayout`, enforce strict `Role.ADMIN` gating, and call dedicated server actions (`admin.ts`, `admin-users.ts`, `admin-analytics.ts`).

---

## Routes & auth overview

| Route | Client component | Purpose |
|---|---|---|
| `/admin/dashboard` | none (inline server component) | KPI cards, Projects by Status, signups bar chart, top 10 brands |
| `/admin/users` | `AdminUsersClient.tsx` | User search/filter/list, detail modal with role/status/limits management |
| `/admin/tasks` | `AdminTasksClient.tsx` | All-project Kanban board, 3D upload + submit for review |
| `/admin/analytics` | none (inline server component) | Platform KPI cards, signups series, Projects by Status, Top Brands |

All four routes are protected by `requirePrincipalOrRedirect()` in the server entry (admin pages pass `{ roles: [Role.ADMIN] }`); each server action calls `requirePrincipal({ roles: [Role.ADMIN] })`. **This is the only role gate** — the edge proxy cannot verify roles (see `../pages/auth.md` §Security properties).

**Layout:** `AdminLayout` (`src/components/admin/AdminLayout.tsx`) is split into an outer wrapper that mounts `<SessionProvider>` and an inner `AdminLayoutInner` that consumes the session. **Required:** `AdminMobileNavDrawer` re-uses the dashboard `MobileNavDrawer`, which calls `useSession()` — without the provider wrapper the admin pages throw `TypeError: Cannot destructure property 'data' of useSession()` on SSR. The layout provides the left sidebar nav (Overview, Users, Tasks Management, Analytics), sticky header with `NotificationBell`, and the mobile drawer. Segment `loading.tsx` covers RSC navigation to all `/admin/*` routes.

---

## 1. Admin Dashboard — `/admin/dashboard`

`AdminDashboardContent` (async, inside `<Suspense>`) calls four actions in parallel:

- `getPlatformKPIs()` → totals, suspended, `projectsByStatus`, month counts
- `getSignupsSeries(12)` → `{ labels, counts }` (single `listAllRows(users)` + JS month buckets)
- `getProjectsByMonth(12)`
- `getTopBrands(10)` → `{ id, name, email, status, createdAt, _count: { projects } }[]`

Sections: 4 KPI cards (Total Users, Total Projects, Active Users, Events This Month) → Projects by Status table (all statuses, `PROJECT_STATUS_META` tones) → 12-month signups bar chart (single-accent) → Top Brands table. Loading: `AdminDashboardSkeleton`; error: `AdminDashboardError` ("use client", Retry button → `router.refresh()`).

## 2. Admin Users — `/admin/users`

No initial data server-side — `AdminUsersClient` loads on mount via `adminGetUsers()`.

- **Toolbar:** search (name/email, 300ms debounce), Role + Status filters, total count.
- **Table:** Email, Name, Role, Status, Created (`formatDistanceToNow`), Usage Limits; rows clickable → detail modal; pagination at 50/page.
- **Detail modal:** header (email + status + suspension reason banner), info grid, stats cards (projects/assets/events counts), recent projects (last 5), and the actions card:
  - Role update, Usage Limits update, Subscription Tier update → `adminUpdateUser`
  - Suspend (prompts for reason) / Activate → `adminSetUserStatus`
  - Delete → `adminDeleteUser`

All mutations return `ActionResult`; the client renders `result.message` in an inline error banner (success closes the modal + `router.refresh()`).

**Self-protection invariant:** all mutation actions throw `ForbiddenError` ("Cannot update/suspend/delete your own account") when `id === principal.userId`.

**Search is a JS case-insensitive substring filter** over email/name (deliberately no fulltext index).

## 3. Admin Tasks — `/admin/tasks`

Server entry: `requirePrincipalOrRedirect({ roles: [Role.ADMIN] })` + `getAllTasks()` (all projects) → `AdminTasksClient` with `initialTasks` + `principal`. **Board-only** (no list toggle), 3 columns:

| `ProjectStatus` | Label | Icon |
|---|---|---|
| `PENDING` | Queued | `PackageCheck` |
| `REVISIONS` | Revisions Required | `MessageSquareWarning` |
| `COMPLETED` | Completed | `Check` |

`PUBLISHED` is not a board column — it shows in the modal as a read-only "Live on storefront" banner. There is no claim/assign concept — every PENDING project is implicitly any admin's.

**Management modal** sections:

1. **Project Info** — name, SKU, brand, status, instructions, dimensions, reference images (proxy URLs, `unoptimized`, `failedRefImages` onError fallback), created, GLB/USDZ View links (proxy, inline disposition).
2. **Brand Revision Notes** (REVISIONS) — all `revisionRequests` newest-first.
3. **Published banner** (PUBLISHED) — "Live on the brand's storefront".
4. **3D Model Upload** (status ∈ {PENDING, REVISIONS}) — GLB upload (required) + USDZ (optional), each via `useAppwriteUpload({ bucketId: "models", maxSizeMB: 128, allowedExtensions: ["glb"]/["usdz"] })` with **live progress bars** (client SDK `onProgress` is percent 0-100). When a READY model exists, the tile shows a **Current** caption card above a dropzone labeled **"Replace GLB/USDZ file"**; a freshly-uploaded file shows as an inline **New** card with an X to cancel. **"Submit for Review"** → `adminSubmitProject(id, glbAssetId, usdzAssetId?)` — disabled until GLB is uploaded.
5. **Previous Models** (when `archivedAssetUrls` has entries) — `<details>` collapsible listing archived models (filename, type, size, archive date). Archived files stay in Appwrite Storage and remain viewable through the proxy.
6. **Submitted banner** (COMPLETED).

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

Entirely an async server component (no client component): `getPlatformKPIs()` + `getSignupsSeries(12)` + `getTopBrands(10)` via `Promise.all`. Sections: KPI cards (Total Users, Total Projects, Signups This Month, Events This Month) → signups chart → Projects by Status table → Top Brands table → notes card linking to `/analytics`.

---

## Server actions

Thin adapters over `src/server/services/*.service.ts`; full reference in `../WEBSITE.md` §8.

- **`src/app/actions/admin.ts`** — `getAllTasks` (throws), `adminSubmitProject` → `ActionResult`
- **`src/app/actions/admin-users.ts`** — `adminGetUsers`, `adminGetUser` (throws); `adminUpdateUser`, `adminSetUserStatus`, `adminDeleteUser` → `ActionResult`. `adminDeleteUser` runs an **explicit cascade transaction** (TablesDB has no FK cascades): deletes the user's projects, assets (owned ∪ linked), events, revision_requests, users row, and the Appwrite auth user.
- **`src/app/actions/admin-analytics.ts`** — `getPlatformKPIs`, `getSignupsSeries`, `getProjectsByMonth`, `getTopBrands` (throws)
