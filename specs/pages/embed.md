# `/embed/[projectId]` — Public 3D Embed

> Parent: [`../WEBSITE.md`](../WEBSITE.md) §11

The public embed is the storefront-facing 3D viewer. Brands paste an `<iframe>` into Shopify, custom HTML, Wix, Squarespace, etc. The iframe loads a tiny static HTML file, fetches the project's GLB/USDZ from the SDK config endpoint, and posts analytics events back to STUDIO.V.

---

## Architecture overview

```
Brand storefront
  └─ <iframe src="{APP_URL}/embed/{projectId}">
       └─ GET /embed/[projectId]  →  route handler (HTML)
            ├─ reads public/embed-viewer.html
            ├─ replaces {PROJECT_ID} placeholder
            └─ returns text/html (no-store, see route handler)

       └─ <script> in the HTML:
            ├─ fetch GET /api/sdk/v1/config/{projectId}  →  assetUrls, sdkConfig
            ├─ creates <model-viewer> with GLB/USDZ
            ├─ POST /api/sdk/v1/events  (VIEW, INTERACTION, AR_LAUNCH)
            └─ lazy-loads model-viewer.min.js from ajax.googleapis.com
```

**No Next.js page render.** The embed never touches `app/layout.tsx`, never loads fonts, never hydrates `TopNav` or `ThemeProvider`. The whole embed is a route handler that streams a static HTML template + a vanilla JS module.

---

## Files

### `src/app/embed/[projectId]/route.ts`
- **File:** `src/app/embed/[projectId]/route.ts:1`
- **Method:** `GET`
- **Auth:** none (public). Middleware bypasses `/embed/*` (see [`../../proxy.ts`](../../proxy.ts)).
- **Behavior:**
  1. `params.projectId` (Next 16+ async params).
  2. `prisma.project.findFirst({ where: { id, status: PUBLISHED } })` — 404 otherwise.
  3. Verify the project has a `MODEL_GLB` asset — 404 otherwise.
  4. `readFile('public/embed-viewer.html')` from disk.
  5. Replace `{PROJECT_ID}` with the projectId.
  6. Return `text/html; charset=utf-8` with `Cache-Control: no-store`. The page is `no-store` so a brand sending PUBLISHED → REVISIONS sees the embed stop immediately on the next iframe load (a cached response could otherwise keep serving for up to 5 minutes).
- **No body parsing, no React, no layout chain.**
- `export const dynamic = "force-dynamic"` — every request re-validates against the DB so a brand sending PUBLISHED → REVISIONS stops the embed immediately.

### `public/embed-viewer.html`
- **File:** `public/embed-viewer.html:1` (single static template, no bundler)
- **Size:** ~10 KB (template). At request time the route handler replaces `{PROJECT_ID}`; the response is `~10 KB` and has no font preloads, no app shell, and zero layout chain.
- **Contents:**
  - `<style>` with STUDIO.V design tokens (`--bg #F9F8F6`, `--border #E5E2DD`, `--text-muted #7A7670`, `--text-primary #1A1A1A`, `--hover #EFEDEA`).
  - `<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js">` in `<head>` (matches landing page version).
  - **3D grid floor** (`.grid-floor`): pure-CSS perspective floor behind the model. Two `repeating-linear-gradient` layers (horizontal and vertical 60px grid lines, `rgba(26,26,26,0.08)` color) transformed with `perspective(800px) rotateX(62deg)`, masked at top/bottom with a 4-stop linear-gradient so the grid fades to nothing at the horizon and at the camera. `pointer-events: none` so it never intercepts drag. `aria-hidden="true"`. Lives inside `#frame` at `z-index: 0;` so `#frame`'s `overflow: hidden;` clips the grid to the rounded card; `border-radius: 16px;` matches the frame.
  - **Frame card** (`#frame`): the landing-style rounded container — `1px solid var(--border)`, `border-radius: 16px`, `overflow: hidden`, `position: absolute; inset: 0;`, `background: transparent;`. Houses the model-viewer, the grid, and the overlays.
  - **Stage** (`#stage`): the model-viewer mount point (`position: absolute; inset: 0; z-index: 1; background: transparent;`). The `<model-viewer>` is also set to `background-color="transparent"` (attribute + inline style) so its host element doesn't paint an opaque backing and the grid shows through wherever the model isn't drawn.
  - **Loader** (`.loader`): replicated from landing's `ThreeDConfigurator`. `RefreshCw` SVG (inline, 20×20, `animation: spin 1.2s linear infinite`) + monospace `LOADING 3D MODEL…` text (10px, `letter-spacing: 0.2em`, `text-transform: uppercase`). On `progress` events from model-viewer, text updates to `LOADING… NN%`.
  - **Error** (`.err`): red monospace error message (`#dc2626`, 12px, `font-family: ui-monospace`). Shown when SDK config returns 404/no GLB, or model-viewer fires `error`.
  - **Controls** (`.controls`): top-right vertical button stack (matches landing's `ThreeDConfigurator` exactly). Hidden until the model loads.
  - Inline `<script type="module">`:
    1. `projectId = "{PROJECT_ID}"` (replaced at request time).
    2. `sessionId = crypto.randomUUID()` (or fallback for old browsers).
    3. `fetch('/api/sdk/v1/config/' + projectId)` → `{ assetUrls, sdkConfig }`. **Only `assetUrls.glb` is read** — `sdkConfig` is intentionally **not consumed** (viewer config is hardcoded, see §"Hardcoded config" below). The `sdkConfig` field is kept in the SDK response for forward-compat and any third-party JS SDK consumers.
    4. On 404 / no GLB → `showError("This 3D model is not currently available.")`.
    5. On success → build `<model-viewer>` with the hardcoded attribute set (see §"Hardcoded config").
    6. `customElements.whenDefined("model-viewer").then(applyInitial)` to set `cameraOrbit`, `cameraTarget`, `interpolationDecay`, `autoRotate = true`, then `jumpCameraToGoal()` to snap to the initial framing without a fly-in animation.
    7. Wire up `btn-rotate` (toggles `mv.autoRotate` + `aria-pressed` + `data-spin` attribute) and `btn-reset` (re-applies `cameraOrbit` + `cameraTarget`).
    8. Wire up loader progress text via `progress` event.
    9. On `load` → hide loader, show controls.
    10. On `error` → show error message, hide controls.
    11. `send("VIEW")` immediately.
    12. First `camera-change` per session → `send("INTERACTION")` once.
- **No STUDIO.V badge.** The bottom-right pill from v1 was removed per user request.
- **No AR.** USDZ `ios-src`, `ar`, and `ar-modes` attributes are **not** set; matches landing's `ThreeDConfigurator`. The SDK config endpoint still returns `assetUrls.usdz` for any future re-add or third-party consumer.
- **`AR_LAUNCH` analytics are not emitted** (the AR button doesn't exist). Existing `AnalyticsEvent` rows of type `AR_LAUNCH` remain in the DB for historical continuity.

---

## Hardcoded config

Every embed uses the same viewer config. **Per-project `sdkConfig` is no longer read** — it is kept in the schema and SDK response for forward-compat and external consumers.

The values are lifted directly from `src/components/ThreeDConfigurator.tsx:42-47, 86-99` so the embed and the landing page render identically.

| Attribute | Value | Source |
|---|---|---|
| `src` | `cfg.assetUrls.glb` (only per-project field still read) | `ThreeDConfigurator.tsx:88` |
| `camera-controls` | ✓ | `ThreeDConfigurator.tsx:90` |
| `disable-pan` | ✓ | `ThreeDConfigurator.tsx:91` |
| `loading` | `"eager"` | `ThreeDConfigurator.tsx:92` |
| `reveal` | `"auto"` | `ThreeDConfigurator.tsx:93` |
| `shadow-intensity` | `"0.6"` | `ThreeDConfigurator.tsx:94` |
| `shadow-softness` | `"0.8"` | `ThreeDConfigurator.tsx:95` |
| `exposure` | `"1"` | `ThreeDConfigurator.tsx:96` |
| `tone-mapping` | `"aces"` | `ThreeDConfigurator.tsx:97` |
| `environment-image` | `"neutral"` | `ThreeDConfigurator.tsx:98` |
| `camera-orbit` (init) | `"0deg 75deg 105%"` | `ThreeDConfigurator.tsx:43, 74` |
| `cameraTarget` (init) | `"0m 0.4m 0m"` | `ThreeDConfigurator.tsx:44, 75` |
| `interpolationDecay` | `200` | `ThreeDConfigurator.tsx:45` |
| `auto-rotate` (default) | `true` | `ThreeDConfigurator.tsx:46` |
| `model-viewer` version | `4.2.0` from `ajax.googleapis.com` | matches `ThreeDConfigurator.tsx:81` |

After mount, `customElements.whenDefined("model-viewer").then(applyInitial)` sets `cameraOrbit`, `cameraTarget`, `interpolationDecay`, `autoRotate = true`, and calls `jumpCameraToGoal()` so the model appears in the landing-page framing with no fly-in animation.

**Dropped attributes** (compared to v1): `ar`, `ar-modes`, `ios-src` (AR support), `scale` (no per-model scaling override), `touch-action` (default is fine without pan).

**Hardcoded to `"transparent"`:** `background-color` on the `<model-viewer>` host (so the 3D grid floor shows through the canvas wherever the model isn't drawn — see §"3D grid floor" below for the full stacking details).

**Why hardcoded:** the user explicitly asked that "for all models I want to have fixed(same config), no need to fetch it everytime." The only per-project field still fetched is `assetUrls.glb` — everything else is identical across embeds.

---

## Controls

Top-right corner, vertical button stack (`.controls` in `public/embed-viewer.html`). Hidden until the model fires `load`. Two buttons, both circular 40×40, white background, `1px solid var(--border)`, soft shadow, `transition-colors 200ms`.

| Button | Icon | Behavior |
|---|---|---|
| `#btn-rotate` | `RotateCcw` SVG, spins via `animation: spin 8s linear infinite` when `aria-pressed="true"` (matches landing's `animationDuration: '8s'`) | Toggles `mv.autoRotate`. Active state: `background: var(--text-primary); color: #fff; border-color: var(--text-primary)`. Inactive state: white with muted icon. |
| `#btn-reset` | `Compass` SVG (lucide-style polygon inside circle) | Sets `mv.cameraOrbit = "0deg 75deg 105%"` and `mv.cameraTarget = "0m 0.4m 0m"` (identical to `ThreeDConfigurator.tsx:74-76`). |

Both buttons have `aria-label`, `:focus-visible` ring per `design.md:49` (`2px solid #1A1A1A`), and `cursor: pointer`. They are positioned `top: 16px; right: 16px; z-index: 20;` (over the model, but only after load — the loader uses `z-index: 10` so it never sits behind the controls).

---

## 3D grid floor

The visual backdrop is a pure-CSS perspective floor — no SVG, no extra DOM, no extra requests. The model sits on a faint receding grid that converges at the horizon.

**Construction** (`.grid-floor` in `public/embed-viewer.html`):

1. Two `repeating-linear-gradient` layers form a 60×60 px grid in `rgba(26,26,26,0.08)` on top of a vertical sky-to-ground gradient (`var(--bg)` → `#E5E2DD`).
2. The whole layer is `transform: perspective(800px) rotateX(62deg)`, `transform-origin: center 100%` — the grid tilts away from the camera like a floor.
3. A 4-stop `mask-image: linear-gradient(180deg, transparent 0%, #000 28%, #000 72%, transparent 100%)` fades the grid at the horizon (top) and the camera (bottom) so the floor blends smoothly into the off-white background.

**Stacking** (critical — the grid must render behind the model, not be covered by it):

- `.grid-floor` lives **inside `#frame`** at `position: absolute; inset: 0; z-index: 0; pointer-events: none;` with `border-radius: 16px;` so `#frame`'s `overflow: hidden;` clips the grid to the rounded card shape.
- `#frame` is `position: absolute; inset: 0; background: transparent;` — fully transparent so the grid shows through wherever the frame isn't covered by the stage.
- `#stage` (containing the `<model-viewer>`) is `position: absolute; inset: 0; z-index: 1; background: transparent;` — on top of the grid.
- `<model-viewer>` is set to `background-color="transparent"` (attribute) and `style.backgroundColor = "transparent"` (inline) to remove the web component's default opaque host background, so the grid shows through the canvas wherever the model isn't drawn.
- `.controls` is at `z-index: 20;` (above the stage) — the white pill buttons are unaffected.

**Properties:** `pointer-events: none;` (decorative, never intercepts drag). `aria-hidden="true"`. Tiled at 60 px per cell — tight enough to read at 500 px tall, loose enough not to compete with the model.

**Why pure CSS:** zero extra HTTP requests, zero extra payload (a few hundred bytes of inline CSS), perfect at any DPI, instantly tunable (change the `60px` step to adjust density). The alternative — SVG patterns or HDRI envmap — would either bloat payload or hide behind `environment-image="neutral"`.

**Tradeoff:** at extreme aspect ratios (e.g. an iframe that's 100 px wide × 1000 px tall) the floor may render as a thin band. The default `generateEmbedCode` snippet (`width: 100%; height: 500px; border-radius: 16px;`) renders correctly.

### `src/lib/embed-liveness.ts`
- **File:** `src/lib/embed-liveness.ts:1`
- Exports:
  - `EMBED_LIVENESS_THRESHOLDS = { AMBER_DAYS: 7, RED_DAYS: 30 } as const`
  - `getLivenessBadge(lastEventAt: Date | null): "ok" | "amber" | "red" | "never"`
  - `formatLastSeen(lastEventAt: Date | null): string` — uses `date-fns` `formatDistanceToNow` for recent, `format(MMM d, yyyy)` for old.

### `src/app/actions/analytics.ts`
- **File:** `src/app/actions/analytics.ts:1`
- **Export:** `getProjectLiveness(projectIds: string[]): Promise<Record<projectId, { lastEventAt: Date | null }>>`
- **Auth:** `requirePrincipal()`. Role-scoped: admin sees all, brand sees their own (`{ brandId: principal.userId }`).
- **Query:** one `prisma.analyticsEvent.groupBy({ by: ['projectId'], where: { projectId: { in } }, _max: { createdAt: true } })` — single round-trip.

---

## SDK endpoints (unchanged from prior spec)

### `GET /api/sdk/v1/config/[projectId]`
- **File:** `src/app/api/sdk/v1/config/[projectId]/route.ts:1`
- **Auth:** public.
- **Cache:** `public, s-maxage=60, stale-while-revalidate=86400, Vary: Accept-Encoding` — 60s edge cache (was 3600s). Re-uploads visible within ~60s without manual cache busting.
- **Response:** `{ assetUrls: { glb, usdz }, sdkConfig }`. 404 for missing/non-PUBLISHED/no-GLB.

### `POST /api/sdk/v1/events`
- **File:** `src/app/api/sdk/v1/events/route.ts:1`
- **Auth:** public, CORS `*` (set in `next.config.mjs:26`).
- **Body:** `{ eventType: "VIEW"|"INTERACTION"|"AR_LAUNCH", sessionId, projectId }`.
- **Behavior:** 1 round-trip INSERT. 404 if project not PUBLISHED.

---

## Resilience headers (`next.config.mjs`)

```js
{
  source: "/embed/:path*",
  headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "xr-spatial-tracking=(self), accelerometer=(self), gyroscope=(self)" },
  ]
}
```

Explicitly **no** `X-Frame-Options` — the embed is meant to be framed by external origins. The Permissions-Policy allows the model-viewer's AR sensors only for the embed's own origin (`(self)`).

---

## Liveness signal on `/analytics`

The brand's analytics leaderboard (top 5 by VIEW count) shows a new "Last Seen" column:

| Last `VIEW` event | Badge | Label |
|---|---|---|
| < 7 days ago | none (green) | "X minutes ago" / "X days ago" |
| 7–30 days ago | amber | "May not be live" |
| > 30 days ago | red | "Embed may be broken" |
| Never | red | "Embed may be broken" |

The query is a single `groupBy` with `_max(createdAt)`, joined with the existing leaderboard by `projectId`. Admin sees all brands' embeds; brands see their own.

**Future improvement:** a real heartbeat (separate `HEARTBEAT` event) could power finer-grained liveness. The current `VIEW`-based signal is the cheap version per Phase 5 of the plan.

---

## Embed code generator

`src/lib/utils.ts` `generateEmbedCode(projectId)` is **unchanged**. It produces:

```html
<iframe
  src="{APP_URL}/embed/{projectId}"
  style="width: 100%; height: 500px; border: none; border-radius: 16px;"
  allow="accelerometer; autoplay; encrypted-media; gyroscope; xr-spatial-tracking"
  allowfullscreen
></iframe>
```

The URL is preserved — brands don't see any change in the snippet they copy from `/integrations`. The server-side response is HTML instead of a React page, but the iframe shape is identical.

---

## File & line index

| Element | File:line |
|---|---|
| Route handler | `src/app/embed/[projectId]/route.ts:1` |
| Static HTML template | `public/embed-viewer.html:1` |
| Hardcoded viewer config | `public/embed-viewer.html` (cameraOrbit/cameraTarget/autoRotate block in inline `<script>`) |
| Top-right controls (rotate + reset) | `public/embed-viewer.html` (`.controls` + `#btn-rotate` / `#btn-reset`) |
| 3D grid floor (CSS) | `public/embed-viewer.html` (`.grid-floor` block in `<style>`) |
| Loader + error UI (landing-replica) | `public/embed-viewer.html` (`.loader` + `.err` blocks) |
| Liveness thresholds | `src/lib/embed-liveness.ts:1` |
| Liveness server action | `src/app/actions/analytics.ts:1` |
| Analytics page (liveness column) | `src/app/analytics/page.tsx:131` (fetch) / `:184-189` (leaderboard) / `:308` (header) / `:341-353` (cell) |
| SDK config endpoint | `src/app/api/sdk/v1/config/[projectId]/route.ts:1` |
| SDK events endpoint | `src/app/api/sdk/v1/events/route.ts:1` |
| Resilience headers | `next.config.mjs:36-43` |
| Embed code generator | `src/lib/utils.ts:18` |
| Integrations page (where brands copy the snippet) | `src/app/integrations/page.tsx:1` |
| Public bypass in middleware | `src/proxy.ts:41` |
| Landing page 3D viewer (config source of truth) | `src/components/ThreeDConfigurator.tsx:1` |

---

## Why this design (and what we rejected)

**Rejected: route group with multiple root layouts.** Next.js lets you split `app/layout.tsx` into per-subtree roots, but only by moving all 16 pages under a route group. High risk, high churn, and Next.js still emits font preloads if any subtree layout references font CSS vars.

**Rejected: headers-based branching in `app/layout.tsx`.** `localFont({ preload: true })` is statically analyzed at build time. Setting `x-studio-v-embed: 1` and branching in the layout did not stop the font preloads — the embed's `next-font-manifest.json` still listed all 11 woff2 files.

**Chosen: route handler + static HTML.** No layout chain, no React, no font preload, no hydration. The embed never imports anything from the Next.js app except the two SDK endpoints (which were already CORS-`*` and public). One file move (the old `page.tsx` → `route.ts`) and one new `public/embed-viewer.html`.

**Future: subdomain (e.g. `embed.studiov.app`).** Punt to a later phase. The current solution gets the user "fast and lightweight" without DNS/deploy work.
