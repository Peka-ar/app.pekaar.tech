# Deployment — Appwrite Sites + Appwrite Cloud

> Parent: [`./WEBSITE.md`](./WEBSITE.md)

Production runtime for STUDIO.V. This document is the **operational handbook** for the live deployment: what is deployed, where, how to inspect it, how to update it, how to recover from a bad deploy, and how to do day-to-day code changes safely.

**Hosting is fully inside Appwrite**: the Next.js app runs on **Appwrite Sites** (SSR), and Auth/TablesDB/Storage/email are Appwrite Cloud services in the same project. The previous Vercel deployment was deleted after migration (commit "v2 - appwrite migration").

---

## 1. Live deployment

| Field | Value |
|---|---|
| **Host** | Appwrite Sites — site ID `peka-ar`, project "Peka.ar" (`6a8562a20037b62075e1`, region `fra`) |
| **Production URL** | (generated domain — see console: Sites → peka-ar → Domains; recorded in §1.1 below after first deploy) |
| **GitHub repo** | `https://github.com/Peka-ar/website` (org repo; Appwrite GitHub App installed on the Peka-ar org) |
| **Branch deployed** | `main` (every push to `main` auto-builds + auto-activates a new deployment) |
| **Framework / adapter** | Next.js (16, App Router) / **SSR** adapter — default output mode, no `output` config in `next.config.mjs` |
| **Build runtime** | Node 22 (`node-22`) |
| **Build commands** | install `npm install` · build `npm run build` · output `./.next` |
| **VCS installation** | `6a94f8463518365b9872` (provider github, org Peka-ar); repo ID `1339382325` |

Pushes to non-`main` branches build preview deployments (visible to Appwrite org members only) — see Appwrite docs "Previews". PRs get a comment with the preview URL unless silent mode is on.

### 1.1 Live values recorded after first deployment
> To be filled in `specs/deployment.md` on the follow-up docs commit: generated domain, first deployment ID, web platform ID.

---

## 2. Third-party services

| Service | Role | Where it's configured |
|---|---|---|
| **Appwrite Cloud** | Hosting (Sites) + Auth + TablesDB (`studiov`, 5 tables) + Storage (2 buckets) + transactional email | console at https://cloud.appwrite.io (project "Peka.ar") |
| **GitHub** | Source control; Appwrite Sites watches `Peka-ar/website` | Appwrite Console → Sites → peka-ar → Settings → Git repository |

Stripe is **not** wired — no `/api/webhooks/stripe` handler exists and the `STRIPE_*` env vars were dropped from `.env.example` in Phase 5. Billing is a post-launch add.

---

## 3. Environment variables

Appwrite Sites reads variables in this precedence: **Appwrite-injected `APPWRITE_*` (highest, cannot be overridden)** → **site variables** → **project variables**. **Never set user variables with the `APPWRITE_` prefix** — Appwrite reserves it (injected vars include `APPWRITE_SITE_API_KEY`, `APPWRITE_SITE_PROJECT_ID`, `APPWRITE_VCS_*`, etc.).

| Variable | Value on Sites | Notes |
|---|---|---|
| `STUDIOV_API_KEY` | Appwrite server API key `studiov-server` (secret site variable) | Read by `src/lib/appwrite.ts` as `STUDIOV_API_KEY ?? APPWRITE_API_KEY`. Scopes: users/sessions/tables/columns/indexes/rows read+write, buckets/files read+write, messaging read+write, usage.read |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | Public |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `6a8562a20037b62075e1` | Public |
| `NEXT_PUBLIC_APP_URL` | `https://<generated-domain>` | **Baked into the client bundle at build time** — must be set before the first build; changing it requires a new deployment |

Local dev (`.env`, gitignored) uses `APPWRITE_API_KEY` instead of `STUDIOV_API_KEY` (the fallback handles both). `ADMIN_*` vars are only needed by `npm run sync-admin` / `npm run seed:appwrite` — never set on the site (they would let anyone with console access reset the admin password; they are run locally against the same Appwrite project).

**Variable changes only take effect on the next deployment** — after creating/updating/deleting a site variable, trigger a redeploy (Sites → Deployments → … or `sites_create_duplicate_deployment`).

**Appwrite sessions** are tied to the project's API keys, not env secrets. Rotating the server API key requires updating the `STUDIOV_API_KEY` site variable + redeploying. Passwords live only inside Appwrite (Argon2).

---

## 4. Appwrite Cloud (auth, database, storage)

**Project:** "Peka.ar" (`6a8562a20037b62075e1`, region `fra`) at https://cloud.appwrite.io. Managed via the console — there are **no code-declared schema migrations**. Database schema (TablesDB database `studiov`, 5 tables), indexes, buckets (`models`, `reference-images`), and email SMTP are configured in the console and documented in `WEBSITE.md` §9/§10 and `file-storage-architecture.md`.

### Web platform registration
The site's generated domain is registered as a **web platform** on the project (Console → Overview → Platforms). Browser-direct Storage uploads (`useAppwriteUpload`) are made from this hostname; keep the platform entry in sync if the domain changes.

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
# 4. Push → Appwrite Sites auto-builds and auto-activates
git push origin main
```

### Commit message style
- **Conventional Commits prefix** — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Optional scope** in parens — `feat(auth):`, `fix(admin):`, `chore(deps):`
- **Subject** in imperative mood, ≤ 72 chars, no period
- **Body** (after blank line) — explain *why*, not *what*
- On Windows PowerShell, use two `-m` flags rather than a literal newline; chain commands with `&&` (not `;`).

### Branching
Trunk-based: `main` is the only long-lived branch. For risky work, use a feature branch — pushes to non-production branches create **preview deployments** (Appwrite org members only). Note: preview deployments share the same site env vars as production (there is no per-env var separation like Vercel's) — do not point previews at a different DB via env; gate in code if needed.

### Before every push
1. `npm run lint` — must be silent (no output = pass)
2. `npm run build` — must compile + pass TypeScript
3. **Check `git status`** — no stray files, no debug `console.log`s
4. **Read your own diff** — `git log -p HEAD~1`

### After every push
1. Appwrite Console → Sites → peka-ar → **Deployments** tab → watch the new build
2. **Wait for "Ready"** — don't assume it succeeded (failed builds do NOT replace the active deployment)
3. Open the build logs if it failed
4. Hit the live URL and smoke-test

---

## 6. Operating the site (Console + MCP)

The Appwrite Console (https://cloud.appwrite.io → Peka.ar → Sites → peka-ar) is the primary interface. The Appwrite MCP server (this repo's tooling) can do the same operations programmatically (`sites_create`, `sites_update`, `sites_create_variable`, `sites_create_vcs_deployment`, `sites_get_deployment`, `sites_list_logs`, etc. — authenticated against the console).

| Task | Where |
|---|---|
| Watch deployments / build logs | Sites → peka-ar → Deployments → click a deployment |
| Runtime + error logs | Sites → peka-ar → Logs |
| Update env vars | Sites → peka-ar → Settings → Environment variables (**redeploy after**) |
| Update build settings / Git config | Sites → peka-ar → Settings → Build settings / Git repository |
| Add a custom domain | Sites → peka-ar → Domains → Add domain (CNAME for subdomains; NS delegation for apex) |
| Disable the site (maintenance) | Sites → peka-ar → Settings → disable toggle (Server SDK access continues to work) |
| Rebuild without new code | Deployments → create duplicate deployment (picks up changed env vars/commands) |

**Debugging rules of thumb** (from Appwrite docs):
- If config changes don't seem to apply — **redeploy the site**; variable/command changes only take effect on the next deployment.
- SSR request logs (including `console.log`/`console.error` from server code) appear in the site **Logs** tab.
- `APPWRITE_DEPLOYMENT_TYPE` env var tells the app how the running deployment was created (`vcs`, `cli`, `manual`).

---

## 7. Rollback strategy

Rollback = **re-activate a previous deployment**. Every deployment is preserved (subject to deployment retention settings).

```text
Console: Sites → peka-ar → Deployments → (previous Ready deployment) → Activate
MCP:     sites_update_site_deployment { site_id: "peka-ar", deployment_id: <id> }
```

No git revert, no rebuild, no DB changes — Appwrite re-points the site at the stored deployment.

**Trigger conditions** (roll back immediately if any):
- HTTP 5xx error rate spikes (server crashes)
- Auth flow broken (no one can sign in)
- `/embed/[id]` failing for any published project
- Data integrity issue (state machine broken, missing rows)

**Database considerations:** Appwrite TablesDB has **no code-declared migrations** — a code rollback never requires a schema change. There is no point-in-time restore; treat console deletes as destructive.

**One quirk specific to this app:** `/embed/[projectId]` is a route handler that reads `public/embed-viewer.html` from disk and substitutes `{PROJECT_ID}`. If a deploy breaks that template, **every third-party embed breaks simultaneously**. If customers report "the embed is broken" and you see 5xx on `/embed/*`, check `public/embed-viewer.html` in the deployed commit.

---

## 8. Custom domains (deferred)

Currently on the generated `*.appwrite.global`-style domain. To add a custom domain later:
1. Console → Sites → peka-ar → **Domains** → Add domain
2. **Subdomain** (recommended): add a CNAME record at your DNS provider pointing to the hostname Appwrite shows
3. **Apex domain**: either delegate NS records to `ns1.appwrite.zone` / `ns2.appwrite.zone` (Appwrite then manages all DNS — recreate any MX/TXT records there) or use CNAME flattening if your provider supports it
4. Wait for verification (DNS can take up to 48h) — SSL is provisioned automatically
5. Update `NEXT_PUBLIC_APP_URL` site variable to the new domain and **redeploy** (it's baked into the client bundle)
6. Register the new domain as a web platform on the project (Console → Overview → Platforms) so browser-direct uploads keep working
7. Add the domain to the project's **Allowed Domains** (Settings) so API calls from it are accepted

---

## 9. Monitoring and error reporting

**Current state:** Appwrite site logs (Console → Sites → peka-ar → Logs) only. No external error tracking.

**Recommended week-1 adds:**
- **Sentry** (`@sentry/nextjs`, `npx @sentry/wizard@latest`) — add `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` as site variables, redeploy
- **Uptime monitoring** (https://uptimerobot.com free tier) — HTTP 200 checks on `/` and `/api/notifications` (a 401 still proves the server is up)
- **Auth rate limiting** — the auth actions/routes are public; brute-forceable in theory (Upstash Ratelimit)

---

## 10. Common operations cheat sheet

| Task | Command |
|---|---|
| First-time setup on a new laptop | `npm install` |
| Run dev server | `npm run dev` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Sync admin user | `npm run sync-admin` (with `ADMIN_*` env vars set locally) |
| Seed demo data (local/dev only) | `npm run seed:appwrite` |
| Deploy | `git push origin main` (auto-build + auto-activate) |
| Rebuild without new code | Console → Deployments → duplicate deployment |
| Roll back | Console → Deployments → activate a previous Ready deployment |
| Watch build logs | Console → Sites → peka-ar → Deployments → deployment |
| Watch runtime logs | Console → Sites → peka-ar → Logs |
| Open the live site | Sites → peka-ar → Domains (generated domain) |
| Open Appwrite console | https://cloud.appwrite.io |
| Open GitHub repo | https://github.com/Peka-ar/website |

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
| Server API key env fallback (`STUDIOV_API_KEY ?? APPWRITE_API_KEY`) | `src/lib/appwrite.ts:4` |
| Local env var template (documents both key names) | `.env.example:1` |
| Next.js config (CORS, security headers, image patterns) | `next.config.mjs:1` |
| Tailwind v4 + design tokens | `src/app/globals.css:1` |
| Admin bootstrap script | `scripts/sync-admin.ts:1` |
| Demo seed script | `scripts/seed-appwrite.ts:1` |
| Deployment plan (this migration) | `tasks/plan.md` |
| Appwrite SSR auth handlers | `src/app/api/appwrite/[...appwrite]/route.ts:1` |

---

## 13. See also

- [`./WEBSITE.md`](./WEBSITE.md) — full app reference, data model, route map, server action reference
- [`./file-storage-architecture.md`](./file-storage-architecture.md) — Appwrite Storage architecture (browser-direct uploads, proxy, publish grants/revokes)
- [`./auth-stabilization.md`](./auth-stabilization.md) — historical task plan (implemented; explains `requirePrincipal` + `StaleSessionError` rationale)
- [`./pages/auth.md`](./pages/auth.md`) — `/auth*` flow deep dive + email-failure recovery
- [`./pages/admin.md`](./pages/admin.md`) — `/admin/*` deep dive
- [`../AGENTS.md`](../AGENTS.md) — repo-wide agent rules (read first, keep `specs/` accurate)
- [`../design.md`](../design.md) — design system spec
- [`../.env.example`](../.env.example) — env var template
- Appwrite Sites docs: https://appwrite.io/docs/products/sites
