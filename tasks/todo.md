# Auth and Onboarding UX Refinement Tasks

## Task 1: Add structured login preflight action

**Description:** Add a server action that checks the submitted email and password before the Auth.js credentials call so the UI can show distinct states for unregistered, unverified, wrong-password, and valid credentials.

**Acceptance criteria:**
- [ ] Unknown email returns a `not_registered` result.
- [ ] Existing unverified email returns an `unverified` result.
- [ ] Existing verified email with wrong password returns an `invalid_password` result.
- [ ] Existing verified email with correct password returns a `valid` result.

**Verification:**
- [ ] Manual check: call the login form with each account state and confirm the expected UI state.
- [ ] Tests/build: `npx tsc --noEmit` succeeds.

**Dependencies:** None

**Files likely touched:**
- `src/app/actions/auth.ts`
- `src/lib/password.ts`

**Estimated scope:** Small: 1-2 files

## Task 2: Update login UI for adaptive account-state messaging

**Description:** Update the sign-in form to use the preflight action before `signIn`, showing clear next actions instead of a generic credentials failure.

**Acceptance criteria:**
- [ ] Not-registered emails show “No account found. Create an account first.”
- [ ] Wrong passwords show “That password is incorrect.”
- [ ] Valid credentials proceed through `signIn("credentials")`.

**Verification:**
- [ ] Manual check: submit unknown email, wrong password, and valid credentials.
- [ ] Tests/build: `npx eslint src/components/auth/SignInForm.tsx src/app/actions/auth.ts` succeeds.

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/auth/SignInForm.tsx`

**Estimated scope:** Small: 1 file

## Task 3: Add unverified-account recovery from login

**Description:** Let users who try to log in before verification recover smoothly by sending or re-sending an OTP and showing an inline verification path rather than leaving them stuck.

**Acceptance criteria:**
- [ ] Unverified login shows a specific unverified-account message.
- [ ] User can request a fresh OTP from that state.
- [ ] Successful OTP verification signs the user in and routes them to onboarding if needed.

**Verification:**
- [ ] Manual check: use an unverified email, request OTP, verify OTP, and confirm the next route.
- [ ] Tests/build: `npx eslint src/components/auth/SignInForm.tsx src/components/auth/SignUpForm.tsx src/app/actions/auth.ts` succeeds.

**Dependencies:** Task 2

**Files likely touched:**
- `src/app/actions/auth.ts`
- `src/components/auth/SignInForm.tsx`
- `src/components/auth/SignUpForm.tsx`

**Estimated scope:** Medium: 2-3 files

## Task 4: Add onboarding profile fields to user schema

**Description:** Add nullable brand-profile fields to `User` so onboarding can persist useful business context without breaking existing accounts.

**Acceptance criteria:**
- [ ] `productCategory String?` exists on `User`.
- [ ] `storefrontPlatform String?` exists on `User`.
- [ ] `catalogSize String?` exists on `User`.
- [ ] Prisma client is regenerated.

**Verification:**
- [ ] Schema update succeeds: `npx prisma generate`.
- [ ] DB update succeeds: `npx prisma db push`.

**Dependencies:** None

**Files likely touched:**
- `prisma/schema.prisma`

**Estimated scope:** XS: 1 file

## Task 5: Expand onboarding persistence

**Description:** Expand `completeOnboarding` so it accepts company name plus optional category, storefront platform, and catalog size, then persists all provided values.

**Acceptance criteria:**
- [ ] Company name remains required.
- [ ] Optional answers can be omitted without error.
- [ ] Provided optional answers are saved to the user record.
- [ ] `onboarded` is set to `true` only after successful save.

**Verification:**
- [ ] Manual check: complete onboarding with only company name and with all fields.
- [ ] Tests/build: `npx tsc --noEmit` succeeds.

**Dependencies:** Task 4

**Files likely touched:**
- `src/app/actions/auth.ts`

**Estimated scope:** Small: 1 file

## Task 6: Create full-page `/onboarding` route

**Description:** Replace the current onboarding modal on `/auth` with a dedicated route that renders as a first-class page after login or signup verification.

**Acceptance criteria:**
- [ ] `/onboarding` exists under `src/app/onboarding`.
- [ ] Authenticated onboarded users visiting `/onboarding` redirect to `/dashboard`.
- [ ] Unauthenticated users visiting `/onboarding` redirect to `/auth`.
- [ ] `/auth` no longer renders the onboarding modal over the login form.

**Verification:**
- [ ] Manual check: visit `/onboarding` as unauthenticated, not-onboarded, and onboarded users.
- [ ] Tests/build: `npx tsc --noEmit` succeeds.

**Dependencies:** Task 5

**Files likely touched:**
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/OnboardingClient.tsx`
- `src/app/auth/page.tsx`
- `src/app/auth/AuthClient.tsx`
- `src/proxy.ts`

**Estimated scope:** Medium: 4-5 files

## Task 7: Build the 5-step onboarding experience

**Description:** Build the polished onboarding UI with a required company-name step, an educational explainer as step 2, and skippable business-profile questions for category, storefront, and catalog size.

**Acceptance criteria:**
- [ ] Step 1 requires company name.
- [ ] Step 2 explains what STUDIO.V solves and how to use the product.
- [ ] Step 3 asks product category and can be skipped.
- [ ] Step 4 asks storefront platform and can be skipped.
- [ ] Step 5 asks catalog size and can be skipped.

**Verification:**
- [ ] Manual check: complete onboarding using all fields.
- [ ] Manual check: complete onboarding by skipping optional steps.
- [ ] Tests/build: `npx eslint src/app/onboarding/OnboardingClient.tsx` succeeds.

**Dependencies:** Task 6

**Files likely touched:**
- `src/app/onboarding/OnboardingClient.tsx`
- `src/components/auth/OnboardingWizard.tsx`

**Estimated scope:** Medium: 1-2 files

## Task 8: Update auth and onboarding redirects

**Description:** Ensure signup verification, login, protected-route access, and onboarding completion all send users to the correct next screen without stale auth backgrounds or redirect loops.

**Acceptance criteria:**
- [ ] Successful OTP verification routes not-onboarded users to `/onboarding`.
- [ ] Successful login routes not-onboarded users to `/onboarding` and onboarded users to `/dashboard`.
- [ ] Protected routes redirect not-onboarded users to `/onboarding`.
- [ ] Completing onboarding routes to `/dashboard` or the approved first destination.

**Verification:**
- [ ] Manual check: new signup path reaches `/onboarding` then dashboard.
- [ ] Manual check: existing not-onboarded login reaches `/onboarding`.
- [ ] Manual check: onboarded login reaches `/dashboard`.
- [ ] Tests/build: `npx tsc --noEmit` succeeds.

**Dependencies:** Task 7

**Files likely touched:**
- `src/components/auth/SignInForm.tsx`
- `src/components/auth/SignUpForm.tsx`
- `src/app/onboarding/OnboardingClient.tsx`
- `src/proxy.ts`

**Estimated scope:** Medium: 3-4 files

## Task 9: Surface onboarding context in admin task views

**Description:** Show product category and related brand context where admins review and triage work, starting with the shared `/tasks` admin view.

**Acceptance criteria:**
- [ ] Admin task data includes the brand's onboarding fields.
- [ ] Admin task list or detail view shows product category when present.
- [ ] Missing category falls back to a quiet “Not specified” state.

**Verification:**
- [ ] Manual check: admin `/tasks` shows category context for a brand with onboarding answers.
- [ ] Tests/build: `npx eslint src/app/actions/admin.ts src/app/tasks/TasksClient.tsx` succeeds.

**Dependencies:** Task 5

**Files likely touched:**
- `src/app/actions/admin.ts`
- `src/app/tasks/TasksClient.tsx`

**Estimated scope:** Small: 2 files

## Task 10: Use storefront platform on integrations page

**Description:** Use the user's storefront platform answer to tailor the integrations page guidance while keeping the universal iframe embed as the core output.

**Acceptance criteria:**
- [ ] Integrations server page fetches `storefrontPlatform` for the signed-in user.
- [ ] Integrations client receives the platform as a prop.
- [ ] Copy or helper text references the selected platform when available.
- [ ] Unknown or skipped platform falls back to generic iframe guidance.

**Verification:**
- [ ] Manual check: Shopify/custom/skipped platform states render sensible guidance.
- [ ] Tests/build: `npx eslint src/app/integrations/page.tsx src/app/integrations/IntegrationsClient.tsx` succeeds.

**Dependencies:** Task 5

**Files likely touched:**
- `src/app/integrations/page.tsx`
- `src/app/integrations/IntegrationsClient.tsx`

**Estimated scope:** Small: 2 files
