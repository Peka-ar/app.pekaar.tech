# `/` — Landing (deep dive)

> Parent: [`../WEBSITE.md`](../WEBSITE.md) · Source: `src/app/page.tsx:1`, `src/components/Hero.tsx:1`, `src/components/landing/*`, `src/components/BentoFeatures.tsx:1`, `src/components/LandingPageClient.tsx:1` · Contract: `design.md` "Layout" (band cycle as implemented in `WEBSITE.md` §12), "Components > Signature Components" (PipelineCard), "Typography > Hierarchy" (display scale) · Product: `PRODUCT.md` §Positioning, §Evidence on Hand

> **Visual styling:** per-element token notes below were written against v2 naming for the older sections. The landing ran the **v3 sweep** (`tasks/v3-wise-migration` Phase 4) and the **conversion redesign (2026-09)**: the **authoritative as-built** design reference is `WEBSITE.md` §12 + `design.md` + the token/class blocks in `globals.css` (sage `hero-band`, `.display-*` Figtree 900, `.btn-primary`/`.btn-tertiary`, ink `--border-ink` pipeline card, Inter eyebrows — no `font-mono` body copy, no Manrope, no coral).

The landing is the v3 showcase and the product's best salesperson: a sage-band hero driving **one primary action** (`Book a demo call` → `/auth`), an honest-evidence section stack, the interactive sandbox (kept, fixed), the free-pilot risk reversal, an objection-handling FAQ, and an ink-band close. **Every fabricated claim is removed** — this is a hard product commitment from `PRODUCT.md` (see §Copy truth). Attributed third-party research with outbound links is allowed (see §Copy truth S1–S5) — phrased as reported outcomes, never as Peka's own results. The landing consumes zero deprecated tokens/classes and no hard-coded v2 hexes.

**2026-09 color pass:** the landing broke up long white runs by promoting the dormant tertiary hues into **role tokens** (`--surface-peach` / `--surface-sky`, glyphs `--surface-peach-deep` / `--surface-sky-deep` — `globals.css:36-42`, bindings `:58-59`) and adding a `ProductProofRail` band. Peach and sky are **capability/story surfaces only** — never on buttons/links/controls (Peka Green owns interaction). Band rhythm now `sage → white → white → sage(rail) → peach → white → sky → sage(sandbox) → white → sage → white → sage → white → ink` — no run longer than two whites (see §Verification).

---

## Route & auth

| | |
|---|---|
| **Route** | `/` |
| **File** | `src/app/page.tsx:1` (server component) |
| **Auth** | Public. No `requirePrincipal`. The root layout's `TopNav` handles public/protected header alone. |
| **Layout shell** | None. The page composes its own bands; `TopNav` is rendered globally by `src/app/layout.tsx:79`. |
| **Deep link anchors** | `#how-it-works` (HowItWorks), `#benefits` (Benefits), `#features` (BentoFeatures), `#sandbox-anchor` (LandingPageClient configurator), `#showroom-catalog-panel` (LandingPageClient catalog), `#pilot` (PilotOfferBand), `#faq` (FAQ). The legacy anchor contract (`#features` / `#sandbox-anchor` / `#showroom-catalog-panel`) is preserved for `TopNav` (`src/components/TopNav.tsx`) and external backlinks. |
| **SEO** | Evergreen offer → indexed. Title/description/OG in `src/app/layout.tsx:31-47`; FAQ JSON-LD (`FAQPage`) inlined in `src/app/page.tsx:17-75` (`<script type="application/ld+json">`). |

### Server entry (`src/app/page.tsx:77`)

```tsx
export default function LandingPage() {
  return (
    <div style={{ background: "var(--canvas)" }}>
      <Hero />
      <CategoryStrip />      // platform-compat strip (reworked 2026-09)
      <ProblemSolution />    // NEW — problem → solution for cold traffic
      <ProductProofRail />   // NEW — offer-proof band (sage, color pass 2026-09)
      <TaglineReveal />      // NEW — scroll word-reveal (B11 moment; peach ground)
      <Benefits />           // NEW — 3 outcome cards, proof beside claim
      <HowItWorks />         // 3 steps (reworked 2026-09)
      <LandingPageClient />  // sandbox + catalog (deduped header, dynamic pills)
      <PilotOfferBand />     // NEW — free-pilot risk reversal (ink)
      <ArtistFinishBand />
      <BentoFeatures />
      <FAQ />                // NEW — 8-Q accordion + JSON-LD source
      <CTABand />            // reworked: free-pilot close
      <LandingFooter />      // expanded: sitemap + stats disclosure
    </div>
  );
}
```

Composition tree (in order):

```
<TopNav />                         // global — mobile CTA + anchor links (fixed 2026-09)
<Hero />                           // sage band · Figtree-900 display-xl headline + PipelineCard  [§Hero]
<CategoryStrip />                  // platform-compat reframe (Shopify/Woo/Webflow/Custom)       [§CategoryStrip]
<ProblemSolution />                // flat-photos problem vs 3D+AR fix, return-rate context      [§ProblemSolution]
<ProductProofRail />               // offer-proof tick strip on sage (color pass 2026-09)         [§ProductProofRail]
<TaglineReveal />                  // scroll word-by-word reveal on peach ground                  [§TaglineReveal]
<Benefits />                       // 3 outcome cards, proof beside each claim                    [§Benefits]
<HowItWorks />                     // Send → Finish → Embed on sky ground                          [§HowItWorks]
<LandingPageClient />              // sandbox + catalog on a full-bleed sage band                 [§Sandbox]
<PilotOfferBand />                 // free-pilot risk reversal (ink)                              [§PilotOfferBand]
<ArtistFinishBand />               // ink card on sage ground (color pass 2026-09)               [§ArtistFinishBand]
<BentoFeatures />                  // capabilities bento — sage/ink/peach/sky tiles                [§Bento]
<FAQ />                            // 8-Q accordion on sage ground (objection handling)            [§FAQ]
<CTABand />                        // ink closing band (free-pilot close)                         [§CTABand]
<LandingFooter />                  // ink footer, sitemap + disclosures                           [§Footer]
```

New section components live in `src/components/landing/` (landing now warrants a folder). `LandingPageClient.tsx` stays at `src/components/`. `ProductCatalog.tsx` + `ThreeDConfigurator.tsx` keep their `model-viewer` logic untouched.

---

## Sections

### Hero — sage band + PipelineCard (`src/components/Hero.tsx:1` + `src/components/landing/PipelineCard.tsx:1`)

`design.md` "Layout" + "Components > Signature Components"; band 1 anatomy as implemented (see `WEBSITE.md` §12).

- **Ground:** hero band is **sage** (`var(--canvas-soft)`), flat — no `mesh-bg`, no gradient.
- **Motion:** `Hero` is `"use client"` (framer-motion). Staged load choreography — eyebrow → H1 → sub → CTAs → risk line → proof row → card (~90ms steps, `0.7s` `cubic-bezier(0.32,0.72,0,1)` rise, shared `EASE` in `Reveal.tsx`); skipped entirely under `prefers-reduced-motion` (static tree). No scroll-linked motion in the hero (it is the first viewport).
- **Eyebrow:** Inter (sans) 12px/600 uppercase tracked `--text-muted`: `3D & AR for D2C storefronts` (was `Photos → Interactive 3D`).
- **H1:** `.display-xl` (Figtree 900 cut — `globals.css:113`; clamp `2.5rem→5.5vw→4rem`, lh `.85`, tracking `-0.02em`) `--text-primary`, `text-wrap: balance`. Copy: `Your products in 3D and AR, live on your storefront in hours.` (outcome + audience; was `Your product photos, live in 3D — in hours, not weeks.`).
- **Sub:** sans 18px/1.6 `--text-secondary`, `max-w-xl`: managed-3D-team framing + `First model free.` (risk reversal in the first viewport).
- **CTA row (single primary):** `.btn-primary` (Peka Green fill + ink label, 48px/24px radius) `Book a demo call` → `/auth`; `.btn-tertiary` (white + 1px `--border-ink`, 48px/24px radius) `See live 3D` → `#sandbox-anchor` (de-emphasized secondary). Risk microline below: `First model free · No 3D files or studio needed · iOS + Android AR` (13px `--text-muted`).
- **Metrics row:** product facts only — `Hours — photo to live embed` · `1 line — iframe embed` · `GLB + USDZ — web + AR formats` (sans-semibold 18–20px values + sans 10px/600 uppercase labels, hairline-topped `rgba(14,15,12,.15)`).
- **Proof line (S1):** 12px `--text-muted` with outbound link: `Academic research in Harvard Business Review found shoppers who used AR were 19.8% more likely to purchase.` → `https://hbr.org/2022/03/how-augmented-reality-can-and-cant-help-your-brand` (`target=_blank rel=noopener`). Attributed, never Peka's own result.
- **Right column:** `<PipelineCard />` (see §PipelineCard). Desktop: 2-col grid (`lg:grid-cols-2`), mobile: stacked, card below CTAs.

### Scroll motion — `Reveal` + one scrub (`src/components/landing/Reveal.tsx:1`)

framer-motion powers the scroll story (landing-only dependency; transform/opacity exclusively, compositor-friendly). One shared vehicle:

- **`<Reveal>`** (`"use client"`): `whileInView` fade-rise (`y 28→0`, `0.7s`, shared `EASE`), `viewport={{ once: true, margin: "-64px" }}`, optional `delay` stagger. Under `useReducedMotion()` it returns the plain static tree — content is never gated behind animation, no-JS renders everything.
- **Applied to:** ProblemSolution cards (0/0.12), Benefits header + cards (`i*0.1`), HowItWorks header + steps, sandbox header + configurator + catalog (`LandingPageClient`), Pilot/Artist band copy + rows, Bento header + tiles, FAQ header + items (`min(i*0.06, 0.3)`), CTABand band (`y 36`), footer (`y 16`). TaglineReveal word-reveal is untouched (pre-existing motion); CategoryStrip's mobile marquee is its own client-side reduced-motion branch (§CategoryStrip).
- **The one scrub:** HowItWorks is `"use client"` with `useScroll({ target, offset: ["start 0.85", "end 0.45"] })` — an accent `scaleX` draw overlays the static hairline connector on `lg`, and steps brighten sequentially (`i <= activeStep`, upcoming at `opacity .5`). Scrub line is not rendered under reduced motion (steps render fully lit).

### CategoryStrip — platform-compat strip (`src/components/landing/CategoryStrip.tsx:1`)

Reworked 2026-09 from the category list (`furniture · jewelry · apparel · decor`) into an **integration-fact** strip — platforms are verifiable compat facts, not customer claims:

- Single quiet strip, `--canvas` ground, hairline `border-[var(--border-default)]` top+bottom.
- Eyebrow `WORKS ON` (`--text-muted`) + four platforms (`Shopify · WooCommerce · Webflow · Custom`) set in sans semibold 18–20px (`--text-primary`), separated by 6px accent dots (`--accent`). Trailing micro-label `one-line iframe` in caps. Categories survive only as an `sr-only` line (`Built for furniture, jewelry, apparel and decor storefronts.`).
- **Mobile:** marquee on the platform words (duplicated list for loop, `animate-[marquee_22s_linear_infinite]`, clones `aria-hidden`). The strip is now `"use client"` so reduced motion can swap the marquee for a **static wrapped list** via framer-motion's `useReducedMotion()` (CSS-only `motion-reduce:` was rejected — Tailwind emitted `.hidden` after the media block, so it would have won the cascade).

### ProblemSolution — cold-traffic argument (`src/components/landing/ProblemSolution.tsx:1`)

Server component. Two-card grid (`lg:grid-cols-2`):

| Card | Fill | Headline | Body + proof |
|---|---|---|---|
| Problem | `--canvas-soft` | `Flat product photos leave shoppers guessing.` | Return-rate context (S3): online returns near 30%, looks-different-than-expected a top reason → `mytotalretail.com` link. |
| Fix (ink) | `--ink` | `Let them hold it before they buy it.` (accent span) | Rotatable 1:1 + AR; 80% confidence stat (S2) → `alteragents.com` link. CTA `Book a demo call` (`bg var(--accent)`, `focus-visible` ring `var(--on-ink)`). |

### ProductProofRail — offer-proof band (`src/components/landing/ProductProofRail.tsx:1`)

Server component (no motion), added in the 2026-09 color pass to reinforce the problem→solution beat and break the long white run after `ProblemSolution`. **Ground: sage** (`--canvas-soft`), compact `py-10 sm:py-12`.

- Centered stack: Figtree-900 lead `You run the storefront. We run the 3D.` + `--text-secondary` sub (`A managed team behind your product pages — draft to embed. No 3D hires, no studio, no learning curve.`).
- Four offer-fact chips (`Free pilot model` / `Artist-finished` / `GLB + USDZ formats` / `You keep the files`) as white pills (`bg-[var(--canvas)]`, 9999 px radius) with a `Check` glyph in an `--accent-pale` 16px well (`--ink-deep` stroke). Static reinforcement — **no CTA** (one primary CTA per viewport is preserved; every chip is an offer fact already carried elsewhere on the page).

### TaglineReveal — scroll reveal moment (`src/components/landing/TaglineReveal.tsx:1`)

`"use client"`. Mandatory large-type moment: `AI drafts in minutes. Artists finish by hand. Shoppers see it in their room.` (14 words, Figtree 900 `clamp(1.875rem, 5vw, 3.75rem)`, `max-w-[680px]`, `text-wrap: balance`). **Ground: peach** (`--surface-peach`) since the 2026-09 color pass — type-only band, the only ground text is the words themselves.

- **Animation:** words start at `opacity .28`; each `span.tagline-word` flips to `.is-revealed` (`opacity 1`, `700ms cubic-bezier(0.32,0.72,0,1)`) via a per-word **`IntersectionObserver`** (`threshold 0.9`, unobserve on reveal) — never a scroll listener. No-JS/`IntersectionObserver`-undefined fallback reveals all words.

### Benefits — outcome cards with proof (`src/components/landing/Benefits.tsx:1`)

Server component, `id="benefits"` (white ground). Three `--canvas-soft` cards (`rounded-[24px]`); **icon wells tinted per card** (2026-09 color pass) — `WELL_TONES` drives fill + glyph per index: card 1 `--accent-pale`/`--ink-deep`, card 2 `--surface-peach`/`--surface-peach-deep`, card 3 `--surface-sky`/`--surface-sky-deep` (`Timer`/`HandHeart`/`Code2`):

1. **Live in hours, not weeks** — managed team + workflow vs per-model agency hire; visible stages, no black box. (No external proof — operational promise.)
2. **Artist-finished, not raw AI** — AI drafts in minutes, artist refines geometry/materials/scale + 1:1 QC. Proof footer (S1): HBR 19.8% line + link, hairline-topped.
3. **One line, zero hassle** — iframe on Shopify/WooCommerce/Webflow/custom + Quick Look/WebXR, no app. Proof footer (S2): 80% confidence line + link.

Proof footers sit **beside the claim they support** (conversion rule), in 13px `--text-muted` with outbound links.

### HowItWorks — three steps on sky (`src/components/landing/HowItWorks.tsx:1`)

Reworked 2026-09 from four stages to three (matches the pipeline truth: draft is internal, not a customer step). `id="how-it-works"` (`scroll-mt-16` for the sticky nav). **Ground: sky** (`--surface-sky`) since the 2026-09 color pass — the process band reads cool/technical against sage and white.

| Stage | Eyebrow | Headline (sans 600 18–20px) | Body |
|---|---|---|---|
| 01 | SEND | Send product photos | Standard photography + dimensions — phone photos work. No studio rig, no 3D files, no 3D staff. |
| 02 | FINISH | We draft, artists finish | Pipeline drafts in minutes, 3D artist refines by hand + 1:1 QC. Never raw AI output. |
| 03 | EMBED | One line, live + AR | One iframe on any storefront; rotate/zoom + view-in-room on iOS/Android, hours after photos. |

- Cards: **white** (`--canvas`) on the sky ground, `radius-24`, `grid lg:grid-cols-3 sm:grid-cols-2` (`<ol>`, `list-none`). Step numbers sans 12px/600 `--ink-deep` (un-reached `--text-muted`) + accent dot (un-reached `--border-default`).
- Connecting hairline `rgba(14,15,12,.12)` between cards on `lg` (decorative, `aria-hidden`) + the single scrub moment: an accent `scaleX` draw (`useScroll`, `offset ["start 0.85", "end 0.45"]`) overlays the hairline while steps brighten sequentially (`opacity .5` until reached). Not rendered under reduced motion (all steps lit).
- Section heading: eyebrow `HOW IT WORKS` in `--text-secondary` (muted is illegible on sky) + display heading `Photos in. 3D out. Live on your storefront in hours.` (`text-wrap: balance`) + managed-pipeline sub-line. Header + steps enter via `Reveal`.

### SandboxSection — kept, fixed, re-grounded (`src/components/LandingPageClient.tsx:1`)

Keeps the two real sections — a live `model-viewer` demo **IS** the proof `PRODUCT.md` wants. 2026-09 fixes (honest + token-level, logic untouched) plus the color pass which moved the whole sandbox + catalog onto one **full-bleed sage band**: `LandingPageClient` now returns `<div style={{ background: "var(--canvas-soft)" }}>` wrapping the constrained `<main>` (the `flex-1` moved off `main` — the wrapper carries the page rhythm):

- **Deduped headings:** the catalog section's redundant header block (`Demo catalog` / `Select a product template` / `Demo content — labeled.`) is deleted; the single header lives in `ProductCatalog` (`Showroom collections` / `Demo showroom` / `Demo — labeled`). Anchors preserved: `id="sandbox-anchor"` (configurator section) and `id="showroom-catalog-panel"` (catalog section) — see §Anchor contract.
- **Dead pills fixed (`src/components/ProductCatalog.tsx:14-16`):** category pills are now **derived from products present** (`["All", ...new Set(products.map(p => p.category))]`) so no pill ever filters to an empty grid; an **empty state** (`No demo models in this category yet — Switch back to All…`) covers future gaps. Header renamed `Furniture catalog` → `Demo showroom`.
- **Surfaces on sage (color pass):** the help popup is now a white card (`--canvas`) with `--canvas-soft` wells (was sage wells on white — fills swap 1:1 to keep elevation); the `Guide` pill is white; section hairlines that sat on white were `--border-default` (== sage) and would vanish on the sage band, so the sandbox/catalog header rows now use `rgba(14,15,12,.12)`; `ThreeDConfigurator`'s outer card is white (`--canvas`, border removed) with its `--canvas-soft` loading/error poster intact; inactive catalog pills and the empty state flipped `--canvas-soft → --canvas`; product thumbnail wells stay `--canvas-soft` (they live *inside* the white cards).
- Help popup copy is honest: `About this demo — This sandbox uses a bundled demo model…` (no invented claims). Grid of 3 wells (Native AR / Materials / One-line embed) in honest copy.
- `Interactive Sandbox` eyebrow + `Build your e-commerce embed` heading + sub-line `Demo model — labeled. Real projects are artist-finished in hours.`
- `LIVE ENVIRONMENT` chip: `bg var(--accent-pale)` + `text var(--positive-deep)` + `bg var(--positive)` pulse dot.
- `ThreeDConfigurator.tsx` + `ProductCatalog.tsx` token retheme only — **do not touch the model-viewer logic** (`load/progress/error` handlers, `camera-change` preservation, `canActivateAR` gating).

### PilotOfferBand — free-pilot risk reversal (`src/components/landing/PilotOfferBand.tsx:1`)

Server component, `id="pilot"` (`scroll-mt-16`). Ink band (`rounded-[24px]` `var(--ink)` + `max-w-7xl` construction, same as ArtistFinishBand):

- Headline `display` clamp `1.875rem → 2.75rem` in `--on-ink` with one accent span: `Your first model is free.`
- Sub: `Don't take our word for it — put your own product in 3D on your own storefront…` + CTAs: primary `bg var(--accent)` `Book a demo call` → `/auth`; secondary transparent (`rgba(232,235,230,.22)` border) `Read the FAQ` → `#faq`.
- Three supporting rows (cards-on-ink: `rgba(228,230,220,.06)` fill + `.16` hairline, `rounded-[16px]`), icon wells `--accent-pale` + `--ink-deep` icons (`Gift`/`Camera`/`CalendarCheck`):
  1. What you get — first product free: GLB + USDZ, live embed, AR.
  2. What we need — standard photos + dimensions; phone photos work.
  3. What happens next — demo call → photos → live in hours; no commitment.

### ArtistFinishBand — differentiator (`src/components/landing/ArtistFinishBand.tsx:1`)

**Outer band: sage** (`--canvas-soft`, color pass 2026-09 — the band previously sat on white, doubling the white run between the sandbox and Bento). Inside the `max-w-7xl` container the unchanged **ink card** (`--ink` fill, `rounded-[24px]`) carries the copy. CTA copy: primary `Book a demo call` (single-action consistency); secondary `See the demo` → `#sandbox-anchor`.

- Headline `display-lg` (`clamp 1.875rem → 2.75rem`) in `--on-ink` with one accent span (`Finished by hand` in `var(--accent)`).
- Three supporting points as cards-on-ink rows (`rgba(228,230,220,.06)` fill + `rgba(228,230,220,.16)` hairline, `rounded-[16px]`), each with an icon well + title + body (Draft → refine → optimize / QC at 1:1 scale / Optimized + AR-ready).

Zero invented customers, metrics, or country counts.

### BentoFeatures — capabilities bento (`src/components/BentoFeatures.tsx:1`)

Unchanged by the redesign (keeps `id="features"` anchor). `md:grid-cols-3 gap-6` grid on a white ground. The color pass (2026-09) promoted the four tiles to a **sage / ink / peach / sky** mix (previously three green-family fills — zero visual variety):

| Card | Span | Fill | Icon well | Headline | Body |
|---|---|---|---|---|---|
| Zero-friction embed | `md:col-span-2` | `--canvas-soft` | `--canvas` well + `--ink-deep` `Code2` | | code-snippet visual (`--canvas` inset well `1px var(--border-default)`) showing `<iframe src="https://pekar.tech/embed/…" …>` |
| Calibrated 1:1 scale | `1` | `--ink` | `rgba(228,230,220,.08)` + hairline, `--accent` `Maximize2` | ink card (`--on-ink` text) |
| Adaptive embeds | `1` | `--surface-peach` | `--canvas` well + `--surface-peach-deep` `Puzzle` | Responsive iframe, sandboxed, theme-owned |
| Optimized + CDN-served | `md:col-span-2` | `--surface-sky` | `--canvas` well + `--surface-sky-deep` `Layers` | **Honest copy:** `Models are optimized and CDN-served for fast storefront loads — progressive streaming, not heavy downloads.` (no `Sub-200ms`/`84 countries` claims) |

Body copy on the tinted cards stays `--text-secondary` (AA on both peach and sky), headings `--text-primary` — the tinted tiles are decorative surfaces, not text channels. Section heading: eyebrow `CAPABILITIES` + heading `Built to ship 3D to your storefront — without the heavy lift.` (`text-wrap: balance`).

### FAQ — objection handling (`src/components/landing/FAQ.tsx:1`)

`"use client"`. `id="faq"` (`scroll-mt-16`). 8 questions (see file for full copy):

1. How fast will my model really be live? (hours, same-day typical)
2. What photos do you need from me? (standard + dimensions; phone OK)
3. Will it work on my storefront? (any iframe-accepting stack)
4. How does the AR view-in-room work? (GLB+USDZ, Quick Look/WebXR, no app)
5. What if I don't like the model? (revision notes → rework → publish gate)
6. Who owns the finished 3D model? (you do)
7. What results have other brands seen? (**attributed named-brand outcomes**: Gunner Kennels +40% conversion / −5% returns via Shopify link; IKEA −35% returns / +14% sales — framed as their reported launch results in size-critical categories)
8. What does the free pilot include? (first product free: GLB+USDZ, embed, AR)

- **Interaction:** accordion (`open: number | null`, first item open by default); `aria-expanded` + `aria-controls`; open panel uses animated `grid-template-rows 0fr→1fr` (`300ms cubic-bezier(0.32,0.72,0,1)`); toggle icon `Plus` rotates 45° with ink-fill active state. Layout: sticky left heading column (`lg:sticky lg:top-24`) + right accordion stack.
- **Surfaces (sage ground, color pass 2026-09):** the section band is now sage (`--canvas-soft`); the old open-state fill (`--canvas-soft`) would have vanished on it, so **every item is white** (`--canvas`) with a hairline `rgba(14,15,12,.10)` — the open item distinguishes itself with a `1px var(--border-ink)` border (the 45° ink `Plus` chip is the secondary cue). Panel transition restricted to `grid-template-rows` (the previous `transition-all` animated nothing else and implied layout churn).
- **SEO:** matching `FAQPage` JSON-LD in `src/app/page.tsx:17-75` (7 Q&A pairs; Q7's link-heavy answer condensed to plain text for schema).

### CTABand — free-pilot close (`src/components/landing/CTABand.tsx:1`)

Ink band (same `rounded-[24px]` `var(--ink)` + `max-w-7xl` construction):

- `display` headline `Get your free pilot model this week.` in `--on-ink`, sub (`var(--on-ink)/70`): `Book a demo call, send photos, see your product live in 3D within hours. No 3D files needed.`, single `button-primary`-equivalent (`Book a demo call → /auth`, `h-12 px-7`). Focus ring `var(--on-ink)` for dark-ground visibility.
- No `mesh-bg`, no `gradient-text`. Identical action to the hero (conversion rule: final CTA identical to the top).

### Footer — ink band + sitemap (`src/components/landing/LandingFooter.tsx:1`)

Full-bleed ink footer (`var(--ink)` + `1px rgba(228,230,220,.12)` top hairline), expanded 2026-09 from a single row into a `sm:grid-cols-[1.2fr_1fr_1fr]` grid:

- Brand column: P-badge + `Wordmark` (Figtree + `var(--accent)` dot) + tagline + `GLB + USDZ · one-line iframe · AR view-in-room` line.
- Sitemap columns: **Product** (Live 3D demo / How it works / Free pilot / Features / FAQ — all section anchors) and **Get started** (Book a demo call / Sign in → `/auth`, Privacy, Terms).
- Fine print: `© {year} Peka AR · pekar.tech · Demo models labeled; no fabricated claims.` + disclosure sub-line: `Third-party stats cited belong to their publishers and are linked beside each claim.`

Replaces the old light footer. `Privacy`/`Terms` are `Link` with `focus-visible` rings.

---

## `PipelineCard` — signature component (`src/components/landing/PipelineCard.tsx:1`)

Signature-component anatomy per `design.md` ‘Components > Signature Components’; chrome as-built in `WEBSITE.md` §12. `"use client"` (framer-motion: `useInView` autoplay + layer cross-fades).

**Shell:** `rounded-[24px]` `bg var(--surface)` on the sage hero, `p-6 sm:p-7`, `max-w-[560px]`, `1px var(--border-ink)`.

**Header row:** eyebrow `PHOTOS → 3D` + `Demo` pill (`bg var(--accent-pale)` + `--positive-deep` + `--positive` dot, `rounded-full`, labeled per `PRODUCT.md`).

**Transformation pane (fixed `300px`, no layout shift):** the metamorphosis made visible — four layers cross-fade (`0.5s`, shared `EASE`) inside one pane, driven by the existing stage machine. The photo source is the local, model-matched `public/velvet_sheen_armchair.jpg` (`610×547`, served as `/velvet_sheen_armchair.jpg`) rather than `PRODUCTS[0].thumbnail`; the final result remains the matching SheenChair GLB.
1. **Photo** (idle + CAPTURE): local armchair reference via `next/image` (`priority`) + chip `Your photos` / `Reading photos`.
2. **AI draft** (MODEL): photo at 50% + viewfinder corner ticks (`--ink-deep`), traveling accent scanline (framer-motion `repeat: Infinity`), `Box` icon + `Drafting geometry` chip.
3. **Artist finish** (FINISH): photo + `rgba(14,15,12,.45)` scrim + `Artist pass — by hand` + three checks (`Geometry refined` / `Materials baked` / `Scale checked 1:1`) staggering in (`0.15 + i*0.3`).
4. **Serve** (SERVE): `GLB` + `USDZ` pills + mono iframe snippet on `--canvas-soft`.
5. **Live 3D** (done): the real `<model-viewer>` fades in (`0.6s`) — same lazy wiring (`next/script` `lazyOnload`, `pageLoaded` guard, `load/progress/error`, rotate/reset 48px buttons + `aria-pressed`, `View in your space` when `canActivateAR`), same `Demo model · {name}` chip.

The viewer **mounts when the run starts** (not at done) so the GLB streams during the scripted stages and is typically ready at reveal. Pane is `aria-hidden` until done (status announced via the strip); the revealed model is interactive.

**Persistent narration:** a fixed-min-height panel under the visual prevents explanatory copy from shifting the card. Idle explains the premise and duration; running shows `Step n of 4 · STAGE`, a plain-language title, and one sentence describing the work; done explains that the model can now be rotated or viewed in AR. Running copy fades/rises over `0.35s` (opacity/transform only); under reduced motion it changes immediately.

**Autoplay:** `useInView(cardRef, { once: true, margin: "-16%" })` starts the run on first scroll-into-view (fires on load for the hero position) — **disabled under `prefers-reduced-motion`** (composed photo frame stays). Manual `Run demo` is always available. The explanatory walkthrough lasts about 13 seconds: CAPTURE `2.6s`, MODEL `3.2s`, FINISH `4s`, SERVE `3s`.

**Trigger:** idle-only dashed affordance (`Watch the pipeline run` / `13-second walkthrough — no upload needed`, `Run demo` pill, honest `aria-label`); hidden while running (the visual + narration panel carry the show). It never accepted uploads — landing visitors have no session.

**Pipeline strip:** four stages `CAPTURE → MODEL → FINISH → SERVE` with status dots per stage (`pending`/`active`/`complete` fills + pulse). Container `role="status" aria-live="polite"`. `prefers-reduced-motion` collapses pulses via the global base rule. The strip mirrors the transformation pane above it (dots = narration, pane = show).

**Result (was "Result pane"):** the live `<model-viewer>` with `PRODUCTS[0]` (SheenChair GLB, `src/lib/types.ts:18`) — mounted at run start, revealed at done (see §Transformation pane layer 5). Circular rotate/reset controls 48px icon buttons + `aria-pressed` on rotate. On success `arSupported` shows the `View in your space` ink button (`slot="ar-button"`). No layout shift: pane is a fixed `300px` in all phases.

**Footer row:** one-line embed snippet on a `var(--canvas-soft)` hairline well + `btn-primary` **`Book a demo call`** → `/auth` (was `Start your project`); when `done`, a `Replay` (`btn-secondary`) resets. Microcopy: `Demo uses a bundled model — no upload required. Real projects: artist-finished in hours. First model free.`

**Script:** `Run demo` → stages advance on explanatory timers (`Capture(2.6) → Model(3.2) → Finish(4) → Serve(3)`, about 13 seconds total; `Finish — artist pass, typically hours` hint at active `FINISH`) → `phase: done` → result pane reveals. `Replay` resets to `idle`.

---

## Copy truth (MANDATORY — from `PRODUCT.md` §Evidence on Hand)

No invented metric, customer, or benchmark survives. Pre-existing invented proof and treatments (unchanged):

| # | Pre-existing (pre-Phase 3) | Treatment |
|---|---|---|
| T1 | `+40% Conversion Lift / −25% Return Rate / <5 Min Integration` (`Hero.tsx:51-60`) | Removed. Replaced by product facts: `Hours — photo to live embed` · `1 line — iframe embed` · `GLB + USDZ — web + AR formats`. |
| T2 | `Maison, Nordik, Lumière, Atelier, Verve, Cobalt, Hazel, Monoforge` + `Trusted by premium D2C brands` (`LandingExtras.tsx`) | Removed. CategoryStrip reframed (2026-09) as platform-compat facts: `Works on Shopify · WooCommerce · Webflow · Custom — one-line iframe`. |
| T3 | `+40% / −25% / <5 Min / 12k+ Brands Live` (`LandingExtras.tsx`) | Band removed. Slot taken by `HowItWorks`. |
| T4 | `From The Field` — 4 invented brand quotes + metrics, `84+ countries` (`LandingPageClient.tsx`) | Removed entirely. Replaced by `ArtistFinishBand` + `PilotOfferBand` (true differentiator + risk reversal). |
| T5 | `Sub-200ms loads across 84 countries` / `Global Edge CDN… sub-second load times worldwide` | Rewritten honestly: `Models are optimized and CDN-served for fast storefront loads — progressive streaming, not heavy downloads.` |
| T6 | `From photo to interactive 3D in under 90 seconds` | Dead. Confirmed promise is **hours**, never minutes/seconds. |
| T7 | `AR in 5 Seconds` | Rewritten: `AR view-in-room — no app required` (iOS Quick Look + Android WebXR is factual). |
| T8 | `The Future of D2C Commerce` hero pill | Rewritten to the offer → `3D & AR for D2C storefronts`. |
| T9 | `Boost conversions and reduce returns… perfectly calibrated` | Rewritten from positioning (managed 3D team + free pilot). |
| T10 | `12k+ Brands Live` / any `brands shipping to N countries` variants | After edits `rg -n "12k|84\+|31%|\+40%|−25%|-25%|90 seconds|Sub-200|sub-200" src/` → 0 real matches (the lone `42%` hit is the pre-existing Tailwind class `xl:w-[42%]` in `AuthClient.tsx:33`, not copy). |

**Allowed always:** the four positioning claims (hours-not-weeks; artist-finished-not-raw-AI; one-embed + AR zero-hassle; honest price-to-quality) + verifiable product facts (`iframe`, `GLB/USDZ`, `model-viewer`, `Quick Look/WebXR`, demo content labeled `Demo`).

**Attributed third-party stats (NEW 2026-09 — allowed with links, never as Peka results):** industry research may be cited on marketing surfaces when every stat carries the publisher's name, year, and an outbound link, phrased as a *reported* outcome. The `90%`-style vendor numbers stay banned. Current set:

| # | Stat (reported wording) | Source | Used in |
|---|---|---|---|
| S1 | Shoppers who used AR were 19.8% more likely to purchase (HBR, Mar 2022, academic, n=3,000+) | `https://hbr.org/2022/03/how-augmented-reality-can-and-cant-help-your-brand` | Hero proof line, Benefits #2 proof |
| S2 | 80% of AR shoppers feel more confident buying (Alter Agents/Snap/Publicis, Jul 2022, n=4,028 + ethnography; self-reported confidence) | `https://alteragents.com/the-future-of-shopping-has-arrived-and-its-augmented-reality/` | ProblemSolution fix card, Benefits #3 proof |
| S3 | Online returns near 30%; looks-different-than-expected a top reason (industry benchmark via Cappasity/MyTotalRetail) | `https://www.mytotalretail.com/article/immersive-technologies-help-retailers-boost-conversions-and-reduce-returns/` | ProblemSolution problem card |
| S4 | Gunner Kennels reported +40% order conversion / −5% returns after AR (Shopify case study; bulky-goods category) | `https://www.shopify.com/enterprise/blog/augmented-reality-ecommerce-shopping` | FAQ Q7 (with category caveat) |
| S5 | IKEA reported −35% returns / +14% online sales after AR placement-app launch (launch-period, furniture) | via S3 link context | FAQ Q7 (with launch-period caveat) |

**Banned even with attribution:** the `94% higher conversion` figure (Shopify-via-Forbes / Snap variants — no published methodology, same number propagated across vendors); unverifiable `71% would shop more with AR` (Deloitte-via-Netguru, no primary source); round vendor multiples (`2–3x`, method-less ranges). No citable time-on-page/retention data was found — the page claims **no** retention lift.

**Greps to keep green:**

```powershell
rg -in "maison|nordik|lumière|atelier|verve|cobalt|hazel|monoforge" src/  # → 0
rg -n "12k|84\+|31%|42%|\+40%|−25%|-25%|90 seconds|Sub-200|sub-200" src/     # → 0 real matches (ignore the xl:w-[42%] Tailwind class in AuthClient.tsx:33)
rg -n "mesh-bg|gradient-text|glow-border|accent-ring" src/app/page.tsx src/components/landing src/components/LandingPageClient.tsx src/components/BentoFeatures.tsx  # → 0
rg -n "#cc785c|#c44320|#faf9f5|#efe9de|#1A1A1A|#181715" src/app/page.tsx src/components/landing src/components/LandingPageClient.tsx src/components/BentoFeatures.tsx src/components/ProductCatalog.tsx src/components/ThreeDConfigurator.tsx  # → 0
```

---

## Anchor contract

Must not break — `TopNav` and `Hero` CTAs link to these ids. 2026-09 adds four, preserves the original three:

| Id | Element | File | Maps to |
|---|---|---|---|
| `#features` | `<section id="features">` | `src/components/BentoFeatures.tsx:7` | TopNav "Features" link, footer sitemap. |
| `#sandbox-anchor` | `<section id="sandbox-anchor">` | `src/components/LandingPageClient.tsx:89` | Hero `See live 3D` + TopNav "Live 3D". |
| `#showroom-catalog-panel` | `<section id="showroom-catalog-panel">` | `src/components/LandingPageClient.tsx:125` | Legacy `HeroCTA` target (kept for external backlinks), footer sitemap. |
| `#how-it-works` | `<section id="how-it-works">` | `src/components/landing/HowItWorks.tsx:31` | TopNav "How it works", footer sitemap. |
| `#benefits` | `<section id="benefits">` | `src/components/landing/Benefits.tsx:56` | (future nav use; no inbound link yet beyond document order) |
| `#pilot` | `<section id="pilot">` | `src/components/landing/PilotOfferBand.tsx:29` | TopNav "Free pilot", footer sitemap. |
| `#faq` | `<section id="faq">` | `src/components/landing/FAQ.tsx:85` | TopNav "FAQ", PilotOfferBand secondary CTA, footer sitemap. |

All anchored sections carry `scroll-mt-16` for the sticky 64px `TopNav`. Removal or rename of the original three would be a breaking change.

---

## Data flow

- **No server data:** `page.tsx` is a static server component — no `requirePrincipal`, no `getUserProjects`, no DB. FAQ JSON-LD is a static object (`page.tsx:17-75`).
- **Demo data:** `src/lib/types.ts:18` `PRODUCTS[]` (currently 1 entry: `sheen-armchair` `SheenChair.glb` on `raw.githubusercontent.com`). `PipelineCard` uses the model-matched local reference photo `/velvet_sheen_armchair.jpg` for its explanatory pipeline; `LandingPageClient` uses `activeProduct` state + `ProductCatalog` grid and retains the product thumbnail. The demo is **labeled** `Demo` in the card header, catalog chips, and configurator overlay.
- **`LandingExtras.tsx`** (`src/components/LandingExtras.tsx:1`) exports **stubs** (`TrustMarquee`/`StatsRibbon`/`GradientCTA` → `null`) to preserve import compat — no content, no claims.
- **Client interactivity:** `Hero` (load choreography), `PipelineCard` (autoplay + transformation + viewer), `HowItWorks` (scrub), `Reveal` (scroll reveals), `TaglineReveal` (IntersectionObserver), `FAQ` (accordion `open` state), `LandingPageClient` (sandbox state), `CategoryStrip` (reduced-motion static branch) are `"use client"`; section shells stay server components (client leaves composed inside them). `ProductProofRail` is a plain server component — no motion, no interactivity.

---

## Files & line index

| Element | Location |
|---|---|
| Landing route (+ FAQ JSON-LD) | `src/app/page.tsx:1` |
| `Hero` (staged load choreography + HBR proof line, client) | `src/components/Hero.tsx:1` |
| `HeroCTA` stubs | `src/components/HeroCTA.tsx:1` |
| `PipelineCard` (transformation + autoplay + Book-demo footer) | `src/components/landing/PipelineCard.tsx:1` |
| `Reveal` (shared scroll-reveal + `EASE`, client) | `src/components/landing/Reveal.tsx:1` |
| `CategoryStrip` (platform-compat, client — reduced-motion branch) | `src/components/landing/CategoryStrip.tsx:1` |
| `ProblemSolution` (NEW) | `src/components/landing/ProblemSolution.tsx:1` |
| `ProductProofRail` (NEW — offer chips on sage, server, color pass 2026-09) | `src/components/landing/ProductProofRail.tsx:1` |
| `TaglineReveal` (NEW, client, peach ground) | `src/components/landing/TaglineReveal.tsx:1` |
| `Benefits` (NEW) | `src/components/landing/Benefits.tsx:1` |
| `HowItWorks` (3 steps + scroll scrub, client) | `src/components/landing/HowItWorks.tsx:1` |
| `PilotOfferBand` (NEW) | `src/components/landing/PilotOfferBand.tsx:1` |
| `ArtistFinishBand` | `src/components/landing/ArtistFinishBand.tsx:1` |
| `BentoFeatures` | `src/components/BentoFeatures.tsx:1` |
| `FAQ` (NEW, client accordion) | `src/components/landing/FAQ.tsx:1` |
| `CTABand` (free-pilot close) | `src/components/landing/CTABand.tsx:1` |
| `LandingFooter` (sitemap + disclosures) | `src/components/landing/LandingFooter.tsx:1` |
| `LandingPageClient` (sandbox, deduped header) | `src/components/LandingPageClient.tsx:1` |
| `LandingExtras` stubs | `src/components/LandingExtras.tsx:1` |
| `ProductCatalog` (dynamic pills + empty state) | `src/components/ProductCatalog.tsx:1` |
| `ThreeDConfigurator` (rethemed) | `src/components/ThreeDConfigurator.tsx:1` |
| Demo data | `src/lib/types.ts:18` (`Product` interface + `PRODUCTS`) |
| `Wordmark` (used in footer) | `src/components/Wordmark.tsx:1` |
| `TopNav` (mobile CTA + anchor links) | `src/components/TopNav.tsx:1` |

---

## Verification (redesign gates, 2026-09; motion upgrade 2026-09)

1. **Static:** `npm run lint` (0) · `npm run build` (pass, 21/21 static) · `npm run test` (untouched, server-only).
2. **Copy-truth greps:** see §Copy truth (0 real matches; `42%` hit is the `xl:w-[42%]` Tailwind class in `AuthClient.tsx:33`).
3. **Design-contract audit:** one primary CTA per viewport (`Book a demo call`); buttons capsule 48px; cards 24px; bands alternate by ground — `sage → white → white → sage(rail) → peach → white → sky → sage(sandbox) → white → sage → white → sage → white → ink`, **no run of more than two whites**; peach/sky appear only on non-interactive surfaces (Peka Green owns interaction); no gradients/mesh/glow; Figtree-900 display clamped; eyebrows are the only tracked-uppercase text; v3 tokens only; motion is transform/opacity exclusively (framer-motion, landing-only dep).
4. **A11y:** single `h1` → `h2`s → `h3`s (catalog header demoted to single header, no duplicate H2); pipeline strip `role="status" aria-live="polite"`; transformation pane `aria-hidden` until the model is interactive; FAQ accordion `aria-expanded`/`aria-controls`; all controls keyboard-reachable with visible rings; `prefers-reduced-motion` disables hero choreography + autoplay + reveals + scrub (static/revealed tree; HowItWorks steps render fully lit; marquee swaps to a static wrapped list; pulses collapse via the global base rule).
5. **Functional:** all 7 anchors navigate (with `scroll-mt-16` offset); demo autoplays once on hero-in-view and runs end-to-end (photo → draft → finish → serve → `model-viewer` visible + rotatable + `View in your space` when supported); `Replay` resets; every primary CTA hits `/auth`; category pills always resolve (derived from data + empty state); outbound stat links open `target=_blank rel=noopener`.
6. **Performance:** `model-viewer` script `lazyOnload` + `pageLoaded` guard — GLB streams only once the hero run starts (not in initial HTML); the local pipeline photo is eager/priority (LCP); framer-motion is the only added library, consumed by landing client leaves only.
