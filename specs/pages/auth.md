# `/auth` — Authentication flows (deep dive)

> Parent: [`../WEBSITE.md`](../WEBSITE.md) · Source: `src/app/auth/page.tsx:1`, `src/app/auth/verify/page.tsx:1`, `src/app/auth/reset-password/page.tsx:1` + components in `src/components/auth/`

> **Visual styling (v3 as-built):** inline token/class notes below were written against v2 naming and may lag the code. Authoritative design reference: `WEBSITE.md` §12 + `design.md` + the token/component blocks in `globals.css` (Figtree 400/900, Inter body, sage/ink grounds, Peka Green `--accent`, `--ink-deep`; no mono outside code blocks, no Manrope/coral, light-only). When this file disagrees with the code or `WEBSITE.md` §12, code + §12 win.

Peka AR uses **Appwrite Cloud** (region `fra`, project `6a8562a20037b62075e1`) end-to-end for auth: sessions, email verification (link-based), and password recovery. The `@appwrite.io/react` package owns the client-side session (cookies, sign-in/sign-out) via the SSR handler at `/api/appwrite/[...appwrite]`; `src/server/auth-guards.ts` resolves the canonical principal (session + `users` TableDB row) server-side. There is **no OTP flow and no magic-link/`Token` model** — Appwrite's native link-based verification (`updateVerification`) and recovery (`updateRecovery`) replace both (Phase 2 of `tasks/appwrite-migration.md`, DONE 2026-08-19).

---

## Routes overview

| Route | File | Auth | Purpose |
|---|---|---|---|
| `/auth` | `src/app/auth/page.tsx:1` → `AuthClient.tsx` | Public (onboarded session → role-aware redirect) | 3-view form: signin / signup / forgot-password |
| `/auth/verify` | `src/app/auth/verify/page.tsx:1` | Public | Appwrite email verification link (`?userId=…&secret=…` → `updateVerification`) |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx:1` | Public | New-password form (`?userId=…&secret=…` → `updateRecovery`) |

The proxy (`src/proxy.ts:18`) whitelists `/auth/*` as public. The logged-in re-visit redirect lives in the page itself (server component checks the session; the edge runtime cannot call Appwrite).

---

## 1. `/auth` — entry page

### Server entry (`src/app/auth/page.tsx:1`)
```tsx
let principal;
try {
  principal = await requirePrincipal();
} catch {
  return <AuthClient />;
}
if (!principal.onboarded) redirect("/onboarding");
if (principal.role === "ADMIN") redirect("/admin/dashboard");
redirect("/dashboard");
```
Role-aware redirect for existing sessions: not onboarded → `/onboarding`; ADMIN → `/admin/dashboard`; BRAND → `/dashboard`; no session (or stale/suspended — `requirePrincipal` throws) → `AuthClient`.

### `AuthClient.tsx` (`src/app/auth/AuthClient.tsx:1`) — client (v3, Phase 5)
Split-screen per `design.md` "Components" / `WEBSITE.md` §12 — **left brand panel is `var(--ink)` + `var(--on-ink)`** (component-level dark surface, legitimate in light-only v3), delineated from the right side by a `1px var(--border-default)` hairline (`AuthClient.tsx:33`). Right side is the white page ground; the form block sits at `max-w-[448px]` with `.input-base` white inputs (1px `--border-ink`, 12px radius).

- **Left (desktop, `hidden lg:flex`, `lg:w-[44%] xl:w-[42%]`):** `Wordmark` (Figtree 900 + Peka Green dot via `dotClassName="text-[var(--accent)]"`), Figtree-900 headline "Photos in. Showroom out." (`font-display` + `font-bold` — the v3 weight guardrail pins it to 900; `clamp(1.625rem,3vw,2.125rem)`), 3 proof bullets in `body-sm` (one-line embed / AR view-in-room / artist-finished) with `--accent` dot markers, quiet Inter-uppercase footer "Peka AR · Photo → 3D pipeline · Hours, not weeks" above a `rgba(232,235,230,0.14)` hairline (`AuthClient.tsx:58`).
- **Left (mobile):** collapses to a compact ink header band (`flex lg:hidden`, `bg-[var(--ink)]`, Wordmark + "Back" `LinkButton ghost` on `var(--on-ink)`).
- **Right:** segmented mode switch (`role="tablist"` with `Sign in` / `Sign up` pills; container `bg-[var(--canvas-soft)]` + `--border-default`, active pill = `bg-[var(--accent-pale)]` + `text-[var(--ink-deep)]` + `shadow-sm`, inactive = `var(--text-secondary)` on hover `--text-primary`) above the forms; form titles are `font-display` (Figtree 900 cut, `text-2xl`); body `body-md`; submit = `Button variant="primary"` (single Peka Green CTA per viewport), tertiary links (`Forgot password?`, `Sign Up`/`Sign In`) render as ink text via the ghost LinkButton (`--ink-deep` hover). Inputs are `Input`/`FormField` (`input-base`, 48px/12px, ink border). Alerts are semantic `Alert` (white banner + colored hairline + semantic-deep text).

**State:** `type AuthView = 'signin' | 'signup' | 'forgot-password'` — `useState<AuthView>('signin')`. Navigation via `onNavigate={(v) => setView(v as AuthView)}` passed to each form; the tablist syncs `view` for signin/signup, while `forgot-password` is entered via the tertiary “Forgot password?” button inside `SignInForm` (no tab). No `onSuccess` wiring — `SignUpForm` owns its post-submit state internally (inbox screen).

```tsx
{view === 'signin' && <SignInForm onNavigate={(v) => setView(v as AuthView)} />}
{view === 'signup' && <SignUpForm onNavigate={(v) => setView(v as AuthView)} />}
{view === 'forgot-password' && <ForgotPasswordForm onNavigate={(v) => setView(v as AuthView)} />}
```

---

## 2. Sign In — `SignInForm` (`src/components/auth/SignInForm.tsx:1`)

**Props:** `{ onNavigate: (view: string) => void }`. Uses `useAuth()` from `@appwrite.io/react` (line 4).

**Flow (`handleSubmit`):**
1. Reads `email` + `password` from the form.
2. Calls `signIn.emailPassword({ email, password, onSuccess, onError })` — the `@appwrite.io/react` hook POSTs to the SSR handler (`/api/appwrite/...`), which calls Appwrite and sets the session cookie. **The SSR handler does NOT hydrate the client SDK session** (it returns only `{ user }`), so step 3 re-syncs it manually.
3. On success → `getSessionPrincipal()` server action (`auth.ts:219`), which now returns `{ onboarded, role, sessionSecret }` (the secret read via `createNextServerHelpers.readSessionCookie()`, same source the root layout uses). `SignInForm` then calls `client.setSession(sessionSecret)` (provider client via `useAppwrite()`) so browser-direct SDK calls (`storage.createFile` uploads, etc.) carry `X-Appwrite-Session` — without this, a soft-navigation `router.push` keeps `Providers` on its pre-login `session = null` prop and uploads go out as guest (`Missing "create" permission…`). Finally `router.push(postLoginPath(principal.onboarded, principal.role))` — **no `router.refresh()`** (removed in the Phase 6 perf fix; it caused a double navigation).
4. On error → `signInErrorMessage(err)` maps an `AppwriteException` (has `.code` status + `.type` code):
   - `401` / `user_invalid_credentials` / `user_not_found` → "Invalid email or password."
   - `429` / `*rate_limit*` → "Too many attempts. Please try again later."
   - otherwise → `err.message`.

**Post-login routing (`postLoginPath`, local):**
- Not onboarded → `/onboarding` (both roles).
- Onboarded + `role === "ADMIN"` → `/admin/dashboard`.
- Onboarded + `role === "BRAND"` → `/dashboard`.

The redirect target is decided **after** Appwrite issues the session, using only the role the server read from the `users` row (`getSessionPrincipal` → `requirePrincipal`). Tampering with the request cannot influence the redirect.

**UI:** Email + password `Input`s with `Mail`/`Lock` left icons, a "Forgot?" button (`onNavigate('forgot-password')`), an error `Alert`, a full-width primary "Sign In" `Button` (loading spinner), and a "Sign Up" link to swap to signup.

---

## 3. Sign Up — `SignUpForm` (`src/components/auth/SignUpForm.tsx:1`)

**Props:** `{ onNavigate }`. Two-stage component gated by `submittedEmail` state.

### Stage 1 — registration form
- Email + password `Input`s. Password is controlled (`useState`) to drive the live strength meter.
- **Password strength meter**: 0 = empty, 1 = `<6` (Weak, amber), 2 = `<10` (Good, amber), 3 = `≥10` (Strong, emerald). 3-bar visual + mono label.
- Calls `registerUser(new FormData(form))` (`auth.ts:64`) on submit.
- On success → `setSubmittedEmail(email)` → swaps to Stage 2.
- Errors surface in an `Alert` ("Email and password are required", "Password must be at least 8 characters", "Email already registered", or the recoverable email-send failure message).
- Links to `/terms` + `/privacy` (open in new tab). "Sign In" link swaps to signin.

### Stage 2 — "Check your inbox"
- Centered card: checkmark icon, "Check your inbox" heading, "We sent a verification link to {email}. Click it to activate your account, then sign in."
- **Spam-folder hint** (`<Alert tone="info">`, unconditional — Gmail SMTP delivers land in spam frequently, no SPF/DKIM on the sending account): "Didn't get the email? Check your **spam** or **promotions** folder, then try again."
- **Resend button** — "Resend verification email" (`Button variant="secondary"`) calls `resendVerificationEmail(submittedEmail)` (`auth.ts:130`); success shows an `Alert tone="success">`. The send stage is `'idle' | 'sending' | 'sent'`.
- **No auto sign-in after signup** (deviation D2): verification is link-based; after clicking the email link the user signs in manually. The password is held in local component state only during Stage 1 — it is never reused after `registerUser` succeeds.
- "Back to Sign In" link (`onNavigate('signin')`).

---

## 4. Forgot Password — `ForgotPasswordForm` (`src/components/auth/ForgotPasswordForm.tsx:1`)

**Props:** `{ onNavigate }`. Single email field; calls `requestPasswordReset(email)` (`auth.ts:147`) on submit. The action **always returns `{ success: true }`** (even if no user exists — no enumeration; failures are logged server-side), so the form swaps to a "Check your inbox" confirmation state regardless. Includes a "Back" link to signin.

---

## 5. Reset Password — `/auth/reset-password` + `ResetPasswordForm`

### Server entry (`src/app/auth/reset-password/page.tsx:1`)
Reads `userId` + `secret` from `searchParams` and renders `<ResetPasswordForm>` on a `var(--canvas)` ground (`min-h-screen flex items-center justify-center px-6 py-12`). If either param is missing the form shows “Reset link is invalid or expired.” up-front.

### `ResetPasswordForm` (`src/components/auth/ResetPasswordForm.tsx:1`) — client (v3)
**Props:** `{ userId: string; secret: string }`. Centered `card` (`max-w-md`, `p-8 sm:p-10`, `radius-24`) on the sage canvas; title `font-display text-2xl font-semibold tracking-[-0.01em]` (Figtree), body `body-md`. New-password `Input` via `FormField`; `Alert` for errors; submit = `Button variant="primary"` (`w-full`, `isLoading`, `disabled={!userId||!secret}`). Success state: `bg-[var(--accent-pale)]` circle with a `var(--positive)` dot + “Your password has been updated.” + `btn-primary` “Sign In” → `/auth`. Calls `resetPassword(userId, secret, password)` (`auth.ts:166`); ≥ 8 chars. Appwrite enforces 1-hr expiry.

---

## 6. Email verify — `/auth/verify` (v2 retheme)

### Server entry (`src/app/auth/verify/page.tsx:1`) — fully server-side, no client component
```tsx
const { userId, secret } = await searchParams;
let error = null;
if (!userId || !secret) error = "Verification link is invalid or missing.";
else try { await new Account(createPublicClient()).updateVerification({ userId, secret }); }
     catch { error = "Verification link is invalid or expired."; }
// centered card: "Email verified" or "Unable to verify" + Sign In link to /auth
```
Visual: `var(--canvas)` ground, centered `card` (`max-w-md p-8 sm:p-10 text-center`); rounded icon circle `bg-[var(--accent-pale)] text-[var(--positive-deep)]` (success) / `bg-[var(--negative-bg)] text-[#fff]` (error) with a `var(--positive)`/`var(--negative)` dot; title `font-display text-2xl font-semibold tracking-[-0.01em]` (Figtree), body `text-sm` `var(--text-secondary)`; single `btn-primary` “Sign In” → `/auth`.
The link comes from Appwrite's verification email: **Appwrite appends `userId` + `secret`** to the click URL (the `url` passed to `createVerification`). On success the user is verified; the page shows a success card linking to `/auth` — **no session is created** (verified: `updateVerification` returns no session token, deviation D2), so the user signs in manually and lands on onboarded-aware routing.

### Loading states (`src/app/auth/loading.tsx:1`, `src/app/onboarding/loading.tsx:1`) — v2
Both are `Skeleton` compositions on `var(--canvas)`/`var(--surface)` (no spinner): `AuthLoading` mirrors the split-screen shell (ink panel + card skeletons), `OnboardingLoading` mirrors the ink aside + card body + step dots. Verified in the Phase 4 build.

---

## 7. Server action reference (auth)

All in `src/app/actions/auth.ts:1` (`"use server"`). Public unless noted.

| Export | Signature | Auth | Behavior |
|---|---|---|---|
| `registerUser` | `(formData) → { email; verificationRequired: true }` | None | `normalizeEmail` + password ≥ 8. **Admin client (deviation D1):** `Users.list` (`Query.equal("email")`) → existing verified user ⇒ throw `Email already registered`; existing unverified ⇒ `Users.updatePassword` + re-send verification; new ⇒ `Users.create(ID.unique(), email, password)` + `TablesDB.createRow(users, { rowId: user.$id, data: { userId, email, role: "BRAND", usageLimits: 10, onboarded: false, status: "ACTIVE" } })` + `Users.updateLabels(["BRAND"])` + `sendVerificationEmail`. Email-send failure ⇒ recoverable throw "Account created, but we couldn't send the verification email. Please try submitting again — it will resend the verification link." **Rate-limited:** 10/h/IP (see `backend-architecture.md` §4). |
| `resendVerificationEmail` | `(email) → { success; status: "invalid"\|"sent" }` | None | `Users.list` by email; missing or already verified ⇒ `{ success: false, status: "invalid" }` (no enumeration). Otherwise re-sends the verification email. **Rate-limited:** 5/h/email + 10/h/IP. |
| `requestPasswordReset` | `(email) → { success: true }` | None | `Account(createPublicClient()).createRecovery({ email, url: APP_URL + "/auth/reset-password" })`. **Always returns `{ success: true }`** (no enumeration; failures logged server-side). Requires the public client — the API-key client fails with `(role: applications) missing scope (public)`. **Rate-limited:** 3/h/email + 10/h/IP. |
| `resetPassword` | `(userId, secret, password) → { success: true }` | None | Requires `userId` + `secret` and password ≥ 8. `Account(createPublicClient()).updateRecovery({ userId, secret, password })` — Appwrite enforces 1-hr expiry. Any failure ⇒ throw `Reset link is invalid or expired`. |
| `completeOnboarding` | `(input) → { success: true }` | `requirePrincipal()` | Sets `name`/`productCategory`/`storefrontPlatform`/`catalogSize` + `onboarded: true` via `TablesDB.updateRow`; `Users.updateLabels([principal.role])`. Appwrite sessions re-read the `users` row per request, so **no `unstable_update`/JWT refresh is needed** (removed in Phase 1). Revalidates `/auth`, `/onboarding`, `/dashboard`, `/tasks`, `/integrations`. |
| `getSessionPrincipal` | `() → { onboarded: boolean; role: Role; sessionSecret: string } \| null` | Session | `requirePrincipal()` inside try/catch → `null` on any failure; also returns the httpOnly-cookie session secret (via `createNextServerHelpers.readSessionCookie()`) so the client can hydrate the Appwrite SDK after SSR sign-in (see §2 step 3). Used by `SignInForm` for post-login routing (replaces the deleted `preflightLogin`, deviation D5). |
| `logout` | `() => Promise<void>` | Session | Reads the `appwrite-session-<projectId>` cookie, calls `Account.deleteSession({ sessionId: "current" })` on the session client (errors logged, not thrown), deletes the cookie, `redirect("/")`. All logout buttons (`AdminLayout.tsx:129`, `DashboardLayout.tsx:137`, `MobileNavDrawer.tsx:236`) are `<form action={logout}>` — kept as a server action (deviation D4) rather than the `useSignOut` hook. |

### Helpers (private, same file)
- `normalizeEmail(email)` — trim + lowercase (`auth.ts:31`).
- `optionalText(value)` — trim or `null` (`auth.ts:35`).
- `appUrl()` — `process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"` (`auth.ts:40`).
- `lookupUserByEmail(email)` — `Users.list({ queries: [Query.equal("email", email)] })` on the admin client (`auth.ts:44`).
- `sendVerificationEmail(userId)` — mints a session (`Users.createSession`), calls `Account(createSessionClient(secret)).createVerification({ url: appUrl() + "/auth/verify" })`, and deletes the minted session in `finally` (cleanup errors logged, never thrown). Called from `registerUser` and `resendVerificationEmail` (`auth.ts:49`). **Requires a session** — `createVerification` has no admin/API-key path, hence the mint-delete dance.

---

## 8. Appwrite session plumbing

### Session cookie
- Name: **`appwrite-session-<projectId>`** = `appwrite-session-6a8562a20037b62075e1` (`src/lib/appwrite-config.ts:3`). This is the `@appwrite.io/react` package default (`DEFAULT_COOKIE_NAME_PREFIX = "appwrite-session"`), NOT the raw-SDK `a_session_` convention. Cookie attributes: `httpOnly`, `secure`, `sameSite=lax`, `path=/` (package defaults — no override in this repo).

### SSR handler — `src/app/api/appwrite/[...appwrite]/route.ts:1`
```ts
export const { GET, POST } = createAppwriteHandlers({
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  redirects: { success: "/dashboard", failure: "/auth" },
});
```
Exposes sign-in / sign-up / sign-out / OAuth-callback / token-refresh routes under `/api/appwrite/*`. Requires the server API key. Writes the session cookie on success and issues the configured redirect (the app overrides the redirect client-side via `getSessionPrincipal`).

### Provider — `src/app/providers.tsx:7`
```tsx
<AppwriteProvider
  endpoint={APPWRITE_ENDPOINT}
  projectId={APPWRITE_PROJECT_ID}
  ssr={{ session, basePath: "/api/appwrite" }}
>
  {children}
</AppwriteProvider>
```
No `ThemeProvider` wrapper — the app is light-only (v3, `ThemeProvider.tsx`/`ThemeToggle.tsx` deleted). `session` comes from the async root layout (`src/app/layout.tsx`) via `createNextServerHelpers({ endpoint, projectId }).readSessionCookie()` so the client doesn't flash logged-out during hydration.

### Server helpers — `src/server/appwrite.ts`
- `createAdminClient()` (`:11`) — server-only, cached singleton (Admin SDK + API key; key read via `env.APPWRITE_API_KEY` from `src/server/env.ts`). Used by `requirePrincipal`, `registerUser`, `resendVerificationEmail`, `completeOnboarding`.
- `createSessionClient(secret, userAgent?)` (`:21`) — `Client` authenticated with a session secret. Used by `logout` and `sendVerificationEmail`.
- `createPublicClient()` (`:32`) — bare `Client` with endpoint + project only. Used by `requestPasswordReset`, `resetPassword`, and the `/auth/verify` page for the public routes (`createRecovery`, `updateRecovery`, `updateVerification`). **Never attach the API key to this client** — the `applications` role lacks the `public` scope and those calls fail with `(role: applications) missing scope (public)`.

> **Edge constraint:** `proxy.ts` may only import from `src/lib/appwrite-config.ts` (constants, zero SDK imports) — importing `node-appwrite` would pull a server-only module into the edge runtime.

---

## 9. Email delivery

Email is sent by **Appwrite Cloud** (Gmail SMTP provider configured in the console: sender "Peka.ar", `studiov3242@gmail.com`) using the built-in **verification** and **recovery** templates — no app code sends email anymore. The click URL is passed per-call: `createVerification({ url })` / `createRecovery({ url })`; Appwrite appends `userId` + `secret` to it. `src/lib/emails.ts`, `src/lib/mail.ts`, and `src/lib/password.ts` now have zero consumers (deleted in Phase 5).

---

## 10. Security properties

- **No user enumeration** — `resendVerificationEmail` and `requestPasswordReset` return uniform responses for missing/verified/unverified users; `registerUser` intentionally reveals "Email already registered" only when the existing user is already verified.
- **Verification/recovery secrets** — handled entirely by Appwrite (hashed, expiring: 1 hr for recovery); the app never stores them.
- **Password hashing** — Appwrite-side; the app never sees or stores passwords (the old bcrypt `src/lib/password.ts` was deleted in Phase 5).
- **Canonical principal** — every protected action resolves the user from the DB via `requirePrincipal` (`src/server/auth-guards.ts:87`): Appwrite session → `users` TableDB row (`TablesDB.getRow`), which returns `Principal { userId, email, role, onboarded, companyName }`. Never trust `user.id`/`role` directly for authorization.
- **DB-backed role enforcement on admin pages** — the proxy can no longer gate `/admin/*` on role claims (edge runtime cannot call Appwrite), so the ONLY gate is `requirePrincipalOrRedirect({ roles: [Role.ADMIN] })` on every admin page, which re-reads the `users` row and rejects non-admins (including demoted users with valid sessions). See `WEBSITE.md` §6.4 (admin page list).
- **Role-aware redirects** — post-login routing (`postLoginPath` in `SignInForm`) branches ADMIN → `/admin/dashboard`, BRAND → `/dashboard`, driven by the role `getSessionPrincipal` read from the DB row. `requirePrincipalOrRedirect`'s `ForbiddenError` fallback also branches on the principal's role.
- **Stale session self-healing** — if a user has a valid Appwrite session but no `users` row (e.g., DB reset, user deleted), `requirePrincipal` throws `StaleSessionError` (extends `UnauthenticatedError`, defined in `src/server/http/errors.ts`). Pages use `requirePrincipalOrRedirect()` (`auth-guards.ts:98`) which redirects to `/auth` — Appwrite expires the cookie itself. API routes catch `StaleSessionError` via their existing `UnauthenticatedError` handler and return 401.
- **Suspended accounts** — Appwrite allows a suspended user to log in (no server-side block), so the check runs per-request: `requirePrincipal` throws `ForbiddenError("Account suspended")` when `users.status === "SUSPENDED"`, blocking every protected page/action/API route.
- **No session auto-creation on verify/reset** — `updateVerification`/`updateRecovery` return no session token; users always sign in explicitly afterward.

---

## File & line index

| Element | Location |
|---|---|
| `/auth` server entry (onboarded-aware redirect) | `src/app/auth/page.tsx:1` |
| `AuthClient` (3-view switch) | `src/app/auth/AuthClient.tsx:1` |
| `/auth/verify` server entry | `src/app/auth/verify/page.tsx:1` |
| `/auth/reset-password` server entry | `src/app/auth/reset-password/page.tsx:1` |
| `SignInForm` | `src/components/auth/SignInForm.tsx:1` |
| `SignUpForm` | `src/components/auth/SignUpForm.tsx:1` |
| `ForgotPasswordForm` | `src/components/auth/ForgotPasswordForm.tsx:1` |
| `ResetPasswordForm` | `src/components/auth/ResetPasswordForm.tsx:1` |
| Auth server actions | `src/app/actions/auth.ts:1` |
| `normalizeEmail` / `optionalText` / `appUrl` | `auth.ts:31` / `:35` / `:40` |
| `lookupUserByEmail` / `sendVerificationEmail` | `auth.ts:44` / `:49` |
| `registerUser` | `auth.ts:64` |
| `resendVerificationEmail` | `auth.ts:130` |
| `requestPasswordReset` | `auth.ts:147` |
| `resetPassword` | `auth.ts:166` |
| `completeOnboarding` | `auth.ts:186` |
| `getSessionPrincipal` | `auth.ts:219` |
| `logout` | `auth.ts:235` |
| SSR auth handlers | `src/app/api/appwrite/[...appwrite]/route.ts:1` |
| `AppwriteProvider` | `src/app/providers.tsx:7` |
| Root layout (reads session cookie) | `src/app/layout.tsx:1` |
| Appwrite config constants | `src/lib/appwrite-config.ts:1` |
| `createAdminClient` / `createSessionClient` / `createPublicClient` | `src/server/appwrite.ts:11` / `:21` / `:32` |
| Proxy (middleware) | `src/proxy.ts:18` |
| `requirePrincipal` | `src/server/auth-guards.ts:87` |
| `requirePrincipalOrRedirect` | `src/server/auth-guards.ts:98` |
| `Role` const/type | `src/lib/enums.ts:1` (re-exported by `src/server/auth-guards.ts:20`) |
| `UnauthenticatedError` / `StaleSessionError` / `ForbiddenError` | `src/server/http/errors.ts` |
| Dead files (deleted in Phase 5) | `src/lib/password.ts`, `src/lib/emails.ts`, `src/lib/mail.ts` |