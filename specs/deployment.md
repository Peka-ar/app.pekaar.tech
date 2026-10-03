# Deployment — Appwrite Sites (two sites) + Appwrite Cloud backend

> **Parent:** [`./WEBSITE.md`](./WEBSITE.md)

Production runtime for Peka AR. This document is the **operational handbook**: what is deployed, where, how to inspect it, update it, recover from a bad deploy, and do day-to-day code changes safely.

**Topology (post-split):** two Appwrite Sites in the same project serve two repos — the **apex `pekaar.tech` runs the Astro marketing site** (repo `Peka-ar/pekaar.tech`), and **`app.pekaar.tech` runs the Next.js app** (repo `Peka-ar/app.pekaar.tech`). All backend services are one **Appwrite Cloud** project "Peka.ar" (Auth + TablesDB + Storage + email + DNS), so web and backend live in one platform. A **frozen Vercel mirror** still serves old vercel.app embed URLs — but the nightly cron it used to fire **breaks at cutover** (§3 step 7).

---

## 1. Live deployments (Appwrite Sites)

### App site (Next.js)

| Field | Value |
|---|---|
| **Host** | Appwrite Sites — site id `peka-ar`, display name **app.pekaar.tech**, project "Peka.ar" (`6a8562a20037b62075e1`, region `fra`) |
| **Production URL** | **https://app.pekaar.tech** (custom subdomain, rule type: Active deployment) |
| **Branch URL** | `https://branch-main-86d3a7e.appwrite.network` — constant, re-points to latest `main` deployment |
| **GitHub repo** | `https://github.com/Peka-ar/app.pekaar.tech` (deploy remote `origin`), branch `main`, root `/`. **Gotcha:** the VCS integration tracks the repo by its immutable GitHub id (`1339382325`) — renaming `Peka-ar/website` → `Peka-ar/app.pekaar.tech` kept the site connected automatically; verify with MCP `sites_get {site_id:"peka-ar"}` (`providerRepositoryId`) instead of assuming a re-point is needed |
| **Build config** | framework `nextjs`, adapter **ssr**, build runtime `node-24`, `npm install` / `npm run build`, output `./.next`, timeout 60s, spec `s-4vcpu-4gb` build / `s-2vcpu-2gb` runtime |
| **Management** | Appwrite Console → Sites → app.pekaar.tech (site id `peka-ar`; Deployments / Settings / Variables / Domains / Logs) |

Deploy = `git push origin main`. Build config lives in the console, not the repo. Build ≈2–4 min (observed ~2 min warm). Deployment URLs rotate per build — never reference them; use `app.pekaar.tech` or the branch URL.

**Deployment gotcha:** only **VCS deployments from `main` re-point the branch URL**; a manual "duplicate deployment" builds fresh but leaves the branch URL on the old deployment. To redeploy after env-var changes: MCP `sites_create_vcs_deployment {site_id:"peka-ar", type:"branch", reference:"main", activate:true}` (or push to `origin`).

### Marketing site (Astro)

| Field | Value |
|---|---|
| **Host** | Appwrite Sites — site id `peka-ar-marketing`, display name **pekaar.tech**, project "Peka.ar" |
| **Production URL** | **https://pekaar.tech** (apex, moved from the app site at cutover, rule type: Active deployment) |
| **GitHub repo** | `https://github.com/Peka-ar/pekaar.tech`, branch `main`, root `/` |
| **Build config** | framework `astro`, install `npm install`, build `npm run build`, output `./dist`, build runtime `node-24`, spec `s-4vcpu-4gb` build / `s-1vcpu-1gb` runtime, **"Server side rendering" checked** (the site is hybrid: static `dist/` + the on-demand `/embed/*` + `/api/sdk/*` redirects served by the `@astrojs/node` standalone adapter — Appwrite's Astro SSR docs list exactly this adapter as the SSR prerequisite) |
| **Management** | Appwrite Console → Sites → (marketing site) — same sections as the app site |

Deploy = `git push origin main`. **No site variables required** — the app origin defaults to `https://app.pekaar.tech` (`PUBLIC_APP_URL` exists only as an override). This site never talks to Appwrite (no Auth/Storage/DB calls), so it needs no API key and no web platform.

### Frozen Vercel mirror

| Field | Value |
|---|---|
| Project / team | `studio-v` (`prj_RjTtGXyFvNs7fGf1nsqCOSr71gv1`) / `kaizens-projects-89bbbf37` |
| URL | `https://studio-v-indol.vercel.app` — serving frozen commit `855391e` (Git integration paused) |
| Source | GitHub `Kaizen3424/StudioV` (remote `legacy`) |
| Env vars | `STUDIOV_API_KEY`, `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID` (same values as Sites), `NEXT_PUBLIC_APP_URL` (mirror origin — stale on purpose), **`CRON_SECRET`** (only place it exists today) |

**Why keep it alive:** old third-party embeds pointing at the vercel.app URL keep working (it serves its own frozen embed code, unaffected by the split).

**Vercel Cron BREAKS at cutover.** Vercel Cron invokes `GET /api/cron/maintenance` on the project's production domain (`pekaar.tech`) — after the apex moves to the marketing site that URL 404s (marketing has no such route), so nightly maintenance silently stops. Do not "fix" it with an apex redirect: cross-host redirects **strip the `Authorization` header** (fetch/curl credential rules), so the app route would fail closed with 401 anyway. The fix is §3 step 7 (external scheduler → `app.pekaar.tech`).

**To un-freeze in an emergency:** Vercel → Settings → Git → resume → `git push legacy main`. Vercel can only serve `pekaar.tech` if NS move back to the registrar first (§9 reversal).

---

## 2. Third-party services

| Service | Role | Where |
|---|---|---|
| **Appwrite Sites** | Hosting × 2 (SSR, auto-deploy from GitHub `main`) | https://cloud.appwrite.io → project "Peka.ar" → Sites |
| **Appwrite Cloud** | Auth + TablesDB (`studiov`) + Storage (2 buckets) + email + DNS for pekaar.tech | https://cloud.appwrite.io |
| **Vercel** | Frozen mirror (old vercel.app embeds only — **no longer the cron trigger** after cutover) | https://vercel.com/kaizens-projects-89bbbf37/studio-v — do not deploy here |
| **GitHub** | Source control; remotes — app `origin` (`Peka-ar/app.pekaar.tech`, **deploy remote**), marketing `origin` (`Peka-ar/pekaar.tech`), legacy (`Kaizen3424/StudioV`, feeds the frozen mirror only). `Peka-ar/website` is **retired** (stops receiving pushes after cutover) | — |
| **get.tech (Namify)** | Domain registrar — NS delegated to Appwrite, so it only handles renewal/billing | https://manage.get.tech |

Stripe is **not** wired — no webhook handler exists and no `STRIPE_*` vars are in `.env.example`. Billing is a post-launch add.

---

## 3. Cutover runbook (execute once, in order)

The repos and code are ready; these are the console/DNS actions that put traffic on the split. **Steps 1–3 before the DNS move; 4–7 with it; 8 verifies.**

**Status: steps 1–6 and 8 are done and verified. Step 7 is delivered as `.github/workflows/nightly-maintenance.yml` + the `CRON_SECRET` site variable — two console steps remain: add the repo secret on GitHub and disable the frozen Vercel cron.** Until those land, the workflow fails fast (missing secret) and the Vercel cron keeps 404ing against the marketing apex (harmless but nightly maintenance does not run).

1. **App site → new repo.** Push app `main` to `Peka-ar/app.pekaar.tech`. No console action needed: the site tracks the repo by its **immutable GitHub id** (`1339382325`), so the GitHub rename `Peka-ar/website` → `Peka-ar/app.pekaar.tech` kept the integration attached — confirm with MCP `sites_get {site_id:"peka-ar"}` → `providerRepositoryId == 1339382325`.
2. **Create the marketing site.** Console → Sites → Create site → connect `Peka-ar/pekaar.tech` → framework Astro, output `./dist`, **Server side rendering on** → Deploy (§1 Marketing site).
3. **App env var.** Site `peka-ar` → Variables → `NEXT_PUBLIC_APP_URL` = `https://app.pekaar.tech` → trigger a new deployment (values bake at build time).
4. **DNS record.** Org → Domains → `pekaar.tech` → Manage Records → add **CNAME `app` → `appwrite.network`** (the target Appwrite shows for Sites; the zone's locked wildcard `* → appwrite.network` already resolves every subdomain, but the explicit record is what verification expects). Then attach `app.pekaar.tech` to site `peka-ar` (Domains → Add, rule type Active deployment; MCP `proxy_create_site_rule {domain:"app.pekaar.tech", site_id:"peka-ar"}`). TLS issues automatically.
5. **Move the apex.** Site `peka-ar` → Domains → `pekaar.tech` → **remove** (record lives in the org zone — removing the site binding keeps the DNS record). Marketing site → Domains → add `pekaar.tech`, rule type Active deployment → Verify (§8 gotchas apply: resolver-cache false alarms right after propagation).
   **Mechanics gotcha:** a hostname holds exactly one rule — creating it on the second site first fails `409 rule_already_exists`, so the move is delete-then-create: MCP `proxy_delete_rule {rule_id:"bb172a1a74c7e8aab97273869b4c7a87"}` then `proxy_create_site_rule {domain:"pekaar.tech", site_id:"peka-ar-marketing"}`. Deleting the apex rule does **not** touch the org zone (all DNS records survive — verified), and the recreated rule **reuses the same id** (that id equals the org-domain id) and re-issues TLS within seconds.
6. **Web platform.** Project → Overview → Platforms → add hostname **`app.pekaar.tech`** (browser-direct Storage uploads + client SDK now run on that origin; without the platform every upload 403s `general_unknown_origin`). Keep `pekar-tech-web` (`pekaar.tech`) while it exists; the marketing site makes no Appwrite calls.
7. **Cron — GitHub Actions.** `.github/workflows/nightly-maintenance.yml` GETs `https://app.pekaar.tech/api/cron/maintenance` with `Authorization: Bearer ${{ secrets.CRON_SECRET }}` at 02:00 UTC (plus `workflow_dispatch` for manual runs) and fails the job on any non-200. The `CRON_SECRET` site variable on `peka-ar` is set (secret, id `cron-secret`; the route fail-closes to **503** when unset, **401** on a bad token). **Two manual steps remain:** (a) add the same value as repo secret `CRON_SECRET` (GitHub → repo → Settings → Secrets and variables → Actions), (b) disable the frozen project's Vercel cron (Settings → Cron Jobs). Gotchas: GitHub auto-**pauses `schedule:` triggers after ~60 days without repo activity** — re-enable from the Actions tab. Never route this through the apex (header stripping — §1).
8. **Smoke test** (both origins + redirects) — all curl-verified, except where noted:
   - `https://pekaar.tech/` 200 (Astro landing, served by the marketing site's deployment — check `X-Appwrite-Deployment-Id`) · `/pricing` → **301 canonical trailing slash** → `/pricing/` 200 (Astro, not an error) · `/sitemap-index.xml` 200 · `GET https://pekaar.tech/embed/<published-id>?x=1` → **301** to `app.pekaar.tech` with query preserved · `POST` same URL → **308** · `GET /api/sdk/v1/config/<id>` → **301**, `POST` → **308**.
   - `https://app.pekaar.tech/api/health` `{"status":"ok",...}` · `/auth` 200 · unauth'd `/admin/dashboard` → 307 `/auth` · a PUBLISHED project's `/api/sdk/v1/config/{id}` 200 + `/embed/{id}` 200 · app `/` responds **200 with a meta-refresh to the apex** (Next `permanentRedirect` streams the shell first, so the digest carries `NEXT_REDIRECT;…;308` instead of a `Location` header — browsers land on `pekaar.tech` immediately; don't "fix" this by expecting 308) · **sign-in works** and **project image upload succeeds from the app origin** (proves platform registration — manual browser checks).
   - The workflow's run shows 200 in its logs AND `GET /api/cron/maintenance` with no header returns **401** (secret set; a **503** would mean the site variable vanished).

---

## 4. Environment variables (Appwrite Sites)

Site variables are set in Console → Sites → (site) → Settings → Variables (or MCP `sites_update_variable`). **Any variable change requires a new deployment** — values are baked into the build; a running deployment keeps its old values until a new build is triggered (§1 redeploy command, or push an empty commit to `origin`).

### App site (`peka-ar`)

| Variable | Value (live) | Variable ID |
|---|---|---|
| `STUDIOV_API_KEY` | Appwrite server API key (same value as local `APPWRITE_API_KEY`) | `studiov-api-key` |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | `next-public-endpoint` |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `6a8562a20037b62075e1` | `next-public-project-id` |
| `NEXT_PUBLIC_APP_URL` | **`https://app.pekaar.tech`** | `next-public-app-url` |
| `CRON_SECRET` | shared secret for the nightly cron — must equal the GitHub Actions repo secret `CRON_SECRET` (step 7) | `cron-secret` (secret) |

- Sites **forbids user-set env vars with the `APPWRITE_` prefix** (reserved for Appwrite-injected vars) — hence the server key lives in `STUDIOV_API_KEY`, read as `process.env.STUDIOV_API_KEY ?? process.env.APPWRITE_API_KEY!` in `src/server/appwrite.ts`. All required vars are validated at boot by `src/server/env.ts`.
- Local dev (`.env`, gitignored) uses `APPWRITE_API_KEY` — the fallback handles both. `ADMIN_*` vars are only needed by `npm run sync-admin` / `seed-appwrite` — **never set them as site variables** (anyone with console access could reset the admin password); run those scripts locally against the same Appwrite project.
- `NEXT_PUBLIC_APP_URL` is read at runtime server-side (embed snippets in `src/lib/utils.ts` `generateEmbedCode`, auth email links in `src/app/actions/auth.ts` `appUrl`, `metadataBase` fallback in `layout.tsx`). Rotating the server API key requires updating `STUDIOV_API_KEY` + a new deployment.

### Marketing site

No variables required. `PUBLIC_APP_URL` (build-time) overrides the app origin in `src/config.ts` — only set it if `app.pekaar.tech` ever changes.

---

## 5. Appwrite Cloud (auth, database, storage, DNS)

**Project:** "Peka.ar" (`6a8562a20037b62075e1`, region `fra`). Managed via the console — there are **no code-declared schema migrations**. Tables, indexes, buckets, and email SMTP are console-configured and documented in `WEBSITE.md` §9 and `file-storage-architecture.md`.

### Web platform registration

Every origin that makes browser-direct Appwrite calls (Storage uploads, client SDK) must be a registered **web platform** on the project (Console → Overview → Platforms) — otherwise Appwrite rejects with `general_unknown_origin` (403). Registered:

| Platform id | Hostname |
|---|---|
| **`app-pekaar-tech`** | **`app.pekaar.tech`** — the app origin (**required or uploads break**) |
| `pekar-tech-web` | `pekaar.tech` (legacy/apex — marketing makes no Appwrite calls; keep until confirmed removable) |
| `web-production-site` | `studio-v-indol.vercel.app` |
| `peka-ar-site` | `branch-main-86d3a7e.appwrite.network` |
| `local-dev-web` | `localhost` |

Keep these in sync whenever a hostname changes.

### Domain & DNS (pekaar.tech)

The domain is **NS-delegated** to Appwrite DNS (`ns1.appwrite.zone` / `ns2.appwrite.zone`) — Appwrite serves the zone (A records → Fastly, auto-applied CAA `0 issue "certainly.com"`) and auto-issues/renews the TLS certificate (Certainly). **All DNS records for pekaar.tech are managed in the Appwrite Console** (organization → Domains → Manage Records), not at get.tech. Email **is** configured on this zone (Resend inbound): MX `contact` → `inbound-smtp.ap-northeast-1.amazonaws.com`, CNAMEs `rsend.contact`/`send.contact` → forge.rmta.net, DKIM TXT `resend._domainkey.contact`, `_dmarc` TXT `p=none` (**two duplicate records exist** — both harmless), plus a google-site-verification TXT at the apex. The apex `A`/`AAAA` and wildcard `*` CNAME are Appwrite-locked records — never delete them.

**Post-split records:** apex `pekaar.tech` → marketing site; `app` (CNAME) → app site. Both are site-domain bindings of records that live in the org zone.

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
- **Do not delete either site's deployment history** — previous deployments are the rollback mechanism (§7).
- **Do not change nameservers at get.tech** unless intentionally leaving Appwrite DNS — the registrar's DNS panel is inert while NS point to Appwrite.
- **Do not enable `security.checkOrigin` on the marketing site** and **do not add an apex redirect for `/api/cron/*`** — see §1 and `WEBSITE.md` (header stripping breaks the Bearer auth).

---

## 6. Day-to-day development workflow

### The 4-step loop

```powershell
# 1. Edit code locally
# 2. Verify
npm run lint      # app repo; marketing repo: npm run build is the only gate
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

1. `npm run lint` — must be silent (app)
2. `npm run build` — must compile + pass TypeScript (app) / pass (marketing)
3. Check `git status` — no stray files, no debug `console.log`s
4. Read your own diff — `git log -p HEAD~1`

### After every push

1. Console → Sites → (the site you pushed to) → **Deployments** → watch the build (~2–4 min)
2. **Wait for "Ready"** — failed builds never activate
3. Open the build logs if it failed (deployment row → logs)
4. Smoke-test **the origin you changed**:
   - **App** — `https://app.pekaar.tech`: `/api/health` `{"status":"ok",...}` · `/auth` 200 · unauth'd `/admin/dashboard` → 307 `/auth` · a PUBLISHED project's `/api/sdk/v1/config/{id}` 200 + `/embed/{id}` 200 · sign-in works.
   - **Marketing** — `https://pekaar.tech`: `/` 200 · `/pricing` 301 → `/pricing/` 200 (canonical slash) · `GET /embed/<id>` → 301 to `app.pekaar.tech` · `POST /embed/<id>` → 308.

---

## 7. Operating the deployments (console)

The Appwrite Console is the primary interface. MCP tools cover the same operations: `sites_list_deployments`, `sites_create_vcs_deployment`, `sites_update_site_deployment`, `sites_list_variables`, `sites_update_variable`, `sites_list_logs`.

| Task | Where |
|---|---|
| Watch deployments / build logs | Console → Sites → (peka-ar \| marketing) → Deployments |
| Runtime + error logs | Console → Sites → (site) → Logs |
| Update site variables | Console → Settings → Variables (**trigger a new deployment after**) |
| Rebuild without new code | MCP `sites_create_vcs_deployment` (see §1) or push an empty commit |
| Roll back | Console → Deployments → previous Ready deployment → **Activate** (§8) |
| Domain / DNS / cert status | Console → Sites → (site) → Domains; org → Domains for DNS records |
| Frozen Vercel mirror | https://vercel.com/kaizens-projects-89bbbf37/studio-v (read-only; cron jobs disabled post-cutover) |

**Debugging rules of thumb:**
- If variable changes don't seem to apply — **trigger a new deployment**; values are baked at build time.
- Runtime route errors appear in Console → Sites → (site) → Logs — check there before guessing.
- **Wrong site answered?** `pekaar.tech` = marketing, `app.pekaar.tech` = app. A marketing-looking 404 on an app path means the apex binding is on the wrong site (or a redirect route is missing — the apex only 301/308s `/embed/*` and `/api/sdk/*`, nothing else).
- `/embed/[id]` reads `public/embed-viewer.html` from disk at request time — **if a deploy breaks that template, every third-party embed breaks simultaneously**. If customers report "the embed is broken" and you see 5xx on `/embed/*`, check `public/embed-viewer.html` in the deployed commit.
- Old embed snippets pointing at `https://pekaar.tech/embed/...` (pre-split) must 301 to the app — if they render the marketing page instead, the marketing redirect route is gone (rebuild marketing).

---

## 8. Rollback strategy (Appwrite Sites)

Rollback = **re-activate a previous deployment on the site that broke**. Every deployment is retained (keep-all).

```text
Console: Sites → (site) → Deployments → (previous Ready deployment) → … → Activate
MCP:     sites_update_site_deployment {site_id:"<site>", deployment_id:"<deployment-id>"}
```

No git revert, no rebuild, no DB changes — the domain + branch URL re-point at the stored deployment.

**Trigger conditions** (roll back immediately if any):
- HTTP 5xx error rate spikes on either origin
- Auth flow broken (no one can sign in)
- `/embed/[id]` failing for any published project (incl. apex-redirected hits)
- Data integrity issue (state machine broken, missing rows)

**Database considerations:** TablesDB has **no code-declared migrations** — a code rollback never requires a schema change. There is no point-in-time restore; treat console deletes as destructive.

**Last-resort mirror:** if Appwrite Sites is ever down hard, the frozen Vercel deployment (same backend) can be un-frozen (§1) and pekaar.tech pointed at Vercel — but DNS changes require moving NS back to the registrar first (§9 reversal). Note the mirror carries pre-split code (marketing routes and apex redirects do not exist there).

---

## 9. Custom domains

### Apex (pekaar.tech → marketing site)

The apex is attached via **NS delegation** (Appwrite's recommended apex method — apex records cannot be CNAMEs per RFC, and get.tech/Namify has no CNAME flattening):

1. Registrar get.tech (Namify; https://manage.get.tech) — nameservers `ns1.appwrite.zone` + `ns2.appwrite.zone` (**already done — unchanged by the split**).
2. Console → Sites → **`peka-ar-marketing`** (display name `pekaar.tech`) → Domains → `pekaar.tech`, rule type **Active deployment** — the app site `peka-ar` no longer holds any apex binding. Org → Domains holds the zone (where records are managed).
3. Web platform on the project: hostname **`app.pekaar.tech`** registered (platform id `app-pekaar-tech`) for the app; `pekar-tech-web` (`pekaar.tech`) kept.
4. App site (`peka-ar`) variable `NEXT_PUBLIC_APP_URL` = `https://app.pekaar.tech` — values bake at build, so any change needs a new deployment.

### Subdomain (app.pekaar.tech → app site)

1. Org → Domains → `pekaar.tech` → Manage Records → add CNAME `app` → **`appwrite.network`**.
2. Sites → app.pekaar.tech (id `peka-ar`) → Domains → `app.pekaar.tech`, rule type Active deployment → Verify.
3. Platform registration (step 3 above) **before** traffic moves.

**Gotchas (do not repeat):**
- The console's **Verify** button checks via resolver 8.8.8.8 from the project region. Right after an NS/record change, stale caches produce the misleading error *"DNS verification failed… missing CNAME record"* — that error really means "not propagated to that resolver yet" (TTL up to 6h). Wait, confirm propagation at dnschecker.org, verify once.
- Do **not** mix old + new nameservers during the switch.
- HTTP does not redirect to HTTPS at Appwrite's edge — both serve 200. Harmless.
- Old vercel.app and `*.appwrite.network` URLs keep working — existing third-party embeds don't break in a switch; pre-split `pekaar.tech/embed/*` embeds survive **only** because the marketing site 301s them (§1) — that route is now load-bearing.

**Reversal (move pekaar.tech back to registrar DNS / to Vercel):** get.tech → DNS → Nameservers → **Default Namify.tech nameservers**, then manage records at the registrar again (e.g. A `76.76.21.21` for a Vercel apex, CNAME `cname.vercel-dns.com` for subdomains). Appwrite's site domain entries would then need CNAME-style verification — only do this if leaving Appwrite Sites hosting.

---

## 10. Monitoring and error reporting

**Current state:** Appwrite Console → Sites → (site) → Logs (requests + errors) only. No external error tracking.

**Recommended week-1 adds:**
- **Sentry** (`@sentry/nextjs`, `npx @sentry/wizard@latest`) — add `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` as site variables + new deployment (app site)
- **Uptime monitoring** (https://uptimerobot.com free tier) — HTTP 200 checks on `https://pekaar.tech/` **and** `https://app.pekaar.tech/api/notifications` (a 401 still proves the server is up) **and** a 301 check on `https://pekaar.tech/embed/<known-id>`
- Auth rate limiting is already in place (`rate_limits` table — `backend-architecture.md` §4)

---

## 11. Common operations cheat sheet

| Task | Command / place |
|---|---|
| First-time setup on a new laptop | `npm install` (Appwrite + GitHub auth per machine) |
| Run dev server | `npm run dev` (app) / `npm run dev` (marketing, port 4321) |
| Lint / Build | `npm run lint` / `npm run build` (app); `npm run build` (marketing) |
| Sync admin user | `npm run sync-admin` (with `ADMIN_*` env vars set locally) |
| Seed demo data (local/dev only) | `npm run seed:appwrite` |
| **Deploy app** | `git push origin main` (→ site peka-ar) |
| **Deploy marketing** | `git push origin main` (→ marketing site) |
| Rebuild without new code | MCP `sites_create_vcs_deployment` (§1) |
| Roll back | Console → Deployments → Activate (or MCP `sites_update_site_deployment`) |
| Watch deployments / logs | Console → Sites → (site) → Deployments / Logs |
| Update site variables | Console → Settings → Variables (+ new deployment) |
| Manage DNS records | Console → organization → Domains → pekaar.tech → Manage Records |
| Open the live sites / console | https://pekaar.tech (marketing) · https://app.pekaar.tech (app) · https://cloud.appwrite.io (project "Peka.ar") |
| Open Vercel (frozen mirror) / GitHub | https://vercel.com/kaizens-projects-89bbbf37/studio-v · https://github.com/Peka-ar/app.pekaar.tech · https://github.com/Peka-ar/pekaar.tech |

---

## 12. See also

- [`./WEBSITE.md`](./WEBSITE.md) — app reference, data model, route map, server actions
- [`./backend-architecture.md`](./backend-architecture.md) — server layering, rate limiting, nightly maintenance cron internals
- [`./file-storage-architecture.md`](./file-storage-architecture.md) — Appwrite Storage architecture
- [`./pages/auth.md`](./pages/auth.md) — `/auth*` flows + email failure recovery
- [`./.env.example`](../.env.example) — env var template, documents both key names (local-only: gitignored via the `.env*` pattern)
- Appwrite docs: https://appwrite.io/docs (Sites Astro quick-start: install `npm install`, build `npm run build`, output `./dist`, SSR via `@astrojs/node`)
