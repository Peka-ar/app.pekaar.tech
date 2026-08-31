# Deployment — Vercel (primary) + Appwrite Cloud backend

> Parent: [`./WEBSITE.md`](./WEBSITE.md) · Full live-values record + migration findings: [`./deployment-findings.md`](./deployment-findings.md)

Production runtime for STUDIO.V. This document is the **operational handbook** for the live deployment: what is deployed, where, how to inspect it, how to update it, how to recover from a bad deploy, and how to do day-to-day code changes safely.

**Split hosting (2026-08-31):** the Next.js app runs on **Vercel** (primary — until a custom domain is bought), and **all backend services are Appwrite Cloud** (Auth + TablesDB + Storage + email, project "Peka.ar"). A second, fully working deployment exists on **Appwrite Sites** (site `peka-ar`) but is **dormant** — frozen at commit `0e72d57`; see `deployment-findings.md` §3 to revive it. Both deployments share the same Appwrite backend, so data is identical.

---

## 1. Live deployment (Vercel)

| Field | Value |
|---|---|
| **Host** | Vercel — project `studio-v` (`prj_RjTtGXyFvNs7fGf1nsqCOSr71gv1`), team `kaizens-projects-89bbbf37` |
| **Production URL** | `https://studio-v-indol.vercel.app` |
| **GitHub repo** | `https://github.com/Kaizen3424/StudioV` (git remote `legacy`) |
| **Branch deployed** | `main` (every push auto-builds a production deployment) |
| **Framework / runtime** | Next.js 16 (Turbopack) auto-detected, Node 24.x, zero config |
| **CLI** | Vercel CLI 57 (logged in as `kaizen3424`; `.vercel/` link exists locally, gitignored) |
| **First migrated deploy** | `studio-4xr1ty9tr` (commit `9c1122e`, Ready in 35s, 2026-08-31) |

Deploy = `git push legacy main`. There is no build command config — Vercel runs `npm install` + `npm run build` from `package.json`.

---

## 2. Third-party services

| Service | Role | Where it's configured |
|---|---|---|
| **Vercel** | Hosting (SSR, auto-deploy from `Kaizen3424/StudioV` `main`) | https://vercel.com/kaizens-projects-89bbbf37/studio-v |
| **Appwrite Cloud** | Auth + TablesDB (`studiov`, 5 tables) + Storage (2 buckets) + transactional email | console at https://cloud.appwrite.io (project "Peka.ar") |
| **GitHub** | Source control; Vercel watches `Kaizen3424/StudioV` (remote `legacy`) | Vercel dashboard → Settings → Git |

Stripe is **not** wired — no `/api/webhooks/stripe` handler exists and the `STRIPE_*` env vars were dropped from `.env.example` in Phase 5. Billing is a post-launch add.

---

## 3. Environment variables (Vercel)

Set in Vercel dashboard → studio-v → Settings → Environment Variables (or CLI `vercel env add`). All 14 pre-migration vars (Prisma/Postgres, UploadThing, Google OAuth, Gmail, GDrive, `ADMIN_*`) were **removed** on 2026-08-31 — zero references remain in the code.

| Variable | Value | Target | Sensitivity |
|---|---|---|---|
| `STUDIOV_API_KEY` | Appwrite server API key (same value as local `APPWRITE_API_KEY`) | Production + Preview | Sensitive |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | Production + Preview | Non-sensitive |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `6a8562a20037b62075e1` | Production + Preview | Non-sensitive |
| `NEXT_PUBLIC_APP_URL` | `https://studio-v-indol.vercel.app` | Production + Preview | Non-sensitive |
| `CRON_SECRET` | Random ≥ 16 chars (e.g. `openssl rand -hex 32`) — must match the value Vercel Cron sends as `Authorization: Bearer ${CRON_SECRET}` | Production | Sensitive |

Read by `src/server/appwrite.ts:5` as `STUDIOV_API_KEY ?? APPWRITE_API_KEY` (the fallback exists because Appwrite Sites forbids user-set `APPWRITE_`-prefixed vars; Vercel has no such restriction but uses `STUDIOV_API_KEY` to keep parity with the dormant Sites deployment). All required vars are validated at boot by `src/server/env.ts`.

**Nightly cron (Production only):** `vercel.json` schedules `GET /api/cron/maintenance` at `0 2 * * *` (02:00 UTC). Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`; the route fails closed when the secret is unset or mismatched (see `backend-architecture.md` §11). On Hobby the cron fires at most once per day.

Local dev (`.env`, gitignored) uses `APPWRITE_API_KEY` instead of `STUDIOV_API_KEY` (the fallback handles both). `ADMIN_*` vars are only needed by `npm run sync-admin` / `npm run seed:appwrite` — never set on Vercel (they would let anyone with dashboard access reset the admin password; they are run locally against the same Appwrite project).

**`NEXT_PUBLIC_*` vars are baked into the client bundle at build time** — after editing any of them, redeploy (dashboard prompts, or `vercel deploy --prod --prebuilt`, or push an empty commit) or the old value keeps serving.

**CLI quirk:** `vercel env add <name> preview` hangs on an interactive "Git branch?" prompt that ignores piped stdin — use the REST API instead (`deployment-findings.md` §2).

**Appwrite sessions** are tied to the project's API keys, not env secrets. Rotating the server API key requires updating `STUDIOV_API_KEY` on Vercel + redeploying. Passwords live only inside Appwrite (Argon2).

---

## 4. Appwrite Cloud (auth, database, storage)

**Project:** "Peka.ar" (`6a8562a20037b62075e1`, region `fra`) at https://cloud.appwrite.io. Managed via the console — there are **no code-declared schema migrations**. Database schema (TablesDB database `studiov`, 5 tables), indexes, buckets (`models`, `reference-images`), and email SMTP are configured in the console and documented in `WEBSITE.md` §9/§10 and `file-storage-architecture.md`.

### Web platform registration
Every origin that makes browser-direct Appwrite calls must be a registered **web platform** on the project (Console → Overview → Platforms) — otherwise Appwrite rejects with `general_unknown_origin` (403). Registered: `studio-v-indol.vercel.app` (`web-production-site`), `branch-main-86d3a7e.appwrite.network` (`peka-ar-site`), `localhost` (`local-dev-web`). Keep these in sync whenever the production domain changes (e.g. custom domain — checklist in `deployment-findings.md` §7).

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
# 4. Push → Vercel auto-builds a production deployment
git push legacy main
```

> The deploy remote is `legacy` (`Kaizen3424/StudioV`) — **not** `origin` (`Peka-ar/website`, watched by the dormant Appwrite Sites site). Push to `origin` only when reviving Sites (`deployment-findings.md` §3).

### Commit message style
- **Conventional Commits prefix** — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Optional scope** in parens — `feat(auth):`, `fix(admin):`, `chore(deps):`
- **Subject** in imperative mood, ≤ 72 chars, no period
- **Body** (after blank line) — explain *why*, not *what*
- On Windows PowerShell, use two `-m` flags rather than a literal newline; chain commands with `&&` (not `;`).

### Branching
Trunk-based: `main` is the only long-lived branch. For risky work, use a feature branch — pushes to non-`main` branches create **Preview deployments** on Vercel (one URL per branch, share the same Appwrite backend + Preview env vars). Do not point previews at a different backend via env — gate in code if needed.

### Before every push
1. `npm run lint` — must be silent (no output = pass)
2. `npm run build` — must compile + pass TypeScript
3. **Check `git status`** — no stray files, no debug `console.log`s
4. **Read your own diff** — `git log -p HEAD~1`

### After every push
1. Vercel dashboard → studio-v → **Deployments** → watch the new build (or `vercel ls`)
2. **Wait for "Ready"** — don't assume it succeeded (failed builds never become production)
3. Open the build/runtime logs if it failed (`vercel inspect <url>`, `vercel logs <url>`)
4. Hit the live URL and smoke-test (see `deployment-findings.md` §6 for the checklist)

---

## 6. Operating the deployment (dashboard + CLI)

The Vercel dashboard (https://vercel.com/kaizens-projects-89bbbf37/studio-v) is the primary interface; the Vercel CLI works against it (authed as `kaizen3424`).

| Task | Where |
|---|---|
| Watch deployments / build logs | Dashboard → Deployments, or `vercel ls` / `vercel inspect <url>` |
| Runtime + error logs | Dashboard → Deployments → Functions/Logs, or `vercel logs <url>` (server `console.error` output appears here) |
| Update env vars | Dashboard → Settings → Environment Variables, or `vercel env add/rm` (**redeploy after** — `NEXT_PUBLIC_*` bake at build) |
| Add a custom domain | Dashboard → Settings → Domains (+ Appwrite platform registration — full checklist in `deployment-findings.md` §7) |
| Pause deployments / maintenance | Dashboard → Settings → pause Git integration |
| Rebuild without new code | Dashboard → Deployments → … → Redeploy, or `vercel deploy --prod` (picks up changed env vars) |

**Debugging rules of thumb:**
- If env-var changes don't seem to apply — **redeploy**; `NEXT_PUBLIC_*` values are inlined at build time.
- Runtime route errors (`catch` blocks, `console.error`) are visible via `vercel logs` — check there before guessing.
- The dormant Appwrite Sites site (`peka-ar`) has its own Console logs — only relevant after reviving it.

---

## 7. Rollback strategy (Vercel)

Rollback = **promote a previous production deployment**. Every deployment is retained (and immutable).

```text
Dashboard: Deployments → (previous Ready production deployment) → … → Promote to Production
CLI:       vercel rollback <deployment-url>        # e.g. vercel rollback https://studio-4xr1ty9tr-kaizens-projects-89bbbf37.vercel.app
```

No git revert, no rebuild, no DB changes — Vercel re-points the production domain at the stored deployment.

*(Appwrite Sites rollback, when revived: Console → Sites → peka-ar → Deployments → Activate, or MCP `sites_update_site_deployment`.)*

**Trigger conditions** (roll back immediately if any):
- HTTP 5xx error rate spikes (server crashes)
- Auth flow broken (no one can sign in)
- `/embed/[id]` failing for any published project
- Data integrity issue (state machine broken, missing rows)

**Database considerations:** Appwrite TablesDB has **no code-declared migrations** — a code rollback never requires a schema change. There is no point-in-time restore; treat console deletes as destructive.

**One quirk specific to this app:** `/embed/[projectId]` is a route handler that reads `public/embed-viewer.html` from disk and substitutes `{PROJECT_ID}`. If a deploy breaks that template, **every third-party embed breaks simultaneously**. If customers report "the embed is broken" and you see 5xx on `/embed/*`, check `public/embed-viewer.html` in the deployed commit.

---

## 8. Custom domains (deferred until purchase)

Currently on `https://studio-v-indol.vercel.app`. When a domain is bought, follow the step-by-step checklist in **`deployment-findings.md` §7** (Vercel domain add → update `NEXT_PUBLIC_APP_URL` + redeploy → register the domain as an Appwrite web platform → optional Appwrite Sites revival path).

---

## 9. Monitoring and error reporting

**Current state:** Vercel runtime logs (`vercel logs`, dashboard → Logs) only. No external error tracking.

**Recommended week-1 adds:**
- **Sentry** (`@sentry/nextjs`, `npx @sentry/wizard@latest`) — add `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` as Vercel env vars, redeploy
- **Uptime monitoring** (https://uptimerobot.com free tier) — HTTP 200 checks on `/` and `/api/notifications` (a 401 still proves the server is up)
- **Auth rate limiting** — the auth actions/routes are public; brute-forceable in theory (Upstash Ratelimit)

---

## 10. Common operations cheat sheet

| Task | Command |
|---|---|
| First-time setup on a new laptop | `npm install` (Vercel link already in `.vercel/`; CLI auth per machine) |
| Run dev server | `npm run dev` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Sync admin user | `npm run sync-admin` (with `ADMIN_*` env vars set locally) |
| Seed demo data (local/dev only) | `npm run seed:appwrite` |
| **Deploy** | `git push legacy main` |
| Rebuild without new code | Dashboard → Deployments → Redeploy, or `vercel deploy --prod` |
| Roll back | `vercel rollback <previous-deployment-url>` |
| Watch deployments | `vercel ls` |
| Watch runtime logs | `vercel logs <deployment-url>` |
| List env vars | `vercel env ls` |
| Open the live site | https://studio-v-indol.vercel.app |
| Open Vercel dashboard | https://vercel.com/kaizens-projects-89bbbf37/studio-v |
| Open Appwrite console | https://cloud.appwrite.io (project "Peka.ar") |
| Open GitHub repo | https://github.com/Kaizen3424/StudioV |

---

## 11. Project structure quick reference

For full detail, read `WEBSITE.md` first, then the relevant deep-dive in `specs/pages/`.

```text
website/
├── public/                  embed-viewer.html (static HTML served by /embed route)
├── scripts/                 sync-admin.ts (admin bootstrap), seed-appwrite.ts (demo seed)
├── src/
│   ├── app/                 App Router pages + server actions + API routes
│   │   ├── actions/         auth.ts, project.ts, admin.ts, admin-users.ts, admin-analytics.ts, analytics.ts, record-asset.ts
│   │   ├── api/             appwrite/[...appwrite], notifications, sdk/v1/{config,events}, v1/assets/[id]/file
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
├── .env.example             env var template (committed; documents both key names)
├── package.json             scripts: dev, build, start, lint, sync-admin, seed:appwrite
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
| Local env var template (documents both key names) | `.env.example:1` |
| Next.js config (CORS, security headers, image patterns) | `next.config.mjs:1` |
| Tailwind v4 + design tokens | `src/app/globals.css:1` |
| Admin bootstrap script | `scripts/sync-admin.ts:1` |
| Demo seed script | `scripts/seed-appwrite.ts:1` |
| Deployment plan + findings (local-only, untracked) | `tasks/plan.md`, `specs/deployment-findings.md` |
| Appwrite SSR auth handlers | `src/app/api/appwrite/[...appwrite]/route.ts:1` |

---

## 13. See also

- [`./WEBSITE.md`](./WEBSITE.md) — full app reference, data model, route map, server action reference
- [`./deployment-findings.md`](./deployment-findings.md) — live values for BOTH hosts, env-var matrix, migration findings, custom-domain checklist
- [`./file-storage-architecture.md`](./file-storage-architecture.md) — Appwrite Storage architecture (browser-direct uploads, proxy, publish grants/revokes)
- [`./auth-stabilization.md`](./auth-stabilization.md) — historical task plan (implemented; explains `requirePrincipal` + `StaleSessionError` rationale)
- [`./pages/auth.md`](./pages/auth.md) — `/auth*` flow deep dive + email-failure recovery
- [`./pages/admin.md`](./pages/admin.md) — `/admin/*` deep dive
- [`../design.md`](../design.md) — design system spec (local-only)
- [`../.env.example`](../.env.example) — env var template
- Appwrite docs: https://appwrite.io/docs · Vercel docs: https://vercel.com/docs
