# Deployment — Appwrite Sites (primary, pekaar.tech) + Appwrite Cloud backend

> Parent: [`./WEBSITE.md`](./WEBSITE.md) · Full live-values record + migration findings: [`./deployment-findings.md`](./deployment-findings.md)

Production runtime for Peka AR. This document is the **operational handbook** for the live deployment: what is deployed, where, how to inspect it, how to update it, how to recover from a bad deploy, and how to do day-to-day code changes safely.

**Primary since 2026-09-01:** the Next.js app runs on **Appwrite Sites** (site `peka-ar`) at **https://pekaar.tech** — custom apex domain, NS-delegated to Appwrite DNS (setup record in §8). All backend services are the same **Appwrite Cloud** project "Peka.ar" (Auth + TablesDB + Storage + email), so web and backend live in one platform now. The former primary, **Vercel** (project `studio-v`), is **frozen** — Git integration paused on 2026-09-01 at commit `855391e`. Its URL `https://studio-v-indol.vercel.app` still serves that frozen copy (old third-party embeds keep working) and its Vercel Cron still fires nightly, but it no longer deploys on push. Full frozen-host record: `deployment-findings.md` §3.

---

## 1. Live deployment (Appwrite Sites)

| Field | Value |
|---|---|
| **Host** | Appwrite Sites — site `peka-ar`, project "Peka.ar" (`6a8562a20037b62075e1`, region `fra`) |
| **Production URL** | **https://pekaar.tech** (custom apex domain, domain rule type: Active deployment) |
| **Also live** | `https://branch-main-86d3a7e.appwrite.network` (branch URL — constant, re-points to latest `main` deployment) |
| **GitHub repo** | `https://github.com/Peka-ar/website` (git remote `origin`) |
| **Branch deployed** | `main` (every push auto-builds + activates a production deployment) |
| **Build config** | framework `nextjs`, adapter **ssr**, build runtime `node-22`, `npm install` / `npm run build`, output `./.next`, timeout 60s, spec `s-2vcpu-2gb` build / `s-0.5vcpu-512mb` runtime |
| **Current deployment** | `6a96ecdb6bac97cb041e` (commit `855391e`, Ready + activated 2026-09-01, ~5 min build) |
| **Management** | Appwrite Console → Sites → peka-ar (Deployments / Settings / Variables / Domains / Logs) |

Deploy = `git push origin main`. Build config lives in the console, not the repo. Deployment URLs rotate per build — never reference them; use `pekaar.tech` (production) or the branch URL.

**Frozen mirror (Vercel):** project `studio-v` (`prj_RjTtGXyFvNs7fGf1nsqCOSr71gv1`, team `kaizens-projects-89bbbf37`), Git integration paused 2026-09-01, frozen at commit `855391e`. `https://studio-v-indol.vercel.app` keeps serving the frozen copy — do **not** push to `legacy` expecting changes to appear. Vercel Cron (`GET /api/cron/maintenance` @ 02:00 UTC, `vercel.json`) keeps firing against the frozen deployment and hits the same Appwrite backend, so nightly cleanup still runs (see §3 for the retirement plan). Ops record + rollback-of-last-resort: `deployment-findings.md` §3.

---

## 2. Third-party services

| Service | Role | Where it's configured |
|---|---|---|
| **Appwrite Sites** | Hosting (SSR, auto-deploy from `Peka-ar/website` `main`, remote `origin`) | https://cloud.appwrite.io → project "Peka.ar" → Sites |
| **Appwrite Cloud** | Auth + TablesDB (`studiov`, 6 tables) + Storage (2 buckets) + transactional email + DNS for `pekaar.tech` | console at https://cloud.appwrite.io |
| **Vercel** | Frozen mirror (serves commit `855391e` at `studio-v-indol.vercel.app`; nightly cron trigger) | https://vercel.com/kaizens-projects-89bbbf37/studio-v — do not deploy here |
| **GitHub** | Source control; Appwrite Sites watches `Peka-ar/website` (remote `origin`) | Console → Sites → peka-ar → Settings |
| **get.tech (Namify)** | Domain registrar for `pekaar.tech` — nameservers delegated to Appwrite, so the registrar only handles renewal/billing | https://manage.get.tech |

Stripe is **not** wired — no `/api/webhooks/stripe` handler exists and the `STRIPE_*` env vars were dropped from `.env.example` in Phase 5. Billing is a post-launch add.

---

## 3. Environment variables (Appwrite Sites)

Site variables are set in Console → Sites → peka-ar → Settings → Variables (or MCP `sites_update_variable`). **Any variable change requires a new deployment** — values are baked into the build; a running deployment keeps its old values until a new build is triggered (MCP `sites_create_vcs_deployment {site_id:"peka-ar", type:"branch", reference:"main", activate:true}`, or push an empty commit to `origin`).

| Variable | Value (live) | Variable ID | Sensitivity |
|---|---|---|---|
| `STUDIOV_API_KEY` | Appwrite server API key (same value as local `APPWRITE_API_KEY`) | `studiov-api-key` | Secret |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | `next-public-endpoint` | Secret |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `6a8562a20037b62075e1` | `next-public-project-id` | Secret |
| `NEXT_PUBLIC_APP_URL` | `https://pekaar.tech` | `next-public-app-url` | Secret |

- Sites **forbids user-set env vars with the `APPWRITE_` prefix** (reserved for Appwrite-injected vars like `APPWRITE_SITE_API_KEY`) — hence the server key lives in `STUDIOV_API_KEY`, read as `process.env.STUDIOV_API_KEY ?? process.env.APPWRITE_API_KEY!` in `src/server/appwrite.ts:5`. All required vars are validated at boot by `src/server/env.ts`.
- **`CRON_SECRET` is NOT set on the site.** The nightly maintenance cron is currently triggered by Vercel Cron against the frozen Vercel deployment (which has the secret as a Vercel env var). If the Vercel project is ever deleted: add `CRON_SECRET` as a site variable, trigger a new deployment, and stand up an external scheduler (GitHub Actions or cron-job.org) hitting `https://pekaar.tech/api/cron/maintenance` with `Authorization: Bearer ${CRON_SECRET}`. The route fails closed (401/503) without the secret.
- Local dev (`.env`, gitignored) uses `APPWRITE_API_KEY` — the fallback handles both. `ADMIN_*` vars are only needed by `npm run sync-admin` / `npm run seed:appwrite` — never set them as site variables (anyone with console access could reset the admin password); run those scripts locally against the same Appwrite project.
- `NEXT_PUBLIC_APP_URL` is read at runtime server-side (embed snippets in `src/lib/utils.ts:19`, auth email links in `src/app/actions/auth.ts:41`) — rotating the server API key requires updating `STUDIOV_API_KEY` + a new deployment. Appwrite sessions are tied to the project's API keys, not env secrets. Passwords live only inside Appwrite (Argon2).

---

## 4. Appwrite Cloud (auth, database, storage, DNS)

**Project:** "Peka.ar" (`6a8562a20037b62075e1`, region `fra`) at https://cloud.appwrite.io. Managed via the console — there are **no code-declared schema migrations**. Database schema (TablesDB database `studiov`, 6 tables), indexes, buckets (`models`, `reference-images`), and email SMTP are configured in the console and documented in `WEBSITE.md` §9/§10 and `file-storage-architecture.md`.

### Web platform registration
Every origin that makes browser-direct Appwrite calls must be a registered **web platform** on the project (Console → Overview → Platforms) — otherwise Appwrite rejects with `general_unknown_origin` (403). Registered: `pekaar.tech` (`pekaar-tech-web`), `studio-v-indol.vercel.app` (`web-production-site`), `branch-main-86d3a7e.appwrite.network` (`peka-ar-site`), `localhost` (`local-dev-web`). Keep these in sync whenever a hostname changes.

### Domain & DNS (pekaar.tech)
The domain is **NS-delegated** to Appwrite DNS (`ns1.appwrite.zone` / `ns2.appwrite.zone`) — Appwrite serves the zone (A records → Fastly, auto-applied CAA `0 issue "certainly.com"` for its CA) and auto-issues/renews the TLS certificate (Certainly). **All DNS records for pekaar.tech are managed in the Appwrite Console** (organization → Domains → Manage Records), not at get.tech. If email or other DNS-dependent services are ever added, their records (MX/SPF/DKIM etc.) must be created there — see `deployment-findings.md` §7 for the full setup record.

### Schema changes
Tables/columns/indexes are edited in the Appwrite console → Databases → `studiov` → table → Columns/Indexes. After changing a schema, update `WEBSITE.md` §9 and the relevant deep-dive. There is no `prisma migrate` equivalent — **make schema changes manually and update docs**.

### Admin bootstrap
```powershell
$env:ADMIN_EMAIL="<email>"
$env:ADMIN_PASSWORD="<password>"
$env:ADMIN_NAME="<name>"
npm run sync-admin
```
**Idempotent.** Re-running is safe; it upserts the env-driven admin (Appwrite user with `ADMIN` label + `users` row) and deletes any stray `ADMIN` users whose email is not the env-driven one. Run this after any rotation of `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`.

### Demo seed (optional, local/dev only)
```powershell
npm run seed:appwrite
```
**Do not run against production** — the demo brand and sample projects are junk for prod.

### What NOT to do
- **Do not delete Appwrite Auth users directly from the console if a `users` row exists** — delete the `users` table row first (or use `adminDeleteUser`, which cascades). An auth user without a `users` row becomes a `StaleSessionError` for their next request.
- **Do not wipe tables** without a plan — archived assets, project history, and analytics are the app's working data.
- **Do not delete the site's deployment history** — previous deployments are the rollback mechanism (§7).
- **Do not change nameservers at get.tech** unless intentionally leaving Appwrite DNS — the registrar's DNS panel is inert while NS point to Appwrite.

---

## 5. Day-to-day development workflow

### The 4-step loop
```powershell
# 1. Edit code locally
# 2. Verify
npm run lint
npm run build
# 3. Commit atomically (one logical change per commit)
git add -p
git commit -m "type(scope): subject" -m "Body explains the *why*, not the *what*."
# 4. Push → Appwrite Sites auto-builds + activates a production deployment
git push origin main
```

> The deploy remote is `origin` (`Peka-ar/website`). The `legacy` remote (`Kaizen3424/StudioV`) feeds the **frozen** Vercel mirror — pushes there deploy nothing and are unnecessary (its `main` already matches `855391e`).

### Commit message style
- **Conventional Commits prefix** — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Optional scope** in parens — `feat(auth):`, `fix(admin):`, `chore(deps):`
- **Subject** in imperative mood, ≤ 72 chars, no period
- **Body** (after blank line) — explain *why*, not *what*
- On Windows PowerShell, use two `-m` flags rather than a literal newline; chain commands with `&&` (not `;`).

### Branching
Trunk-based: `main` is the only long-lived branch. Feature branches can be pushed for review, but note Appwrite Sites builds them too (branch deployments get their own `branch-<name>-<hash>.appwrite.network` URL) — they share the same Appwrite backend as production, so any branch deployment that mutates data affects prod data. Do not point branch builds at a different backend via env — gate in code if needed.

### Before every push
1. `npm run lint` — must be silent (no output = pass)
2. `npm run build` — must compile + pass TypeScript
3. **Check `git status`** — no stray files, no debug `console.log`s
4. **Read your own diff** — `git log -p HEAD~1`

### After every push
1. Appwrite Console → Sites → peka-ar → **Deployments** → watch the new build (~3–5 min; cache hit compiles in ~20s)
2. **Wait for "Ready"** — don't assume it succeeded (failed builds never activate)
3. Open the build logs if it failed (deployment row → logs; npm/Next.js output is inlined)
4. Hit https://pekaar.tech and smoke-test (see `deployment-findings.md` §6 for the checklist)

---

## 6. Operating the deployment (console)

The Appwrite Console (https://cloud.appwrite.io → Peka.ar → Sites → peka-ar) is the primary interface. MCP tools (this repo's agent toolchain) cover the same operations: `sites_list_deployments`, `sites_create_vcs_deployment`, `sites_update_site_deployment`, `sites_list_variables`, `sites_update_variable`, `sites_list_logs`.

| Task | Where |
|---|---|
| Watch deployments / build logs | Console → Sites → peka-ar → Deployments |
| Runtime + error logs | Console → Sites → peka-ar → Logs |
| Update site variables | Console → Settings → Variables (**trigger a new deployment after** — values bake at build) |
| Rebuild without new code | MCP `sites_create_vcs_deployment {site_id:"peka-ar", type:"branch", reference:"main", activate:true}` (or push an empty commit) |
| Roll back | Console → Deployments → previous Ready deployment → **Activate** (§7) |
| Domain / DNS / cert status | Console → Sites → peka-ar → Domains; org → Domains for DNS records |
| Frozen Vercel mirror | https://vercel.com/kaizens-projects-89bbbf37/studio-v (read-only reference; cron jobs viewable under Settings → Cron Jobs) |

**Debugging rules of thumb:**
- If variable changes don't seem to apply — **trigger a new deployment**; values are baked at build time.
- Runtime route errors (`catch` blocks, `console.error`) appear in Console → Sites → peka-ar → Logs — check there before guessing.
- `/embed/[id]` is a route handler that reads `public/embed-viewer.html` from disk and substitutes `{PROJECT_ID}`. If a deploy breaks that template, **every third-party embed breaks simultaneously**. If customers report "the embed is broken" and you see 5xx on `/embed/*`, check `public/embed-viewer.html` in the deployed commit.

---

## 7. Rollback strategy (Appwrite Sites)

Rollback = **re-activate a previous deployment**. Every deployment is retained (deployment retention setting; currently keep-all).

```text
Console: Sites → peka-ar → Deployments → (previous Ready deployment) → … → Activate
MCP:     sites_update_site_deployment {site_id:"peka-ar", deployment_id:"<deployment-id>"}
```

No git revert, no rebuild, no DB changes — the domain + branch URL re-point at the stored deployment. Latest known-good: `6a96ecdb6bac97cb041e` (commit `855391e`).

**Trigger conditions** (roll back immediately if any):
- HTTP 5xx error rate spikes (server crashes)
- Auth flow broken (no one can sign in)
- `/embed/[id]` failing for any published project
- Data integrity issue (state machine broken, missing rows)

**Database considerations:** Appwrite TablesDB has **no code-declared migrations** — a code rollback never requires a schema change. There is no point-in-time restore; treat console deletes as destructive.

**Last-resort mirror:** if Appwrite Sites is ever down hard, the frozen Vercel deployment (same backend, commit `855391e`) can be un-frozen: Vercel dashboard → Settings → Git → resume, catch `legacy` up (`git push legacy main`), and point pekaar.tech DNS at Vercel (A `76.76.21.21` at get.tech → but note DNS changes require moving NS back to the registrar first — see `deployment-findings.md` §7).

---

## 8. Custom domain record (pekaar.tech — completed 2026-09-01)

The apex domain was attached via **NS delegation** (Appwrite's recommended method for apexes — apex records cannot be CNAMEs per RFC):

1. Registrar get.tech (Namify; dashboard https://manage.get.tech) — nameservers switched from Namify's `orderbox-dns.com` defaults to `ns1.appwrite.zone` + `ns2.appwrite.zone` (DNSSEC empty — nothing to remove).
2. Appwrite Console → Sites → peka-ar → Domains → Add domain `pekaar.tech`, rule type **Active deployment**. Org → Domains also has the zone registered (that is where DNS records are managed).
3. Web platform `pekaar.tech` registered on the project (`pekaar-tech-web`) — required for browser-direct Storage uploads etc.
4. Site variable `NEXT_PUBLIC_APP_URL` → `https://pekaar.tech` + new deployment.

**Gotchas hit during setup (do not repeat):**
- The console's **Verify** button checks via resolver 8.8.8.8 from the project region (fra). During the first ~6h after an NS switch, stale caches produce the misleading error *"DNS verification failed with resolver 8.8.8.8. Domain … is missing CNAME record"* — an apex under NS delegation **never has a CNAME** (Appwrite serves flattened A records). The error really means "not propagated to that resolver yet". Wait, confirm propagation at dnschecker.org (Germany rows), verify once.
- The Add Domain screen shows both CNAME and NS methods; for an apex on a registrar without CNAME flattening (get.tech/Namify), **use NS only** — do not add the CNAME/CAA records at the registrar.
- HTTP does not redirect to HTTPS at Appwrite's edge — both serve 200. Nothing to configure; just don't be surprised.
- Old vercel.app URLs and `*.appwrite.network` URLs keep working — existing third-party embeds did not break in the switch.

---

## 9. Monitoring and error reporting

**Current state:** Appwrite Console → Sites → peka-ar → Logs (requests + errors) only. No external error tracking.

**Recommended week-1 adds:**
- **Sentry** (`@sentry/nextjs`, `npx @sentry/wizard@latest`) — add `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` as site variables + new deployment
- **Uptime monitoring** (https://uptimerobot.com free tier) — HTTP 200 checks on `https://pekaar.tech/` and `/api/notifications` (a 401 still proves the server is up)
- **Auth rate limiting** is already in place (`rate_limits` table, `backend-architecture.md` §4)

---

## 10. Common operations cheat sheet

| Task | Command / place |
|---|---|
| First-time setup on a new laptop | `npm install` (Appwrite + GitHub auth per machine) |
| Run dev server | `npm run dev` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Sync admin user | `npm run sync-admin` (with `ADMIN_*` env vars set locally) |
| Seed demo data (local/dev only) | `npm run seed:appwrite` |
| **Deploy** | `git push origin main` |
| Rebuild without new code | MCP `sites_create_vcs_deployment` (see §6) |
| Roll back | Console → Deployments → Activate (or MCP `sites_update_site_deployment`) |
| Watch deployments | Console → Sites → peka-ar → Deployments |
| Watch runtime logs | Console → Sites → peka-ar → Logs |
| Update site variables | Console → Settings → Variables (+ new deployment) |
| Manage DNS records | Console → organization → Domains → pekaar.tech → Manage Records |
| Open the live site | https://pekaar.tech |
| Open Appwrite console | https://cloud.appwrite.io (project "Peka.ar") |
| Open Vercel (frozen mirror) | https://vercel.com/kaizens-projects-89bbbf37/studio-v |
| Open GitHub repo | https://github.com/Peka-ar/website |

---

## 11. Project structure quick reference

For full detail, read `WEBSITE.md` first, then the relevant deep-dive in `specs/pages/`.

```text
website/
├── public/                  embed-viewer.html (static HTML served by /embed route)
├── scripts/                 sync-admin.ts (admin bootstrap), seed-appwrite.ts (demo seed), ensure-backend.ts (rate_limits + bucket hardening)
├── src/
│   ├── app/                 App Router pages + server actions + API routes
│   │   ├── actions/         auth.ts, project.ts, admin.ts, admin-users.ts, admin-analytics.ts, analytics.ts, record-asset.ts
│   │   ├── api/             appwrite/[...appwrite], notifications, sdk/v1/{config,events}, v1/assets/[id]/file, cron/maintenance, health
│   │   ├── embed/[id]/      public 3D viewer route handler
│   │   ├── admin/           /admin/{dashboard,users,tasks,analytics}
│   │   ├── auth/            /auth, /auth/verify, /auth/reset-password
│   │   └── dashboard, tasks, notifications, integrations, analytics, onboarding
│   ├── components/          auth, admin, dashboard, ui, TopNav, Hero, ThreeDConfigurator
│   ├── lib/                 appwrite.ts (STUDIOV_API_KEY ?? APPWRITE_API_KEY), db, enums, appwrite-config, auth-guards, status, embed-liveness, notifications, utils, hooks
│   ├── proxy.ts             proxy (middleware) — cookie-presence route gating only
│   └── types/               ambient type augmentations
├── specs/                   WEBSITE.md (source of truth) + per-page deep-dives + this file
├── design.md                design system spec
├── .env                     local env vars (gitignored; APPWRITE_API_KEY locally)
├── .env.example             env var template (local-only — gitignored via `.env*`; documents both key names)
├── package.json             scripts: dev, build, start, lint, test, sync-admin, seed:appwrite, ensure-backend
├── vercel.json              Vercel Cron schedule (still consumed by the frozen Vercel deployment; Appwrite Sites ignores it)
└── next.config.mjs          headers (CORS for /api/sdk/*, resilience for /embed/*), images
```

**Conventions to know before editing code:**
- Pages are server components; interactivity lives in `*Client.tsx` (note the suffix)
- UI primitives in `src/components/ui/` are server-compatible (except `Modal` which uses `createPortal`)
- Auth: never trust `user.id`/`role` directly — always go through `requirePrincipal()` (Appwrite session + `users` TableDB row)
- For pages, use `requirePrincipalOrRedirect()`
- Use Tailwind v4 design tokens (CSS custom properties from `globals.css`) — never raw hex
- `transition-colors` / `transition-transform` / `transition-opacity` only (never `transition-all`)

---

## 12. File & line index

| Element | Location |
|---|---|
| Server API key env fallback (`STUDIOV_API_KEY ?? APPWRITE_API_KEY`) | `src/server/appwrite.ts:5` |
| App URL for embed snippets | `src/lib/utils.ts:19` |
| App URL for auth email links | `src/app/actions/auth.ts:41` |
| Local env var template (documents both key names) | `.env.example:1` |
| Next.js config (CORS, security headers, image patterns) | `next.config.mjs:1` |
| Tailwind v4 + design tokens | `src/app/globals.css:1` |
| Admin bootstrap script | `scripts/sync-admin.ts:1` |
| Demo seed script | `scripts/seed-appwrite.ts:1` |
| Vercel Cron schedule (frozen mirror) | `vercel.json:1` |
| Appwrite SSR auth handlers | `src/app/api/appwrite/[...appwrite]/route.ts:1` |

---

## 13. See also

- [`./WEBSITE.md`](./WEBSITE.md) — full app reference, data model, route map, server action reference
- [`./deployment-findings.md`](./deployment-findings.md) — live values for BOTH hosts, env-var matrix, git remotes map, domain-setup timeline, frozen-Vercel record
- [`./backend-architecture.md`](./backend-architecture.md) — server layering, rate limiting, nightly maintenance cron internals
- [`./file-storage-architecture.md`](./file-storage-architecture.md) — Appwrite Storage architecture (browser-direct uploads, proxy, publish grants/revokes)
- [`./auth-stabilization.md`](./auth-stabilization.md) — historical task plan (implemented; explains `requirePrincipal` + `StaleSessionError` rationale)
- [`./pages/auth.md`](./pages/auth.md) — `/auth*` flow deep dive + email-failure recovery
- [`./pages/admin.md`](./pages/admin.md) — `/admin/*` deep dive
- [`../design.md`](../design.md) — design system spec (local-only)
- [`../.env.example`](../.env.example) — env var template
- Appwrite docs: https://appwrite.io/docs
