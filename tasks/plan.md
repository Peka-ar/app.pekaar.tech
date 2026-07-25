# Implementation Plan: Fast, Lightweight, Resilient Public Embed

## Overview

The current public embed (`/embed/[projectId]`) renders inside the app's root layout, which loads 6+ local-font woff2 files, mounts a client-side `TopNav` (which then hides itself post-hydration), and pulls in the full `globals.css` design-token system it doesn't use. On top of that, the `EmbedViewer` reaches back to the app for `model-viewer.min.js` and posts events to `/api/sdk/v1/events` on the same origin. When a brand pastes the iframe on a slow mobile connection, the embed is visibly heavier than it needs to be.

This plan ships four changes, all on the same domain (no `embed.` subdomain for v1):

1. **Make `/embed/[projectId]` light** — give it its own root layout that doesn't load fonts, mount the TopNav, or initialize `next-themes`. Same-domain, zero new infra.
2. **Make GLB re-uploads visible fast** — drop the SDK config cache from `s-maxage=3600` to `s-maxage=60` so the new model shows up on the next iframe refresh (~60s worst case) without manual cache busting. The GLB file itself stays CDN-cached by UploadThing.
3. **Wire embed liveness into `/analytics`** — every `EmbedViewer` already POSTs a `VIEW` event. Use the latest `VIEW.createdAt` per project as a "last seen" signal. If no event for N days, surface a "your embed may not be live" warning on the brand's analytics page.
4. **Embed resilience headers** — add a small set of `next.config.mjs` response headers to the `/embed/*` path (no `X-Frame-Options` since embeds are framed cross-origin, plus `Referrer-Policy`, `Permissions-Policy` for AR, and `X-Content-Type-Options`).

The existing analytics flow (`VIEW` / `INTERACTION` / `AR_LAUNCH` → `AnalyticsEvent` → `/analytics` page) is unchanged. The existing `generateEmbedCode` iframe snippet is unchanged. No new public endpoints, no new JS SDK.

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Same domain, dedicated layout for embed (no `embed.` subdomain) | User chose "ship fast" over the cleaner separation. We get 80% of the perf win by stripping layout, no DNS/deploy work. |
| Route group `src/app/embed/(public)/layout.tsx` overrides the root layout if Next.js 16 won't auto-detect the embed's own root layout | Next.js App Router lets nested layouts opt out of the root. Putting `/embed` inside `(public)` lets it use a slim root layout while everything else keeps fonts/TopNav. The `proxy.ts` matcher already covers `/embed/*` — only the public bypass in line 41 needs to remain, no other change. |
| Drop SDK config `s-maxage` from 3600 to 60 | Brand-priority: re-uploads visible within ~60s. Cached for a year via `stale-while-revalidate`, so 99% of the time it's still a CDN hit. The GLB file URL inside the config is what changes; the small JSON config is the cheap thing to revalidate. |
| Liveness via existing `VIEW` events, not a heartbeat | Zero new code paths. Brands see "last seen X days ago" derived from `analyticsEvent.max(createdAt)`. If they want a heartbeat later, the same column powers it. |
| `<model-viewer>` script loads from `ajax.googleapis.com` (current) — keep it | Already whitelisted in the root layout `<head>` preconnect. Keeps a single source of truth. No CSP risk since we don't enable CSP. |
| No CSP for the embed | Adds complexity; a brand's host site already has its own CSP. Our iframe is isolated. Defer until we see real issues. |
| No new metrics, no new endpoints, no new env vars | The plan is to ship the perf fix without expanding surface area. |

## Task List

### Phase 1: Embed layout separation

- [ ] **Task 1.1**: Create `src/app/embed/layout.tsx` (a Next.js root-layout replacement for the embed subtree). It must:
  - Be its own root layout (export `metadata` like the current page does — just `STUDIO.V 3D Viewer` title, no description).
  - Render `<html lang="en"><body className="m-0 p-0 h-full">{children}</body></html>`.
  - Import **only** the model-viewer script tag (move the `<Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js" />` here).
  - Not import `globals.css`, `localFont`, `ThemeProvider`, or `TopNav`.
- [ ] **Task 1.2**: If Next.js 16 still applies the app-root layout to `/embed/*` (because the embed's own layout is detected as a non-root), restructure as a route group: move to `src/app/embed/(public)/layout.tsx` + `src/app/embed/(public)/[projectId]/page.tsx` and document in the file index.
- [ ] **Task 1.3**: `npm run build` — must succeed. The build output for the embed route should show fewer chunks than the rest of the app.

### Phase 2: Embed page hardening

- [ ] **Task 2.1**: Edit `src/app/embed/[projectId]/page.tsx`:
  - Remove the `<Script>` import (now in the layout).
  - Add `export const dynamic = "force-dynamic"` to prevent static caching of the page itself (the per-request DB lookup is fine and we want fresh PROJECT status).
  - Set the page background via inline `style` on the `<main>` (already there).
  - Add `aria-label` on the "STUDIO.V" badge link to clarify it's an external link.
- [ ] **Task 2.2**: Add `export const revalidate = 0` (or use `noStore()` from `next/cache`) to make sure the DB read is always live — a brand sending a PUBLISHED project back to REVISIONS should stop the embed immediately on the next request.
- [ ] **Task 2.3**: Confirm `EmbedViewer` is unchanged (the layout-level script tag now serves `model-viewer.min.js`).

### Phase 3: Faster config cache

- [ ] **Task 3.1**: Edit `src/app/api/sdk/v1/config/[projectId]/route.ts:35`: change `s-maxage=3600` to `s-maxage=60`. Keep `stale-while-revalidate=86400` so the CDN can serve stale while revalidating.
- [ ] **Task 3.2**: Add `Vary: Accept-Encoding` to the response headers (defensive — Vercel/CDN usually adds it, but explicit is better for embed partners diagnosing caching issues).

### Phase 4: Embed resilience headers

- [ ] **Task 4.1**: Edit `next.config.mjs` — add a new `headers()` entry for `/embed/:path*`:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: xr-spatial-tracking=(self), accelerometer=(self), gyroscope=(self)`
  - Explicitly **no** `X-Frame-Options` (the embed is meant to be framed by external origins).
- [ ] **Task 4.2**: Verify the iframe still loads on a sandboxed cross-origin test page (we can't easily test this in dev, but the headers should be visible in the network tab once deployed).

### Phase 5: Embed liveness on `/analytics`

- [ ] **Task 5.1**: Add a new server-action function `getProjectLiveness(projectIds: string[])` in a new `src/app/actions/analytics.ts`:
  - Input: list of `projectId`s.
  - Returns: `Record<projectId, { lastEventAt: Date | null }>`.
  - Query: `prisma.analyticsEvent.groupBy({ by: ['projectId'], where: { projectId: { in } }, _max: { createdAt: true } })`. One round-trip.
  - Returns `lastEventAt: null` for projects that have never been seen.
- [ ] **Task 5.2**: In `src/app/analytics/page.tsx`, compute `lastEventAt` for each project in the leaderboard.
- [ ] **Task 5.3**: In the leaderboard table, add a "Last Seen" column: format as `formatDistanceToNow(lastEventAt)` if within 30 days, else `format(lastEventAt, "MMM d, yyyy")`. If `lastEventAt` is null OR > 7 days old for a PUBLISHED project, show a small amber "May not be live" badge. If > 30 days, show a red "Embed may be broken" badge. Otherwise no badge.
- [ ] **Task 5.4**: The liveness query must be `role-scoped` — admin sees all, brand sees their own.

### Phase 6: Spec updates

- [ ] **Task 6.1**: `specs/WEBSITE.md`:
  - §3 (Folder layout): add `src/app/embed/layout.tsx`.
  - §4 (Route map): annotate `/embed/[projectId]` with the slim-layout note.
  - §5 (API routes): update `GET /api/sdk/v1/config` cache header.
  - §11 (Public embed SDK): new sub-section on embed liveness, resilience headers, and config cache TTL.
- [ ] **Task 6.2**: New spec file `specs/pages/embed.md` (deep dive, like the other page deep-dives):
  - Layout structure, route group or dedicated layout, headers, cache strategy.
  - Liveness signal: which query, what thresholds, how it's surfaced.
  - File & line index for every file touched.
- [ ] **Task 6.3**: `specs/WEBSITE.md §14`: add a row for `pages/embed.md` in the deep-dive list.

### Phase 7: Verification

- [ ] **Task 7.1**: `npx tsc --noEmit` — clean.
- [ ] **Task 7.2**: `npm run lint` — clean.
- [ ] **Task 7.3**: `npm run build` — succeeds; the embed route appears in the build output with a smaller client bundle than `/dashboard`.
- [ ] **Task 7.4**: Manual smoke (Chrome DevTools):
  - Open `https://localhost:3000/embed/<published-id>` in a fresh tab → verify the network panel shows **no font woff2 requests**, no `TopNav` component in the DOM, no `globals.css` stylesheet.
  - Compare request count + bytes to a pre-change baseline.
  - Reload 3 times → confirm `model-viewer.min.js` is served from cache after first load.
- [ ] **Task 7.5**: Manual re-upload test:
  - As admin, re-upload a GLB on a PUBLISHED project.
  - Reload the embed in another tab → within ~60s, the new model appears.
- [ ] **Task 7.6**: Manual liveness test:
  - Open `/analytics` as a brand with a PUBLISHED project that's been VIEWed today → "Last Seen" shows "X minutes ago", no badge.
  - Verify amber badge appears when last VIEW is 8+ days old.
  - Verify red badge appears when last VIEW is 31+ days old.
  - Verify red badge appears for PUBLISHED projects with zero events.
- [ ] **Task 7.7**: Cross-origin smoke (best-effort):
  - Spin up a tiny static HTML file with the embed iframe pointed at a PUBLISHED project → load in browser → confirm model renders, no console errors, CORS doesn't block the SDK config fetch (CORS is `*` already on `/api/sdk/*`).
- [ ] **Task 7.8**: Browser console check — no warnings, no 404s, no CSP violations.
- [ ] **Task 7.9**: Final embed code review — read through the final embed HTML/JS, the embed code generator output, and the iframe snippet on `/integrations` to make sure end-to-end is correct.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `src/app/embed/layout.tsx` doesn't get treated as a root layout in Next.js 16 (the root layout is auto-applied) | High — fonts still load | If the simple approach fails, restructure as a route group `src/app/embed/(public)/layout.tsx` + move the page under it. Document the pattern in the spec. |
| Cache TTL drop on `/api/sdk/v1/config` (3600 → 60) increases upstream load on the DB query | Med — Vercel function invocations | The endpoint is already cheap (1 small Prisma query, no joins beyond `assets`). Vercel's edge cache absorbs 99% of requests. 60× more upstream is fine. |
| Brand with a CDN/proxy that aggressively caches the iframe's HTML will still see a stale model for up to their cache TTL | Low — beyond our control | The plan already gets us to ~60s; can't fix the host site's cache. Document in `/integrations` copy that iframe caches apply. |
| `formatDistanceToNow` from `date-fns` is already a dep, but verify the import path | Low | Reuse the existing import from `src/lib/notifications.ts` or import directly from `date-fns`. |
| Liveness threshold (7d amber, 30d red) is opinionated and might be wrong for the brand's reality | Low — pure UI | Use constants in `src/lib/embed-liveness.ts` so they're easy to tune later. |
| Adding the "Last Seen" column shifts the analytics table layout | Low — UX | Place it after "AR Launches" (last column → keep existing columns untouched for brands not yet seeing traffic). |
| Route group restructure breaks the embed URL | High — brand-storefront iframes 404 | The URL `/embed/[projectId]` is preserved by putting the page under the route group: `src/app/embed/(public)/[projectId]/page.tsx`. Route groups don't appear in the URL. |
| Permission-Policy header breaks `<model-viewer>` AR on Safari/iOS | Med — AR won't work | The policy explicitly allows `xr-spatial-tracking`, `accelerometer`, `gyroscope` for self. Test in Safari before merging. If it breaks, drop the Permissions-Policy header entirely — most browsers default to allowing these for same-origin and we can revisit. |
| Next.js 16 root-layout detection in `src/app/embed/` | Med | If the embed's own `layout.tsx` doesn't override the app root, fall back to a route group. Plan covers both. |

## Open Questions

None blocking. Threshold tuning deferred to a follow-up.

## Files to be Modified

**New:**
- `src/app/embed/layout.tsx` (or `src/app/embed/(public)/layout.tsx` + `src/app/embed/(public)/[projectId]/page.tsx` if route group needed)
- `src/lib/embed-liveness.ts` — thresholds + helper
- `src/app/actions/analytics.ts` — `getProjectLiveness`
- `specs/pages/embed.md`

**Edited:**
- `src/app/embed/[projectId]/page.tsx` — drop `<Script>`, add `dynamic = "force-dynamic"`
- `src/app/api/sdk/v1/config/[projectId]/route.ts` — drop `s-maxage` to 60
- `next.config.mjs` — add `/embed/*` headers
- `src/app/analytics/page.tsx` — add "Last Seen" column
- `specs/WEBSITE.md` — §3, §4, §5, §11, §14

**Verified unchanged:**
- `src/components/EmbedViewer.tsx` — still the same; layout-level script serves `model-viewer.min.js`
- `src/app/api/sdk/v1/events/route.ts` — no change; VIEW events already feed liveness
- `src/lib/utils.ts` `generateEmbedCode` — no change; the snippet is correct as-is

---

# Implementation Plan v2: Embed Visual Parity with Landing Page (hardcoded config)

## Overview

The v1 embed (route handler + static `public/embed-viewer.html` + SDK config) is fast and resilient, but its visuals diverge from the landing page. The brand-facing iframe in a Shopify storefront looks different from the model the user just saw on the STUDIO.V landing page, which hurts trust.

This plan ships four changes to the embed **only** (no other surface area touched):

1. **Hardcode the viewer config** — copy the exact `cameraOrbit`, `cameraTarget`, `interpolationDecay`, `autoRotate` defaults, `shadow-intensity`, `shadow-softness`, `exposure`, `tone-mapping`, `environment-image`, `camera-controls`, `disable-pan`, `loading`, `reveal` attribute set from `src/components/ThreeDConfigurator.tsx:42-47, 86-99` into the embed. The SDK config response is still fetched, but only `assetUrls.glb` is read — `sdkConfig` is not consumed by the embed.
2. **Add the top-right controls** — landing-style auto-rotate toggle + compass reset buttons (vertical stack, hidden until model load, `1px solid #E5E2DD`, `40×40` circular).
3. **Add a 3D grid floor** — pure-CSS perspective floor behind the model (two `repeating-linear-gradient` layers, `perspective(800px) rotateX(62deg)`, masked at horizon and ground). Replaces the flat off-white background.
4. **Replicate the landing's loader + error UI** — `RefreshCw` SVG spinner with monospace `LOADING 3D MODEL…` text updating to `LOADING… NN%` on `progress` events; red monospace error message on failure.
5. **Drop the bottom-right STUDIO.V badge** and **drop AR** (USDZ + `ar-modes`) to match the landing page. The SDK config endpoint still returns `assetUrls.usdz` for any future re-add or third-party consumer; `AR_LAUNCH` analytics are no longer emitted.

## Architecture Decisions

| Decision | Rationale |
|---|---|
| All viewer config hardcoded (no per-project override) | User asked explicitly: "for all models I want to have fixed(same config)." Avoids per-project drift between the brand's iframe and the landing page. |
| Still fetch `/api/sdk/v1/config/{id}` for `assetUrls.glb` | Each project has its own GLB URL — can't be hardcoded. Fetching the same endpoint also keeps the existing CORS, cache, and 404 behavior intact. The response still includes `sdkConfig` for forward-compat and third-party JS SDK consumers. |
| `sdkConfig` field kept in Prisma + SDK response | Not deleted. Embed no longer reads it. Future per-project override is one JS change away. |
| Pure-CSS 3D grid floor (no SVG, no HDRI, no model-viewer ground-color) | Cheapest possible (a few hundred bytes of inline CSS), perfect at any DPI, instantly tunable. SVG would bloat payload; HDRI would force a custom `environment-image` and break visual parity with the landing; model-viewer `ground-color` only works on models with a defined bottom face. |
| Inline SVG icons (not Lucide via CDN) | Keeps the embed zero-fetch beyond `model-viewer.min.js` and the GLB. Lucide would add ~50KB. |
| Drop AR to match landing | `ThreeDConfigurator` has no AR button. The embed should look and feel like the same product. Reduces payload, simpler UI. |
| Drop STUDIO.V badge | User request. Removes a brand-marketing element from the iframe content. |
| `model-viewer@4.2.0` from `ajax.googleapis.com` | Pixel-parity with landing's `4.2.0` from jsdelivr. The 2 CDNs serve the same bytes; ajax is more globally cached. |

## Task List

### Phase 1: Rewrite `public/embed-viewer.html`
- [ ] **Task 1.1**: Replace the entire template with the v2 design:
  - Hardcoded viewer attributes on `<model-viewer>`: `camera-controls`, `disable-pan`, `loading="eager"`, `reveal="auto"`, `shadow-intensity="0.6"`, `shadow-softness="0.8"`, `exposure="1"`, `tone-mapping="aces"`, `environment-image="neutral"`.
  - Post-mount `cameraOrbit = "0deg 75deg 105%"`, `cameraTarget = "0m 0.4m 0m"`, `interpolationDecay = 200`, `autoRotate = true`, then `jumpCameraToGoal()`.
  - 3D grid floor: `.grid-floor` div with two `repeating-linear-gradient` layers, `transform: perspective(800px) rotateX(62deg)`, `transform-origin: center 100%`, `mask-image: linear-gradient(180deg, transparent 0%, #000 28%, #000 72%, transparent 100%)`, `pointer-events: none`, `aria-hidden="true"`.
  - Frame card: `#frame` div with `1px solid var(--border)`, `border-radius: 16px`, `overflow: hidden`.
  - Top-right controls: `.controls` div with `#btn-rotate` (RotateCcw SVG, `data-spin` attribute when active, `animation: spin 8s linear infinite`) + `#btn-reset` (Compass SVG). Both 40×40, white background, `transition-colors 200ms`, `:focus-visible` ring per `design.md:49`.
  - Loader: `.loader` with `RefreshCw` SVG (`animation: spin 1.2s linear infinite`) + monospace text `LOADING 3D MODEL…` updating to `LOADING… NN%` on `progress` events.
  - Error: `.err` div with red monospace text (`#dc2626`, `font-family: ui-monospace`).
  - `customElements.whenDefined("model-viewer").then(applyInitial)` to set the initial camera without a fly-in animation.
  - Wire up `btn-rotate` to toggle `mv.autoRotate` + `aria-pressed` + `data-spin` attribute. Wire up `btn-reset` to re-apply `cameraOrbit` + `cameraTarget` (identical to `ThreeDConfigurator.tsx:74-76`).
  - Remove: STUDIO.V badge, USDZ/AR attributes, all `sdkConfig` reads, `ar-status` listener.
  - Keep: `send("VIEW")` on load, first-`camera-change` `send("INTERACTION")`.

### Phase 2: Spec updates
- [ ] **Task 2.1**: `specs/pages/embed.md`:
  - Replace §"public/embed-viewer.html" contents with the v2 spec (3D grid, frame card, controls, loader/error, no badge, no AR).
  - Add new §"Hardcoded config" with the attribute table and the `ThreeDConfigurator.tsx` source citations.
  - Add new §"Controls" describing the top-right button group.
  - Add new §"3D grid floor" describing the CSS perspective technique.
  - Update the File & line index to reference the new sections.
- [ ] **Task 2.2**: `specs/WEBSITE.md`:
  - §11: rewrite the "Static template" bullet to describe hardcoded config + grid + controls + loader/error + no badge + no AR. Add a note to the SDK config response explaining that `sdkConfig` is not consumed by the STUDIO.V embed.
  - §9 (`Project` model): add a one-liner that `sdkConfig` is kept for forward-compat and not currently consumed by the embed.
  - §14: update the `pages/embed.md` deep-dive reference to mention the new sections.

### Phase 3: Verification
- [ ] **Task 3.1**: `npx tsc --noEmit` — clean.
- [ ] **Task 3.2**: `npm run lint` — no new errors. (Pre-existing errors in `admin.ts`, `project.ts`, `AuthClient.tsx`, `TasksClient.tsx`, `BentoFeatures.tsx`, `ThemeToggle.tsx`, `Drawer.tsx`, `use-presigned-upload.ts` are out of scope.)
- [ ] **Task 3.3**: `npm run build` — succeeds.
- [ ] **Task 3.4**: Curl-test the live embed at `/embed/cmrxm8uiu00012styo3hqo7c9`:
  - HTTP 200, `text/html; charset=utf-8`, `Cache-Control: no-store`.
  - Resilience headers still present (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; no `X-Frame-Options`).
  - HTML contains: `grid-floor`, `btn-rotate`, `btn-reset`, `loader`, `err`, `model-viewer@4.2.0`, `perspective`, `repeating-linear-gradient`, `rotateX(62deg)`.
  - HTML does **not** contain: `STUDIO.V` (badge), `usdz`, `ar-modes`, `ar-status`, `sdkConfig` reads.
  - Size: ~10 KB (template) → ~10 KB response (just `{PROJECT_ID}` replaced). No font preloads, no `<link>` tags, no app shell.
- [ ] **Task 3.5**: SDK endpoints unaffected:
  - `GET /api/sdk/v1/config/{id}` → 200 with `s-maxage=60`, `Vary: Accept-Encoding`, CORS `*`.
  - `POST /api/sdk/v1/events` → 201, CORS `*`.
  - 404 for missing/non-PUBLISHED project.
- [ ] **Task 3.6**: Manual visual test in browser at `http://localhost:3000/embed/cmrxm8uiu00012styo3hqo7c9`:
  - Model loads with the 3D grid behind it.
  - Loader shows `LOADING 3D MODEL…` → `LOADING… NN%` → disappears.
  - Top-right: rotate toggle is dark (active, spinning) + compass button. Both are clickable.
  - Clicking rotate stops the auto-rotation, button turns white.
  - Clicking rotate again resumes auto-rotation, button turns dark and starts spinning.
  - Clicking compass snaps the camera back to `0deg 75deg 105%`.
  - No STUDIO.V badge bottom-right.
  - Camera drag/zoom works (`disable-pan` so vertical scroll doesn't pan).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 3D grid floor looks wrong at extreme aspect ratios (e.g. 100px × 1000px iframe) | Low — visual only | The 4-stop mask hides the worst of it. Default `generateEmbedCode` snippet (16:5-ish) renders correctly. |
| 3D grid behind a model with no defined bottom (e.g. floating sphere) leaves the model orientation ambiguous | Low — UX | The compass reset button is the recovery path. |
| Inline SVG icons don't match lucide-react exactly | Very low | Both are 24×24 stroke-2 line icons of the same names (RotateCcw, Compass, RefreshCw). Pixel-comparable to the landing. |
| Bumping `model-viewer` to `4.2.0` adds ~3 KB | Very low | Worth the pixel-parity guarantee. |
| `customElements.whenDefined` not supported in very old browsers | Very low | The fallback `mv.addEventListener("load", applyInitial)` runs if `whenDefined` is undefined. |
| `jumpCameraToGoal()` throws if called before the element is fully ready | Very low | Wrapped in `try { … } catch (_) {}`. The `whenDefined` promise guarantees readiness. |
| Brands with the v1 embed (AR + badge) cached on their storefront CDN | Low — visual | New embed HTML is served on next iframe load (no-store). Old embeds in a CDN cache will live until their cache TTL expires. Document in `/integrations` if it becomes a problem. |

## Files to be Modified

**Edited:**
- `public/embed-viewer.html` — full rewrite (~10 KB).
- `specs/pages/embed.md` — new sections + updated contents list + updated file & line index.
- `specs/WEBSITE.md` — §11 rewrite, §9 `Project` note, §14 deep-dive reference.
- `tasks/plan.md` — this new v2 section (this file).
- `tasks/todo.md` — new checked items.

**Verified unchanged:**
- `src/app/embed/[projectId]/route.ts` — no change; still 200/404 on PUBLISHED + GLB, `Cache-Control: no-store`, `dynamic = "force-dynamic"`.
- `src/app/api/sdk/v1/config/[projectId]/route.ts` — no change; still returns `{ assetUrls, sdkConfig }`, `s-maxage=60`, `Vary: Accept-Encoding`, CORS `*`.
- `src/app/api/sdk/v1/events/route.ts` — no change; still CORS `*`, valid event types, `keepalive` recommended.
- `next.config.mjs` — no change; resilience headers still in place.
- `src/proxy.ts` — no change; `/embed/*` still in public-bypass list.
- `src/lib/utils.ts` `generateEmbedCode` — no change; brand snippet preserved.
- `src/lib/embed-liveness.ts` — no change; thresholds still 7/30 days.
- `src/app/actions/analytics.ts` — no change; liveness query still works.
- `src/app/analytics/page.tsx` — no change; "Last Seen" column still works.
- `prisma/schema.prisma` — no change; `sdkConfig` field kept (not deleted).
- `src/components/ThreeDConfigurator.tsx` — no change; it is the source of truth that the embed is now copying from.

---

## v3 — Drop API key from `/integrations`; simplify embed customizer (test page only)

### Motivation
- The API key shown on `/integrations` was a client-derived placeholder (`pk_live_<sha256(userId)>`) — never used by anything. The embed is unauthenticated by design (the brand's storefront simply embeds `/embed/[projectId]`), so displaying an "API key" was misleading.
- The customizer on the mock storefront test page (lives outside the repo at `C:\Users\am\Desktop\Codes\studioV\test\index.html`) had grown to six controls. The user requested only width + height remain.

### Changes — `src/app/integrations/`
- **`page.tsx`**: removed `import { createHash } from "crypto"`, removed `apiKey` variable, removed `createHash(...).update(principal.userId).digest(...)` assignment, removed `apiKey` from `<IntegrationsClient>` props.
- **`IntegrationsClient.tsx`**: removed `Key` from the lucide-react import, removed `apiKey` from props + destructure, deleted the entire **API Security** `<section>` (heading, "Public API Key" subheading, copy button), and restructured the page from a 2/3 + 1/3 two-card layout to a three-zone single-column flow:
  1. **Hero** — eyebrow + serif headline "Drop your 3D models anywhere." + platform-guidance subtitle + 3-stat row (`No API key` / `Zero setup` / `Any storefront`).
  2. **Two-column row** — "Where it works" (platform guidance + Requirements card) on the left, "What you'll see" (live iframe of the currently selected project) on the right.
  3. **Full-width dark card** — product dropdown, snippet block, copy-to-clipboard button.
- Layout uses the existing `DashboardLayout` envelope (sidebar + main) so it inherits the dashboard's nav, theme, and notification bell.

### Changes — `test/index.html` (mock storefront, outside the repo)
- Customizer section now contains only: **Width** (number + `%` / `px` unit) and **Height** (number + `px` / `%` unit), plus the Reset button, snippet, and Copy button.
- Removed from HTML: aspect-ratio preset row, border-radius slider, background swatches row.
- Removed from CSS: `.field-range`, `.field-range::-webkit-slider-thumb`, `.field-range::-moz-range-thumb`, `.field-range-value`, `.swatch-row`, `.swatch` (+ hover / pressed / focus), `.preset-row`, `.preset` (+ hover / pressed / focus).
- Removed from JS: `radiusRange` / `bgSwatches` / `aspectPresets` lookups, `activePreset` / `setAspect` / `onAspectClick` / `onSwatchClick` functions, radius/background writes to `.embed-frame`, the `frame.style.backgroundImage` transparent-checker logic, and the aspect-ratio logic in `reset()`. The iframe wrapper now keeps the page's default `16px` radius and `#F9F8F6` background (baked into `.embed-frame` CSS, not user-tweakable).
- The generated snippet no longer emits `border-radius` or `background` in its inline `style`; it is now `width: ...; height: ...; border: 0;`.
- File size: 28,631 → 20,780 bytes.

### Changes — specs
- `specs/WEBSITE.md` line 144: rewrote the `/integrations` row from "API key, embed code generator, platform guidance" to "Hero + 'where it works' + live preview + full-width embed code card; no API key (the iframe is unauthenticated)".
- `specs/auth-stabilization.md`: no changes — the historical file does not mention the API key.
- `tasks/plan.md` (this file): new v3 section (above) recording the change.
- `tasks/todo.md`: new v3 section (below) with the task list.

### Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| A brand had bookmarked or scripted copy of the API key from the old page | Low | The key was a per-user hash with no API, so nothing depends on it. No deprecation notice needed. |
| Customizer removal hides useful controls (radius, bg) for some embed layouts | Low | The customizer is on a one-off mock storefront page used for visual testing, not a public tool. The brand-facing `/integrations` page does not host a customizer. |
| New "What you'll see" preview iframe on `/integrations` doubles model-viewer load | Low | Single brand project per session in practice; both iframes share the browser's CDN cache. The preview is `loading="lazy"`. |

### Files modified in v3
- `src/app/integrations/page.tsx` (40 → 38 lines)
- `src/app/integrations/IntegrationsClient.tsx` (165 → 226 lines; restructuring offset the API-key deletion)
- `specs/WEBSITE.md` (line 144 only)
- `tasks/plan.md` (this section)
- `tasks/todo.md` (v3 task list)
- `C:\Users\am\Desktop\Codes\studioV\test\index.html` (outside the repo; 28,631 → 20,780 bytes)

---

## v3.1 — Platform directory in `/integrations` "Where it works" card

### Motivation
After v3 removed the API Security block, the "Where it works" card on `/integrations` was a single paragraph plus a small Requirements sub-card. It read as a placeholder. The canonical platform list (defined in `src/app/onboarding/OnboardingClient.tsx:11`: `["Shopify", "WooCommerce", "Webflow", "Custom", "Other"]`) was only special-cased for `shopify` and `custom` in the brand guidance ternary — `woocommerce`, `webflow`, and `other` all fell through to a generic sentence. There was no visual cue for which platforms were supported.

### Changes — `src/app/integrations/IntegrationsClient.tsx`
- **Added a `PLATFORMS` constant** (5 entries: `shopify`, `woocommerce`, `webflow`, `custom`, `other`) with `{ key, name, tagline, steps, Logo }` per entry. Source of truth for all platform metadata.
- **Added 5 inline SVG logo components** (`ShopifyLogo`, `WooCommerceLogo`, `WebflowLogo`, `CustomLogo`, `OtherLogo`) — 24×24, `currentColor`, `strokeWidth=1.75`, lucide-style. **No new icon package** — keeps `package.json` unchanged.
- **Added `PLATFORM_BY_KEY` lookup** (built via `Array.reduce`) and an `isPlatformKey` type guard.
- **Refactored `platformGuidance`** from a 3-branch nested ternary to a single lookup (`detectedPlatform?.steps ?? genericFallback`). Now `woocommerce`, `webflow`, and `other` all get their own tailored copy.
- **Added `detectedPlatform` derived value** (`PlatformDef | null`) and used it in two places: the card header shows "Detected: {Name}" and the matched tile gets a `border-2 border-[#1A1A1A] bg-[#F9F8F6]` highlight with a small "Detected" pill in the top-right.
- **Replaced the "Where it works" card body** with a 2-column grid of 5 platform tiles (logo + name + tagline), followed by the matched platform's `steps` as a sentence (only if matched), followed by the Requirements sub-card.
- File size: 198 → 320 lines.

### Per-platform step copy
- **Shopify** — "For Shopify, paste this iframe into a custom liquid block or product template section. It loads the published STUDIO.V viewer automatically."
- **WooCommerce** — "For WooCommerce, add a custom product tab via the woocommerce_product_tabs hook or paste the iframe into the long-description field with HTML enabled."
- **Webflow** — "For Webflow, drop the iframe into a custom embed component on your product page. Webflow renders it in-place with no extra setup."
- **Custom** — "For a custom storefront, paste this iframe into your product detail page where the 3D viewer should appear. Works with any HTML-rendering stack."
- **Other** — "For any other storefront, paste the iframe wherever custom HTML is supported. If your storefront enforces a content security policy, allow frame-src against your STUDIO.V origin."

### Spec updates
- `specs/WEBSITE.md` line 144 — updated the `/integrations` row from "Hero + 'where it works' + live preview" to "Hero + platform directory (5 tiles, detected one highlighted with steps below) + live preview".
- `tasks/plan.md` — this v3.1 section.
- `tasks/todo.md` — v3.1 task list.

### Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Inline SVG logos don't look like the actual brand marks | Very low | Logos are intentionally minimal line glyphs, not color-accurate brand marks — matches the page's existing muted aesthetic and pairs cleanly with the detected-state highlight. |
| An unknown platform value (not in `PLATFORM_BY_KEY`) renders the old generic copy | Low | `isPlatformKey` type guard ensures only known keys resolve. Unknown values fall through to the existing `For {storefrontPlatform}, paste this iframe…` fallback. |
| 5 tiles don't fit on narrow screens | Low | Grid is `grid-cols-1 sm:grid-cols-2` — 1 column on mobile, 2 columns on tablet+. The matched tile still highlights correctly at any width. |
| The `detectedPlatform` value uses a strict lowercase comparison | Low | `OnboardingClient.tsx:11` writes the display string verbatim ("Shopify" not "shopify"), so `.toLowerCase()` normalization is needed and already in place. Confirmed in v3. |

### Files modified in v3.1
- `src/app/integrations/IntegrationsClient.tsx` (198 → 320 lines)
- `specs/WEBSITE.md` (line 144 only)
- `tasks/plan.md` (this v3.1 section)
- `tasks/todo.md` (v3.1 task list)

**Verified unchanged:**
- `src/app/integrations/page.tsx` — no change; still queries `User.storefrontPlatform` and passes to client.
- `src/app/onboarding/OnboardingClient.tsx` — no change; `platformOptions` list stays the source of truth.
- All other pages, all SDK endpoints, the embed, the proxy, the auth, the Prisma schema, the test page, `package.json`, `next.config.mjs`.


