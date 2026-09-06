# `/dashboard` — Overview

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md) · Source: `src/app/dashboard/page.tsx`

The dashboard is the authenticated landing page: four metric cards, a 12-month interaction-trends bar chart, a recent-tasks list, and quick-link cards. All metrics are computed server-side from the `analytics_events` table, scoped to the signed-in user's projects.

---

## Route & auth

| | |
|---|---|
| **Route** | `/dashboard` — server component, proxy-gated `["BRAND","ADMIN"]` + onboarded |
| **Shell** | `DashboardLayout` with `title="Overview"` (sidebar ≥768px, sticky header, `NotificationBell`, mobile drawer) |
| **Loading** | `<DashboardSkeleton />` via `<Suspense>` around the async `DashboardContent`; segment `loading.tsx` covers RSC navigation |
| **Error** | `<DashboardError />` (EmptyState with recovery action) — DB failures only; auth failures redirect via `requirePrincipalOrRedirect()` |

`DashboardContent` is an async server component inside `<Suspense>` so metric computation streams without blocking the shell. It opens with `requirePrincipalOrRedirect()`, then `fetchDashboardData()` (wraps `getUserProjects()`; non-auth errors are swallowed → `DashboardError`).

**No duplicate auth cost:** `requirePrincipal` is wrapped in React `cache()` (`getSessionPrincipalData` in `src/server/auth-guards.ts`), so the page-level guard and `getUserProjects`' internal call share one session lookup + users-row fetch per request.

---

## Data acquisition

- `projectIds = projects.map(p => p.id)`; empty → zeros shown, queries skipped.
- Events are filtered by **`equal("brandId", principal.userId)`** (the caller's own id) **AND** `equal("projectId", projectIds)`.
- **Totals:** one `listAllRows(analytics_events, …)` query; `totalViews` / `arLaunches` / `totalInteractions` computed with JS `.filter()` — no DB aggregation. Fine at MVP scale; refactor to DB-level aggregation if event volume grows.
- **12-month series:** second `listAllRows` query (`eventType: VIEW`, `$createdAt >= 11 months back, day 1`), bucketed in JS into `Map<"YYYY-MM", count>`. `$createdAt` range comparisons use **ISO strings** (TablesDB convention).

**`AR_LAUNCH` source:** events come from the public storefront embed (`/embed/[projectId]`) on the first AR session-start per page view — not from brand/admin users viewing models inside `/tasks` (those emit nothing). When AR is unsupported on the viewer's device, no event fires. See `../pages/embed.md` §"AR button".

---

## Computed metrics

| Card | Label | Formula | Icon |
|---|---|---|---|
| 1 | Total Model Views | `formatCount(totalViews)` | `Eye` |
| 2 | AR Launches | `formatCount(arLaunches)` | `Smartphone` |
| 3 | Interaction Rate | `round(totalInteractions / totalViews * 100)%` (or `--` if no views) | `Activity` |
| 4 | Est. Conversion Lift | `+(totalInteractions / totalViews * 100).toFixed(1)%` (or `--`) | `Box` |

All four cards report `change: "--"` — period-over-period deltas are **not implemented here**; they live on `/analytics` (`?range=7D|30D|ALL`). The metric card component hides the trend chip entirely when `change === "--"`, so these cards render no chip. If adding deltas, reuse `formatChange` (`src/lib/utils.ts`) and the analytics page's period math; chips render only for real `up`/`down` values.

---

## Layout grid

`space-y-8` wrapper; header "Welcome back." + subcopy.

- **Metric cards row** — `grid md:grid-cols-2 lg:grid-cols-4`; each card is a white borderless `24px` surface: circular icon chip on a tinted well (accent-pale / surface-sky / surface-butter / accent), optional trend chip (hidden when `--`, see above), `label-mono` label, display value.
- **Two-column body** (`lg:grid-cols-3`):
  - Left (×2): **Interaction Trends** card — 12 flex bars (heights `% of maxCount`, capped `calc(100% - 24px)`) with hover tooltips and dashed gridlines; **Recent Tasks** card — `projects.slice(0, 3)` with relative dates (`formatDistanceToNow`) + status badges + "View All" → `/tasks`.
  - Right: **Deploy New Model** card (inverted `--ink` card, "Start Generation" → `/tasks`); **Quick Links** card (→ `/integrations`, `/analytics`).

---

## Loading & error states

- `DashboardSkeleton` — `Skeleton` placeholders mirroring the cards + chart + lists (rendered by the Suspense fallback).
- `DashboardError` — `EmptyState`-based recovery card, shown when `fetchDashboardData()` returns `{ error: true }` so a transient DB failure never crashes the page.

---

## Notes & gaps

- **Admin sees only their own projects here** — `getUserProjects` filters by `brandId = principal.userId`. ADMIN users do **not** see global data on `/dashboard` (only on `/analytics` + `/admin/*`). By design.
- **`brandId` filter uses `principal.userId`** — safe because every project's `brandId` is the caller's own id (enforced by `createProject`). If multi-brand accounts ever exist, this breaks.
- **In-memory event filtering** — see Data acquisition; the noted refactor path is DB-level aggregation.
