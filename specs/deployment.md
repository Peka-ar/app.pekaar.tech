# Deployment — Vercel + Supabase + UploadThing + GDrive + Gmail SMTP

> Parent: [`./WEBSITE.md`](./WEBSITE.md)

Production runtime for STUDIO.V. This document is the **operational handbook** for working with the live deployment: what is deployed, where, how to inspect it, how to update it, how to recover from a bad deploy, how to add a custom domain, and how to do day-to-day code changes safely.

**Last verified against live deployment:** `studio-k67lsw9pk` (Sun Jul 26 2026).

---

## 1. Live deployment (as of this commit)

| Field | Value |
|---|---|
| **Production URL** | `https://studio-v-indol.vercel.app` |
| **Project name** | `studio-v` |
| **Vercel project ID** | `prj_RjTtGXyFvNs7fGf1nsqCOSr71gv1` |
| **Vercel scope** | `kaizens-projects-89bbbf37` (personal account, `kaizen3424`) |
| **GitHub repo** | `https://github.com/Kaizen3424/StudioV` |
| **Branch deployed** | `main` (auto-deploys on push) |
| **Latest deployment ID** | `dpl_47c7cKPQkvcphNUBL6p8WXmEQoYE` (alias: `studio-k67lsw9pk`) |
| **Build region** | `iad1` (Washington, D.C., USA — East) |
| **Build machine** | 2 cores, 8 GB |
| **Node version** | Vercel default (currently 20.x — auto-detected) |
| **Build command** | `next build` (default; no override) |
| **Framework** | Next.js 16.2.10 (auto-detected) |
| **Build time** | ~50s compile + ~45s TypeScript = ~1m 30s typical |

**Every push to `main` triggers a new production deploy automatically.** The Vercel GitHub integration watches the repo; no manual "Deploy" button is required.

---

## 2. Third-party services

| Service | Role | Where it's configured |
|---|---|---|
| **Supabase** | Postgres DB (transaction + session pooler) | `DATABASE_URL`, `DIRECT_URL` in Vercel + local `.env` |
| **UploadThing** | Primary file storage (`*.ufs.sh` CDN) | `UPLOADTHING_TOKEN` |
| **Google Drive** | Backup of every uploaded asset (best-effort) | `GOOGLE_OAUTH_*`, `GDRIVE_BACKUP_FOLDER_ID` |
| **Gmail SMTP** | Transactional auth emails (OTP, password reset) via Nodemailer | `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| **GitHub** | Source control; Vercel watches the repo | OAuth-linked in Vercel project settings |
| **Vercel** | Hosting + serverless + edge middleware + build pipeline | CLI + dashboard |

Stripe is **not** wired yet — the `STRIPE_*` env vars are documented in `.env.example` and `WEBSITE.md §13` but no `/api/webhooks/stripe` handler exists in the codebase. Billing is a post-launch add.

---

## 3. Environment variables (current production values)

All 14 are set in Vercel → Project → Settings → Environment Variables, **Production only** (Preview/Development deliberately left empty so branch deploys don't touch the prod DB or send real emails).

| Variable | Current production value (redacted/masked) |
|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | `postgresql://postgres.<ref>:<password>@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres` |
| `AUTH_SECRET` | 32-byte base64 (use `openssl rand -base64 32` to generate new) |
| `NEXT_PUBLIC_APP_URL` | `https://studio-v-indol.vercel.app` |
| `UPLOADTHING_TOKEN` | `eyJ...` (JWT) |
| `GMAIL_USER` | `kaizen3242@gmail.com` (full Gmail address used as both SMTP auth user and `from` sender) |
| `GMAIL_APP_PASSWORD` | 16-char Google App Password (regenerable at https://myaccount.google.com/apppasswords) |
| `GOOGLE_OAUTH_CLIENT_ID` | `...apps.googleusercontent.com` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `GOCSPX-...` |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | `1//0...` (long-lived, from one-time consent flow) |
| `GDRIVE_BACKUP_FOLDER_ID` | Drive folder ID |
| `ADMIN_EMAIL` | `werewolfiscool404@gmail.com` |
| `ADMIN_PASSWORD` | (16+ char) |
| `ADMIN_NAME` | `StudioV Admin` |

**If you ever need to recreate these from scratch** (e.g. you joined a new dev machine), the local `.env` file is the source of truth — copy from there. **Never commit `.env`** (it's in `.gitignore`).

To rotate `AUTH_SECRET` (e.g. suspected compromise):
1. `openssl rand -base64 32` → new value
2. Vercel → Settings → Environment Variables → edit `AUTH_SECRET`
3. **Redeploy** (Deployments → ⋯ → Redeploy) — old JWTs become invalid, all users get signed out
4. Communicate to active users before doing this

---

## 4. Database (Supabase Postgres)

### Connection modes
- **Transaction mode** (port 6543, `?pgbouncer=true`) → `DATABASE_URL` → app runtime. Use this from the Next.js app.
- **Session mode** (port 5432) → `DIRECT_URL` → Prisma CLI (migrations, `prisma studio`). PgBouncer in transaction mode does **not** support the DDL statements Prisma uses for migrations.

### Migrations
```bash
# Run from local machine against prod DB
$env:DATABASE_URL="<prod-transaction-url>"
$env:DIRECT_URL="<prod-session-url>"
npx prisma migrate deploy
```
**Non-destructive** — only creates tables/columns/enums, never drops them. Idempotent: running twice is safe.

**When migrations fail mid-way:** Prisma records the failed migration in `_prisma_migrations` and refuses to apply anything else until you `resolve` it. The fix is either:
- `npx prisma migrate resolve --applied <name>` — mark as "applied by some other means" (use this if the SQL did actually run, e.g. an enum value was already present)
- `npx prisma migrate resolve --rolled-back <name>` — mark as "rolled back, please retry"

Verify state before resolving:
```bash
# See which migrations are marked done vs not
node -e "/* pg query against _prisma_migrations */"
```

### Admin bootstrap
```bash
$env:DATABASE_URL="<prod-transaction-url>"
$env:DIRECT_URL="<prod-session-url>"
$env:ADMIN_EMAIL="<email>"
$env:ADMIN_PASSWORD="<password>"
$env:ADMIN_NAME="<name>"
npm run sync-admin
```
**Idempotent.** Re-running is safe; it preserves all admin data, refreshes the password hash, and deletes any stray `ADMIN` users whose email is not the env-driven one. Run this after any rotation of `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`.

### Direct DB access (psql-style)
If you need to query the DB directly (debugging, manual cleanup), the simplest path is a one-off Node script using the `pg` package that's already in `node_modules`:
```js
// db-probe.cjs
const { Client } = require("pg");
const c = new Client({
  connectionString: "postgresql://postgres.<ref>:<password>@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
});
(async () => {
  await c.connect();
  const r = await c.query("SELECT * FROM \"User\" LIMIT 5");
  console.log(r.rows);
  await c.end();
})();
```
```bash
node db-probe.cjs
# remember to delete the script when done
```
The port is **5432** (session mode) for direct queries — PgBouncer's transaction mode can hold connections open and break ad-hoc queries.

### What NOT to do
- **Do not run `prisma db seed` against production.** The seed creates a demo `brand@example.com` user and 3 sample projects — fine for local dev, junk for prod. The `seed.ts` is skip-on-existence but the *first* run on a fresh DB will populate the demo data. If you need a fresh prod-like dataset, sign up via the UI instead.
- **Do not run `prisma migrate reset`** against prod. It drops everything.

---

## 5. Day-to-day development workflow

### The 4-step loop
```bash
# 1. Edit code locally
# 2. Verify
npm run lint
npm run build
# 3. Commit atomically (one logical change per commit)
git add -p
git commit -m "type(scope): subject" -m "Body explains the *why*, not the *what*."
# 4. Push → Vercel auto-builds and auto-deploys
git push origin main
```

### Commit message style
Follow the project's existing convention (see `git log --oneline -20` for examples):
- **Conventional Commits prefix** — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Optional scope** in parens — `feat(auth):`, `fix(admin):`, `chore(deps):`
- **Subject** in imperative mood, ≤ 72 chars, no period
- **Body** (after blank line) — explain *why*, not *what*. Reference the symptom, the root cause, and the verification

**On Windows PowerShell**, the `git commit` multi-line body via `-m "..." -m "..."` is safer than using a literal newline (which can be mis-interpreted). Watch out for `;` separators between `git add` and `git commit` — PowerShell may eat the second command; chain with `&&` or run them as two separate calls.

### Branching
Trunk-based: `main` is the only long-lived branch, every commit goes through a PR review (even self-review) before merging. For risky work, use a feature branch + Vercel Preview deploys:
```bash
git checkout -b feat/some-thing
# ... commits ...
git push -u origin feat/some-thing
# Vercel creates a Preview deployment for the branch
# URL like: https://studio-v-git-feat-some-thing-kaizens-projects-89bbbf37.vercel.app
# (no production env vars, no production data — isolated)
```
**Preview deploys currently have NO env vars set** (we set Production-only on purpose). If you need DB access in a Preview, you must either (a) temporarily allow Preview env access for testing, or (b) test against a staging DB.

### Before every push
1. `npm run lint` — must be silent (no output = pass)
2. `npm run build` — must compile + pass TypeScript
3. **Check `git status`** — no stray files, no debug `console.log`s
4. **Read your own diff** — `git log -p HEAD~1` and ask "would a code reviewer approve this?"

### After every push
1. Vercel → Deployments tab → watch the new build (typically ~1m 30s)
2. **Wait for "Ready"** — don't assume it succeeded
3. Click into the deployment, open the **Logs** tab
4. Hit the live URL (`https://studio-v-indol.vercel.app`) and smoke-test

---

## 6. Using the Vercel CLI

The CLI is the fastest way to inspect and operate on the live deployment. After `npm i -g vercel` and `vercel login`, all commands work from any directory.

### One-time setup (already done in this project)
```bash
# Link the local repo to the Vercel project so commands default to it
vercel link
# Already linked. Verified: project is "studio-v" under scope "kaizens-projects-89bbbf37"
```

### Daily commands

**List recent deployments:**
```bash
vercel ls
# Shows: age, project, deployment URL, status, environment, duration
# Statuses: ● Building  ● Ready  ● Error  ● Canceled
```

**Pull live logs (any deployment, filtered):**
```bash
# All logs from latest production deploy, last 1 hour
vercel logs --since 1h

# Just errors from a specific deployment URL
vercel logs https://studio-v-indol.vercel.app --level error

# Filter by HTTP status code (5xx = server crash, 4xx = client bug)
vercel logs --status-code 500 --since 1h

# Live stream of a deployment's runtime logs (Ctrl+C to stop)
vercel logs https://studio-v-indol.vercel.app --follow

# Filter to a specific source
vercel logs --source edge-middleware --since 30m
vercel logs --source serverless --since 30m

# JSON output for piping into jq
vercel logs --status-code 500 --json | jq '.message'
```

**Inspect a single deployment:**
```bash
vercel inspect <deployment-url-or-id>
# Shows: id, name, target (production/preview), status, url, created time, aliases, builds
```

**Promote / rollback:**
```bash
# Promote any past deployment to production
vercel promote <deployment-id-or-url>

# Quick rollback path
# 1. Find the last-known-good deployment
vercel ls
# 2. Promote it
vercel promote dpl_xxxxx
```

**Manage env vars from CLI:**
```bash
# Pull all env vars (USE WITH CARE — exposes secrets in terminal)
vercel env pull .env.production.local

# Push a single var (interactive)
vercel env add VARIABLE_NAME production

# Remove
vercel env rm VARIABLE_NAME production
```

**Other useful commands:**
```bash
vercel whoami                 # confirm which account is logged in
vercel projects ls            # list all projects in the scope
vercel domains ls             # list domains attached to the project
vercel certs ls               # list SSL certificates
vercel logs --help            # full options reference
```

### Gotchas
- `vercel env pull` writes to `.env.production.local` — make sure this is in `.gitignore` (it is by default). Delete the file after you're done with it.
- The CLI is auto-detected as running inside an agent in some cases; if a command hangs on a prompt, pass `--yes` (most commands) or pipe `n` to skip.

---

## 7. Rollback strategy

**Every Vercel deployment is preserved forever.** Rollback = promote a previous deployment to production. No git revert, no rebuild, no DB changes.

```bash
# Find the last-known-good deployment
vercel ls

# Promote it (takes ~5 seconds — Vercel just re-points the alias)
vercel promote dpl_47c7cKPQkvcphNUBL6p8WXmEQoYE
```

**Trigger conditions** (roll back immediately if any of these):
- HTTP 5xx error rate > 1% (server crashes)
- P95 latency > 2x pre-deploy baseline
- Auth flow broken (no one can sign in)
- `/embed/[id]` returning 500 for any published project
- Data integrity issue (state machine broken, missing rows, etc.)
- Security vulnerability introduced

**Database considerations:**
- All Prisma migrations in this repo are **additive** (new tables, new columns, new enum values) — no drops, no destructive changes
- A code rollback does **NOT** require a DB rollback
- The only DB writes that happen on deploy are: `prisma migrate deploy` (run manually, not by Vercel) and the `sync-admin` script

**If you also need to roll back a migration:** see `prisma migrate resolve --rolled-back` in §4 above. The DB itself can be reset to a snapshot via Supabase dashboard (Project → Settings → Database → "Restore to point in time") — destructive, last resort.

### One quirk specific to this app
`/embed/[projectId]` is a route handler that reads `public/embed-viewer.html` from disk and substitutes `{PROJECT_ID}`. If a deploy breaks that template (typo in HTML, missing closing tag), **every third-party embed breaks simultaneously** because the same static template is served for all projects. If a customer reports "the embed is broken" and you see a 5xx on `/embed/*`, check `public/embed-viewer.html` in the deployed build via `vercel inspect <url>` → build output.

---

## 8. Adding a custom domain

Currently on `https://studio-v-indol.vercel.app` (Vercel's auto-assigned domain). To add a real domain like `studiov.app`:

### 1. Buy the domain
Any registrar works (Namecheap, Cloudflare, Google Domains, Porkbun). **Cloudflare Registrar** is recommended — at-cost pricing, free DNS, easy Vercel integration.

### 2. Add the domain to Vercel
**Via dashboard:**
1. Vercel → Project → **Settings** → **Domains**
2. Type the domain (e.g. `studiov.app` and/or `www.studiov.app`)
3. Click **Add**
4. Vercel shows the DNS records you need to add at your registrar

**Via CLI:**
```bash
vercel domains add studiov.app
# Follow the prompt to add the DNS records shown
```

### 3. Configure DNS at the registrar
Vercel will show one of these patterns:

**Apex domain (`studiov.app`):**
- Type: `A`, Name: `@`, Value: `76.76.21.21`
- Type: `CNAME`, Name: `www`, Value: `cname.vercel-dns.com`

**Subdomain (`app.studiov.app`):**
- Type: `CNAME`, Name: `app`, Value: `cname.vercel-dns.com`

(Exact IPs/values may change — copy from what Vercel shows you, not from this doc.)

### 4. Wait for SSL
Vercel auto-provisions a Let's Encrypt certificate. Takes 1–10 minutes after DNS propagates. The domain status in the dashboard goes from "Invalid Configuration" → "Valid Configuration" → ✅.

### 5. Update env vars
1. Vercel → Settings → Environment Variables
2. Edit `NEXT_PUBLIC_APP_URL` → change to `https://studiov.app` (no trailing slash)
3. **Redeploy** (the env var is baked into the client bundle at build time)
4. Auth emails, embed code snippets, and the "Back to home" link will all use the new domain automatically

### 6. (Optional) Make it the primary domain
In Vercel → Settings → Domains, click the three dots next to the new domain → **Set as Primary**. This redirects all traffic from the old `*.vercel.app` URL to the new domain.

### 7. Set up redirects (optional)
If you want `studio-v-indol.vercel.app` to redirect to `studiov.app` instead of just being an alias:
- Vercel → Settings → Domains → click the old domain → "Redirect to primary"

### Cost
- Domain: $10–15/yr (depends on TLD)
- DNS: free (Cloudflare) or free with most registrars
- SSL: free (Let's Encrypt via Vercel)
- Vercel hosting: free tier covers this app (Hobby plan) — no extra cost for adding a domain

---

## 9. Monitoring and error reporting

**Current state:** Vercel function logs only. No external error tracking. The `vercel logs` command (see §6) is the primary tool for post-deploy diagnosis.

**Recommended week-1 add — Sentry:**
1. Sign up at https://sentry.io (free tier: 5K errors/month)
2. Create a new Next.js project
3. `npm install @sentry/nextjs`
4. `npx @sentry/wizard@latest` (auto-configures)
5. Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to Vercel env vars
6. Redeploy — Sentry now captures server errors, client errors, and performance traces

**Recommended week-1 add — Uptime monitoring:**
1. https://uptimerobot.com (free tier: 50 monitors, 5-min interval)
2. Add a monitor for `https://studio-v-indol.vercel.app/` (HTTP 200 check)
3. Add a monitor for `/api/notifications` (auth-gated, but a 401 response still proves the server is up)
4. Set up email/Telegram/Slack alerts for downtime

**Recommended week-1 add — Auth rate limiting:**
The `/api/auth/*` and server action endpoints are public and currently unrate-limited. Brute-forceable in theory. The cleanest fix is Upstash Ratelimit:
1. Sign up at https://upstash.com (free tier: 10K requests/day)
2. Create a Redis database
3. `npm install @upstash/ratelimit @upstash/redis`
4. Wrap the auth actions and `/api/auth/*` route handlers
5. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel env vars

---

## 10. Common operations cheat sheet

| Task | Command |
|---|---|
| First-time setup on a new laptop | `npm install` (regenerates Prisma client via postinstall) |
| Run dev server | `npm run dev` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Migrate prod DB | `npx prisma migrate deploy` (with prod env vars set) |
| Sync admin user | `npm run sync-admin` (with prod env vars set) |
| Pull prod env vars locally | `vercel env pull .env.production.local` |
| Stream live logs | `vercel logs --follow` |
| Tail a specific deployment's errors | `vercel logs <url> --level error --follow` |
| Roll back to a previous deploy | `vercel promote <deployment-id>` |
| List all deployments | `vercel ls` |
| Inspect a deployment | `vercel inspect <url>` |
| Open the live site | https://studio-v-indol.vercel.app |
| Open Vercel dashboard | https://vercel.com/dashboard |
| Open Supabase dashboard | https://supabase.com/dashboard |
| Open Gmail App Passwords | https://myaccount.google.com/apppasswords |
| Open UploadThing dashboard | https://uploadthing.com/dashboard |
| Open Google Drive backup folder | (open the folder by ID via drive.google.com) |

---

## 11. Project structure quick reference

For full detail, read `WEBSITE.md` first, then the relevant deep-dive in `specs/pages/`.

```
studiov-website/
├── prisma/                  schema.prisma + migrations + seed.ts (DO NOT seed prod)
├── public/                  embed-viewer.html (static HTML served by /embed route)
├── scripts/                 sync-admin.ts, get-gdrive-refresh-token.ts (one-time setup)
├── src/
│   ├── app/                 App Router pages + server actions + API routes
│   │   ├── actions/         auth.ts, project.ts, admin.ts, admin-users.ts, admin-analytics.ts
│   │   ├── api/             auth/[...nextauth], uploadthing, notifications, sdk/v1/{config,events}
│   │   ├── embed/[id]/      public 3D viewer route handler
│   │   ├── admin/           /admin/{dashboard,users,tasks,analytics}
│   │   ├── auth/            /auth, /auth/verify, /auth/reset-password
│   │   └── dashboard, tasks, notifications, integrations, analytics, onboarding
│   ├── components/          auth, admin, dashboard, ui, TopNav, Hero, ThreeDConfigurator
│   ├── lib/                 prisma, auth-guards, password, emails, status, embed-liveness, hooks
│   ├── auth.ts              NextAuth instance
│   ├── auth.config.ts       Edge-safe config (used by middleware)
│   ├── proxy.ts             middleware (route gating + onboarding enforcement)
│   └── types/               ambient type augmentations
├── specs/                   WEBSITE.md (source of truth) + per-page deep-dives + this file
├── design.md                design system spec
├── .env                     local env vars (gitignored, source of truth for prod values)
├── .env.example             env var template (committed)
├── package.json             scripts: dev, build, start, lint, sync-admin; postinstall: prisma generate
└── next.config.mjs          headers (CORS for /api/sdk/*, resilience for /embed/*), images
```

**Conventions to know before editing code:**
- Pages are server components; interactivity lives in `*Client.tsx` (note the suffix)
- UI primitives in `src/components/ui/` are server-compatible (except `Modal` which uses `createPortal`)
- Auth: never trust `session.user.id`/`role` directly — always go through `requirePrincipal()` (DB-backed)
- For pages, use `requirePrincipalOrRedirect()` which auto-redirects on stale/absent sessions
- Use Tailwind v4 design tokens (CSS custom properties from `globals.css`) — never raw hex
- The `part: string` parameter in `slice` callbacks and similar TS strictness fixes
- `transition-colors` / `transition-transform` / `transition-opacity` only (never `transition-all`)

---

## 12. File & line index

| Element | Location |
|---|---|
| Vercel project config | (none — auto-detected; no `vercel.json`) |
| Local env var template | `.env.example:1` |
| Live env vars (gitignored) | `.env:1` |
| Next.js config (CORS, security headers, image patterns) | `next.config.mjs:1` |
| Tailwind v4 + design tokens | `src/app/globals.css:1` |
| Postinstall hook (prisma generate) | `package.json:11` |
| Vercel function log streaming | `vercel logs --follow` (no in-code instrumentation) |

---

## 13. See also

- [`./WEBSITE.md`](./WEBSITE.md) — full app reference, data model, route map, server action reference
- [`./file-storage-architecture.md`](./file-storage-architecture.md) — UploadThing + GDrive backup architecture
- [`./auth-stabilization.md`](./auth-stabilization.md) — historical task plan (now implemented; explains `requirePrincipal` + `StaleSessionError` rationale)
- [`./pages/auth.md`](./pages/auth.md) — `/auth*` flow deep dive + email-failure recovery
- [`./pages/admin.md`](./pages/admin.md) — `/admin/*` deep dive + SessionProvider wrapper note
- [`../AGENTS.md`](../AGENTS.md) — repo-wide agent rules (read first, keep `specs/` accurate)
- [`../design.md`](../design.md) — design system spec
- [`../.env.example`](../.env.example) — env var template
- Vercel CLI docs: https://vercel.com/docs/cli
- Prisma migration reference: https://www.prisma.io/docs/orm/prisma-migrate
