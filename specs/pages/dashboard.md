# `/dashboard` — Overview (deep dive)

> Parent: [`../WEBSITE.md`](../WEBSITE.md) · Source: `src/app/dashboard/page.tsx:1` + `DashboardSkeleton.tsx` + `DashboardError.tsx`

The dashboard is the authenticated landing page. It surfaces four metric cards, a 12-month interaction-trends bar chart, a recent-tasks list, and quick-link cards. All metrics are computed server-side from `prisma.analyticsEvent` scoped to the signed-in user's projects.

---

## Route & auth

| | |
|---|---|
| **Route** | `/dashboard` |
| **Server entry** | `src/app/dashboard/page.tsx:1` (async server component) |
| **Layout shell** | `DashboardLayout` with `title="Overview"` (`src/components/dashboard/DashboardLayout.tsx:1`) |
| **Proxy gating** | `["BRAND","ADMIN"]` + onboarded (`src/proxy.ts:8`) |
| **Loading** | `<DashboardSkeleton />` via `<Suspense>` (`page.tsx:19`) |
| **Error** | `<DashboardError />` (`page.tsx:43`) — DB failures only; auth failures handled by `requirePrincipalOrRedirect()` |

### Server entry (`page.tsx:16`)
```tsx
export default function DashboardPage() {
  return (
    <DashboardLayout title="Overview">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </DashboardLayout>
  );
}
```
`DashboardContent` is an **async** server component wrapped in `<Suspense>` so the metric computation can stream without blocking the shell. The Suspense boundary is what makes `DashboardSkeleton` show during server work.

> **Note (known perf issue):** `DashboardContent` calls `requirePrincipalOrRedirect()` at the top, then `getUserProjects()` internally calls `requirePrincipal()` again — the DB lookup is duplicated. The `auth-stabilization.md` task plan tracks eliminating this redundant call (Task 10). Until then, dashboard data path does two DB lookups for the same user.

---

## Data acquisition

### Auth guard (`DashboardContent` line 41)
`DashboardContent` opens with `await requirePrincipalOrRedirect()` which calls `requirePrincipal()` and redirects to `/auth` if the session is absent or stale (DB user gone). This prevents auth failures from reaching the downstream data fetching.

### `fetchDashboardData()` (`page.tsx:31`)
```ts
async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const projects = await getUserProjects();   // src/app/actions/project.ts:82
    return { projects };
  } catch {
    return { error: true };
  }
}
```
`getUserProjects` requires `requirePrincipal()` (any role) and returns the caller's projects (newest first) with `assets` + `brand` + derived `referenceUrls`/`assetUrls`/`assignedUser`. Non-auth errors (DB hiccups) are swallowed and surfaced as `<DashboardError />` so a transient DB failure never crashes the page.

### Metric queries (`page.tsx:52`–`148`)
After `projects` resolve, the component derives:
- `projectIds = projects.map(p => p.id)`
- `userId = projects[0]?.brand.id` — the brand's id (used as `brandId` filter; assumes all of a user's projects share one `brandId`)
- **Guards:** if `projectIds.length === 0` or `userId` is falsy, both query blocks are skipped and zeros are shown.

**Query 1 — totals** (`page.tsx:57`):
```ts
const events = await prisma.analyticsEvent.findMany({
  where: { brandId: userId, projectId: { in: projectIds } },
});
totalViews      = events.filter(e => e.eventType === 'VIEW').length;
arLaunches      = events.filter(e => e.eventType === 'AR_LAUNCH').length;
totalInteractions = events.length;
```
In-memory filtering — no DB-level aggregation. Acceptable at MVP scale (a brand's event volume is small).

**Query 2 — 12-month series** (`page.tsx:118`):
```ts
const twelveMonthsAgo = new Date();
twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
twelveMonthsAgo.setDate(1); twelveMonthsAgo.setHours(0,0,0,0);

const recentEvents = await prisma.analyticsEvent.findMany({
  where: { brandId: userId, projectId: { in: projectIds }, eventType: 'VIEW', createdAt: { gte: twelveMonthsAgo } },
  select: { createdAt: true },
});
```
Then buckets events into a `Map<"${year}-${month}", count>` and writes into `monthlyViewCounts[i]`. `monthLabels[i]` holds the `toLocaleDateString('en-US', { month: 'short' })` label. `maxCount = Math.max(...monthlyViewCounts, 1)` drives the bar heights.

---

## Computed metrics

| Card | Label | Value formula | Icon | Trend badge |
|---|---|---|---|---|
| 1 | Total Model Views | `formatCount(totalViews)` or `"0"` if none | `Eye` | up |
| 2 | AR Launches | `formatCount(arLaunches)` or `"0"` | `Smartphone` | up |
| 3 | Interaction Rate | `totalViews > 0 ? \`${interactionRate}%\`` else `"--"` where `interactionRate = round(totalInteractions / totalViews * 100)` | `Activity` | down |
| 4 | Est. Conversion Lift | `totalViews > 0 ? \`+${conversionLift}%\`` else `"--"` where `conversionLift = (totalInteractions / totalViews * 100).toFixed(1)` | `Box` | up |

All four cards render `change: "--"` — period-over-period deltas are **not yet implemented** on this page (they live on `/analytics`). `formatCount` is from `src/lib/utils.ts` (compact number formatting).

**Card markup** (`page.tsx:160`): each is a `Card` → `CardBody` with a circular icon chip (top-left), a trend pill (top-right, emerald for `up` / red for `down`), a mono uppercase label, and a 3xl serif italic value. Hover darkens the border.

---

## Layout grid

`page.tsx:152` wraps everything in `space-y-8 animate-in fade-in duration-500`.

### Header
- `h2` "Welcome back." (serif italic 3xl) + subcopy "Here is what's happening with your 3D assets today."

### Metric cards row (`page.tsx:160`)
`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` — the 4 cards above.

### Two-column body (`page.tsx:183`)
`grid grid-cols-1 lg:grid-cols-3 gap-8`:
- **Left (lg:col-span-2):**
  - **Interaction Trends** card (`:186`) — the 12-month bar chart. 12 flex bars (`bg-[#EFEDEA]`, hover `bg-[#1A1A1A]`) with height `${(count / maxCount) * 100}%` capped at `calc(100% - 24px)`. Hover shows a dark tooltip `${count.toLocaleString()} Views`. Three dashed gridlines (top, middle, bottom — bottom is solid `#1A1A1A`). Month labels row underneath in mono micro caps.
  - **Recent Tasks** card (`:215`) — `CardHeader` with title + "View All" `LinkButton` → `/tasks`. Body is a divided list of `recentProjects = projects.slice(0, 3)`. Each row: a placeholder thumbnail square + name + `formatDistanceToNow(createdAt, { addSuffix: true })` + status `Badge` from `PROJECT_STATUS_META`. Empty state: "No recent tasks. Get started by deploying a new model!"
- **Right (lg:col-span-1):**
  - **Deploy New Model** card (`:250`, `Card variant="inverted"`) — dark inverted card, emerald `Box` icon, "Deploy New Model" serif italic heading, copy, and a "Start Generation" `LinkButton` → `/tasks`.
  - **Quick Links** card (`:264`) — "SDK Documentation" → `/integrations`, "Full Analytics Report" → `/analytics` (both `LinkButton variant="secondary" size="sm"`).

---

## Loading & error states

### `DashboardSkeleton` (`src/app/dashboard/DashboardSkeleton.tsx:1`)
Shown while `DashboardContent` resolves. Uses `Skeleton` (`src/components/ui/Skeleton.tsx:1`, `animate-pulse` muted block) placeholders mirroring the metric cards + chart + lists. Rendered by `<Suspense fallback>` at `page.tsx:19`.

### `DashboardError` (`src/app/dashboard/DashboardError.tsx:1`)
Rendered when `fetchDashboardData()` returns `{ error: true }` (`page.tsx:42`). Uses `EmptyState` (`src/components/ui/EmptyState.tsx:1`, `role="status"`) with an icon, title, description, and an action slot. Provides a recovery path (typically a retry/refresh link) so an auth or DB failure doesn't leave a blank page.

---

## Dependencies

| Import | Source | Used for |
|---|---|---|
| `DashboardLayout` | `@/components/dashboard/DashboardLayout` | shell (sidebar, header, NotificationBell, logout) |
| `getUserProjects` | `@/app/actions/project` | project list (calls `requirePrincipal` + Prisma) |
| `prisma` | `@/lib/prisma` | direct `analyticsEvent.findMany` for metrics + chart |
| `formatCount` | `@/lib/utils` | compact number formatting |
| `formatDistanceToNow` | `date-fns` | relative time on recent tasks |
| `Card`/`CardHeader`/`CardBody` | `@/components/ui/Card` | metric + section cards |
| `Badge` | `@/components/ui/Badge` | status badge on recent tasks |
| `LinkButton` | `@/components/ui/LinkButton` | "View All", "Start Generation", Quick Links |
| `PROJECT_STATUS_META` | `@/lib/status` | label + tone + icon for the status badge |
| `DashboardSkeleton` / `DashboardError` | local (`./DashboardSkeleton`, `./DashboardError`) | Suspense + error fallbacks |
| `lucide-react` icons | `ArrowUpRight`, `ArrowDownRight`, `Activity`, `Box`, `Eye`, `Smartphone` | metric icons + trend arrows |

---

## Notes & gaps

- **No period-over-period on this page** — the 4 metric cards show `change: "--"`. Real deltas live on `/analytics` (`?range=7D|30D|ALL`, current-vs-previous). If you add deltas here, reuse `formatChange` from `src/lib/utils.ts` and the analytics page's period math.
- **Admin sees only their own projects here** — `getUserProjects` filters by `brandId = principal.userId`. ADMIN users do **not** see global data on `/dashboard` (only on `/analytics` + `/tasks`). This is by design; an "admin overview" is a future consideration.
- **`projects[0]?.brand.id` assumption** — the code uses the first project's `brand.id` as the `brandId` filter for analytics. Safe because every project's `brandId` is the caller's own id (enforced by `createProject`). If multi-brand accounts ever exist, this breaks.
- **In-memory event filtering** — `totalViews`/`arLaunches`/`totalInteractions` are computed with JS `.filter()` over all the user's events, not via DB `groupBy`. Fine at MVP scale; refactor to `prisma.analyticsEvent.groupBy({ by: ['eventType'] })` if event volume grows.
- **Redundant `auth()` call** — see `auth-stabilization.md` Task 10. Passing the resolved principal from the parent into `getUserProjects` would eliminate the duplicate.

---

## File & line index

| Element | Location |
|---|---|
| Server entry | `src/app/dashboard/page.tsx:1` |
| `DashboardPage` | `page.tsx:16` |
| `requirePrincipalOrRedirect` call | `page.tsx:41` |
| `fetchDashboardData` | `page.tsx:31` |
| `DashboardContent` | `page.tsx:40` |
| Metric totals query | `page.tsx:57` |
| Metric formulas | `page.tsx:66`–`67` |
| `METRICS` array | `page.tsx:69` |
| 12-month series query | `page.tsx:118` |
| Metric cards grid | `page.tsx:160` |
| Interaction Trends chart | `page.tsx:186` |
| Recent Tasks card | `page.tsx:215` |
| Deploy New Model card | `page.tsx:250` |
| Quick Links card | `page.tsx:264` |
| `DashboardSkeleton` | `src/app/dashboard/DashboardSkeleton.tsx:1` |
| `DashboardError` | `src/app/dashboard/DashboardError.tsx:` |
| `getUserProjects` action | `src/app/actions/project.ts:82` |
| `formatCount` / `formatChange` | `src/lib/utils.ts:1` |
| `PROJECT_STATUS_META` | `src/lib/status.ts:1` |
| `DashboardLayout` | `src/components/dashboard/DashboardLayout.tsx:1` |
| `NotificationBell` (in shell) | `src/components/dashboard/NotificationBell.tsx:1` |
