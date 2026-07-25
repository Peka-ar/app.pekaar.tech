# TODO — Fast, Lightweight, Resilient Public Embed

Track progress for the plan in `tasks/plan.md`.

## Phase 1: Embed layout separation
- [x] Task 1.1: Create `src/app/embed/layout.tsx` (slim root layout: no fonts, no TopNav, no globals.css, no ThemeProvider; only the `model-viewer.min.js` script tag and `<html><body>{children}</body></html>`)
  - **Replaced by Option D2:** static HTML template + route handler, no Next.js page render for the embed.
- [x] Task 1.2: If Next.js 16 still applies the app-root layout to `/embed/*`, restructure as `src/app/embed/(public)/layout.tsx` + `src/app/embed/(public)/[projectId]/page.tsx`
  - **Resolved by Option D2:** deleted the Next.js page entirely; `/embed/[projectId]` is now a route handler returning `text/html`.
- [x] Task 1.3: `npm run build` succeeds; embed route has smaller client chunks than `/dashboard`
  - **Confirmed:** no `next-font-manifest.json` for the embed path; the embed never touches the app root.

## Phase 2: Embed page hardening
- [x] Task 2.1: Edit `src/app/embed/[projectId]/page.tsx` — drop `<Script>` import (now in layout), add `aria-label` on the STUDIO.V badge link
  - **Replaced by Option D2:** the static template at `public/embed-viewer.html` includes the `<Script>` and the badge.
- [x] Task 2.2: Add `export const dynamic = "force-dynamic"` to the embed page (fresh DB read on every request → brand sending PUBLISHED → REVISIONS stops the embed immediately)
  - **Applied to route handler:** `src/app/embed/[projectId]/route.ts` exports `dynamic = "force-dynamic"`.
- [x] Task 2.3: Confirm `EmbedViewer.tsx` is unchanged; verify it works
  - **EmbedViewer deleted** as part of Option D2 — replaced by inline `<script type="module">` in `public/embed-viewer.html`.

## Phase 3: Faster config cache
- [x] Task 3.1: Edit `src/app/api/sdk/v1/config/[projectId]/route.ts` — change `s-maxage=3600` → `s-maxage=60`, keep `stale-while-revalidate=86400`
- [x] Task 3.2: Add `Vary: Accept-Encoding` to the response headers

## Phase 4: Embed resilience headers
- [x] Task 4.1: Edit `next.config.mjs` — add a `headers()` entry for `/embed/:path*`:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: xr-spatial-tracking=(self), accelerometer=(self), gyroscope=(self)`
  - **No** `X-Frame-Options` (embed is meant to be cross-origin-framed)

## Phase 5: Embed liveness on /analytics
- [x] Task 5.1: Create `src/app/actions/analytics.ts` with `getProjectLiveness(projectIds: string[])` — one Prisma `groupBy` query returning `Record<projectId, { lastEventAt: Date | null }>`
- [x] Task 5.2: Create `src/lib/embed-liveness.ts` with `EMBED_LIVENESS_THRESHOLDS = { AMBER_DAYS: 7, RED_DAYS: 30 }` and `getLivenessBadge(lastEventAt)` returning `'amber' | 'red' | 'ok' | 'never'`
- [x] Task 5.3: Edit `src/app/analytics/page.tsx` — add "Last Seen" column to the leaderboard, role-scoped (admin=all, brand=own)
- [x] Task 5.4: Pass `lastEventAt` into the leaderboard and render the badge + relative time

## Phase 6: Spec updates
- [x] Task 6.1: Edit `specs/WEBSITE.md` — §3 (folder layout, public/embed-viewer.html), §4 (route map: route handler), §5 (API cache 60s), §11 (static HTML embed, liveness, headers), §14 (deep-dive), §15 (3D convention)
- [x] Task 6.2: Create `specs/pages/embed.md` (deep dive: layout, route group, headers, cache, liveness, file & line index)
- [x] Task 6.3: Add `pages/embed.md` to `specs/WEBSITE.md` §14 deep-dive list

## Phase 7: Verification
- [ ] Task 7.1: `npx tsc --noEmit` clean
- [ ] Task 7.2: `npm run lint` clean
- [ ] Task 7.3: `npm run build` succeeds
- [ ] Task 7.4: Manual browser smoke — embed page has no font/TopNav/globals.css requests
- [ ] Task 7.5: Manual re-upload test — new GLB visible in embed within ~60s
- [ ] Task 7.6: Manual liveness test — verify amber/red/ok badges render correctly
- [ ] Task 7.7: Cross-origin iframe smoke test
- [ ] Task 7.8: Browser console clean — no warnings, no 404s, no CSP violations
- [ ] Task 7.9: **Final embed code review** — read the final embed HTML/JS end-to-end, verify the iframe snippet in `generateEmbedCode`, the embed route handler, the static HTML template, the SDK endpoints, and the embed code displayed on `/integrations` all work together as a single coherent thing

---

# TODO v2 — Embed Visual Parity with Landing Page

Track progress for the v2 plan in `tasks/plan.md` (v2 section).

## Phase 1: Rewrite `public/embed-viewer.html`
- [x] Task 1.1: Full rewrite to v2 design — hardcoded viewer config (matches `src/components/ThreeDConfigurator.tsx:42-47, 86-99`), 3D CSS perspective grid floor, top-right controls (rotate toggle + compass reset), landing-replica loader (RefreshCw + monospace `LOADING 3D MODEL…` text + progress %), landing-replica error UI, drop STUDIO.V badge, drop AR (USDZ + `ar-modes` + `ar-status` listener). `model-viewer@4.2.0` from `ajax.googleapis.com`.

## Phase 2: Spec updates
- [x] Task 2.1: `specs/pages/embed.md` — replaced `public/embed-viewer.html` contents with v2 spec; added new §"Hardcoded config" / §"Controls" / §"3D grid floor" sections; updated File & line index.
- [x] Task 2.2: `specs/WEBSITE.md` — §11 rewrite (static template bullet now describes hardcoded config + grid + controls + loader/error + no badge + no AR), added `sdkConfig` note in §11 SDK config section, added `sdkConfig` one-liner to §9 `Project` model, updated §14 deep-dive reference.

## Phase 3: Verification
- [ ] Task 3.1: `npx tsc --noEmit` clean
- [ ] Task 3.2: `npm run lint` — no new errors (pre-existing out-of-scope errors in other files are acceptable)
- [ ] Task 3.3: `npm run build` succeeds
- [ ] Task 3.4: Curl-test the live embed at `http://localhost:3000/embed/cmrxm8uiu00012styo3hqo7c9`:
  - HTTP 200, `text/html; charset=utf-8`, `Cache-Control: no-store`
  - Resilience headers present (X-Content-Type-Options, Referrer-Policy, Permissions-Policy; no X-Frame-Options)
  - HTML contains: `grid-floor`, `btn-rotate`, `btn-reset`, `loader`, `err`, `model-viewer@4.2.0`, `perspective`, `repeating-linear-gradient`, `rotateX(62deg)`
  - HTML does NOT contain: `STUDIO.V` (badge), `usdz`, `ar-modes`, `ar-status`
  - Size: ~10 KB (template → response with `{PROJECT_ID}` replaced); no `<link>` tags, no font preloads
- [ ] Task 3.5: SDK endpoints unaffected:
  - `GET /api/sdk/v1/config/{id}` → 200 with `s-maxage=60`, `Vary: Accept-Encoding`, CORS `*`
  - `POST /api/sdk/v1/events` → 201, CORS `*`
  - 404 for missing/non-PUBLISHED project
- [ ] Task 3.6: Manual browser test at `http://localhost:3000/embed/cmrxm8uiu00012styo3hqo7c9`:
  - Model loads with 3D grid behind it
  - Loader shows `LOADING 3D MODEL…` → `LOADING… NN%` → disappears
  - Top-right: rotate toggle is dark/active (spinning) + compass button
  - Click rotate stops auto-rotation (button turns white)
  - Click rotate again resumes auto-rotation (button turns dark, spins)
  - Click compass snaps camera back to `0deg 75deg 105%`
  - No STUDIO.V badge bottom-right
  - Drag/zoom works, vertical scroll doesn't pan

---

## v3 — Drop API key from `/integrations`; simplify embed customizer (test page only)

### Phase 1: `/integrations` — remove API key + restructure page
- [x] Task 1.1: `src/app/integrations/page.tsx` — remove `import { createHash } from "crypto"`, remove `apiKey` variable, remove the `createHash(...).update(principal.userId).digest(...)` assignment, remove `apiKey` from `<IntegrationsClient>` props.
- [x] Task 1.2: `src/app/integrations/IntegrationsClient.tsx` — remove `Key` from lucide-react import, remove `apiKey` from props + destructure, delete the **API Security** `<section>`.
- [x] Task 1.3: Restructure `/integrations` layout to three zones: hero (eyebrow + serif headline + 3-stat row), two-column row ("Where it works" + "What you'll see" live preview iframe), full-width dark embed-code card (product dropdown + snippet + copy).
- [x] Task 1.4: `specs/WEBSITE.md` line 144 — rewrite `/integrations` row to drop "API key" and describe the new layout.
- [x] Task 1.5: `tasks/plan.md` — append v3 section recording the change.

### Phase 2: Mock storefront test page — customizer → width + height only
- [x] Task 2.1: `C:\Users\am\Desktop\Codes\studioV\test\index.html` — remove the Aspect ratio preset row, border-radius slider, and background swatch row from the customizer HTML.
- [x] Task 2.2: Remove the corresponding CSS rules: `.field-range` (+ thumbs), `.field-range-value`, `.swatch-row`, `.swatch` (+ variants), `.preset-row`, `.preset` (+ variants).
- [x] Task 2.3: Strip the customizer JS: remove `radiusRange` / `bgSwatches` / `aspectPresets` lookups, `activePreset` / `setAspect` / `onAspectClick` / `onSwatchClick` functions, all radius/background logic in `apply()` and `reset()`, the `frame.style.backgroundImage` transparent-checker logic, and the aspect-ratio logic in `reset()`. The generated snippet no longer emits `border-radius` or `background` styles.

### Phase 3: Verification
- [ ] Task 3.1: `npx tsc --noEmit` clean
- [ ] Task 3.2: `npm run lint` — no new errors
- [ ] Task 3.3: `npm run build` succeeds
- [ ] Task 3.4: `http://localhost:8000/` shows the customizer with only Width + Height fields; changing values resizes the iframe live; Copy button works; Reset reverts to `100%` / `500px`. No console errors.
- [ ] Task 3.5: Log in as a BRAND user, visit `/integrations` — page renders the new hero + two-column row + dark embed-code card; no API Security section; no `Key` icon; no `pk_live_` string in the rendered HTML; product dropdown, snippet, and copy still work.

---

## v3.1 — Platform directory in `/integrations`

### Phase 1: Build the platform directory
- [x] Task 1.1: `src/app/integrations/IntegrationsClient.tsx` — add `PLATFORMS` array (5 entries: Shopify / WooCommerce / Webflow / Custom / Other), each with `{ key, name, tagline, steps, Logo }`.
- [x] Task 1.2: Add 5 inline SVG logo components (`ShopifyLogo`, `WooCommerceLogo`, `WebflowLogo`, `CustomLogo`, `OtherLogo`) — 24×24, `currentColor`, `strokeWidth=1.75`, lucide-style. No new package.
- [x] Task 1.3: Add `PLATFORM_BY_KEY` lookup and `isPlatformKey` type guard. Refactor `platformGuidance` from a 3-branch nested ternary to a single lookup.
- [x] Task 1.4: Replace the "Where it works" card body with a 2-column grid of 5 tiles (logo + name + tagline). Detected tile gets `border-2 border-[#1A1A1A] bg-[#F9F8F6]` and a "Detected" pill in the top-right.
- [x] Task 1.5: Below the grid, render the matched platform's `steps` as a one-sentence paragraph (only if matched). Requirements sub-card moves to the bottom of the card.
- [x] Task 1.6: `specs/WEBSITE.md` line 144 — update the route description to mention the platform directory + 5 tiles + detected highlight.
- [x] Task 1.7: `tasks/plan.md` — append v3.1 section.

### Phase 2: Verification
- [ ] Task 2.1: `npx tsc --noEmit` clean
- [ ] Task 2.2: `npm run lint` — no new errors
- [ ] Task 2.3: `npm run build` succeeds
- [ ] Task 2.4: Log in as a BRAND user, visit `/integrations`:
  - "Where it works" card shows a 2-column grid of 5 tiles (Shopify / WooCommerce / Webflow / Custom / Other).
  - Each tile renders: logo (line glyph) + name + tagline.
  - The detected platform tile is visually distinct (2px `#1A1A1A` border, off-white fill, "Detected" pill in the top-right).
  - Below the grid, the matched platform's `steps` sentence appears.
  - The Requirements sub-card sits at the bottom of the left card.
  - No console errors.
  - Hero subtitle still shows the matched-platform guidance.
- [ ] Task 2.5: To test other platform highlights, temporarily run `UPDATE "User" SET "storefrontPlatform" = 'Shopify' WHERE id = '<brand-id>';` then re-render the page. Revert after testing.
