# `/auth*` — Authentication flows

> **Parent:** [`../WEBSITE.md`](../WEBSITE.md) · Sources: `src/app/auth/`, `src/components/auth/`, `src/app/actions/auth.ts`, `src/server/auth-guards.ts`

Peka AR uses **Appwrite Cloud** (region `fra`, project `6a8562a20037b62075e1`) end-to-end for auth: password sessions, link-based email verification, and password recovery. The `@appwrite.io/react` package owns the client-side session via the SSR handler at `/api/appwrite/[...appwrite]`; `src/server/auth-guards.ts` resolves the canonical principal server-side. There is **no OTP flow and no magic-link/`Token` model** — Appwrite's native link-based `updateVerification` / `updateRecovery` are the only verification/recovery paths.

---

## Routes overview

| Route | File | Auth | Purpose |
|---|---|---|---|
| `/auth` | `src/app/auth/page.tsx` → `AuthClient.tsx` | Public (onboarded session → role-aware redirect) | 3-view form: signin / signup / forgot-password |
| `/auth/verify` | `src/app/auth/verify/page.tsx` | Public | Verification link (`?userId&secret` → `updateVerification`) |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx` | Public | New-password form (`?userId&secret` → `updateRecovery`) |

The proxy whitelists `/auth/*` as public. The logged-in re-visit redirect lives in the page itself (server component; the edge runtime cannot call Appwrite).

---

## `/auth` entry — `AuthClient`

Server entry: `requirePrincipal()` in try/catch — no session → `<AuthClient />`; onboarded → role-aware redirect (not onboarded → `/onboarding`, ADMIN → `/admin/dashboard`, BRAND → `/dashboard`).

`AuthClient` is a split-screen client component: left ink brand panel (Wordmark, "Photos in. Showroom out." headline, proof bullets — desktop only, compact ink header on mobile), right white form area with a segmented Sign in / Sign up tablist. `type AuthView = 'signin' | 'signup' | 'forgot-password'`; forgot-password is entered from a tertiary link inside `SignInForm` (no tab). `SignUpForm` owns its post-submit state internally (inbox screen).

---

## Sign In — `SignInForm`

Uses `useAuth()` from `@appwrite.io/react`. Flow:

1. `signIn.emailPassword({ email, password })` — POSTs to the SSR handler, which calls Appwrite and sets the session cookie. **The SSR handler does NOT hydrate the client SDK session** (returns only `{ user }`).
2. On success → `getSessionPrincipal()` server action → returns `{ onboarded, role, sessionSecret }`; the form calls `client.setSession(sessionSecret)` (provider client via `useAppwrite()`), then `router.push(postLoginPath(...))` — **no `router.refresh()`** (caused double navigation).
   - **Why the secret handoff exists:** uploads are browser-direct to Appwrite Storage. A soft-navigation sign-in keeps the provider's `session` prop `null`, so `storage.createFile` would go out as a guest and fail the label-gated bucket `create` with `Missing "create" permission`. See `../file-storage-architecture.md` §2.
3. Error mapping from `AppwriteException`: 401 / `user_invalid_credentials` / `user_not_found` → "Invalid email or password."; 429 / `*rate_limit*` → "Too many attempts. Please try again later."

**Post-login routing** (`postLoginPath`, decided only after Appwrite issues the session, from the role the server read — tamper-proof): not onboarded → `/onboarding`; ADMIN → `/admin/dashboard`; BRAND → `/dashboard`.

---

## Sign Up — `SignUpForm` (two stages)

**Stage 1:** email + password (controlled, live strength meter: `<6` weak, `<10` good, `≥10` strong) → `registerUser(formData)`. Success → Stage 2.

**Stage 2 — "Check your inbox":** heading + spam hint (`Gmail SMTP delivers land in spam frequently — no SPF/DKIM on the sending account`) + **Resend** button (`resendVerificationEmail`, states idle/sending/sent) + "Back to Sign In".

**No auto sign-in after signup:** verification is link-based; after clicking the email link the user signs in manually. The password lives in component state only during Stage 1 and is never reused.

---

## Forgot / Reset password

- `ForgotPasswordForm` → `requestPasswordReset(email)`: **always returns `{ success: true }`** (no enumeration; failures logged server-side) → form swaps to "Check your inbox" regardless.
- `/auth/reset-password?userId&secret` → `ResetPasswordForm`: ≥8 chars, `updateRecovery` on the public client (Appwrite enforces 1-hr expiry). Missing params show the invalid/expired message up-front. Success → "Your password has been updated." + Sign In link.

## Email verify — `/auth/verify`

Fully server-side page: `new Account(createPublicClient()).updateVerification({ userId, secret })` with invalid/missing/expired → "Verification link is invalid or expired." Appwrite appends `userId` + `secret` to the click URL (the `url` passed to `createVerification`). **No session is created** — the user signs in manually afterward.

---

## Server actions (`src/app/actions/auth.ts`)

| Action | Auth | Behavior |
|---|---|---|
| `registerUser` | public, rate-limited 10/h/IP | Normalize email + password ≥ 8. Existing **verified** user → throw "Email already registered" (takeover guard). Existing **unverified** → `updatePassword` + re-send. New → `Users.create` + `users` row (`role: "BRAND"`, `usageLimits: 10`, `onboarded: false`, `status: "ACTIVE"`) + `updateLabels(["BRAND"])` + verification email. Email-send failure → recoverable throw ("Account created, but we couldn't send the verification email. Please try submitting again…") |
| `resendVerificationEmail` | public, rate-limited 5/h/email + 10/h/IP | Re-send for unverified users; missing/verified → `{ success: false, status: "invalid" }` (no enumeration) |
| `requestPasswordReset` | public, rate-limited 3/h/email + 10/h/IP | `createRecovery` on the **public client**; always returns success |
| `resetPassword` | public | ≥ 8 chars; `updateRecovery` on the public client; any failure → "Reset link is invalid or expired" |
| `completeOnboarding` | `requirePrincipal` | Sets name/category/platform/catalogSize + `onboarded: true` + `updateLabels([role])`; revalidates 5 paths. No session refresh needed — Appwrite re-reads the `users` row per request |
| `getSessionPrincipal` | session | `{ onboarded, role, sessionSecret } \| null` — used by `SignInForm` for routing + client SDK hydration (see Sign In) |
| `logout` | session | `Account.deleteSession("current")` + cookie delete + redirect `/`. All logout buttons are `<form action={logout}>` |

Private helpers in the same file: `normalizeEmail`, `optionalText`, `appUrl` (`NEXT_PUBLIC_APP_URL` fallback localhost), `lookupUserByEmail` (admin client), `sendVerificationEmail` — mints a session (`Users.createSession`), `createVerification({ url })`, deletes the session in `finally`. **`createVerification` has no admin/API-key path — it requires a session**, hence the mint-delete dance.

---

## Appwrite session plumbing

- **Session cookie:** `appwrite-session-<projectId>` (`appwrite-session-6a8562a20037b62075e1`) — the `@appwrite.io/react` default, **not** the raw-SDK `a_session_` convention. httpOnly, secure, sameSite=lax.
- **SSR handler** (`src/app/api/appwrite/[...appwrite]/route.ts`): `createAppwriteHandlers` — sign-in/sign-up/sign-out/OAuth routes, writes the cookie, redirects `/dashboard` or `/auth` (the app overrides the redirect client-side).
- **Provider** (`src/app/providers.tsx`): `<AppwriteProvider ssr={{ session, basePath: "/api/appwrite" }}>`; `session` is read server-side in the root layout via `createNextServerHelpers().readSessionCookie()` so the client doesn't flash logged-out during hydration.
- **Client factories** (`src/server/appwrite.ts`):
  - `createAdminClient()` — cached singleton + API key.
  - `createSessionClient(secret)` — for `logout`, `sendVerificationEmail`.
  - `createPublicClient()` — bare client for `createRecovery` / `updateRecovery` / `updateVerification`. **Never attach the API key to this client** — the `applications` role lacks the `public` scope and those calls fail with `missing scope (public)`.
- **Edge constraint:** `proxy.ts` may only import from `src/lib/appwrite-config.ts` (constants, zero SDK imports) — importing `node-appwrite` would pull a server-only module into the edge runtime.

---

## Email delivery

Email is sent entirely by **Appwrite Cloud** (Gmail SMTP provider configured in the console, sender "Peka.ar") using the built-in verification/recovery templates. The click URL is passed per-call (`createVerification({ url })` / `createRecovery({ url })`); Appwrite appends `userId` + `secret`. No app code sends email.

---

## Security properties

- **No user enumeration** — `resendVerificationEmail` and `requestPasswordReset` return uniform responses; `registerUser` reveals "Email already registered" only for verified accounts.
- **Secrets + passwords** — verification/recovery secrets and password hashing are entirely Appwrite-side; the app never stores them.
- **Canonical principal** — every protected action resolves identity from the DB via `requirePrincipal` (Appwrite session → `users` TableDB row). Never trust `user.id`/`role` directly.
- **DB-backed role enforcement on admin pages** — the edge proxy cannot gate `/admin/*` on role; the ONLY gate is `requirePrincipalOrRedirect({ roles: [Role.ADMIN] })` on every admin page (rejects non-admins including demoted users with valid sessions).
- **Stale session self-healing** — valid session but no `users` row → `StaleSessionError` → redirect `/auth` (Appwrite expires the cookie itself); API routes return 401.
- **Suspended accounts** — Appwrite allows login, so `requirePrincipal` checks `users.status` per-request and blocks every protected page/action/route.
- **No session auto-creation on verify/reset** — `updateVerification`/`updateRecovery` return no session token.
