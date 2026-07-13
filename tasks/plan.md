# Implementation Plan: Auth and Onboarding UX Refinement

## Overview
Improve the complete first-run experience for STUDIO.V by replacing vague credential failures with actionable auth states, moving onboarding from an auth-page modal to a dedicated full-page route, collecting meaningful setup data, and wiring that data into the parts of the product where it creates immediate value.

## Architecture Decisions
- Keep credentials auth and OTP email verification as the primary signup path; do not add OAuth in this pass.
- Add structured preflight auth checks before calling `signIn("credentials")` so the UI can distinguish unregistered, unverified, wrong-password, and success states without relying on Auth.js generic `CredentialsSignin` behavior.
- Create a dedicated `/onboarding` route and redirect not-onboarded users there from protected routes; remove onboarding modal behavior from `/auth`.
- Add `productCategory`, `storefrontPlatform`, and `catalogSize` to `User` because these are brand-level setup answers, not per-project fields.
- Require only company name during onboarding; make category, platform, and catalog size skippable to preserve low-friction signup.
- Use onboarding answers lightly at first: admin task context and integrations guidance, not broad personalization across the app.

## Dependency Graph
```text
User schema fields
    |
    +-- Prisma client generation / db push
    |       |
    |       +-- completeOnboarding payload persistence
    |       |       |
    |       |       +-- /onboarding full-page UI
    |       |       |       |
    |       |       |       +-- proxy redirects to /onboarding
    |       |       |
    |       |       +-- admin task context
    |       |       +-- integrations platform guidance
    |
    +-- Auth preflight actions
            |
            +-- SignInForm adaptive messages
            +-- unverified-account OTP recovery path
```

## Task List

### Phase 1: Auth State Foundation
- [ ] Task 1: Add structured login preflight action.
- [ ] Task 2: Update login UI for adaptive account-state messaging.
- [ ] Task 3: Add unverified-account recovery from login.

### Checkpoint: Auth UX
- [ ] Unregistered email shows a register-first message.
- [ ] Unverified email offers verification recovery without scary logs dominating the user experience.
- [ ] Wrong password shows a distinct wrong-password message.
- [ ] Verified credentials sign in normally.

### Phase 2: Onboarding Data Foundation
- [ ] Task 4: Add onboarding profile fields to the user schema.
- [ ] Task 5: Expand `completeOnboarding` to persist setup answers.

### Checkpoint: Data Layer
- [ ] Prisma client generation succeeds.
- [ ] Database schema is pushed successfully.
- [ ] Existing users remain valid with nullable optional onboarding fields.

### Phase 3: Full-Page Onboarding
- [ ] Task 6: Create the `/onboarding` route and move onboarding out of `/auth`.
- [ ] Task 7: Build the 5-step onboarding experience.
- [ ] Task 8: Update redirects after signup, login, and onboarding completion.

### Checkpoint: First-Run Flow
- [ ] New signup verifies OTP and reaches `/onboarding` without seeing the login form behind it.
- [ ] Existing not-onboarded users are redirected to `/onboarding` from protected routes.
- [ ] Onboarding can be completed with only company name.
- [ ] Optional onboarding questions can be skipped.

### Phase 4: Product Value Wiring
- [ ] Task 9: Surface onboarding context in admin task views.
- [ ] Task 10: Use storefront platform on the integrations page.

### Checkpoint: Complete
- [ ] Lint and TypeScript verification pass.
- [ ] Manual auth matrix is tested: unregistered, unverified, wrong password, verified success.
- [ ] Manual onboarding path is tested: new signup, existing not-onboarded login, skip optional answers, complete all answers.
- [ ] Integration copy and admin task context reflect onboarding answers where available.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Distinguishing auth states exposes account existence | Medium | This is explicitly requested; keep messages helpful but avoid revealing more than necessary outside submitted email context. |
| Schema changes require DB push and generated Prisma client | High | Make fields nullable and run `npx prisma generate` plus `npx prisma db push` as a dedicated checkpoint. |
| `/onboarding` redirect loop | High | Keep `/onboarding` authenticated but exempt from redirecting to itself; add matcher coverage deliberately. |
| Silent sign-in still lands on `/auth` or stale session state | Medium | Route successful verification to `/onboarding` and refresh after `signIn`. |
| Onboarding becomes too long | Medium | Require only company name; make all business-profile questions skippable. |
| Build remains blocked by missing Stripe env | Low | Verify changed files with lint/TypeScript; document if full build fails on existing Stripe config. |

## Parallelization Opportunities
- Task 1 and Task 4 can be researched in parallel, but implementation should land auth preflight before UI changes.
- Task 9 and Task 10 can be implemented in parallel after Task 5 because both consume persisted onboarding fields.
- Verification can be split: one session tests auth paths while another checks onboarding redirect paths.

## Open Questions
- After onboarding completion, should the final redirect be `/dashboard` or `/tasks`?
- Should unverified-login recovery automatically resend OTP or show a resend button first?
- Should optional onboarding answers be editable later from settings in a follow-up task?
