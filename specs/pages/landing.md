# `/` — Landing (deep dive)

> Parent: [`../WEBSITE.md`](../WEBSITE.md) · Source: `src/app/page.tsx:1`, `src/components/Hero.tsx:1`, `src/components/landing/*`, `src/components/BentoFeatures.tsx:1`, `src/components/LandingPageClient.tsx:1` · Contract: `design.md` §4.3 (bands), §8.6 (PipelineCard), §3.2 (type scale) · Product: `PRODUCT.md` §Positioning, §Evidence on Hand

The landing is the v2 showcase and the product's best salesperson: a sage-band hero with the **photos-to-3D pipeline card** as the live proof, an honest-evidence section stack, the interactive sandbox (kept, rethemed), and an ink-band close. **Every fabricated claim is removed** — this is a hard product commitment from `PRODUCT.md` (see §Copy truth). The landing is the **first clean surface** in the redesign: it consumes zero compat tokens/classes (`--canvas-secondary`, `--accent-1/2/3`, `mesh-bg`/`gradient-text`/`glow-border`/`accent-ring`) and no hard-coded v1 hexes.

---

## Route & auth

| | |
|---|---|
| **Route** | `/` |
| **File** | `src/app/page.tsx:1` (server component) |
| **Auth** | Public. No `requirePrincipal`. The root layout's `TopNav` handles public/protected header alone. |
| **Layout shell** | None. The page composes its own bands; `TopNav` is rendered globally by `src/app/layout.tsx:79`. |
| **Deep link anchors** | `#features` (BentoFeatures), `#sandbox-anchor` (LandingPageClient configurator), `#showroom-catalog-panel` (LandingPageClient catalog). The anchor contract is preserved for `TopNav` (`src/components/TopNav.tsx:28-29`) and `HeroCTA`. |

### Server entry (`src/app/page.tsx:1`)

```tsx
export default function LandingPage() {
  return (
    <div style={{ background: "var(--canvas)" }}>
      <Hero />
      <CategoryStrip />
      <HowItWorks />
      <LandingPageClient />   // sandbox + catalog (kept, rethemed)
      <ArtistFinishBand />
      <BentoFeatures />
      <CTABand />
      <LandingFooter />
    </div>
  );
}
```

Composition tree (in order, per `tasks/v2-redesign/PHASE-3-landing.md` §3):

```
<TopNav />                         // global — Phase 1 anatomy, Phase 2 wordmark
<Hero />                           // sage band · Manrope-800 headline + PipelineCard  [§Hero]
<CategoryStrip />                  // honest reframe of TrustMarquee               [§CategoryStrip]
<HowItWorks />                     // Capture → Model → Finish → Serve             [§HowItWorks]
<LandingPageClient />              // sandbox (ThreeDConfigurator + ProductCatalog) [§Sandbox]
<ArtistFinishBand />               // replaces "From The Field" testimonials       [§ArtistFinishBand]
<BentoFeatures />                  // v2 bento, honest copy                        [§Bento]
<CTABand />                        // ink closing band                             [§CTABand]
<LandingFooter />                  // ink footer                                   [§Footer]
```

New section components live in `src/components/landing/` (landing now warrants a folder). `LandingPageClient.tsx` stays at `src/components/` — its testimonial band was deleted (see Copy truth). `ProductCatalog.tsx` + `ThreeDConfigurator.tsx` are rethemed only (no logic changes).

---

## Sections

### Hero — sage band + PipelineCard (`src/components/Hero.tsx:1` + `src/components/landing/PipelineCard.tsx:1`)

`design.md` §4.3 band 1 + §8.6 signature component.

- **Ground:** `--canvas` (sage), flat — no `mesh-bg`, no gradient.
- **Eyebrow** mono `--text-muted`: `PHOTOS → INTERACTIVE 3D` (tracked 0.12em, 12px, `font-mono`).
- **H1:** Manrope 800, `display-xl` `clamp(2.5rem, 6vw, 4.5rem)`, `line-height 1.0`, `tracking -0.025em`, `text-wrap: balance`, `--text-primary`. Copy: `Your product photos, live in 3D — in hours, not weeks.` (no italic serif accent span; one idea, no gradient text).
- **Sub:** `body-xl` (Inter 20px/1.6) `--text-secondary`, `max-w-xl`, from `PRODUCT.md`: `Peka AR turns your product photography into artist-finished 3D assets — live on your storefront in hours, embeddable with one line, viewable in your customers' rooms.`
- **CTA row:** `button-primary` (capsule, 48px, `--accent`) `Start your project → /auth`; `button-secondary` (capsule, 48px, `--surface` + hairline) `Try the live demo → #sandbox-anchor`. Replaces `ScrollToSandboxButton`/`ARDemoButton` (kept as stubs in `src/components/HeroCTA.tsx:1`).
- **Metrics row:** product facts only — `Hours — photo to live embed` · `1 line — iframe embed` · `GLB + USDZ — web + AR formats` (Manrope 600 values + mono 10px labels, hairline-topped). Replaces `+40% / −25% / <5 Min` (T1).
- **Right column:** `<PipelineCard />` (see §PipelineCard). Desktop: 2-col grid (`lg:grid-cols-2`), mobile: stacked, card below CTAs.

`Hero` is also duplicated at `src/components/landing/Hero.tsx:1` (same implementation; `src/components/Hero.tsx` is the canonical export consumed by `page.tsx`).

### CategoryStrip — replaces TrustMarquee (`src/components/landing/CategoryStrip.tsx:1`)

- Single quiet strip, `--canvas` ground, hairline `border-[var(--border-default)]` top+bottom.
- Mono eyebrow `BUILT FOR` (`--text-muted`) + four categories (`furniture · jewelry · apparel · decor`) set in `display-sm` Manrope 600 (`--text-primary`), separated by 6px coral dots (`--accent`). Trailing micro-label `storefronts` in mono.
- **Mobile:** marquee on the category words (duplicated list for loop, `animate-[marquee_22s_linear_infinite]`, clones `aria-hidden`, honors `prefers-reduced-motion` via the global `globals.css:122` base rule).
- Replaces `TrustMarquee` (`LandingExtras.tsx:TrustMarquee`) which shipped fake logos `Maison, Nordik, Lumière, Atelier, Verve, Cobalt, Hazel, Monoforge` + `Trusted by premium D2C brands` (T2).

### HowItWorks — four claims as a pipeline (`src/components/landing/HowItWorks.tsx:1`)

Takes T3's slot in the rhythm. Four `card-content`-equivalent cards (white `--surface`, `radius-24`, no shadow) on the sage ground in a `grid lg:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-6` grid:

| Stage | Eyebrow | Headline (display 700) | Body |
|---|---|---|---|
| 01 | CAPTURE | Send product photos | Upload standard product photography — no studio rig, no 3D files needed. |
| 02 | MODEL | AI-accelerated pipeline | Our pipeline drafts the model fast — that's where the AI stops. |
| 03 | FINISH | Artist-finished by hand | A 3D artist refines every model and optimizes it for the web. Never raw AI output. |
| 04 | SERVE | One line, live + AR | Embed with one iframe line; shoppers preview in their own room on iOS and Android. |

- Step numbers in mono `--accent-copy` (`01`…`04`) + coral dot.
- Connecting hairline (`--border-default`) between cards on `lg` (decorative, `aria-hidden`).
- Section heading: eyebrow `HOW IT WORKS` + `display-lg`-scale heading `Photos in. 3D out. Live on your storefront in hours.` (`text-wrap: balance`).

### SandboxSection — kept, rethemed (`src/components/LandingPageClient.tsx:1`)

Keeps the two real sections — a live `model-viewer` demo **IS** the proof `PRODUCT.md` wants. Changes only honest + token-level:

- The **testimonial coral band** (`bg-[#c44320]`, `Maison/Lumière/Nordik/Atelier` quotes with `31%`, `42%`, `90 seconds`, T4) is **deleted**. Replaced by `ArtistFinishBand` (below).
- Help popup rethemed to a `rounded-[24px]` `var(--surface)` card with hairline + `var(--canvas-soft)` wells (was `var(--color-canvas-secondary)`). Copy is honest: `About this demo — This sandbox uses a bundled demo model…` (no invented claims). Grid of 3 wells (Native AR / Materials / One-line embed) in honest copy.
- `Interactive Sandbox` eyebrow + `Build your e-commerce embed` heading → v2 type (`font-mono 12px/0.12em uppercase` eyebrow; `display-lg`-scale `font-display font-bold` Manrope heading, `text-wrap: balance`). Sub-line `Demo model — labeled. Real projects are artist-finished in hours.`
- `LIVE ENVIRONMENT` chip: `bg var(--positive-pale)` + `text var(--positive-copy)` + `bg var(--positive)` pulse dot (was `emerald-500` raw class).
- `ThreeDConfigurator.tsx` + `ProductCatalog.tsx` token retheme only — see §Sandbox child notes below. **Do not touch the model-viewer logic** (`load/progress/error` handlers, `camera-change` preservation, `canActivateAR` gating).
- Anchors preserved: `id="sandbox-anchor"` (configurator section) and `id="showroom-catalog-panel"` (catalog section) — see §Anchor contract.

Child retheme notes:

- **`src/components/ThreeDConfigurator.tsx:1`** — outer wrapper `rounded-[24px]` `bg var(--canvas-soft)` hairline `var(--border-default)`; info overlay brand now `Elysian Design · Demo`; rotate/reset buttons 48px circles (`var(--ink)/var(--on-ink)` when active, `var(--surface)/var(--border-default)` idle); AR button `var(--ink)`. Logic untouched (`model-viewer` via `next/script` lazyOnload, `pageLoaded` guard, `hasInteractedRef` camera preservation, `autoRotate` toggle).
- **`src/components/ProductCatalog.tsx:1`** — category pills `font-mono 12px` uppercase: active `bg var(--ink)/var(--on-ink)` / idle `bg var(--surface)` hairline + `hover var(--text-primary)`; cards `rounded-[24px]` hairline `var(--border-default)` `hover var(--accent)`; image well `var(--canvas-soft)`; overlays: category pill `var(--surface)`, `AR ready` chip `var(--ink)/var(--on-ink)`, `Demo` chip `var(--accent-pale)/var(--accent-copy)` (new), selected scrim `var(--ink)/10` + `var(--accent)` pill. Title `font-display` `group-hover var(--accent-copy)`. Empty `Elysian Design` demo brand is shown as `Demo · Elysian Design` in the configurator overlay; catalog shows the `Demo` pill on thumbnails (labels demo content per `PRODUCT.md`).

### ArtistFinishBand — replaces From-The-Field testimonials (`src/components/landing/ArtistFinishBand.tsx:1`)

Ink band (`--ink` fill, `rounded-[24px]` card inside the `max-w-7xl` container — NOT a full-bleed coral band per `design.md` §4.3 band 3). **T4** replacement — the true differentiator instead of fake customers.

- Headline `display-lg` (`clamp 1.875rem → 2.75rem`, Manrope 700) in `--on-ink` with one coral word (`Finished by hand` in `var(--accent)`).
- Three supporting points as cards-on-ink rows (`rgba(228,230,220,.06)` fill + `rgba(228,230,220,.16)` hairline, `rounded-[16px]`), each with an icon well (`--accent-pale`/`--accent-copy` or `--positive-pale`/`--positive-copy`) + title `font-display 14px` `var(--on-ink)` + body `13px var(--on-ink)/65`:
  1. Draft → refine → optimize — AI draft in minutes, artist refines geometry/materials/scale.
  2. QC at 1:1 scale — checked in-viewer at true physical size.
  3. Optimized + AR-ready — web-optimized GLB + USDZ, one iframe, Quick Look / WebXR, no app.
- CTAs: primary `bg var(--accent)` and secondary transparent with `rgba(228,230,220,.22)` border.

Zero invented customers, metrics, or country counts.

### BentoFeatures — v2 bento, honest (`src/components/BentoFeatures.tsx:1`)

Keeps the bento grid concept (`rounded-[24px]` per `design.md` §6), restructured to v2 on a `md:grid-cols-3 gap-6` grid at `id="features"`:

| Card | Span | Fill | Icon well | Headline | Body |
|---|---|---|---|---|---|
| Zero-friction embed | `md:col-span-2` | `--surface` | `--accent-pale`/`--accent-copy` `Code2` | code-snippet visual (`font-mono code` face, `--canvas-soft` inset well `1px var(--border-default)`) showing `<iframe src="https://pekar.tech/embed/…" …>` |
| Calibrated 1:1 scale | `1` | `--ink` | `rgba(228,230,220,.08)` + hairline, `--accent` `Maximize2` | stays the ink card (`--on-ink` text) — replaces `#181715`/`#252320` hard-codes |
| Adaptive embeds | `1` | `--surface` hairline | `--accent-pale`/`--accent-copy` `Puzzle` | Responsive iframe, sandboxed, theme-owned |
| Optimized + CDN-served | `md:col-span-2` | `--surface` | `--accent-pale`/`--accent-copy` `Layers` | **T5 honest copy:** `Models are optimized and CDN-served for fast storefront loads — progressive streaming, not heavy downloads.` (no `Sub-200ms`/`84 countries` / `sub-second` claims) |

- Icon wells: flat `--accent-pale` circles with `--accent-copy` icons — **no gradient fills** (`bg-gradient-to-br` retired).
- Section heading: eyebrow `CAPABILITIES` + `display-lg` heading `Built to ship 3D to your storefront — without the heavy lift.` (`text-wrap: balance`).

### CTABand — replaces GradientCTA (`src/components/landing/CTABand.tsx:1`)

Ink band (same `rounded-[24px]` `var(--ink)` + `max-w-7xl` construction as ArtistFinishBand):

- `display-lg` headline `Your storefront, in 3D, this week.` in `--on-ink`, one-line sub (`var(--on-ink)/70`), single `button-primary` (`Start your project → /auth`). The focus ring uses `var(--on-ink)` so it remains visible on the dark ground.
- No `mesh-bg`, no `gradient-text`, no 3-card `01/02/03` row (content moved to HowItWorks/Bento).

### Footer — ink band (`src/components/landing/LandingFooter.tsx:1`)

Full-bleed ink footer (`var(--ink)` + `1px rgba(228,230,220,.12)` top hairline): Wordmark (`src/components/Wordmark.tsx`, Manrope 600 + coral dot in `var(--accent)`) + tagline, then `W3C WebXR · CORS Assets · Model-Viewer 4.0` + `Privacy/Terms` links (`Link` with `focus-visible` ring) in `font-mono 11px uppercase tracking-widest` (`--on-ink`/`--on-ink/50`/`--on-ink/20` separators). Fine print `font-sans 12px var(--on-ink)/45` with demo disclosure: `Demo models labeled; no fabricated claims.` Sub-line `GLB + USDZ · one-line iframe · AR view-in-room`.

Replaces the old `page.tsx:25-43` light footer (`var(--canvas)`, `var(--border-default)` top line).

---

## `PipelineCard` — signature component (`src/components/landing/PipelineCard.tsx:1`)

`design.md` §8.6 verbatim. `"use client"`.

**Shell:** `rounded-[24px]` `bg var(--surface)` on the sage hero, `p-6 sm:p-7`, `max-w-[560px]` (`card-content` on sage = white, no shadow — surface contrast is the elevation). Also consumed via `src/components/Hero.tsx:2` (which re-exports the card).

**Header row:** eyebrow `PHOTOS → 3D` (`font-mono 12px/0.12em var(--text-muted)`) + `Demo` pill (`bg var(--positive-pale)` + `var(--positive-copy)` + `var(--positive)` dot, `rounded-full`, labeled per `PRODUCT.md` — the demo is scripted, say so).

**Drop zone:** dashed `1.5px var(--border-default)`, `rounded-[16px]`, `bg var(--canvas-soft)`, `min-h 132px`, centered: icon well `var(--surface)` + hairline, title `Drop a product photo` (`14px/600 var(--text-primary)`), sub `or watch the demo run` (`12px var(--text-muted)`), `Run demo` pill `bg var(--accent)` `var(--on-accent)` with `Play` icon. Clicking the zone starts the scripted sequence — real uploads are **NOT** wired to the pipeline (landing visitors have no session; the demo uses the bundled demo product — honest by label).

**Pipeline strip:** four mono stages `CAPTURE → MODEL → FINISH → SERVE` (`font-mono 10px/0.08em uppercase`) with status dots per stage:

| Dot state | Fill | Extra |
|---|---|---|
| `pending` | `var(--border-default)` | — |
| `active` | `var(--accent)` | `box-shadow 0 0 0 4px var(--accent-pale)` pulse, `color var(--accent-copy)` on the label |
| `complete` | `var(--positive)` | `color var(--positive-copy)` |

The strip container is `role="status" aria-live="polite" aria-label="Pipeline progress"` (stage changes announce). Decorative `h-px` connectors (`var(--border-default)`) are `aria-hidden`. `prefers-reduced-motion` collapses pulses via the global base rule.

**Result pane:** after the script completes, cross-fade in a real `<model-viewer>` with `PRODUCTS[0]` (SheenChair GLB, `src/lib/types.ts:18`) — the card embeds `model-viewer` directly (`next/script` `lazyOnload`, `pageLoaded` guard, same `load/progress/error` pattern as `ThreeDConfigurator.tsx:35-77`; do not import the component itself). Loader: spinner + `Loading… {progress}%`. Circular rotate/reset controls 48px icon buttons (`active: var(--ink)/var(--on-ink)` vs `var(--surface)/var(--border-default)` idle) + `aria-pressed` on rotate. On success `arSupported` shows the `View in your space` ink button (`slot="ar-button"`). No layout shift: the pane reserves `min-height 280px` when `phase === "done"` (otherwise `display: none` + `min-height 0`).

**Footer row:** one-line embed snippet (`font-mono 11-12px var(--text-secondary)`) on a `var(--canvas-soft)` hairline well + `button-primary` (`Start your project → /auth`); when `done`, a `Replay` (`button-secondary`) resets. Microcopy `font-mono 11px var(--text-muted)`: `Demo uses a bundled model — no upload required. Real projects: artist-finished in hours.`

**Script:** `Run demo` → stages advance on a timer (1.2s each + 1.8s `FINISH` pause to dramatize the artist pass, `Capture(1.2) → Model(1.2) → Finish(1.8) → Serve(1.2)`; the `Finish — artist pass, typically hours` hint shows at the active `FINISH` stage) → `phase: done` → result pane reveals. `Replay` resets to `idle`. The demo is obviously labeled (header `Demo` pill + loader hint + footer microcopy) — the honest version of the currency-converter moment.

**Behavior requirements:** reduced-motion collapses stage pulses; `model-viewer` lazy (no GLB fetch on initial HTML — `src={pageLoaded ? product.src : undefined}`); dark mode verified (`--surface`/`--canvas-soft`/`--border-default`/`--positive-*`/`--accent-copy` all invert; ink elements `var(--ink)/var(--on-ink)` stay constant).

---

## Copy truth (MANDATORY — from `PRODUCT.md` §Evidence on Hand)

No invented metric, customer, or benchmark survives. Current page's invented proof was:

| # | Current (pre-Phase 3) | Treatment |
|---|---|---|
| T1 | `+40% Conversion Lift / −25% Return Rate / <5 Min Integration` (`Hero.tsx:51-60`) | Removed. Replaced by product facts: `Hours — photo to live embed` · `1 line — iframe embed` · `GLB + USDZ — web + AR formats`. |
| T2 | `Maison, Nordik, Lumière, Atelier, Verve, Cobalt, Hazel, Monoforge` + `Trusted by premium D2C brands` (`LandingExtras.tsx:3,12-35`) | Removed. Reframed as a category strip: `Built for furniture · jewelry · apparel · decor storefronts` (categories are not customer claims). |
| T3 | `+40% / −25% / <5 Min / 12k+ Brands Live` (`LandingExtras.tsx:5-10,37-53`) | Band removed. Slot taken by `HowItWorks`. |
| T4 | `From The Field` — 4 invented brand quotes + metrics, `84+ countries` (`LandingPageClient.tsx:117-178`) | Removed entirely. Replaced by `ArtistFinishBand` — the true differentiator (draft-by-AI / finish-by-artist / QC / optimize). |
| T5 | `Sub-200ms loads across 84 countries` / `Global Edge CDN… sub-second load times worldwide` (`LandingExtras.tsx:86`, `BentoFeatures.tsx:67-70`) | Rewritten honestly: `Models are optimized and CDN-served for fast storefront loads — progressive streaming, not heavy downloads.` |
| T6 | `From photo to interactive 3D in under 90 seconds` | Dies with T4. Confirmed promise is **hours**, never minutes/seconds. |
| T7 | `AR in 5 Seconds` (`Hero.tsx:13`) | Rewritten: `AR view-in-room — no app required` (iOS Quick Look + Android WebXR is factual). In current copy: `view in your customers' rooms` / `View in your space`. |
| T8 | `The Future of D2C Commerce` hero pill | Rewritten to the offer: `3D & AR for D2C storefronts` → `PHOTOS → INTERACTIVE 3D`. |
| T9 | `Boost conversions and reduce returns… perfectly calibrated` | Rewritten from positioning: `Peka AR turns your product photography into artist-finished 3D assets — live on your storefront in hours, embeddable with one line, viewable in your customers' rooms.` |
| T10 | `12k+ Brands Live` / any `brands shipping to N countries` variants | After edits `rg -n "12k|84\+|31%|42%|\+40%|−25%|-25%|90 seconds|Sub-200|sub-200" src/` → 0. |

**Allowed always:** the four positioning claims (hours-not-weeks; artist-finished-not-raw-AI; one-embed + AR zero-hassle; honest price-to-quality) + verifiable product facts (`iframe`, `GLB/USDZ`, `model-viewer`, `Quick Look/WebXR`, demo content labeled `Demo`). After Phase 3 `rg -in "maison|nordik|lumière|atelier|verve|cobalt|hazel|monoforge" src/` → 0.

**Greps to keep green:**

```powershell
rg -in "maison|nordik|lumière|atelier|verve|cobalt|hazel|monoforge" src/  # → 0
rg -n "12k|84\+|31%|42%|\+40%|−25%|-25%|90 seconds|Sub-200|sub-200" src/     # → 0
rg -n "mesh-bg|gradient-text|glow-border|accent-ring" src/app/page.tsx src/components/landing src/components/LandingPageClient.tsx src/components/BentoFeatures.tsx  # → 0
rg -n "#cc785c|#c44320|#faf9f5|#efe9de|#1A1A1A|#181715" src/app/page.tsx src/components/landing src/components/LandingPageClient.tsx src/components/BentoFeatures.tsx src/components/ProductCatalog.tsx src/components/ThreeDConfigurator.tsx  # → 0
```

---

## Anchor contract

Must not break — `TopNav` (`src/components/TopNav.tsx:28-29`) and `Hero` CTA link to these ids. Phase 3 preserves all three:

| Id | Element | File | Maps to |
|---|---|---|---|
| `#features` | `<section id="features">` | `src/components/BentoFeatures.tsx:7` | `TopNav` "Features" link. |
| `#sandbox-anchor` | `<section id="sandbox-anchor">` | `src/components/LandingPageClient.tsx:89` | Hero `Try the live demo` + TopNav preview. |
| `#showroom-catalog-panel` | `<section id="showroom-catalog-panel">` | `src/components/LandingPageClient.tsx:137` | `HeroCTA`/`ARDemoButton` legacy target (kept for external backlinks). |

Removal or rename would be a breaking change (checked in Gates §Functional).

---

## Data flow

- **No server data:** `page.tsx` is a static server component — no `requirePrincipal`, no `getUserProjects`, no DB.
- **Demo data:** `src/lib/types.ts:18` `PRODUCTS[]` (currently 1 entry: `sheen-armchair` `SheenChair.glb` on `raw.githubusercontent.com` + unsplash thumbnail). Used by `PipelineCard` (`PRODUCTS[0]`) and `LandingPageClient` (`activeProduct` state + `ProductCatalog` grid). The demo is **labeled** `Demo` in the card header, catalog chips, and configurator overlay.
- **`LandingExtras.tsx`** (`src/components/LandingExtras.tsx:1`) now exports **stubs** (`TrustMarquee`/`StatsRibbon`/`GradientCTA` → `null`) to preserve import compat — no content, no claims.

---

## Files & line index

| Element | Location |
|---|---|
| Landing route | `src/app/page.tsx:1` |
| `Hero` (sage band + metrics + CTA) | `src/components/Hero.tsx:1` (canonical) + `src/components/landing/Hero.tsx:1` (folder mirror) |
| `HeroCTA` stubs | `src/components/HeroCTA.tsx:1` (`ScrollToSandboxButton`/`ARDemoButton` — now capsule `btn-*`, keep `focus-visible`) |
| `PipelineCard` | `src/components/landing/PipelineCard.tsx:1` |
| `CategoryStrip` | `src/components/landing/CategoryStrip.tsx:1` |
| `HowItWorks` | `src/components/landing/HowItWorks.tsx:1` |
| `ArtistFinishBand` | `src/components/landing/ArtistFinishBand.tsx:1` |
| `BentoFeatures` (v2) | `src/components/BentoFeatures.tsx:1` |
| `CTABand` | `src/components/landing/CTABand.tsx:1` |
| `LandingFooter` | `src/components/landing/LandingFooter.tsx:1` |
| `LandingPageClient` (sandbox) | `src/components/LandingPageClient.tsx:1` |
| `LandingExtras` stubs | `src/components/LandingExtras.tsx:1` |
| `ProductCatalog` (rethemed) | `src/components/ProductCatalog.tsx:1` |
| `ThreeDConfigurator` (rethemed) | `src/components/ThreeDConfigurator.tsx:1` |
| Demo data | `src/lib/types.ts:18` (`Product` interface + `PRODUCTS`) |
| `Wordmark` (used in footer) | `src/components/Wordmark.tsx:1` |
| `TopNav` anchor links | `src/components/TopNav.tsx:28-29` |

---

## Verification (Phase 3 gates)

1. **Static:** `npm run lint` (0) · `npm run build` (NODE_OPTIONS=6144) · `npm run test` (58/58).
2. **Copy-truth greps:** see §Copy truth.
3. **Design-contract audit:** buttons capsule; one coral CTA per viewport; cards 24px; bands alternate `sage → white → ink` by ground; no gradients/mesh/glow; display type Manrope clamped; eyebrows are the only tracked-uppercase text.
4. **A11y:** single `h1` → `h2`s → `h3`s; pipeline strip `role="status" aria-live="polite"`; all controls keyboard-reachable with visible rings; `prefers-reduced-motion` pauses marquee + pulses.
5. **Functional:** anchors navigate; demo script runs end-to-end (Run demo → 4 stages → `model-viewer` visible + rotatable + `View in your space` when supported); CTAs hit `/auth`.
6. **Performance:** `model-viewer` dynamic (`lazyOnload` + `pageLoaded` guard) — GLB fetch only when PipelineCard result or sandbox approaches; no fetch on initial HTML; Lighthouse `/` no regression.
