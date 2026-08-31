# Deploy on Appwrite Sites — TODO

- [x] Phase 0: Appwrite GitHub App installed on org Peka-ar (repo `website`)
- [x] Phase 1a: `src/lib/appwrite.ts` env fallback (`STUDIOV_API_KEY ?? APPWRITE_API_KEY`)
- [x] Phase 1b: `.env.example` documents both keys; `.gitignore` excludes `perf-server.log`, `.agents/`
- [x] Phase 1c: `tasks/plan.md` + `tasks/todo.md` written
- [x] Phase 1d: `specs/deployment.md` rewritten + `specs/WEBSITE.md` §2 updated
- [ ] Phase 2: `npm run lint` silent + `npm run build` passes
- [ ] Phase 3: remotes set; commit "v2 - appwrite migration"; push to Peka-ar/website (creates main)
- [ ] Phase 4a: create site `peka-ar` via MCP (nextjs, ssr, node-22, VCS-linked)
- [ ] Phase 4b: set site env vars (STUDIOV_API_KEY secret + NEXT_PUBLIC_*) BEFORE first build
- [ ] Phase 4c: register generated domain as project web platform
- [ ] Phase 4d: trigger first deployment, poll build logs, fix failures
- [ ] Phase 5: live smoke test (landing, sign-in, /tasks, /embed, /api/sdk/v1/config, upload)
- [ ] Phase 6a: delete Vercel project (confirm with user first)
- [ ] Phase 6b: record live details in specs/deployment.md + follow-up commit
