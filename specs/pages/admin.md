# `/admin/*` — Admin Panel (deep dive)

> Parent: [`../WEBSITE.md`](../WEBSITE.md)

The admin panel provides platform-wide management tools for ADMIN users. Four pages share a common `AdminLayout`, enforce strict `Role.ADMIN` gating, and call dedicated server actions (`admin.ts`, `admin-users.ts`, `admin-analytics.ts`).

---

## Routes & auth overview

| Route | Server entry | Client component | Purpose |
|---|---|---|---|
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx:25` | None (inline server component) | KPI cards, Projects by Status, signups bar chart, top 10 brands |
| `/admin/users` | `src/app/admin/users/page.tsx:20` | `AdminUsersClient.tsx:45` | User search/filter/list, detail modal with inline role/status/limits management |
| `/admin/tasks` | `src/app/admin/tasks/page.tsx:10` | `AdminTasksClient.tsx:95` | All-project Kanban + list, status override, claim + 3D upload, reassign |
| `/admin/analytics` | `src/app/admin/analytics/page.tsx:22` | None (inline server component) | Platform KPI cards, signups time-series, Projects by Status, Top Brands |

**Proxy gating:** `/admin` → `["ADMIN"]` (`src/proxy.ts:8`). All four routes are protected by `requirePrincipalOrRedirect()` in the server entry, and each server action calls `requirePrincipal({ roles: [Role.ADMIN] })`.

**Layout:** All four pages are wrapped in `AdminLayout` (`src/components/admin/AdminLayout.tsx:19`), which is split into an outer wrapper that mounts `<SessionProvider>` and an inner `AdminLayoutInner` that consumes the session. This mirrors the `DashboardLayout` pattern (`src/components/dashboard/DashboardLayout.tsx:19`) and is required because `AdminMobileNavDrawer` (`src/components/admin/AdminMobileNavDrawer.tsx:17`) re-uses the dashboard `MobileNavDrawer`, which calls `useSession()`. Without the provider, the admin pages would throw `TypeError: Cannot destructure property 'data' of useSession() as it is undefined` on every SSR. The layout provides a left sidebar navigation (Overview, Users, Tasks Management, Analytics), a sticky header with title + action slot + ThemeToggle + NotificationBell, and the mobile nav drawer.

---

## 1. Admin Dashboard — `/admin/dashboard`

### Server entry (`page.tsx:25`)

```tsx
export default async function AdminDashboardPage() {
  const principal = await requirePrincipalOrRedirect();
  return (
    <AdminLayout title="Admin Overview" user={{...}}>
      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardContent />
      </Suspense>
    </AdminLayout>
  );
}
```

`AdminDashboardContent` (`:43`) calls three server actions in parallel:
- `getPlatformKPIs()` → `{ totalUsers, totalProjects, totalEvents, suspendedUsers, projectsByStatus, signupsThisMonth, eventsThisMonth }`
- `getSignupsSeries(12)` → `{ labels: string[], counts: number[] }`
- `getTopBrands(10)` → `{ id, name, email, status, createdAt, _count: { projects } }[]`

### Dashboard sections

1. **KPI Cards** (`:96`) — 4-card grid: Total Users, Total Projects, Active Users (total − suspended), Events This Month. Each card renders a Lucide icon, mono label, and serif count via `formatCount()`.
2. **Projects by Status** (`:122`) — `Card` > `Table` with rows for each `ProjectStatus` group from `projectsByStatus`. Uses `PROJECT_STATUS_META` for Badge tone/icon/label. Displays all 6 statuses.
3. **Signups by Month** (`:168`) — 12-month bar chart built from `getSignupsSeries`. Horizonal stacked bars with hover tooltip. Month labels at the bottom.
4. **Top Brands** (`:205`) — `Card` > `Table` with Brand Name (avatar + name), Email, Projects count, Status badge (ACTIVE/SUSPENDED).

### Loading & error states
- **Skeleton:** `AdminDashboardSkeleton` (`src/app/admin/dashboard/AdminDashboardSkeleton.tsx:1`) — shapes matching the 4-card grid, status table, and 2-column chart layout.
- **Error boundary:** `AdminDashboardError` (`src/app/admin/dashboard/AdminDashboardError.tsx:8`) — `"use client"`, renders an `EmptyState` with a Retry button calling `router.refresh()`. Shown when any of the three server action promises rejects.

### Data flow

```
AdminDashboardContent
  ├── getPlatformKPIs()       ──→ prisma.user.count() + project.groupBy + analyticsEvent.count
  ├── getSignupsSeries(12)    ──→ prisma.user.count() × 12 (one query per month)
  └── getTopBrands(10)        ──→ prisma.user.findMany + slice(10) after JS sort
```

All three actions require `Role.ADMIN` and throw `ForbiddenError` for non-admin callers.

---

## 2. Admin Users — `/admin/users`

### Server entry (`page.tsx:20`)

```tsx
export default async function AdminUsersPage() {
  const principal = await requirePrincipalOrRedirect();
  return (
    <AdminLayout title="Users" user={{...}}>
      <Suspense fallback={<UserSkeleton />}>
        <AdminUsersClient />
      </Suspense>
    </AdminLayout>
  );
}
```

No initial data is fetched server-side — `AdminUsersClient` loads on mount via `useEffect` calling `adminGetUsers()`.

### Client component (`AdminUsersClient.tsx:45`)

**Toolbar** (`:252`): Search input (name/email, 300ms debounce), Role filter (`Select`: All / BRAND / ADMIN), Status filter (`Select`: All / ACTIVE / SUSPENDED), total count label.

**User table** (`:290`): Columns — Email, Name, Role (Badge), Status (Badge), Created (`formatDistanceToNow`), Usage Limits. Rows are clickable → opens detail modal. Pagination footer when `totalPages > 1`.

**Detail modal** (`:378`): Dialog variant, displays:
- Header: email + status badge + suspension reason banner (if SUSPENDED)
- Info grid: Name, Role, Created, Onboarded
- Stats cards: Projects count, Assets count, Events count
- Recent Projects list (last 5, from `adminGetUser`)
- **Actions section** (`Card` at `:468`):
  - Role update (`Select` + "Update" — calls `adminUpdateUser({ role })`)
  - Usage Limits update (`Input number` + "Update" — calls `adminUpdateUser({ usageLimits })`)
  - Subscription Tier update (`Input text` + "Update" — calls `adminUpdateUser({ subscriptionTier })`)
  - Suspend/Activate toggle (suspend prompts for reason, activate requires confirm — calls `adminSetUserStatus`)
  - Delete User (requires confirm — calls `adminDeleteUser`)

### Data flow

```
[on mount] useCallback → adminGetUsers(search?, roleFilter?, statusFilter?, page?)
                                     └── prisma.user.findMany + count
[i] openUserDetail(id) → adminGetUser(id) ──→ prisma.user.findUnique + project.findMany
[i] handle*Update → adminUpdateUser(id, { role|usageLimits|subscriptionTier })
[i] handleSetUserStatus → adminSetUserStatus(id, status, reason?)
[i] handleDeleteUser → adminDeleteUser(id)
```

All server actions require `Role.ADMIN` and are defined in `src/app/actions/admin-users.ts` (`../WEBSITE.md` §8).

### Self-protection
All mutation actions (`adminUpdateUser`, `adminSetUserStatus`, `adminDeleteUser`) throw `"Cannot update/suspend/delete your own account"` when `id === principal.userId`.

---

## 3. Admin Tasks — `/admin/tasks`

### Server entry (`page.tsx:10`)

```tsx
export default async function AdminTasksPage() {
  return (
    <Suspense fallback={...}>
      <AdminTasksContent />
    </Suspense>
  );
}

async function AdminTasksContent() {
  const principal = await requirePrincipalOrRedirect({ roles: [Role.ADMIN] });
  const tasks = await getAllTasks();
  return (
    <AdminLayout title="Tasks Management" user={{...}}>
      <AdminTasksClient
        initialTasks={tasks}
        principal={{ userId, name, email }}
      />
    </AdminLayout>
  );
}
```

Loads `getAllTasks()` (all projects, not just the caller's). `requirePrincipalOrRedirect` is called with `{ roles: [Role.ADMIN] }`. The admin users list is no longer fetched — reassignment was removed from the UI along with `assignedTo` itself.

### Client component (`AdminTasksClient.tsx:99`)

**State management:** Receives `initialTasks` and `principal`. Filtering runs client-side over `initialTasks`. **Board-only** (no list view toggle).

**Toolbar** (`:188`): Search input (name/SKU/id), Status filter restricted to the 3 board statuses (`PENDING`, `REVISIONS`, `COMPLETED`).

**Board view** (`:214`): 3 columns from `COLUMNS` (`:69`):

| `ProjectStatus` | Label | Icon |
|---|---|---|
| `PENDING` | Queued | `PackageCheck` |
| `REVISIONS` | Revisions Required | `MessageSquareWarning` |
| `COMPLETED` | Completed | `Check` |

`PUBLISHED` is not rendered as a board column but does show in the modal as a read-only "Live on storefront" banner. There is no separate queue for `IN_PROGRESS` — every PENDING project is implicitly any admin's.

Each column is `w-72`, scrollable, with header (icon + label + count badge) and job cards. Card shows thumbnail, job ID mono pill, product name, brand initials + SKU + created date. Empty columns show dashed "Empty" placeholder.

**Management modal** (`:295`): Dialog variant, sections (no footer; closed via header X / Escape / backdrop):

1. **Project Info** (`:288`) — Name, SKU, Brand, Status (Badge with `ADMIN_LABEL`), Additional Instructions (always rendered; shows text or italic "No additional instructions specified" fallback), Dimensions, Reference Images (grid with `onError` fallback to a placeholder icon — `failedRefImages` Set, resets in `openModal`), Created date, GLB/USDZ asset links (if any).
2. **Brand Revision Notes** (`:387`, only for REVISIONS) — amber-tinted section showing all `revisionRequests` newest-first with requester name, timestamp, and note text.
3. **Published banner** (`:448`, only for PUBLISHED) — green "Live on the brand's storefront" notice.
4. **3D Model Upload** (`:419`, shown when `status ∈ {PENDING, REVISIONS}`) — GLB file upload (required), USDZ file upload (optional). Each upload tile shows a **live progress bar** (`h-1.5` track, `var(--color-text-primary)` fill, `Math.max(2, progress)%` width) + a `0%`–`100%` label below the spinner while `isUploading` is true. Progress is wired from UploadThing v7's `onUploadProgress(p: number)` in `usePresignedUpload` (`src/lib/hooks/use-presigned-upload.ts`). Existing GLB/USDZ assets show as "View file" links. **"Submit for Review"** button. Calls `adminSubmitProject(id, glbAssetId, usdzAssetId?)`. Disabled until GLB is uploaded.
5. **Submitted banner** (`:515`, only for COMPLETED) — green "The brand has been notified" notice with a link to view the GLB.

The "Claim Task" section, "Mark as Completed" button, SDK Configuration form, and list view toggle are all gone. `assignedTo` is no longer a concept.

### Data flow

```
[server] getAllTasks() ──→ prisma.project.findMany (with revisionRequests + requester)

[client] handleSubmit → adminSubmitProject(id, glbId, usdzId?)
                       ──→ updateMany(where: {id, status ∈ {PENDING, REVISIONS}})
                       ──→ status: COMPLETED
```

`adminSubmitProject` calls `revalidatePath("/tasks")` and `revalidatePath("/admin/tasks")`, then `router.refresh()`. The same action handles both initial submit (PENDING → COMPLETED) and re-submit after revisions (REVISIONS → COMPLETED).

---

## 4. Admin Analytics — `/admin/analytics`

### Server entry (`page.tsx:22`)

```tsx
export default async function AdminAnalyticsPage() {
  const principal = await requirePrincipalOrRedirect();
  const [kpis, signupsSeries, topBrands] = await Promise.all([
    getPlatformKPIs(),
    getSignupsSeries(12),
    getTopBrands(10),
  ]);
  return (
    <AdminLayout title="Platform Analytics" user={{...}}>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* inline server-rendered content */}
      </div>
    </AdminLayout>
  );
}
```

No client component — the entire page is an async server component that fetches data and renders inline.

### Dashboard sections

1. **KPI Cards** (`:54`) — 4-card grid: Total Users, Total Projects, Signups (This Month), Events (This Month).
2. **Signups Over Time** (`:75`) — 12-month bar chart, identical to dashboard signups chart.
3. **Projects by Status** (`:104`) — Table from `PROJECT_STATUS_META`. Shows all 6 statuses.
4. **Top Brands** (`:140`) — Table with Brand Name, Email, Projects count, Status, Joined date.
5. **Admin Notes card** (`:183`) — Link to `/analytics` (per-project analytics).

### Data flow

Same three actions as Admin Dashboard: `getPlatformKPIs()`, `getSignupsSeries(12)`, `getTopBrands(10)` — all from `src/app/actions/admin-analytics.ts`.

---

## AdminLayout (`src/components/admin/AdminLayout.tsx:19`)

`"use client"` component providing the admin shell.

**Props:**
```ts
interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  user?: { name: string | null; email: string; role: string };
}
```

**Structure:**
- Left sidebar (desktop only, `w-64`): STUDIO.V logo + nav links (Overview → `/admin/dashboard`, Users → `/admin/users`, Tasks Management → `/admin/tasks`, Analytics → `/admin/analytics`), user profile (initials avatar + name/role) + Sign Out form.
- Header (sticky): hamburger `Menu` button (mobile only, opens `AdminMobileNavDrawer`), title (`h1`, serif italic), action slot, `ThemeToggle`, `NotificationBell`.
- `<main>` content area: `p-6 sm:p-8`.

**Nav items** (`:23`):
```
{ name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard }
{ name: 'Users', path: '/admin/users', icon: Users }
{ name: 'Tasks Management', path: '/admin/tasks', icon: ListTodo }
{ name: 'Analytics', path: '/admin/analytics', icon: BarChart2 }
```

Active state is determined by `pathname.startsWith(item.path)`. Active: dark background (`var(--text-primary)`), white text. Inactive: transparent background, secondary text; hover background `var(--canvas-secondary)`.

`AdminMobileNavDrawer` (`src/components/admin/AdminMobileNavDrawer.tsx:17`) wraps the shared `MobileNavDrawer` component — same nav items, same active highlighting, animated drawer overlay on mobile.

---

## Server actions reference

All admin server actions are documented in `../WEBSITE.md` §8. Summary of files:

- **`src/app/actions/admin.ts`** — `getAllTasks`, `adminSubmitProject` (replaces `claimProject` + `markAsCompleted` + `adminUpdateProjectStatus` + `adminReassignProject`)
- **`src/app/actions/admin-users.ts`** — `adminGetUsers`, `adminGetUser`, `adminUpdateUser`, `adminSetUserStatus`, `adminDeleteUser`
- **`src/app/actions/admin-analytics.ts`** — `getPlatformKPIs`, `getSignupsSeries`, `getTopBrands`

---

## File & line index

| Element | Location |
|---|---|
| **Admin Dashboard** | |
| Server entry | `src/app/admin/dashboard/page.tsx:25` |
| `AdminDashboardContent` | `page.tsx:43` |
| `AdminDashboardSkeleton` | `src/app/admin/dashboard/AdminDashboardSkeleton.tsx:1` |
| `AdminDashboardError` | `src/app/admin/dashboard/AdminDashboardError.tsx:8` |
| **Admin Users** | |
| Server entry | `src/app/admin/users/page.tsx:20` |
| `AdminUsersClient` | `src/app/admin/users/AdminUsersClient.tsx:45` |
| Toolbar (search + filters) | `AdminUsersClient.tsx:252` |
| User table | `AdminUsersClient.tsx:290` |
| Detail modal | `AdminUsersClient.tsx:378` |
| Status management (suspend/activate) | `AdminUsersClient.tsx:181` |
| Delete user | `AdminUsersClient.tsx:209` |
| **Admin Tasks** | |
| Server entry | `src/app/admin/tasks/page.tsx:10` |
| `AdminTasksContent` | `page.tsx:25` |
| `AdminTasksClient` | `src/app/admin/tasks/AdminTasksClient.tsx:84` |
| `COLUMNS` (3 statuses) | `AdminTasksClient.tsx:69` |
| Board view | `AdminTasksClient.tsx:215` |
| Management modal | `AdminTasksClient.tsx:293` |
| 3D Model Upload section (PENDING\|REVISIONS, with live progress bars) | `AdminTasksClient.tsx:419` |
| **Admin Analytics** | |
| Server entry | `src/app/admin/analytics/page.tsx:22` |
| KPI cards | `page.tsx:54` |
| Signups chart | `page.tsx:75` |
| Projects by Status table | `page.tsx:104` |
| Top Brands table | `page.tsx:140` |
| **Admin Layout** | |
| `AdminLayout` | `src/components/admin/AdminLayout.tsx:19` |
| Nav items | `AdminLayout.tsx:23` |
| `AdminMobileNavDrawer` | `src/components/admin/AdminMobileNavDrawer.tsx:17` |
| **Server actions** | |
| `getAllTasks` | `src/app/actions/admin.ts:8` |
| `adminSubmitProject` (PENDING\|REVISIONS → COMPLETED) | `src/app/actions/admin.ts:46` |
| `adminGetUsers` | `src/app/actions/admin-users.ts:8` |
| `adminGetUser` | `src/app/actions/admin-users.ts:55` |
| `adminUpdateUser` | `src/app/actions/admin-users.ts:103` |
| `adminSetUserStatus` | `src/app/actions/admin-users.ts:117` |
| `adminDeleteUser` | `src/app/actions/admin-users.ts:135` |
| `getPlatformKPIs` | `src/app/actions/admin-analytics.ts:8` |
| `getSignupsSeries` | `src/app/actions/admin-analytics.ts:40` |
| `getTopBrands` | `src/app/actions/admin-analytics.ts:65` |