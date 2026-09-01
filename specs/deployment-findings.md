# Deployment findings & reference (Appwrite Sites primary + Vercel frozen record)

> Parent: [`./WEBSITE.md`](./WEBSITE.md) · Operational handbook: [`./deployment.md`](./deployment.md)

Chronological record of the production deployment of the Appwrite-migrated app (Aug 31 – Sep 1, 2026), all live IDs/URLs, the env-var matrix, the git remotes map, and the custom-domain setup record for `pekaar.tech`. **No secrets in this file** — secret values live only in the Appwrite console, Vercel dashboard, and local `.env`.

---

## 1. Current state (as of 2026-09-01)

| | Host | URL | Status |
|---|---|---|---|
| **Primary** | **Appwrite Sites** — site `peka-ar` | **https://pekaar.tech** | Live, auto-deploys from `Peka-ar/website` `main` (remote `origin`) |
| Mirror (frozen) | Vercel — project `studio-v` | https://studio-v-indol.vercel.app | Serving frozen commit `855391e`; Git integration **paused** 2026-09-01; Vercel Cron still fires nightly |

Timeline: Vercel was primary 2026-08-31 → 2026-09-01 (no custom domain; the rotating `*.appwrite.network` URL was a hassle). Domain `pekaar.tech` bought at get.tech, attached via NS delegation, verified ~22:00 IST 2026-09-01 → **Appwrite Sites became primary**; Vercel paused the same evening. Both hosts share the **same Appwrite Cloud project** — data, auth users, and files are identical, not duplicated.

---

## 2. Appwrite Sites deployment (primary)

| Field | Value |
|---|---|
| Site ID / project | `peka-ar` / "Peka.ar" `6a8562a20037b62075e1` (region `fra`) |
| Production domain | `https://pekaar.tech` — apex, rule type **Active deployment**, NS-delegated (see §7) |
| Branch URL | `https://branch-main-86d3a7e.appwrite.network` — constant, re-points to latest `main` deployment |
| Commit URL pattern | `https://commit-<hash>.appwrite.network`; deployment URLs rotate per deployment (never reference them) |
| VCS installation / repo | `6a94f8463518365b9872` / `Peka-ar/website` repo ID `1339382325`, branch `main`, root `/` |
| Build config | framework `nextjs`, adapter **ssr**, runtime `node-22`, `npm install` / `npm run build`, output `./.next`, timeout 60 (max 1–60), spec `s-2vcpu-2gb` build / `s-0.5vcpu-512mb` runtime |
| Deployments | `6a95064f92e098b251ee` (first VCS, commit `9b88c16`) · `6a9507f9ae89a4f99dd6` (manual duplicate — did NOT re-point branch URL) · `6a9509027178ddba4b54` (VCS) · `6a950c0f4371d77da348` (docs commit `0e72d57`, was the dormant freeze point) · `6a96ecdb6bac97cb041e` (**current** — commit `855391e`, activated 2026-09-01 with `NEXT_PUBLIC_APP_URL=https://pekaar.tech`, Ready in ~5 min) |
| Site env vars | `STUDIOV_API_KEY` (id `studiov-api-key`), `NEXT_PUBLIC_APPWRITE_ENDPOINT` (id `next-public-endpoint`), `NEXT_PUBLIC_APPWRITE_PROJECT_ID` (id `next-public-project-id`), `NEXT_PUBLIC_APP_URL` (id `next-public-app-url`, → `https://pekaar.tech`) — all secret; **any change requires a new deployment**. **No `CRON_SECRET`** (cron trigger comes from the frozen Vercel deployment; see §3) |
| Web platform | `peka-ar-site` (hostname `branch-main-86d3a7e.appwrite.network`) |

**Findings (unique to Sites):**
- Sites **forbids user-set env vars with the `APPWRITE_` prefix** (reserved for injected vars like `APPWRITE_SITE_API_KEY`) — hence the server key lives in `STUDIOV_API_KEY`, read as `process.env.STUDIOV_API_KEY ?? process.env.APPWRITE_API_KEY!` in `src/server/appwrite.ts:5`.
- Only **VCS deployments from `main` re-point the branch URL**; a manual "duplicate deployment" builds fresh but leaves the branch URL on the old deployment. To redeploy after env-var changes: MCP `sites_create_vcs_deployment {site_id:"peka-ar", type:"branch", reference:"main", activate:true}` (or push to `origin`).
- Build ~3.5–5 min (cache hit compiles in ~20s). 5 npm audit highs + blocked postinstall scripts (esbuild/sharp/unrs-resolver) — non-blocking.
- Rollback = re-activate a previous deployment (Console → Deployments → Activate, or MCP `sites_update_site_deployment`). No rebuild needed.

---

## 3. Vercel deployment (frozen mirror)

| Field | Value |
|---|---|
| Project name / ID | `studio-v` / `prj_RjTtGXyFvNs7fGf1nsqCOSr71gv1` |
| Team / scope | `kaizens-projects-89bbbf37` (`team_GQWWsHy5R7Y3NqK1HTfftrSo`) |
| Production URL | `https://studio-v-indol.vercel.app` — still serving the frozen copy |
| Source | GitHub `Kaizen3424/StudioV` (remote `legacy`), branch `main` — **Git integration paused 2026-09-01**; frozen at commit `855391e` |
| Runtime | Node 24.x, Next.js 16 (Turbopack), zero config (`next build` detected) |
| CLI | Vercel CLI 57, logged in as `kaizen3424` (`vercel link` done — `.vercel/project.json` is gitignored) |
| Notable deploys | `studio-4xr1ty9tr` (commit `9c1122e`, first migrated deploy, 35s) · `studio-dcjsy5zfo` (commit `c0b6803`, CLI-deployed backend-hardening build) |

### Env vars (still set, still consumed by the frozen deployment + cron)

| Name | Value | Sensitivity |
|---|---|---|
| `STUDIOV_API_KEY` | Appwrite server key (same value as local `APPWRITE_API_KEY`) | Sensitive |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | Non-sensitive |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `6a8562a20037b62075e1` | Non-sensitive |
| `NEXT_PUBLIC_APP_URL` | `https://studio-v-indol.vercel.app` (stale on purpose — the mirror serves its own origin; harmless) | Non-sensitive |
| `CRON_SECRET` | Random 64-hex, added 2026-08-31 | Sensitive |

**Why keep the Vercel project alive:** (1) old third-party embeds pointing at `studio-v-indol.vercel.app` keep working; (2) **Vercel Cron still fires** `GET /api/cron/maintenance` at 02:00 UTC nightly against the frozen deployment — same Appwrite backend, so rate-limit/notifications cleanup still runs. If the project is ever deleted, replicate the cron first (add `CRON_SECRET` as a site variable + GitHub Actions or cron-job.org hitting `https://pekaar.tech/api/cron/maintenance`).

**To un-freeze in an emergency:** Vercel → Settings → Git → resume integration → `git push legacy main` (catch `Kaizen3424/StudioV` up from `Peka-ar/website`). Then, to serve pekaar.tech from Vercel instead of Appwrite, NS must move back to the registrar (Appwrite owns the zone) — see §7 "reversal".

**Historical findings (Vercel ops, for the record):**
- `NEXT_PUBLIC_*` vars bake into the client bundle at build time — changes need a redeploy.
- Vercel CLI defaults new env vars to **sensitive**; keep `NEXT_PUBLIC_*` non-sensitive so they're inspectable.
- 2026-08-31: pushed `main` did **not** trigger the auto-deploy webhook within the polling window; deployed via CLI `vercel --prod --yes` instead.
- **CLI quirk:** `vercel env add <name> preview` hangs on an interactive "Git branch?" prompt that ignores piped stdin. Workaround — REST API:
  `POST https://api.vercel.com/v10/projects/<projectId>/env?teamId=<teamId>&upsert=true` with `{"key","value","target":["preview"],"type":"encrypted"|"sensitive"}` and `Authorization: Bearer <token>` (token: `~/AppData/Roaming/xdg.data/com.vercel.cli/auth.json`).

---

## 4. Appwrite Cloud project (shared backend)

| Field | Value |
|---|---|
| Project | "Peka.ar" — `6a8562a20037b62075e1`, region `fra`, console https://cloud.appwrite.io |
| Endpoint | `https://fra.cloud.appwrite.io/v1` |
| TablesDB | database `studiov` (6 tables incl. `rate_limits` — IDs in `src/lib/appwrite-config.ts`; `rate_limits` provisioned by `npm run ensure-backend`) |
| Storage buckets | `models`, `reference-images` |
| API key | `standard_…` server key (scopes: users/sessions, tables+columns+indexes+rows, buckets/files, messaging, usage.read) — value only in local `.env` + host env-var stores |
| Web platforms | `pekaar-tech-web` → `pekaar.tech` · `web-production-site` → `studio-v-indol.vercel.app` · `peka-ar-site` → `branch-main-86d3a7e.appwrite.network` · `local-dev-web` → `localhost` |
| DNS | `pekaar.tech` zone served by `ns1/ns2.appwrite.zone`; records managed in org → Domains (§7) |

**Platform registration matters:** browser-direct Appwrite calls (Storage uploads, client SDK via proxy origin) are rejected with `general_unknown_origin` (403) unless the hostname is a registered web platform. `pekaar.tech` was registered (`pekaar-tech-web`) **before** the first production build pointed at it — uploads verified working on the domain.

---

## 5. Git remotes & workflow

| Remote | Repo | Role |
|---|---|---|
| `origin` | `https://github.com/Peka-ar/website.git` | **Deploy remote** — Appwrite Sites watches it; push here to deploy |
| `legacy` | `https://github.com/Kaizen3424/StudioV.git` | Vercel remote — **frozen mirror** (Vercel Git integration paused); only push when un-freezing Vercel (§3) |

```powershell
# day-to-day deploy (Appwrite Sites):
git push origin main
# un-freezing/updating the Vercel mirror too:
git push legacy main
```

Local-only files (gitignored + untracked from repos in commit `9c1122e`): `.agents/skills`, `AGENTS.md`, `design.md`, `skills-lock.json`, `tasks/`, `.env.example` (matched by `.gitignore`'s `.env*` pattern despite the name suggesting a committed template). Old versions remain in git history of both repos.

---

## 6. Smoke test results

**2026-09-01, https://pekaar.tech (post domain-verification):**

| Check | Result |
|---|---|
| `GET /` | 200 |
| TLS certificate | valid (issued by Appwrite's CA — Certainly) |
| `GET /api/health` | `200 {"status":"ok","appwrite":"ok"}` |
| `GET /auth` | 200 |
| Sign-in via `POST /api/appwrite/sign-in/email-password` | pass (user-verified in browser) |
| `GET /admin/dashboard` unauthenticated | 307 → `https://pekaar.tech/auth` |
| `GET /api/sdk/v1/config/6a929eac002ed64d09df` (PUBLISHED) | 200 + CDN URL |
| `GET /embed/6a929eac002ed64d09df` | 200 |
| Embed in third-party page | pass (user-verified) |
| `http://pekaar.tech` | 200, no redirect to HTTPS (Appwrite edge serves both — noted, harmless) |

**2026-08-31, both hosts (pre-domain, for the record):** all checks passed identically on Appwrite Sites (`branch-main-86d3a7e.appwrite.network`) and Vercel — `/`, `/auth`, sign-in, admin redirect, SDK config, embed (published 200 / pending 404), events 201.

**PowerShell gotcha:** `curl.exe -d "{\"key\":\"val\"}"` sends literal backslashes (backtick is the PS escape char, not backslash) → `SyntaxError: Expected property name` server-side. Use single quotes: `-d '{"key":"val"}'`.

---

## 7. Custom domain setup record (pekaar.tech — 2026-09-01)

Registrar: **get.tech** (Namify; dashboard https://manage.get.tech, helpdesk https://helpdesk.namify.tech). Method chosen: **NS delegation for the apex** (Appwrite's recommended apex method — apex cannot hold CNAME per RFC, and Namify's plain DNS has no CNAME flattening/ALIAS or CAA record types).

**Timeline (IST):**
1. 2026-09-01 ~21:05 — get.tech: DNS tab → Nameservers → Edit → **Custom nameservers**, replaced the four `cont603385.*.orderbox-dns.com` defaults with `ns1.appwrite.zone` + `ns2.appwrite.zone`. (DNSSEC tab: empty — nothing to remove. Do **not** mix old+new nameservers.)
2. Console: Sites → peka-ar → Domains → Add domain `pekaar.tech` (rule type Active deployment); org → Domains shows the zone too (that's where records are managed). Web platform `pekaar-tech-web` registered via MCP; site variable `NEXT_PUBLIC_APP_URL` → `https://pekaar.tech`; deployment `6a96ecdb6bac97cb041e` built + activated.
3. 21:05–~21:40 — Verify attempts failed with `DNS verification failed with resolver 8.8.8.8. Domain pekaar.tech is missing CNAME record. (region: Frankfurt)`. **Red herring**: the verifier (8.8.8.8, anycast — Frankfurt PoP) still had the old orderbox NS cached (TTL 6h); an NS-delegated apex never has a CNAME (Appwrite DNS serves flattened A records = Fastly IPs, identical to `appwrite.network`). Diagnosis: query NS via multiple resolvers + the Appwrite authoritative servers directly (`Resolve-DnsName pekaar.tech -Type NS -Server ns1.appwrite.zone`), check A-records match `appwrite.network`.
4. ~22:00 — after propagation reached the verifier's resolver, domain **verified**; TLS certificate auto-issued. CAA `0 issue "certainly.com"` was auto-applied by Appwrite DNS (no manual CAA needed when the zone is delegated). Site live at https://pekaar.tech.
5. Later the same evening — Vercel Git integration paused (freeze). Verify the cron still fires on the Vercel dashboard → Settings → Cron Jobs / Functions logs.

**Current DNS facts:**
- Zone authoritative on `ns1/ns2.appwrite.zone`; registrar panel's DNS records section is **inert** (NS delegation) — records live in Appwrite Console → organization → Domains → pekaar.tech → Manage Records.
- A records (flattened apex) → Fastly anycast (`151.101.x.52`), same as `appwrite.network`. CAA → `0 issue "certainly.com"`.
- No MX/TXT records — email not set up (intentional). If ever added, create the records in Appwrite's DNS panel, not at get.tech.

**Reversal (move pekaar.tech back to registrar DNS / to Vercel):** get.tech → DNS → Nameservers → **Default Namify.tech nameservers**, then manage records at the registrar again (e.g. A `76.76.21.21` for Vercel apex, CNAME `cname.vercel-dns.com` for subdomains). Appwrite's site domain entry would then need CNAME-style verification — only do this if leaving Appwrite Sites hosting.

---

## 8. File & line index

| Element | Location |
|---|---|
| Server key env fallback | `src/server/appwrite.ts:5` |
| App URL for embed snippets | `src/lib/utils.ts:19` |
| App URL for auth email links | `src/app/actions/auth.ts:41` |
| Appwrite proxy (sign-in/out, OAuth) | `src/app/api/appwrite/[...appwrite]/route.ts:1` (routes: `POST sign-in/email-password`, `POST sign-up/email-password`, `POST sign-out`, `GET/POST oauth/{callback,failure}`) |
| Public SDK endpoints | `src/app/api/sdk/v1/config/[projectId]/route.ts:1`, `src/app/api/sdk/v1/events/route.ts:1` |
| Env var template | `.env.example:1` |
| Operational handbook (day-to-day) | `specs/deployment.md` |
