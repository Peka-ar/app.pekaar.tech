# `/embed/[projectId]` — Public 3D Embed

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md) §11

The public embed is the storefront-facing 3D viewer. Brands paste an `<iframe>` into Shopify, custom HTML, Wix, etc. The iframe loads a small static HTML file, fetches the project's GLB/USDZ from the SDK config endpoint, and posts analytics events back.

---

## Architecture overview

```
Brand storefront
  └─ <iframe src="{APP_URL}/embed/{projectId}">
       └─ GET /embed/[projectId]  →  route handler (HTML)
            ├─ reads public/embed-viewer.html
            ├─ replaces {PROJECT_ID} placeholder
            └─ returns text/html (no-store)

       └─ <script> in the HTML:
            ├─ fetch GET /api/sdk/v1/config/{projectId}  →  assetUrls
            ├─ creates <model-viewer> with GLB/USDZ
            ├─ POST /api/sdk/v1/events  (VIEW, INTERACTION, AR_LAUNCH)
            └─ lazy-loads model-viewer.min.js from ajax.googleapis.com
```

**No Next.js page render.** The embed never touches `app/layout.tsx`, never loads fonts, never hydrates `TopNav` or any React provider. The whole embed is a route handler that streams a static HTML template + vanilla JS.

---

## Route handler (`src/app/embed/[projectId]/route.ts`)

GET, public. Flow: async `params.projectId` → `getRowSafe(projects)` with **PUBLISHED guard** → verify a `MODEL_GLB` asset row exists (else 404) → read `public/embed-viewer.html` from disk → replace `{PROJECT_ID}` → return `text/html; charset=utf-8`.

- **`Cache-Control: no-store` + `export const dynamic = "force-dynamic"`** — every request re-validates against the DB so a brand sending PUBLISHED → REVISIONS sees the embed stop immediately (a cached response could keep serving a revoked model).
- No body parsing, no React, no layout chain.

## Static template (`public/embed-viewer.html`)

~12 KB, single file, no bundler. Contains: local tokens (`--bg`, `--border`, `--text-muted`, `--text-primary`, `--hover`, `--btn-bg`, `--grid-end`, `--grid-line`, `--ctl-active-bg/fg`, `--ar-bg/fg/…` — an intentional studio-backdrop exception to the app palette), a light-first `[data-theme="dark"]` override block + early-paint script, the model-viewer module script in `<head>` (4.2.0, matches the landing page), frame card + stage, loader (spinning `RefreshCw` + `LOADING… NN%` on `progress`), error line, top-right controls, inline module script.

Inline script outline: `projectId` → `sessionId = crypto.randomUUID()` → theme button sync/toggle (below) → fetch config → on 404/no GLB show "This 3D model is not currently available." → build `<model-viewer>` with the hardcoded attribute set (+ `ios-src` when USDZ present) → `customElements.whenDefined(...)` applies initial camera + `jumpCameraToGoal()` (no fly-in) → wire rotate/reset buttons + loader progress → on `load` reveal controls (+ AR button if `canActivateAR`) → send events: `VIEW` immediately, `INTERACTION` on first `camera-change`, `AR_LAUNCH` on first `ar-status: session-started`/`object-placed` (each once per page view).

**No provider badge** (removed per user request).

---

## Hardcoded config

Every embed uses the **same viewer config** — per-project `sdkConfig` is not read (kept in the schema/SDK response for forward-compat and third-party consumers). Values are lifted directly from `src/components/ThreeDConfigurator.tsx` so the embed and the landing page render identically. **User decision: fixed config, no per-model fetch** — the only per-project field is `assetUrls.glb`.

| Attribute | Value |
|---|---|
| `camera-controls` / `disable-pan` | ✓ |
| `ar` / `ar-modes` | ✓ / `"webxr scene-viewer quick-look"` |
| `ar-scale` | `"fixed"` (locks 1:1 physical scale) |
| `loading` / `reveal` | `"eager"` / `"auto"` |
| `shadow-intensity` / `shadow-softness` | `"0.6"` / `"0.8"` |
| `exposure` / `tone-mapping` / `environment-image` | `"1"` / `"aces"` / `"neutral"` |
| `camera-orbit` / `cameraTarget` (init) | `"0deg 75deg 105%"` / `"0m 0.4m 0m"` |
| `interpolationDecay` / `auto-rotate` (default) | `200` / `true` |
| `ios-src` | `assetUrls.usdz` when present, else omitted (Quick Look auto-generates USDZ from GLB) |

`background-color` is hardcoded to `"transparent"` so the grid floor shows through the canvas (see below). If you change viewer config, change it in **both** `ThreeDConfigurator.tsx` and `embed-viewer.html` — they must stay identical.

---

## Controls + AR button

**Top-right control stack** (hidden until `load`): theme toggle (`#btn-theme` — first in the stack; moon/sun SVG swap via `aria-pressed` + `data-theme`), rotate toggle (`#btn-rotate` — spins its icon while `aria-pressed="true"`, matches landing's 8s rotation) and camera reset (`#btn-reset` — re-applies the initial orbit/target). All circular 40×40 (`--btn-bg`, hairline border, focus rings).

**Theme toggle fires no analytics event** — only `camera-change` maps to `INTERACTION`; the toggle is pure chrome.

**AR button** — slotted via `slot="ar-button"` (replaces model-viewer's built-in pill): "View in your space" pill, bottom-right, ink background (`--ar-bg`). **Capability-gated:** starts `hidden`, revealed on `load` only if `mv.canActivateAR` is truthy — on desktop (and any device without a usable AR mode) the button never appears, no dead click target.

**Mode resolution** (driven by the element's AR attributes, not JS):
1. Android Chrome → in-browser WebXR session.
2. Other Android browsers → Scene Viewer app via the `intent://` URL model-viewer constructs.
3. iOS Safari → AR Quick Look; uses `ios-src` (uploaded USDZ) when the config provides one, else model-viewer generates a USDZ from the GLB in-browser (button stays available; only fidelity + iOS load time differ).
4. Desktop → hidden.

`AR_LAUNCH` fires once per page view (guarded boolean) — the AR-launch charts on `/analytics` + `/dashboard` are powered by these events.

---

## Dark / light theme

Light is the **default**; dark is opt-in. Preference lives in `localStorage["peka-embed-theme"]` (`"dark"` | `"light"`).

- **Pre-paint apply:** a tiny inline `<script>` in `<head>` (before any paint) sets `data-theme="dark"` on `<html>` when the stored value is `"dark"` — no light-flash on reload. Wrapped in try/catch (storage can throw in sandboxed iframes).
- **Toggle:** `#btn-theme` in the control stack flips `data-theme`, persists the choice, and syncs `aria-pressed`. The dark block only overrides token values (`:root` defaults stay light) plus `color-scheme`.
- **Origin-shared:** the key is per-origin, so the choice carries across **every embed on the same site** (expected — one storefront, one preference).
- **Gotcha — `--text-primary` inversion trap:** control chips and the AR button historically used `var(--text-primary)` as their *background*. Since `--text-primary` flips dark↔light between themes, that inverts the chip wrongly in dark mode. They now use dedicated tokens (`--ctl-active-bg/fg`, `--ar-bg/fg/…`) so background and foreground move together. Same reasoning for `--btn-bg` (was hardcoded `#fff`) and the grid floor's `--grid-end` / `--grid-line` (were hardcoded hex/rgba). New themed surfaces must derive from these tokens, not raw colors.

---

## 3D grid floor

Pure-CSS perspective floor behind the model — no SVG, no extra requests. Two `repeating-linear-gradient` layers (60px grid) on a sky-to-ground gradient (`var(--grid-end)` → horizon, `var(--grid-line)` for the lines so it themes with dark mode), `perspective(800px) rotateX(62deg)`, masked 4-stop at horizon + camera. `pointer-events: none`, `aria-hidden="true"`.

**Stacking (critical — the grid must render behind the model):** `.grid-floor` inside `#frame` at `z-index: 0` (clipped by the frame's `overflow: hidden` + matching border-radius); `#stage` (model-viewer) at `z-index: 1`; the `<model-viewer>` host gets `background-color: transparent` (attribute **and** inline style — the web component paints an opaque host background by default, which would hide the grid); `.controls` at `z-index: 20`.

At extreme aspect ratios the floor may render as a thin band; the default embed snippet (`height: 500px`) renders correctly.

---

## SDK endpoints

### `GET /api/sdk/v1/config/[projectId]`
Public, `Cache-Control: public, s-maxage=60, stale-while-revalidate=86400` (re-uploads visible within ~60s). PUBLISHED-only (404 for missing/non-public — prevents enumeration). Returns `{ assetUrls: { glb, usdz }, sdkConfig }`; URLs derived on-the-fly by `resolveAssetUrl` (`buildFileUrl(bucketForAssetType(type), fileId)` for appwrite rows — always includes the required `?project=` param — falling back to the stored `url` for legacy/external rows).

### `POST /api/sdk/v1/events`
Public, CORS `*` (`next.config.mjs`). Body `{ eventType: VIEW|INTERACTION|AR_LAUNCH, sessionId, projectId }` → `analytics_events` row with the project's `brandId`. 404 if not PUBLISHED. Rate-limited 60/min/IP.

---

## Resilience headers (`next.config.mjs`)

`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: xr-spatial-tracking=(self), accelerometer=(self), gyroscope=(self)` on `/embed/*`. **Explicitly no `X-Frame-Options`** — the embed is meant to be cross-origin framed.

---

## Embed liveness (`/analytics`)

`getProjectLiveness(projectIds)` (`src/app/actions/analytics.ts`) — per project, latest `analytics_events.$createdAt` (role-scoped: admin sees all, brand their own). Thresholds in `src/lib/embed-liveness.ts`: `< 7d` ok "Live" · `7–30d` amber "No events in 7+ days" · `> 30d` red "No events in 30+ days" · never red "No events yet". The leaderboard "Last Seen" column on `/analytics` renders these badges.

Future improvement: a real `HEARTBEAT` event could power finer-grained liveness than the VIEW-based signal.

---

## Embed code generator

`generateEmbedCode(projectId)` in `src/lib/utils.ts` — produces the iframe snippet shown on `/integrations`:

```html
<iframe
  src="{APP_URL}/embed/{projectId}"
  style="width: 100%; height: 500px; border: none; border-radius: 16px;"
  allow="accelerometer; autoplay; encrypted-media; gyroscope; xr-spatial-tracking"
  allowfullscreen
></iframe>
```

---

## Why this design (and what we rejected)

- **Rejected: route group with multiple root layouts** — would require moving all pages under a route group; high churn, and Next still emits font preloads if any subtree layout references font CSS vars.
- **Rejected: headers-based branching in `app/layout.tsx`** — `localFont({ preload: true })` is statically analyzed at build time; a runtime header branch did not stop the font preloads.
- **Chosen: route handler + static HTML** — no layout chain, no React, no font preloads, no hydration. The embed imports nothing from the Next app except the two public SDK endpoints.

**Gotchas:** the route handler reads `public/embed-viewer.html` from disk at request time — **if a deploy breaks that template, every third-party embed breaks simultaneously**. When customers report "the embed is broken", check `public/embed-viewer.html` in the deployed commit first.
