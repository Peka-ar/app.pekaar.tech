# `/` — Landing

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md) · Design contract: `design.md` (local-only) + `globals.css` · Product truth: `PRODUCT.md` (local-only) §Positioning, §Evidence on Hand

The landing is the v3 design showcase and the product's salesperson: a sage-band hero driving **one primary action** (`Book a demo call` → `/auth`), an honest-evidence section stack, the interactive sandbox, the free-pilot risk reversal, an objection-handling FAQ, and an ink-band close. **Every fabricated claim is banned** (see §Copy truth — a hard product commitment). Attributed third-party research with outbound links is allowed, phrased as reported outcomes, never as Peka's own results.

---

## Route & auth

| | |
|---|---|
| **Route** | `/` — static server component, public. No server data, no `requirePrincipal`. |
| **Shell** | None — the page composes its own bands; `TopNav` is rendered globally by the root layout. |
| **SEO** | Title/description/OG in `src/app/layout.tsx`; FAQ `FAQPage` JSON-LD inlined in `src/app/page.tsx`. |
| **Anchors** | `#how-it-works`, `#benefits`, `#features`, `#sandbox-anchor`, `#showroom-catalog-panel`, `#pilot`, `#faq` (see §Anchor contract). |

### Composition tree (in order)

```
<TopNav />                         // global — mobile CTA + anchor links
<Hero />                           // sage band · display-xl headline + PipelineCard
<CategoryStrip />                  // platform-compat strip (Shopify/Woo/Webflow/Custom)
<ProblemSolution />                // problem vs fix, return-rate context
<ProductProofRail />               // offer-proof chips on sage
<TaglineReveal />                  // scroll word-reveal on peach
<Benefits />                       // 3 outcome cards, proof beside claim
<HowItWorks />                     // Send → Finish → Embed on sky
<LandingPageClient />              // sandbox + catalog on full-bleed sage
<PilotOfferBand />                 // free-pilot risk reversal (ink)
<ArtistFinishBand />               // ink card on sage
<BentoFeatures />                  // capabilities bento — sage/ink/peach/sky tiles
<FAQ />                            // 8-Q accordion on sage
<CTABand />                        // ink closing band
<LandingFooter />                  // ink footer, sitemap + disclosures
```

Section components live in `src/components/landing/`; `LandingPageClient`, `ProductCatalog`, `ThreeDConfigurator`, `BentoFeatures` stay in `src/components/`.

---

## Sections

**Design-band rhythm (contract):** `sage → white → white → sage(rail) → peach → white → sky → sage(sandbox) → white → sage → white → sage → white → ink` — no run of more than two whites. Peach/sky appear **only on non-interactive surfaces** (Peka Green owns interaction).

### Hero (`src/components/Hero.tsx` + `landing/PipelineCard.tsx`)
- Sage ground, flat. Staged load choreography (eyebrow → H1 → sub → CTAs → risk line → proof row → card; ~90ms steps, `0.7s` rise) — skipped entirely under `prefers-reduced-motion`. No scroll-linked motion in the hero.
- H1 `.display-xl` (Figtree 900): `Your products in 3D and AR, live on your storefront in hours.` Sub carries `First model free.`
- **CTA row (single primary):** `.btn-primary` `Book a demo call` → `/auth`; `.btn-tertiary` `See live 3D` → `#sandbox-anchor`. Risk microline below.
- Metrics row: product facts only (`Hours` / `1 line` / `GLB + USDZ`). Proof line (S1): HBR 19.8% AR purchase lift, attributed + linked.
- Right column: `<PipelineCard />` (below CTAs on mobile).

### Scroll motion (`landing/Reveal.tsx`)
framer-motion, landing-only dependency, transform/opacity exclusively. `<Reveal>` = `whileInView` fade-rise (`once: true`), returns the plain static tree under `useReducedMotion()` — content is never gated behind animation, no-JS renders everything. Applied to most section headers/cards. **The one scrub:** HowItWorks (`useScroll` accent `scaleX` draw + sequential step brightening on `lg`); not rendered under reduced motion.

### CategoryStrip (`landing/CategoryStrip.tsx`)
Integration-fact strip: `WORKS ON` + `Shopify · WooCommerce · Webflow · Custom` + `one-line iframe` micro-label; categories only as an `sr-only` line. Mobile: marquee that swaps to a **static wrapped list** under reduced motion (client-side branch — CSS-only `motion-reduce:` was rejected: Tailwind emitted `.hidden` after the media block, so it would have won the cascade).

### ProblemSolution (`landing/ProblemSolution.tsx`)
Two-card grid: Problem (sage fill, "Flat product photos leave shoppers guessing." + S3 return-rate context) vs Fix (ink fill, "Let them hold it before they buy it." + S2 80% confidence stat + CTA).

### ProductProofRail (`landing/ProductProofRail.tsx`)
Sage band, server component, no motion, **no CTA** (one-primary-CTA rule). Lead `You run the storefront. We run the 3D.` + four offer-fact chips (Free pilot model / Artist-finished / GLB + USDZ formats / You keep the files).

### TaglineReveal (`landing/TaglineReveal.tsx`)
Peach ground, Figtree-900 word-reveal: `AI drafts in minutes. Artists finish by hand. Shoppers see it in their room.` Per-word **IntersectionObserver** (`threshold 0.9`, unobserve on reveal) — never a scroll listener. No-JS fallback reveals all words.

### Benefits (`landing/Benefits.tsx`)
`id="benefits"`, white ground. Three sage cards with per-card tinted icon wells (accent-pale / peach / sky): Live in hours not weeks · Artist-finished not raw AI (S1 proof footer) · One line zero hassle (S2 proof footer). **Proof footers sit beside the claim they support.**

### HowItWorks (`landing/HowItWorks.tsx`)
`id="how-it-works"`, sky ground. Three steps (01 SEND / 02 FINISH / 03 EMBED — draft is internal, not a customer step) as white cards + the scrub connector. Eyebrow uses `--text-secondary` (muted is illegible on sky).

### Sandbox (`src/components/LandingPageClient.tsx`)
Full-bleed sage band wrapping the constrained content. A live `model-viewer` demo IS the proof — kept, with honest copy: `Demo model — labeled. Real projects are artist-finished in hours.`
- Single header lives in `ProductCatalog` (`Showroom collections` / `Demo showroom`); anchors `#sandbox-anchor` + `#showroom-catalog-panel` preserved.
- Category pills are **derived from products present** (`["All", ...new Set(products.map(p => p.category))]`) — no pill can filter to an empty grid; an empty state covers gaps.
- `ThreeDConfigurator` + `ProductCatalog` are token-themed only — **do not touch the model-viewer logic** (load/progress/error handlers, camera preservation, `canActivateAR` gating).

### PilotOfferBand (`landing/PilotOfferBand.tsx`)
`id="pilot"`, ink band. `Your first model is free.` + primary CTA + secondary `Read the FAQ` → `#faq`. Three supporting rows: what you get / what we need / what happens next.

### ArtistFinishBand (`landing/ArtistFinishBand.tsx`)
Sage band with an ink card: `Finished by hand` accent span + three rows (draft→refine→optimize, QC at 1:1, optimized + AR-ready). Zero invented customers/metrics.

### BentoFeatures (`src/components/BentoFeatures.tsx`)
`id="features"`, white ground, `md:grid-cols-3` grid with sage/ink/peach/sky tiles: Zero-friction embed (iframe snippet visual) · Calibrated 1:1 scale (ink) · Adaptive embeds (peach) · Optimized + CDN-served (sky — honest copy, no sub-200ms/countries claims). Body copy on tinted cards stays `--text-secondary` (AA on peach/sky).

### FAQ (`landing/FAQ.tsx`)
`id="faq"`, sage ground, 8-Q accordion: speed, photos needed, storefront compat, AR mechanics, revision flow, file ownership, **attributed named-brand outcomes** (Q7: Gunner Kennels +40%/−5% via Shopify; IKEA −35% returns/+14% sales — framed as their reported results with category caveats), free-pilot scope. Every item white with a hairline; the open item distinguishes itself with a `1px var(--border-ink)` border. `aria-expanded`/`aria-controls`; panel transition is `grid-template-rows 0fr→1fr` only. Matching `FAQPage` JSON-LD in `src/app/page.tsx`.

### CTABand + Footer
CTABand: ink band, `Get your free pilot model this week.` — **final CTA identical to the hero** (conversion rule). LandingFooter: ink, sitemap columns + fine print with the disclosure line `Third-party stats cited belong to their publishers and are linked beside each claim.`

---

## `PipelineCard` — signature component (`src/components/landing/PipelineCard.tsx`)

The hero's right column: a scripted photo → 3D transformation that makes the pipeline visible. `"use client"` (framer-motion).

- **Transformation pane (fixed 300px, no layout shift):** four cross-fading layers — Photo (local model-matched `public/velvet_sheen_armchair.jpg`) → AI draft (scanline + viewfinder) → Artist finish (scrim + three staggered checks: geometry refined / materials baked / scale checked 1:1) → Serve (GLB + USDZ pills + iframe snippet) → Live 3D (the real `<model-viewer>` fades in). The viewer **mounts when the run starts** so the GLB streams during the scripted stages.
- **Narration panel:** fixed min-height under the pane (no layout shift); running copy shows `Step n of 4 · STAGE` + a plain-language sentence.
- **Autoplay:** `useInView(cardRef, { once: true, margin: "-16%" })` — **disabled under reduced motion**; manual `Run demo` always available. Timers: CAPTURE 2.6s → MODEL 3.2s → FINISH 4s → SERVE 3s (~13s total).
- **Pipeline strip:** `role="status" aria-live="polite"` stage dots mirroring the pane. Pane is `aria-hidden` until done.
- **Footer:** iframe snippet + `Book a demo call` → `/auth`; `Replay` resets when done. Microcopy: demo uses a bundled model, no upload required; real projects artist-finished in hours; first model free.

---

## Copy truth (MANDATORY)

No invented metric, customer, or benchmark — ever. This is the product honesty contract.

**Allowed always:** the positioning claims (hours-not-weeks; artist-finished-not-raw-AI; one-embed + AR zero-hassle; honest price-to-quality) + verifiable product facts (`iframe`, `GLB/USDZ`, `model-viewer`, Quick Look/WebXR, demo content labeled `Demo`).

**Banned claims (do not reintroduce):**
- Invented brand names as customers (`Maison`, `Nordik`, `Lumière`, `Atelier`, `Verve`, `Cobalt`, `Hazel`, `Monoforge`) and "Trusted by premium D2C brands"
- `+40% Conversion Lift` / `−25% Return Rate` / `<5 Min Integration` / `12k+ Brands Live` as **Peka's own** numbers
- `Sub-200ms loads across 84 countries` / any `84+` countries / `90 seconds` / `AR in 5 Seconds` / `The Future of D2C Commerce`
- "From photo to interactive 3D in under 90 seconds" — the confirmed promise is **hours**, never minutes/seconds
- v2 visual classes: `mesh-bg`, `gradient-text`, `glow-border`, `accent-ring`; v2 hex values

**Attributed third-party stats (allowed with publisher + year + outbound link, phrased as reported outcomes):**

| # | Stat | Source | Used in |
|---|---|---|---|
| S1 | AR shoppers 19.8% more likely to purchase (HBR, Mar 2022) | hbr.org | Hero proof line, Benefits #2 |
| S2 | 80% of AR shoppers feel more confident buying (Alter Agents/Snap/Publicis, Jul 2022) | alteragents.com | ProblemSolution, Benefits #3 |
| S3 | Online returns near 30%; looks-different a top reason | mytotalretail.com | ProblemSolution |
| S4 | Gunner Kennels +40% conversion / −5% returns (Shopify case study) | shopify.com | FAQ Q7 |
| S5 | IKEA −35% returns / +14% online sales (launch-period) | via S3 context | FAQ Q7 |

**Banned even with attribution:** the `94% higher conversion` figure (no published methodology); unverifiable `71% would shop more with AR`; round vendor multiples (`2–3x`). The page claims **no** retention/time-on-page lift — no citable data exists.

---

## Anchor contract

Must not break — `TopNav`, Hero CTAs, and the footer sitemap link to these ids. All anchored sections carry `scroll-mt-16` for the sticky 64px `TopNav`.

| Id | File | Maps to |
|---|---|---|
| `#features` | `src/components/BentoFeatures.tsx` | TopNav "Features", footer sitemap |
| `#sandbox-anchor` | `src/components/LandingPageClient.tsx` | Hero `See live 3D` + TopNav "Live 3D" |
| `#showroom-catalog-panel` | `src/components/LandingPageClient.tsx` | External backlinks, footer sitemap |
| `#how-it-works` | `src/components/landing/HowItWorks.tsx` | TopNav "How it works", footer sitemap |
| `#benefits` | `src/components/landing/Benefits.tsx` | (no nav link yet — document order) |
| `#pilot` | `src/components/landing/PilotOfferBand.tsx` | TopNav "Free pilot", footer sitemap |
| `#faq` | `src/components/landing/FAQ.tsx` | TopNav "FAQ", PilotOfferBand secondary CTA, footer sitemap |

Removal or rename of any id with inbound links is a breaking change.

---

## Data flow

- **No server data.** FAQ JSON-LD is a static object.
- **Demo data:** `PRODUCTS[]` in `src/lib/types.ts` (currently one entry: `SheenChair.glb` on GitHub raw). The catalog thumbnail is the **model-matched local reference photo** `/velvet_sheen_armchair.jpg` (served from `public/`) so the card shows the same armchair as the embedded GLB. The demo is labeled `Demo` in the card header, catalog chips, and configurator overlay.
- `src/components/LandingExtras.tsx` exports null stubs (`TrustMarquee`/`StatsRibbon`/`GradientCTA`) for import compat only.
- **Client components:** Hero, PipelineCard, HowItWorks (scrub), Reveal, TaglineReveal, FAQ, LandingPageClient, CategoryStrip. Section shells stay server components.

---

## Verification gates (definition of "done" for landing changes)

1. **Static:** `npm run lint` (0) · `npm run build` (pass, all static) · `npm run test` (untouched, server-only).
2. **Copy-truth:** grep `src/` for the banned names/numbers above → 0 real matches (ignore the `xl:w-[42%]` Tailwind class in `AuthClient.tsx`).
3. **Design contract:** one primary CTA per viewport (`Book a demo call`); band rhythm — no run of more than two whites; peach/sky only on non-interactive surfaces; no gradients/mesh/glow; Figtree-900 display clamped; eyebrows are the only tracked-uppercase text; v3 tokens only.
4. **A11y:** single `h1`; pipeline strip `role="status" aria-live="polite"`; transformation pane `aria-hidden` until interactive; FAQ `aria-expanded`/`aria-controls`; keyboard-reachable controls with visible rings; `prefers-reduced-motion` disables choreography + autoplay + reveals + scrub + marquee.
5. **Functional:** all 7 anchors navigate; demo autoplays once on hero-in-view and runs end-to-end (rotatable + `View in your space` when supported); `Replay` resets; every primary CTA hits `/auth`; category pills always resolve; outbound stat links open `target=_blank rel=noopener`.
6. **Performance:** `model-viewer` script `lazyOnload` + `pageLoaded` guard — GLB streams only once the hero run starts; the local pipeline photo is eager/priority (LCP); framer-motion consumed by landing client leaves only.
