# Implementation Plan: Deploy STUDIO.V on Appwrite Sites

## Overview
Migrate hosting of the STUDIO.V Next.js 16 app from Vercel to Appwrite Sites (SSR), keeping the existing Appwrite Cloud backend (Auth, TablesDB, Storage, email) in project "Peka.ar" (`6a8562a20037b62075e1`, region `fra`). Git-based continuous deployment from the new repo `Peka-ar/website` (the Appwrite GitHub App is installed on the Peka-ar org; installation ID `6a94f8463518365b9872`, repo ID `1339382325`). **Live:** https://branch-main-86d3a7e.appwrite.network (constant branch URL — always serves latest `main`).

## Architecture decisions
- **SSR adapter, framework `nextjs`, Node 22 build runtime.** Docs: Next.js is fully supported on Sites without OpenNext; default output mode (no `output` config) — standalone also allowed. Build: `npm install` / `npm run build` / `./.next`.
- **Env var collision fix.** Appwrite injects reserved `APPWRITE_*` vars into every site; user-set keys with that prefix are disallowed. The server API key is read as `process.env.STUDIOV_API_KEY ?? process.env.APPWRITE_API_KEY` (`src/lib/appwrite.ts`), so Sites uses `STUDIOV_API_KEY` (secret site variable) while local/Vercel keep `APPWRITE_API_KEY`.
- **Ordering: env vars before first build.** `NEXT_PUBLIC_*` vars are inlined into the client bundle at build time, so they must exist as site variables before the first deployment is triggered (the console wizard deploys immediately — hence the site is created via MCP instead).
- **Web platform registration.** The site's generated domain must be registered as a web platform on the project so browser-direct Storage uploads (session-authenticated `storage.createFile`) are accepted.
- **Repo switch.** `origin` becomes `https://github.com/Peka-ar/website.git` (empty repo — first push creates `main`). Old remote kept as `legacy` (Kaizen3424/StudioV); the Vercel project is deleted afterwards.
- **Vercel teardown.** After the Appwrite site is verified live, the Vercel project `studio-v` is deleted (user decision).

## Task list

### Phase 0 — GitHub App install (user, done)
- [x] Appwrite GitHub App installed on org `Peka-ar` with access to repo `website` (verified via `vcs_list_installations`)

### Phase 1 — Code & docs
- [x] Task 1: env fallback `STUDIOV_API_KEY ?? APPWRITE_API_KEY` in `src/lib/appwrite.ts`
- [x] Task 2: document both keys in `.env.example`; ignore `perf-server.log` + `.agents/` in `.gitignore`
- [x] Task 3: this plan + `tasks/todo.md`
- [x] Task 4: rewrite `specs/deployment.md` (Appwrite Sites handbook) + `specs/WEBSITE.md` §2 hosting row

### Checkpoint: build gate
- [x] `npm run lint` silent
- [x] `npm run build` compiles + type-checks

### Phase 3 — Git
- [x] Task 5: remotes (`legacy` ← old, `origin` ← Peka-ar/website), commit "v2 - appwrite migration", push → creates `main`

### Phase 4 — Appwrite Sites setup (via MCP)
- [x] Task 6: create site `peka-ar` (framework nextjs, adapter ssr, node-22, VCS-linked)
- [x] Task 7: site env vars — `STUDIOV_API_KEY` (secret), `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `NEXT_PUBLIC_APP_URL=https://branch-main-86d3a7e.appwrite.network`
- [x] Task 8: register branch URL as project web platform (`peka-ar-site`)
- [x] Task 9: VCS deployments built + activated (first live deployment `6a9509027178ddba4b54`)

### Checkpoint: live
- [x] Site serves HTTP 200 on branch URL
- [x] Build logs clean

### Phase 5 — Smoke test (Chrome DevTools)
- [x] Landing renders; sign-in → `/admin/dashboard` (SSR auth + TablesDB data); `/admin/tasks`; `/embed/<published>` (GLB streams from Appwrite CDN); `/api/sdk/v1/config/<id>` 200; `/api/sdk/v1/events` POST 201; zero console errors

### Phase 6 — Cleanup
- [ ] Task 10: delete Vercel project (destructive — confirm with user first)
- [x] Task 11: record live site details in `specs/deployment.md`, follow-up docs commit

## Risks and mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Org billing `draft` — SSR site creation may be blocked | High | Surface exact console error; fallback: static adapter is not viable (app is fully SSR) — user must activate plan |
| 150 MB GLB proxy streams through SSR request — timeout | Medium | Raise site request timeout; uploads already bypass the server (browser-direct) |
| `experimental.serverActions.bodySizeLimit` ignored off-Vercel | Low | Uploads never used server actions (Phase 4 browser-direct) |
| First-build env failures (missing var typos) | Medium | Env vars set before build; build logs polled; `sites_create_duplicate_deployment` to rebuild without new code |
| Next 16 + Sites framework defaults mismatch | Medium | Explicit install/build/output commands + adapter set on site create |

## Open questions
- None blocking. Custom domain intentionally deferred (generated domain first).
