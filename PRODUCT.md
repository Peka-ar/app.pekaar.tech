# Product


## Platform

web

## Users

Primary: founders and marketers at small-to-mid D2C / e-commerce brands who want interactive 3D product experiences but have no in-house 3D team. Their job: get a product on their storefront that shoppers can rotate, zoom, and preview in their own room (AR) — without running a 3D-studio engagement.

Secondary (the end audience the product exists to serve): the brand's shoppers, who interact with the embedded viewer and AR preview on the product page before buying.

## Product Purpose

Peka AR turns standard product photography into interactive, web-optimized 3D assets. The operating promise is speed: a brand uploads product photos and, hours later, embeds an artist-finished 3D model into its storefront. Success means the asset is actually used — embedded on the product page, rotated by shoppers, and launched into AR — not merely produced.

## Positioning

Peka AR sells a managed 3D team and workflow, not a filter. Two generation tiers serve different needs:

**Premium (Artist-Finished)** — the flagship. Four claims stack into the offer:
1. **Hours, not weeks.** Where an agency engagement hires a 3D artist per model, Peka AR runs a full team + workflow management that completes a model in a few hours.
2. **Artist-finished, not raw AI.** AI accelerates the pipeline, then each model is manually improved by a 3D artist and optimized for fast serving on the web. Never a raw AI-generated asset.
3. **Zero-hassle delivery.** One iframe embed that works everywhere and runs without fuss — plus AR so customers view the product in their own house or office before buying.
4. **Honest value.** A price-to-quality ratio that undercuts what a normal 3D studio plus web developer would charge.

**Fast (AI Draft)** — quick AI-generated 3D model (~5-10 min). Clearly labeled "AI Draft" throughout the UI so brands know exactly what they're getting. Ideal for rapid prototyping, internal review, or quick previews before committing to the premium artist finish.

The mechanism a neighboring competitor cannot copy-paste is the combination: AI-accelerated pipeline + human 3D craft + one-line embed + in-home AR, delivered as a managed service within hours.

## Operating Context

- The seller's side runs in the app: photo upload, a visible project pipeline with status stages, review, publish, embed-code generation, and integration instructions.
- The buyer's side runs on the brand's own site: an iframe to `/embed/[projectId]` rendering a model-viewer surface, plus AR (WebXR on Android Chrome, Scene Viewer fallback, Quick Look on iOS).
- Assets are real-world products photographed by the seller; models are served as GLB (with USDZ for iOS AR).
- Evaluation happens live: the embeddable viewer and AR session are the proof of quality.

## Capabilities and Constraints

- Next.js app (Appwrite Sites), backed by Appwrite: TablesDB rows, storage, sessions, OTP/magic-link/reset auth, admin.
- Image-to-3D pipeline with a project lifecycle state machine; statuses render differently per viewer role (brand vs admin) via `src/lib/status.ts`.
- Embed surface at `/embed/[projectId]` (standalone viewer, `public/embed-viewer.html` chrome), cross-origin-framed by design (no `X-Frame-Options`).
- `/dashboard` metrics, `/tasks` kanban, `/admin/*` pages, `/onboarding`, `/integrations` embed-code + AR-launch analytics.
- Light-only theming (v3, shipped) — dark surfaces survive as components (ink bands, footer, auth panel, embed viewer).
- Terminology in use: project stages PENDING/REVISIONS/COMPLETED/PUBLISHED; embed "liveness"; AR launch events.
- No third-party 3D-automation dependency is a product fact beyond the AI-acceleration claim above; the manual-artist pass is the differentiator and must stay true in copy and operations.

## Brand Commitments

- **Name:** Peka AR. Rebranded from STUDIO.V / StudioV — do not reintroduce the old name on new surfaces. Domain: `pekar.tech`. Appwrite project already carries the name ("Peka.ar").
- **Single brand accent:** one Peka Green family (lime `#9fe870`). No second brand hue; status colors are semantic, not brand.
- **Themes:** light-only (v3, shipped); dark surfaces survive as components (ink bands, footer, embed viewer).
- **Tone of truth:** Premium tier is always "artist-finished"; Fast tier is always labeled "AI Draft." Never conflate the two.
- The visual language is defined in `design.md` (v3, shipped — `WEBSITE.md` §12 is the as-built mirror); this file records product truth only.

## Evidence on Hand

- Product only: the running app, the live 3D viewer, demo projects, embed output, AR sessions. These are the proof material for marketing surfaces.
- Absences (must not be fabricated): named customers, testimonials, case studies, revenue/volume benchmarks, and third-party claims. Demonstration copy and mock projects on marketing surfaces are synthetic and must be labeled as such where a visitor could mistake them for real customer output.

## Product Principles

1. **Artist-finished, not raw AI.** Protect the differentiator in every claim and in the actual pipeline. Premium tier is always artist-finished; Fast tier is clearly labeled "AI Draft."
2. **Speed is a promise.** "Hours, not weeks" must stay visible and true — the pipeline stages surface progress, never a black box. AI Draft targets ~5-10 minutes.
3. **Zero hassle for both sides.** One embed for the seller; a viewer that just works for the shopper.
4. **Proof over claims.** Wherever the site claims quality, show the real 3D/AR result.
5. **Restraint.** Premium comes from precision and calm, not decoration — one accent, disciplined hierarchy.

## Accessibility & Inclusion

- WCAG 2.1 AA is the bar; the existing Vercel frontend guidelines are adopted (focus-visible rings, aria labeling, 44 px targets, reduced motion).
- The embed viewer and AR flows must stay operable without a mouse where the platform allows, and must never trap focus.
