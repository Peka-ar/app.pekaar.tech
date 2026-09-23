# Deployment — Appwrite Sites (primary, pekaar.tech) + Appwrite Cloud backend

> **Parent:** [`./WEBSITE.md`](./WEBSITE.md)

Production runtime for Peka AR. This document is the **operational handbook**: what is deployed, where, how to inspect it, update it, recover from a bad deploy, and do day-to-day code changes safely.

**Primary:** the Next.js app runs on **Appwrite Sites** (site `peka-ar`) at **https://pekaar.tech** — custom apex domain, NS-delegated to Appwrite DNS. All backend services are the same **Appwrite Cloud** project "Peka.ar" (Auth + TablesDB + Storage + email), so web and backend live in one platform. A **frozen Vercel mirror** keeps serving old embed URLs and fires the nightly cron.

---

## 1. Live deployment (Appwrite Sites)

| Field | Value |
|---|---|
| **Host** | Appwrite Sites — site `peka-ar`, project "Peka.ar" (`6a8562a20037b62075e1`, region `fra`) |
| **Production URL** | **https://pekaar.tech** (custom apex domain, rule type: Active deployment) |
| **Branch URL** | `https://branch-main-86d3a7e.appwrite.network` — constant, re-points to latest `main` deployment |
| **GitHub repo** | `https://github.com/Peka-ar/website` (remote `origin`; VCS installation `6a94f8463518365b9872`, repo ID `1339382325`), branch `main`, root `/` |
| **Build config** | framework `nextjs`, adapter **ssr**, build runtime `node-22`, `npm install` / `npm run build`, output `./.next`, timeout 60s, spec `s-2vcpu-2gb` build / `s-0.5vcpu-512mb` runtime |
| **Management** | Appwrite Console → Sites → peka-ar (Deployments / Settings / Variables / Domains / Logs) |

Deploy = `git push origin main`. Build config lives in the console, not the repo. Build ~3.5–5 min (cache hit compiles in ~20s). Deployment URLs rotate per build — never reference them; use `pekaar.tech` or the branch URL.

**Deployment gotcha:** only **VCS deployments from `main` re-point the branch URL**; a manual "duplicate deployment" builds fresh but leaves the branch URL on the old deployment. To redeploy after env-var changes: MCP `sites_create_vcs_deployment {site_id:"peka-ar", type:"branch", reference:"main", activate:true}` (or push to `origin`).

### Frozen Vercel mirror

| Field | Value |
|---|---|
| Project / team | `studio-v` (`prj_RjTtGXyFvNs7fGf1nsqCOSr71gv1`) / `kaizens-projects-89bbbf37` |
| URL | `https://studio-v-indol.vercel.app` — serving frozen commit `855391e` (Git integration paused) |
| Source | GitHub `Kaizen3424/StudioV` (remote `legacy`) |
| Env vars | `STUDIOV_API_KEY`, `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID` (same values as Sites), `NEXT_PUBLIC_APP_URL` (mirror origin — stale on purpose), **`CRON_SECRET`** (only place it exists) |

**Why keep it alive:** (1) old third-party embeds pointing at the vercel.app URL keep working; (2) **Vercel Cron fires `GET /api/cron/maintenance` at 02:00 UTC nightly** against the frozen deployment — same Appwrite backend, so maintenance still runs. If the project is ever deleted, replicate the cron first (§3).

**To un-freeze in an emergency:** Vercel → Settings → Git → resume → `git push legacy main`. To serve pekaar.tech from Vercel, NS must move back to the registrar first (§8 reversal).

---

## 2. Third-party services

| Service | Role | Where |
|---|---|---|
| **Appwrite Sites** | Hosting (SSR, auto-deploy from `Peka-ar/website` `main`) | https://cloud.appwrite.io → project "Peka.ar" → Sites |
| **Appwrite Cloud** | Auth + TablesDB (`studiov`) + Storage (2 buckets) + email + DNS for pekaar.tech | https://cloud.appwrite.io |
| **Vercel** | Frozen mirror + nightly cron trigger | https://vercel.com/kaizens-projects-89bbbf37/studio-v — do not deploy here |
| **GitHub** | Source control; two remotes — `origin` (`Peka-ar/website`, **deploy remote**) and `legacy` (`Kaizen3424/StudioV`, feeds the frozen mirror only) | — |
| **get.tech (Namify)** | Domain registrar — NS delegated to Appwrite, so it only handles renewal/billing | https://manage.get.tech |

Stripe is **not** wired — no webhook handler exists and no `STRIPE_*` vars are in `.env.example`. Billing is a post-launch add.

---

## 3. Environment variables (Appwrite Sites)

Site variables are set in Console → Sites → peka-ar → Settings → Variables (or MCP `sites_update_variable`). **Any variable change requires a new deployment** — values are baked into the build; a running deployment keeps its old values until a new build is triggered (§1 redeploy command, or push an empty commit to `origin`).

| Variable | Value (live) | Variable ID |
|---|---|---|
| `STUDIOV_API_KEY` | Appwrite server API key (same value as local `APPWRITE_API_KEY`) | `studiov-api-key` |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | `next-public-endpoint` |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `6a8562a20037b62075e1` | `next-public-project-id` |
| `NEXT_PUBLIC_APP_URL` | `https://pekaar.tech` | `next-public-app-url` |

- Sites **forbids user-set env vars with the `APPWRITE_` prefix** (reserved for Appwrite-injected vars) — hence the server key lives in `STUDIOV_API_KEY`, read as `process.env.STUDIOV_API_KEY ?? process.env.APPWRITE_API_KEY!` in `src/server/appwrite.ts`. All required vars are validated at boot by `src/server/env.ts`.
- **`CRON_SECRET` is NOT set on the site** — the cron trigger comes from the frozen Vercel deployment. If the Vercel project is deleted: add `CRON_SECRET` as a site variable, trigger a new deployment, and stand up an external scheduler (GitHub Actions or cron-job.org) hitting `https://pekaar.tech/api/cron/maintenance` with `Authorization: Bearer ${CRON_SECRET}`. The route fails closed (401/503) without the secret.
- Local dev (`.env`, gitignored) uses `APPWRITE_API_KEY` — the fallback handles both. `ADMIN_*` vars are only needed by `npm run sync-admin` / `seed:appwrite` — **never set them as site variables** (anyone with console access could reset the admin password); run those scripts locally against the same Appwrite project.
- `NEXT_PUBLIC_APP_URL` is read at runtime server-side (embed snippets in `src/lib/utils.ts` `generateEmbedCode`, auth email links in `src/app/actions/auth.ts` `appUrl`). Rotating the server API key requires updating `STUDIOV_API_KEY` + a new deployment.

---

## 4. Appwrite Cloud (auth, database, storage, DNS)

**Project:** "Peka.ar" (`6a8562a20037b62075e1`, region `fra`). Managed via the console — there are **no code-declared schema migrations**. Tables, indexes, buckets, and email SMTP are console-configured and documented in `WEBSITE.md` §9 and `file-storage-architecture.md`.

### Web platform registration

Every origin that makes browser-direct Appwrite calls (Storage uploads, client SDK) must be a registered **web platform** on the project (Console → Overview → Platforms) — otherwise Appwrite rejects with `general_unknown_origin` (403). Registered:

| Platform id | Hostname |
|---|---|
| `pekar-tech-web` | `pekaar.tech` |
| `web-production-site` | `studio-v-indol.vercel.app` |
| `peka-ar-site` | `branch-main-86d3a7e.appwrite.network` |
| `local-dev-web` | `localhost` |

Keep these in sync whenever a hostname changes.

### Domain & DNS (pekaar.tech)

The domain is **NS-delegated** to Appwrite DNS (`ns1.appwrite.zone` / `ns2.appwrite.zone`) — Appwrite serves the zone (A records → Fastly, auto-applied CAA `0 issue "certainly.com"`) and auto-issues/renews the TLS certificate (Certainly). **All DNS records for pekaar.tech are managed in the Appwrite Console** (organization → Domains → Manage Records), not at get.tech. If email or other DNS-dependent services are ever added, their records must be created there. No MX/TXT records exist today (email not set up — intentional).

### Schema changes

Tables/columns/indexes are edited in the console → Databases → `studiov` → table → Columns/Indexes, or idempotently via `npm run ensure-backend` (`src/server/db/ensure.ts`).

```powershell
npm run ensure-backend
```

Idempotent — creates all missing `generationMode`/`generationStatus`/`generationJobId`/`generationRunId`/`generationAssetId`/`generationError`/`generationViews`/`generationStartedAt`/`generationCompletedAt`/`generationCreditCost` columns on `projects` (and `rate_limits`, `contact_requests`, subscription columns on `users`). The New Task AI-pipeline path also **auto-heals** on the first `Unknown attribute: "generationMode"` at request time (creates + waits for `available` + retries once), so a cold DB self-heals; still run `ensure-backend` eagerly after any schema change and verify with `GET /api/health` → `generationSchemaReady:true`.

After changing a schema, update `WEBSITE.md` §9 and the relevant deep-dive. There is no point-in-time restore; treat console deletes as destructive.

### Admin bootstrap

```powershell
$env:ADMIN_EMAIL="<email>"
$env:ADMIN_PASSWORD="<password>"
$env:ADMIN_NAME="<name>"
npm run sync-admin
```

**Idempotent.** Upserts the env-driven admin (Appwrite user with `ADMIN` label + `users` row) and deletes any stray ADMIN users whose email is not the env-driven one. Run after any rotation of the `ADMIN_*` values.

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

### Commit message style

- Conventional Commits prefix (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`), optional scope (`feat(auth):`)
- Subject imperative, ≤ 72 chars, no period. Body explains *why*, not *what*.
- On Windows PowerShell, use two `-m` flags rather than a literal newline; chain with `&&` (not `;`). When POSTing JSON with `curl.exe`, use single quotes — `-d '{"key":"val"}'` (PowerShell backslash-escaping sends literal backslashes).

### Branching

Trunk-based: `main` is the only long-lived branch. Feature branches can be pushed, but Appwrite Sites builds them too (branch deployments get their own `branch-<name>-<hash>.appwrite.network` URL) — **they share the same Appwrite backend as production, so any branch deployment that mutates data affects prod data.** Do not point branch builds at a different backend via env — gate in code if needed.

### Before every push

1. `npm run lint` — must be silent
2. `npm run build` — must compile + pass TypeScript
3. Check `git status` — no stray files, no debug `console.log`s
4. Read your own diff — `git log -p HEAD~1`

### After every push

1. Console → Sites → peka-ar → **Deployments** → watch the build (~3–5 min)
2. **Wait for "Ready"** — failed builds never activate
3. Open the build logs if it failed (deployment row → logs)
4. Smoke-test https://pekaar.tech: `/` 200 · `/api/health` `{ok:true}` · `/auth` 200 · unauth'd `/admin/dashboard` → 307 `/auth` · a PUBLISHED project's `/api/sdk/v1/config/{id}` 200 + `/embed/{id}` 200 · sign-in works.

---

## 6. Operating the deployment (console)

The Appwrite Console is the primary interface. MCP tools cover the same operations: `sites_list_deployments`, `sites_create_vcs_deployment`, `sites_update_site_deployment`, `sites_list_variables`, `sites_update_variable`, `sites_list_logs`.

| Task | Where |
|---|---|
| Watch deployments / build logs | Console → Sites → peka-ar → Deployments |
| Runtime + error logs | Console → Sites → peka-ar → Logs |
| Update site variables | Console → Settings → Variables (**trigger a new deployment after**) |
| Rebuild without new code | MCP `sites_create_vcs_deployment` (see §1) or push an empty commit |
| Roll back | Console → Deployments → previous Ready deployment → **Activate** (§7) |
| Domain / DNS / cert status | Console → Sites → peka-ar → Domains; org → Domains for DNS records |
| Frozen Vercel mirror | https://vercel.com/kaizens-projects-89bbbf37/studio-v (read-only; cron jobs under Settings → Cron Jobs) |

**Debugging rules of thumb:**
- If variable changes don't seem to apply — **trigger a new deployment**; values are baked at build time.
- Runtime route errors appear in Console → Sites → peka-ar → Logs — check there before guessing.
- `/embed/[id]` reads `public/embed-viewer.html` from disk at request time — **if a deploy breaks that template, every third-party embed breaks simultaneously**. If customers report "the embed is broken" and you see 5xx on `/embed/*`, check `public/embed-viewer.html` in the deployed commit.

---

## 7. Rollback strategy (Appwrite Sites)

Rollback = **re-activate a previous deployment**. Every deployment is retained (keep-all).

```text
Console: Sites → peka-ar → Deployments → (previous Ready deployment) → … → Activate
MCP:     sites_update_site_deployment {site_id:"peka-ar", deployment_id:"<deployment-id>"}
```

No git revert, no rebuild, no DB changes — the domain + branch URL re-point at the stored deployment.

**Trigger conditions** (roll back immediately if any):
- HTTP 5xx error rate spikes
- Auth flow broken (no one can sign in)
- `/embed/[id]` failing for any published project
- Data integrity issue (state machine broken, missing rows)

**Database considerations:** TablesDB has **no code-declared migrations** — a code rollback never requires a schema change. There is no point-in-time restore; treat console deletes as destructive.

**Last-resort mirror:** if Appwrite Sites is ever down hard, the frozen Vercel deployment (same backend) can be un-frozen (§1) and pekaar.tech pointed at Vercel — but DNS changes require moving NS back to the registrar first (§8 reversal).

---

## 8. Custom domain (pekaar.tech)

The apex is attached via **NS delegation** (Appwrite's recommended apex method — apex records cannot be CNAMEs per RFC, and get.tech/Namify has no CNAME flattening):

1. Registrar get.tech (Namify; https://manage.get.tech) — nameservers `ns1.appwrite.zone` + `ns2.appwrite.zone`.
2. Console → Sites → peka-ar → Domains → `pekaar.tech`, rule type **Active deployment**. Org → Domains holds the zone (where records are managed).
3. Web platform `pekar.tech` registered on the project (`pekar-tech-web`) — required for browser-direct Storage uploads.
4. Site variable `NEXT_PUBLIC_APP_URL` → `https://pekaar.tech` + new deployment.

**Gotchas (do not repeat):**
- The console's **Verify** button checks via resolver 8.8.8.8 from the project region. Right after an NS switch, stale caches produce the misleading error *"DNS verification failed… missing CNAME record"* — an NS-delegated apex **never has a CNAME** (Appwrite serves flattened A records). The error really means "not propagated to that resolver yet" (TTL up to 6h). Wait, confirm propagation at dnschecker.org, verify once.
- Do **not** mix old + new nameservers during the switch.
- HTTP does not redirect to HTTPS at Appwrite's edge — both serve 200. Harmless.
- Old vercel.app and `*.appwrite.network` URLs keep working — existing third-party embeds don't break in a switch.

**Reversal (move pekaar.tech back to registrar DNS / to Vercel):** get.tech → DNS → Nameservers → **Default Namify.tech nameservers**, then manage records at the registrar again (e.g. A `76.76.21.21` for a Vercel apex, CNAME `cname.vercel-dns.com` for subdomains). Appwrite's site domain entry would then need CNAME-style verification — only do this if leaving Appwrite Sites hosting.

---

## 9. Monitoring and error reporting

**Current state:** Appwrite Console → Sites → peka-ar → Logs (requests + errors) only. No external error tracking.

**Recommended week-1 adds:**
- **Sentry** (`@sentry/nextjs`, `npx @sentry/wizard@latest`) — add `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` as site variables + new deployment
- **Uptime monitoring** (https://uptimerobot.com free tier) — HTTP 200 checks on `https://pekaar.tech/` and `/api/notifications` (a 401 still proves the server is up)
- Auth rate limiting is already in place (`rate_limits` table — `backend-architecture.md` §4)

---

## 10. Common operations cheat sheet

| Task | Command / place |
|---|---|
| First-time setup on a new laptop | `npm install` (Appwrite + GitHub auth per machine) |
| Run dev server | `npm run dev` |
| Lint / Build | `npm run lint` / `npm run build` |
| Sync admin user | `npm run sync-admin` (with `ADMIN_*` env vars set locally) |
| Seed demo data (local/dev only) | `npm run seed:appwrite` |
| **Deploy** | `git push origin main` |
| Rebuild without new code | MCP `sites_create_vcs_deployment` (§1) |
| Roll back | Console → Deployments → Activate (or MCP `sites_update_site_deployment`) |
| Watch deployments / logs | Console → Sites → peka-ar → Deployments / Logs |
| Update site variables | Console → Settings → Variables (+ new deployment) |
| Manage DNS records | Console → organization → Domains → pekaar.tech → Manage Records |
| Open the live site / console | https://pekaar.tech · https://cloud.appwrite.io (project "Peka.ar") |
| Open Vercel (frozen mirror) / GitHub | https://vercel.com/kaizens-projects-89bbbf37/studio-v · https://github.com/Peka-ar/website |

---

## 11. See also

- [`./WEBSITE.md`](./WEBSITE.md) — app reference, data model, route map, server actions
- [`./backend-architecture.md`](./backend-architecture.md) — server layering, rate limiting, nightly maintenance cron internals
- [`./file-storage-architecture.md`](./file-storage-architecture.md) — Appwrite Storage architecture
- [`./pages/auth.md`](./pages/auth.md) — `/auth*` flows + email failure recovery
- [`./.env.example`](../.env.example) — env var template, documents both key names (local-only: gitignored via the `.env*` pattern)
- Appwrite docs: https://appwrite.io/docs
