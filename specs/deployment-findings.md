# Deployment findings & reference (Vercel primary + Appwrite Sites record)

> Parent: [`./WEBSITE.md`](./WEBSITE.md) · Operational handbook: [`./deployment.md`](./deployment.md)

Chronological record of both production deployments of the Appwrite-migrated app (Aug 31, 2026), all live IDs/URLs, the env-var matrix, and the checklist for when a custom domain is purchased. **No secrets in this file** — secret values live only in Appwrite console, Vercel dashboard, and local `.env`.

---

## 1. Current state (as of 2026-08-31)

| | Host | URL | Status |
|---|---|---|---|
| **Primary** | **Vercel** — project `studio-v` | **https://studio-v-indol.vercel.app** | Live, auto-deploys from `Kaizen3424/StudioV` `main` |
| Secondary (dormant) | Appwrite Sites — site `peka-ar` | https://branch-main-86d3a7e.appwrite.network | Live but **frozen** at commit `0e72d57`; no further pushes to `Peka-ar/website` |

Reason for the split: Appwrite Sites works flawlessly but has no custom domain yet; the rotating-looking `*.appwrite.network` URL is a hassle to maintain. Vercel is primary **until a custom domain is bought** — then either platform can serve it (checklist in §7).

Both deployments talk to the **same Appwrite Cloud project** — data, auth users, and files are shared, not duplicated.

---

## 2. Vercel deployment (primary)

| Field | Value |
|---|---|
| Project name / ID | `studio-v` / `prj_RjTtGXyFvNs7fGf1nsqCOSr71gv1` |
| Team / scope | `kaizens-projects-89bbbf37` (`team_GQWWsHy5R7Y3NqK1HTfftrSo`) |
| Production URL | `https://studio-v-indol.vercel.app` |
| Source | GitHub `Kaizen3424/StudioV` (remote `legacy`), branch `main`, auto-deploy on push |
| Runtime | Node 24.x, Next.js 16 (Turbopack), zero config (`next build` detected) |
| CLI | Vercel CLI 57, logged in as `kaizen3424` (`vercel link` done — `.vercel/project.json` is gitignored) |
| First migrated deploy | `https://studio-4xr1ty9tr-kaizens-projects-89bbbf37.vercel.app` (commit `9c1122e`, Ready in 35s) |

### Env vars (set 2026-08-31, both Production and Preview)

| Name | Value | Sensitivity |
|---|---|---|
| `STUDIOV_API_KEY` | Appwrite server key (same value as local `APPWRITE_API_KEY`) | Sensitive |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` | Non-sensitive |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `6a8562a20037b62075e1` | Non-sensitive |
| `NEXT_PUBLIC_APP_URL` | `https://studio-v-indol.vercel.app` | Non-sensitive |

All 14 pre-migration vars (Prisma/Postgres `DATABASE_URL`/`DIRECT_URL`, `AUTH_SECRET`, UploadThing, Google OAuth, Gmail, GDrive, `ADMIN_*`) were removed — zero references remain in the migrated code.

**Findings:**
- `NEXT_PUBLIC_*` vars are baked into the client bundle at build time — changing them requires a redeploy (Vercel: the env-var edit UI prompts "Redeploy"; CLI: push an empty commit or `vercel deploy --prod`).
- Vercel CLI defaults new env vars to **sensitive**; sensitive values still reach builds/runtime, but `NEXT_PUBLIC_*` values are public anyway — keep them non-sensitive so they're inspectable.
- **CLI quirk:** `vercel env add <name> preview` hangs on an interactive "Git branch?" prompt that ignores piped stdin. Workaround — REST API:
  `POST https://api.vercel.com/v10/projects/<projectId>/env?teamId=<teamId>&upsert=true` with `{"key","value","target":["preview"],"type":"encrypted"|"sensitive"}` and `Authorization: Bearer <token>` (token: `~/AppData/Roaming/xdg.data/com.vercel.cli/auth.json`).
- Sign-in on Vercel flows through `POST /api/appwrite/sign-in/email-password` (the `@appwrite.io/react` proxy) — verified working; see §8 smoke results.

---

## 3. Appwrite Sites deployment (dormant — full record)

| Field | Value |
|---|---|
| Site ID / project | `peka-ar` / "Peka.ar" `6a8562a20037b62075e1` (region `fra`) |
| Production (branch) URL | `https://branch-main-86d3a7e.appwrite.network` — constant, re-points to latest `main` deployment |
| Commit URL pattern | `https://commit-<hash>.appwrite.network`; deployment URLs rotate per deployment (never reference them) |
| VCS installation / repo | `6a94f8463518365b9872` / `Peka-ar/website` repo ID `1339382325`, branch `main`, root `/` |
| Build config | framework `nextjs`, adapter **ssr**, runtime `node-22`, `npm install` / `npm run build`, output `./.next`, timeout 60 (max 1–60), spec `s-2vcpu-2gb` build / `s-0.5vcpu-512mb` runtime |
| Deployments | `6a95064f92e098b251ee` (first VCS, commit `9b88c16`) · `6a9507f9ae89a4f99dd6` (manual duplicate — did NOT re-point branch URL) · `6a9509027178ddba4b54` (VCS, live) · `6a950c0f4371d77da348` (docs commit `0e72d57`, last build) |
| Site env vars | `STUDIOV_API_KEY` (id `studiov-api-key`), `NEXT_PUBLIC_APPWRITE_ENDPOINT` (id `next-public-endpoint`), `NEXT_PUBLIC_APPWRITE_PROJECT_ID` (id `next-public-project-id`), `NEXT_PUBLIC_APP_URL` (id `next-public-app-url`) — all secret; **any change requires a new deployment** |
| Web platform | `peka-ar-site` (hostname `branch-main-86d3a7e.appwrite.network`) |

**Findings (unique to Sites):**
- Sites **forbids user-set env vars with the `APPWRITE_` prefix** (reserved for injected vars like `APPWRITE_SITE_API_KEY`) — hence the server key lives in `STUDIOV_API_KEY`, read as `process.env.STUDIOV_API_KEY ?? process.env.APPWRITE_API_KEY!` in `src/server/appwrite.ts:5`.
- Only **VCS deployments from `main` re-point the branch URL**; a manual "duplicate deployment" builds fresh but leaves the branch URL on the old deployment. To redeploy after env-var changes: MCP `sites_create_vcs_deployment {site_id:"peka-ar", type:"branch", reference:"main", activate:true}` (or push to `origin`).
- Build ~3.5 min (cache hit ~55s compile). 6 npm audit highs + blocked postinstall scripts (esbuild/sharp/unrs-resolver) — non-blocking.
- Rollback = re-activate a previous deployment (Console → Deployments → Activate, or MCP `sites_update_site_deployment`). No rebuild needed.

### To revive the site after buying a domain
1. `git push origin main` (catch `Peka-ar/website` up from `Kaizen3424/StudioV`) — auto-build + auto-activate.
2. Update site env var `NEXT_PUBLIC_APP_URL` to the new domain, then trigger another VCS deployment (env changes only apply to new builds).
3. Console → Sites → peka-ar → Domains → Add domain (CNAME for subdomain; NS delegation for apex).

---

## 4. Appwrite Cloud project (shared backend)

| Field | Value |
|---|---|
| Project | "Peka.ar" — `6a8562a20037b62075e1`, region `fra`, console https://cloud.appwrite.io |
| Endpoint | `https://fra.cloud.appwrite.io/v1` |
| TablesDB | database `studiov` (6 tables incl. `rate_limits` — IDs in `src/lib/appwrite-config.ts`; `rate_limits` provisioned by `npm run ensure-backend`) |
| Storage buckets | `models`, `reference-images` |
| API key | `standard_…` server key (scopes: users/sessions, tables+columns+indexes+rows, buckets/files, messaging, usage.read) — value only in local `.env` + host env-var stores |
| Web platforms | `web-production-site` → `studio-v-indol.vercel.app` · `peka-ar-site` → `branch-main-86d3a7e.appwrite.network` · `local-dev-web` → `localhost` |

**Platform registration matters:** browser-direct Appwrite calls (Storage uploads, client SDK via proxy origin) are rejected with `general_unknown_origin` (403) unless the hostname is a registered web platform. `localhost` was missing until 2026-08-31 — if local dev ever 403s, check Console → Overview → Platforms first.

---

## 5. Git remotes & workflow

| Remote | Repo | Role |
|---|---|---|
| `legacy` | `https://github.com/Kaizen3424/StudioV.git` | **Deploy remote** — Vercel watches it; push here to deploy |
| `origin` | `https://github.com/Peka-ar/website.git` | Appwrite Sites remote — **stale** (frozen at `0e72d57`); only push when reviving Sites |

```powershell
# day-to-day deploy (Vercel):
git push legacy main
# reviving/updating Appwrite Sites too:
git push origin main
```

Local-only files (gitignored + untracked from repos in commit `9c1122e`): `.agents/skills`, `AGENTS.md`, `design.md`, `skills-lock.json`, `tasks/`. Old versions remain in git history of both repos.

---

## 6. Smoke test results (both hosts, 2026-08-31)

| Check | Appwrite Sites | Vercel |
|---|---|---|
| `GET /` renders, 0 console errors | pass | pass (200) |
| `GET /auth` | pass | 200 |
| Sign-in via `POST /api/appwrite/sign-in/email-password` | pass (browser) | pass (200, admin user + session cookie) |
| `GET /admin/dashboard` unauthenticated | redirect | 307 redirect (auth gate works) |
| `GET /api/sdk/v1/config/6a929eac002ed64d09df` (PUBLISHED) | 200 + CDN URL | 200 + CDN URL |
| `GET /embed/<published>` | 200, GLB streams from Appwrite CDN | 200, model-viewer present |
| `GET /embed/<pending>` | 404 (correct) | 404 (correct) |
| `POST /api/sdk/v1/events` | 201 | 201 |
| `GET /api/notifications` (auth-gated) | 200 | — |

**PowerShell gotcha:** `curl.exe -d "{\"key\":\"val\"}"` sends literal backslashes (backtick is the PS escape char, not backslash) → `SyntaxError: Expected property name` server-side. Use single quotes: `-d '{"key":"val"}'`.

---

## 7. Custom-domain checklist (when purchased)

**On Vercel (stays primary):**
1. Vercel dashboard → studio-v → Settings → Domains → Add `yourdomain.com` (+ `www` redirect) — follow DNS instructions (A record `76.76.21.21` for apex, CNAME `cname.vercel-dns.com` for subdomain).
2. Update Vercel env `NEXT_PUBLIC_APP_URL` → `https://yourdomain.com` (Production + Preview) and **redeploy** (baked at build time).
3. Appwrite Console → Overview → Platforms → Add platform (web) → hostname `yourdomain.com` (keeps browser-direct uploads + client calls working).
4. Embed snippets already generated by the app will switch to the new domain automatically (they derive from `NEXT_PUBLIC_APP_URL`); third-party pages embedding old URLs keep working (both domains stay live on Vercel).

**Optional — move hosting to Appwrite Sites instead:** follow §3 "revive" + Sites → Domains (CNAME/NS), and skip Vercel step 2 only if Vercel is retired.

---

## 8. File & line index

| Element | Location |
|---|---|
| Server key env fallback | `src/server/appwrite.ts:5` |
| Appwrite proxy (sign-in/out, OAuth) | `src/app/api/appwrite/[...appwrite]/route.ts:1` (routes: `POST sign-in/email-password`, `POST sign-up/email-password`, `POST sign-out`, `GET/POST oauth/{callback,failure}`) |
| Public SDK endpoints | `src/app/api/sdk/v1/config/[projectId]/route.ts:1`, `src/app/api/sdk/v1/events/route.ts:1` |
| Env var template | `.env.example:1` |
| Operational handbook (day-to-day) | `specs/deployment.md` |
