# Auth and Onboarding UX Refinement

## Problem Statement
How might we make STUDIO.V signup, login, verification, and onboarding feel calm, polished, and valuable so a new brand understands what the product solves and reaches the dashboard without confusing errors or awkward modal states?

## Recommended Direction
Build a tighter first-run experience around two principles: adaptive auth and full-page guided onboarding. Authentication should distinguish the real cases users hit: an email that is not registered, an email that exists but is not verified, and a verified account with the wrong password. The user should never see scary terminal-style failures reflected as vague UI behavior; they should get a clear next action.

Move onboarding out of the `/auth` modal and into a dedicated `/onboarding` route. The route should feel like part of the product, not an interruption layered over the login screen. The flow should require only the company name, then explain what STUDIO.V solves, then ask optional but useful business questions: product category, storefront platform, and catalog size. These answers should improve later screens, especially admin task triage and integration guidance.

Keep the experience simple. Defer flashy preview features and focus on a reliable path: sign up, verify OTP, sign in automatically, learn what STUDIO.V does, answer useful setup questions, land on the dashboard or first upload path.

## Key Assumptions to Validate
- [ ] Users prefer clear account-state messages over generic auth errors. Test by manually trying unregistered, unverified, wrong-password, and successful login paths.
- [ ] A dedicated `/onboarding` route feels more professional than a modal on `/auth`. Test by completing signup and login as a fresh user.
- [ ] Product category, storefront platform, and catalog size are useful enough to ask during onboarding. Test by confirming these fields help admin triage and integration copy.
- [ ] Requiring only company name keeps onboarding low-friction. Test by ensuring all later questions can be skipped and the user can still reach the app.

## MVP Scope
In scope: structured auth-state checks, improved login messages, inline recovery for unverified users, a full-page `/onboarding` route, required company-name step, educational explainer step, optional category/platform/catalog-size steps, persistence of onboarding answers, middleware redirects to `/onboarding`, and light wiring of onboarding answers into admin/integrations surfaces.

Out of scope for this pass: live 3D preview during onboarding, a full CRM-style admin user directory, analytics personalization, billing personalization, and OAuth.

## Not Doing (and Why)
- Live category-based 3D preview — exciting, but it needs curated demo assets and would distract from fixing the broken first-run path.
- Per-step onboarding autosave — useful later, but a single final save is simpler and enough for short onboarding.
- Full admin user profile pages — admin only needs category/platform context for task triage right now.
- OAuth login — credentials signup is the launch path and must be solid first.
- Password reset redesign — current link-based reset is acceptable and not the source of the reported UX issues.

## Open Questions
- Should skipped optional onboarding fields be editable later from an account/settings page?
- Should successful onboarding land on `/dashboard` or directly on `/tasks` to create the first product?
- Should unverified login resend the existing OTP automatically or require a button click?
