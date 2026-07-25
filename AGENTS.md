# AGENTS.md — STUDIO.V website

This repo maintains a living **`specs/`** folder that documents the entire website at code-level reference depth. Read it first, keep it updated, and extend it with new `.md` files as the codebase grows. The goal: any agent starting a task should already have the necessary context without manually exploring the codebase.

## 1. Before starting any task — read specs

**Always start here, before reading source files:**

1. Read **`specs/WEBSITE.md`** — the single source of truth. It covers the product, stack, folder layout, route map, auth/data-model/API/server-action reference, workflows, design system, and env vars.
2. Read the relevant **deep-dive** if your task touches one of these areas:
   - `specs/pages/tasks.md` — `/tasks` Kanban pipeline
   - `specs/pages/dashboard.md` — `/dashboard` metrics
   - `specs/pages/auth.md` — `/auth*` flows (signin/signup/OTP/magic-link/reset)
   - `specs/file-storage-architecture.md` — UploadThing + GDrive backup
3. Skim `design.md` (repo root) for visual/interaction conventions before any UI work.
4. Only **then** open source files — and only the ones the specs point you to (`file:line` refs are embedded throughout).

If a spec accurately describes the code, trust it. If the spec and code disagree, the **code wins** — and you must fix the spec (see §2).

## 2. After completing a task — update specs

Before considering a task done, update `specs/` to reflect your changes. Treat spec updates as part of "done," not an afterthought.

**Update an existing spec when your change:**
- Adds, removes, or renames a route, page, or API endpoint → update the route map in `WEBSITE.md` §4 / §5 and the matching deep-dive.
- Changes a server action signature, auth requirement, or request/response shape → update `WEBSITE.md` §8 / §5 and the relevant deep-dive's "Server side" section.
- Changes the Prisma schema (models, enums, relations, indexes) → update `WEBSITE.md` §9 and `data-model` references in deep-dives.
- Changes the project lifecycle, auth flow, or upload flow → update `WEBSITE.md` §6/§7/§10 and the relevant deep-dive's flow section.
- Changes env vars, dependencies, or config (`next.config.mjs`, `.env.example`) → update `WEBSITE.md` §2/§13 and `file-storage-architecture.md` if storage-related.
- Changes `globals.css` tokens, design classes, or the theme system → update `WEBSITE.md` §12 (and reference `design.md`).

**Run `npm run lint` and `npm run build` after code changes** (the specs assume the build passes). Fix any breakage before updating specs.

## 3. When to create a NEW .md file

Don't cram everything into `WEBSITE.md`. Create a new spec file when:

- **A new page** becomes complex enough to warrant a deep-dive (multi-modal interactions, significant server data flow, role-gated behavior). Put it at `specs/pages/<route>.md`. Add a row to `WEBSITE.md` §4 route map and a link in `WEBSITE.md` §14 deep-dive list.
- **A new cross-cutting workflow** emerges (e.g., billing/Stripe, a new auth provider, a background job system). Put it at `specs/workflows/<name>.md` and link it from `WEBSITE.md`.
- **A new subsystem** with its own architecture (e.g., a search index, a webhook ingester, an analytics pipeline). Put it at `specs/<subsystem>-architecture.md` and link it from `WEBSITE.md` §14.

**Naming:** lowercase-kebab-case `.md` files. `pages/` for per-route deep-dives, `workflows/` for multi-page flows, root of `specs/` for cross-cutting architectures.

**Add new files to the index in `WEBSITE.md` §14** the moment you create them — never leave an orphan spec with no inbound link.

## 4. Spec writing conventions (keep docs consistent)

Every spec file should be **code-level reference**, not prose summaries. Match the style of the existing specs:

- **Start with a `> Parent:` breadcrumb** linking back to `../WEBSITE.md` (for deep-dives) or noting it's a top-level spec.
- **Include `file:line` references** for every function, route, model, and component you mention (e.g., `src/app/tasks/TasksClient.tsx:156`). Update line numbers when you touch the file.
- **Server actions / API handlers:** give the full signature, auth requirement (which `requirePrincipal` options), and request/response JSON shapes.
- **Components:** list props with types; note `"use client"` vs server; note which pages use them.
- **Data flow:** show what's queried, what's mutated, what's passed client-side. Prefer a small code/ASCII block for multi-step flows.
- **File & line index** at the end of deep-dives — a table mapping each named element to its source location.
- **Cross-link** to related specs (`../WEBSITE.md` §N, `../pages/X.md`, `file-storage-architecture.md`).
- **No emojis.** No marketing copy. Specs are reference material.

## 5. When NOT to update specs

Skip spec updates for changes that don't alter documented behavior:
- Pure formatting, whitespace, or import reordering.
- Refactors that preserve the public signature and data flow (the spec still describes them accurately).
- Test-only changes (there is currently no test suite — if one is added, create `specs/testing.md`).
- Dependency patch bumps that don't change APIs (note major-version upgrades in `WEBSITE.md` §2).

When in doubt, update — a slightly stale spec is worse than a slightly noisy one, but pure-noise updates erode trust in the docs.

## 6. Current spec inventory

```
specs/
├── WEBSITE.md                       # ← START HERE. Single source of truth.
├── file-storage-architecture.md      # UploadThing + GDrive backup (current) + Filebase history
├── auth-stabilization.md            # Task plan (historical; implemented)
├── deployment.md                    # Vercel deploy guide
└── pages/
    ├── tasks.md                     # /tasks Kanban + list + 4 modals
    ├── dashboard.md                 # /dashboard metrics + chart
    └── auth.md                      # /auth, /auth/verify, /auth/reset-password
```

Also relevant (repo root, not in `specs/`): `design.md` (design system), `tasks/` (migration records — read-only history), `.env.example` (env var reference).

## 7. Golden rule

> **Leave `specs/` at least as accurate as you found it.** The next agent — including future you — should be able to do its job by reading `specs/` alone, only opening source files to make the specific edit. If you finish a task and the specs would mislead a fresh reader, you're not done.
