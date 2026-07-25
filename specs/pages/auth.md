# `/auth` — Authentication flows (deep dive)

> Parent: [`../WEBSITE.md`](../WEBSITE.md) · Source: `src/app/auth/page.tsx:1`, `src/app/auth/verify/page.tsx:1`, `src/app/auth/reset-password/page.tsx:1` + components in `src/components/auth/`

STUDIO.V uses **NextAuth v5 beta** (`next-auth@5.0.0-beta.31`) with the **Credentials** provider and a **JWT** session strategy. Email verification is a 6-digit OTP (hashed, 10-min expiry); password reset is a UUID magic link (1-hr expiry). This deep dive covers the three `/auth*` routes, the OTP/magic-link flows, the JWT callback contract, and the preflight + no-enumeration patterns.

---

## Routes overview

| Route | File | Auth | Purpose |
|---|---|---|---|
| `/auth` | `src/app/auth/page.tsx:1` → `AuthClient.tsx` | Public (redirects logged-in-not-onboarded → `/onboarding`) | 3-view form: signin / signup / forgot-password |
| `/auth/verify` | `src/app/auth/verify/page.tsx:1` | Public | Magic-link email verify (`?token=…` → `verifyEmail`) |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx:1` | Public | New-password form (`?token=…` → `resetPassword`) |

The proxy (`src/proxy.ts:16`) whitelists `/auth/*` as public **and** redirects logged-in+onboarded users away from `/auth` to `/dashboard` (`proxy.ts:23`).

---

## 1. `/auth` — entry page

### Server entry (`src/app/auth/page.tsx:1`)
```tsx
export default async function AuthPage() {
  const session = await auth();
  const user = session?.user as { onboarded?: boolean } | undefined;
  if (user && !user.onboarded) redirect("/onboarding");
  return <AuthClient />;
}
```
Two redirect layers protect this route:
- Server (`page.tsx:9`): logged-in + **not onboarded** → `/onboarding` (catches the signup→OTP→verified-but-not-onboarded case).
- Proxy (`proxy.ts:23`): logged-in + **onboarded** → `/dashboard` (catches re-visits to login).

### `AuthClient.tsx` (`src/app/auth/AuthClient.tsx:1`) — client
A two-column layout. Left half (lg+): dark `#1A1A1A` panel with the first demo product image (`PRODUCTS[0].thumbnail`) at 50% opacity, a gradient scrim, the STUDIO.V logo, and the "Elevate your catalog with stereoscopic realism." editorial copy. Right half: white panel with "Back to Home" `LinkButton`s (mobile + desktop variants) and a centered `max-w-md` container that swaps between the three forms based on local `view` state.

**State:** `type AuthView = 'signin' | 'signup' | 'forgot-password'` — `useState<AuthView>('signin')`. Navigation between views is via `onNavigate={(v) => setView(v as AuthView)}` passed to each form. `SignUpForm`'s `onSuccess` swaps back to `'signin'`.

```tsx
{view === 'signin' && <SignInForm onNavigate={(v) => setView(v as AuthView)} />}
{view === 'signup' && <SignUpForm onNavigate={(v) => setView(v as AuthView)} onSuccess={handleSignUpSuccess} />}
{view === 'forgot-password' && <ForgotPasswordForm onNavigate={(v) => setView(v as AuthView)} />}
```

---

## 2. Sign In — `SignInForm` (`src/components/auth/SignInForm.tsx:1`)

**Props:** `{ onNavigate: (view: string) => void }`.

**Flow (`handleSubmit`, line 36):**
1. Reads `email` + `password` from the form.
2. Calls `preflightLogin(email, password)` server action.
3. If `preflight.status !== "valid"` → shows "Invalid email or password." and returns (no session created).
4. On valid → `finishSignIn(email, password, preflight.onboarded, preflight.role)`:
   - `signIn("credentials", { email, password, redirect: false })` (NextAuth client).
   - If `result?.error` → throws "Sign-in failed. Please try again."
   - `router.push(postLoginPath(onboarded, role))` + `router.refresh()`.

**Post-login routing (`postLoginPath`, line 22):**
- If not onboarded → `/onboarding` (both roles).
- If onboarded and `role === "ADMIN"` → `/admin/dashboard`.
- If onboarded and `role === "BRAND"` → `/dashboard`.

The redirect target is decided **after** NextAuth issues the JWT and only using the role the server already validated in `preflightLogin` (read from the DB row, never from client input). Tampering with the request cannot influence the redirect.

**Why preflight?** `preflightLogin` (`auth.ts:51`) validates credentials **without** creating a session, returning `{ status, onboarded, role }`. This lets the client decide the redirect destination *before* the NextAuth callback runs (which would otherwise always send to a default page). It also gives a uniform "invalid credentials" error regardless of whether the user is missing, unverified, or has a wrong password (no enumeration). The `role` field is sourced from the user row (closed Prisma enum `BRAND | ADMIN`); no client input flows into the response.

**UI:** Email + password `Input`s with `Mail`/`Lock` left icons, a "Forgot?" button (`onNavigate('forgot-password')`), an error `Alert`, a full-width primary "Sign In" `Button` (loading spinner), and a "Request Access" link to swap to signup.

---

## 3. Sign Up — `SignUpForm` (`src/components/auth/SignUpForm.tsx:1`)

**Props:** `{ onNavigate, onSuccess }`. Two-stage component gated by `submittedEmail` state.

### Stage 1 — registration form (`:117`)
- Email + password `Input`s. Password is controlled (`useState`) to drive the live strength meter.
- **Password strength meter** (`:26`): 0 = empty, 1 = `<6` (Weak, amber), 2 = `<10` (Good, amber), 3 = `≥10` (Strong, emerald). 3-bar visual + mono label.
- Calls `registerUser(new FormData(form))` (`auth.ts:97`) on submit.
- On success → `setSubmittedEmail(email)` → swaps to Stage 2.
- Errors surface in an `Alert` ("Email and password are required", "Password must be at least 6 characters", "Email already registered").
- Links to `/terms` + `/privacy` (open in new tab). "Sign In" link swaps to signin.

### Stage 2 — OTP verification (`:81`)
- Centered card with a checkmark, "Enter your code" heading, "We sent a 6-digit verification code to {email}."
- `<OtpInput value={otp} onChange={setOtp} id="signup-otp" />` (6 boxes, auto-advance, paste-to-fill).
- Calls `verifyEmailOtp(submittedEmail, otp)` (`auth.ts:205`) → on success immediately `signIn("credentials", { email: submittedEmail, password, redirect: false })`.
- If `signIn` errors → "Email verified, but automatic sign-in failed. Please sign in manually." (verification still succeeded).
- On full success → `onSuccess()` (swaps AuthClient to signin view) + `router.push("/onboarding")` + `router.refresh()`.
- "Back to Sign In" link (`onNavigate('signin')`).

---

## 4. Forgot Password — `ForgotPasswordForm` (`src/components/auth/ForgotPasswordForm.tsx:1`)

**Props:** `{ onNavigate }`. Single email field; calls `requestPasswordReset(email)` (`auth.ts:159`) on submit. Always returns `{ success: true }` (the action returns success even if no user exists — no enumeration), so the form swaps to a "Check your inbox" confirmation state regardless. Includes a "Back" link to signin.

---

## 5. Reset Password — `/auth/reset-password` + `ResetPasswordForm`

### Server entry (`src/app/auth/reset-password/page.tsx:1`)
Reads `token` from `searchParams` and passes it to the client: `<ResetPasswordForm token={token} />`. (If `token` is missing, the form shows an error up-front.)

### `ResetPasswordForm` (`src/components/auth/ResetPasswordForm.tsx:1`) — client
**Props:** `{ token: string }`. New-password form inside a `Card` → `CardBody`. Calls `resetPassword(token, password)` (`auth.ts:182`) on submit. Enforces password ≥ 6 chars (server side too). On success → success state with a "Sign In" link to `/auth`. Errors: "Password must be at least 6 characters", "Reset link is invalid or expired".

---

## 6. Magic-link verify — `/auth/verify`

### Server entry (`src/app/auth/verify/page.tsx:1`) — fully server-side, no client component
```tsx
export default async function VerifyEmailPage({ searchParams }) {
  const { token } = await searchParams;
  let error = null;
  if (!token) error = "Verification token is missing.";
  else try { await verifyEmail(token); } catch (err) { error = err.message ?? "Verification failed."; }
  return (/* centered card: "Email verified" or "Unable to verify" + Sign In link */);
}
```
Calls `verifyEmail(token)` (`auth.ts:140`) directly during render. If the `email_verification` token is missing/expired, the action throws "Verification link is invalid or expired", which becomes the error message. On success the user is verified and the token is deleted; the page shows a success card linking to `/auth`.

> **Two verification paths exist:** the OTP path (primary, used by `SignUpForm` Stage 2) and the magic-link path (`/auth/verify`). Both mark `emailVerified` and delete their tokens. The OTP path is wired into the signup flow; the magic-link path is a fallback — currently no UI sends `email_verification` UUID tokens (only `email_verification_otp`), so `/auth/verify` is reached only if you manually construct the link. Keep it for email-client deep-link fallback.

---

## 7. `OtpInput` (`src/components/auth/OtpInput.tsx:1`)

**Props:** `{ value: string; onChange: (value: string) => void; id?: string }` (default `id="otp"`). Six single-character `<input>` boxes:
- Auto-advance on entry; backspace navigates back; paste fills left-to-right (sanitized to digits, capped at 6).
- Each box has `aria-label` of the form "Digit N of 6".
- Controlled via `value`/`onChange` — the parent owns the concatenated string.

---

## 8. Server action reference (auth)

All in `src/app/actions/auth.ts:1` (`"use server"`). Public unless noted.

| Export | Signature | Auth | Behavior |
|---|---|---|---|
| `preflightLogin` | `(email, password) → { status: "invalid_credentials" } \| { status: "valid"; onboarded: boolean; role: Role }` | None | Normalizes email; returns `invalid_credentials` if user missing / unverified / wrong password. No session created. `role` is sourced from the DB row and used by `SignInForm` to pick the post-login redirect (`/admin/dashboard` for ADMIN, `/dashboard` for BRAND). |
| `resendVerificationOtp` | `(email) → { success; status: "invalid"\|"sent" }` | None | Returns `{ success: false, status: "invalid" }` if user missing or already verified (no enumeration). Otherwise deletes old tokens, issues new 6-digit OTP (10-min, hashed), emails it. |
| `registerUser` | `(formData) → { email; verificationRequired: true }` | None | Normalizes email, requires password ≥ 6. If unverified user exists → re-hash password + re-issue OTP. Else create BRAND user (`usageLimits: 10`). Always issues OTP via `issueVerificationOtp`. Throws on validation. |
| `verifyEmail` | `(token) → { success: true }` | None | Looks up `email_verification` UUID token (unexpired); throws "Verification link is invalid or expired". Marks `emailVerified`, deletes token. |
| `requestPasswordReset` | `(email) → { success: true }` | None | **Always returns success** (no enumeration). If user exists, creates `password_reset` UUID (1-hr expiry), emails link. |
| `resetPassword` | `(token, password) → { success: true }` | None | Requires password ≥ 6. Validates `password_reset` token (throws "Reset link is invalid or expired"). Updates `hashedPassword`, deletes token. |
| `verifyEmailOtp` | `(email, otp) → { success: true }` | None | Requires 6-digit OTP. Loads all unexpired `email_verification_otp` tokens for the email (oldest-first via `orderBy: createdAt desc`), compares each with `verifyPassword`. On match: marks `emailVerified`, deletes all OTP tokens. Throws "Verification code is invalid or expired" if none match. |
| `completeOnboarding` | `(input) → { success: true }` | `requirePrincipal()` | Sets `name`/`productCategory`/`storefrontPlatform`/`catalogSize` + `onboarded: true`. Calls `unstable_update({ user: { onboarded: true } })` to refresh the JWT. Revalidates `/auth`, `/onboarding`, `/dashboard`, `/tasks`, `/integrations`. |
| `logout` | `() => Promise<void>` | (signOut) | `signOut({ redirectTo: "/" })` |

### Helpers (private, same file)
- `normalizeEmail(email)` — trim + lowercase.
- `generateOtp()` — `crypto.getRandomValues(Uint32Array(1))[0]` padded to 10 digits, sliced to 6.
- `issueVerificationOtp(email)` — deletes any existing `email_verification`/`email_verification_otp` tokens, hashes the OTP with `hashPassword` (bcrypt 12 rounds), stores with 10-min expiry, then calls `sendVerificationOtpEmail`. **The Resend send is wrapped in try/catch** — on email failure, the user record (already in the DB at this point) is left untouched and a clear error is thrown ("Account created, but we couldn't send the verification email. Please use the resend code option to try again.") which the form's `<Alert>` surfaces to the user. The throw is recoverable: re-submitting signup hits the "existing unverified user" branch and re-issues the OTP, or the user clicks the existing resend-code button.
- `optionalText(value)` — trim or `null`.

---

## 9. Token model

`prisma/schema.prisma:61`:
```prisma
model Token {
  id         String   @id @default(cuid())
  identifier String           // email address
  token      String   @unique // hashed OTP, or UUID for magic links
  type       String           // "email_verification" | "email_verification_otp" | "password_reset"
  expires    DateTime
  createdAt  DateTime @default(now())
}
```
**Three token types:**
- `email_verification` — UUID magic link (1-hr expiry). Consumed by `verifyEmail` (`/auth/verify`). Currently no UI issues this type (the OTP path is primary).
- `email_verification_otp` — 6-digit OTP, **hashed with bcrypt** (never stored plaintext), 10-min expiry. Consumed by `verifyEmailOtp` (signup Stage 2). Multiple can exist briefly; `verifyEmailOtp` deletes all on success.
- `password_reset` — UUID (1-hr expiry). Consumed by `resetPassword` (`/auth/reset-password`).

---

## 10. NextAuth configuration

### `src/auth.ts:1` — full instance
```ts
export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [CredentialsProvider({
    name: "Credentials",
    credentials: { email: {...}, password: {...} },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const user = await prisma.user.findUnique({ where: { email: credentials.email as string } });
      if (!user || !user.hashedPassword || !user.emailVerified) return null;
      const isValid = await verifyPassword(credentials.password as string, user.hashedPassword);
      if (!isValid) return null;
      return { id: user.id, email: user.email, name: user.name ?? user.email, role: user.role, onboarded: user.onboarded };
    }
  })]
});
```
- **JWT strategy** — no database sessions; the JWT carries `sub`, `role`, `onboarded`.
- **`authorize`** requires: user exists, has `hashedPassword`, is `emailVerified`, and the password verifies. Returns the user object that the JWT callback reads.
- **`unstable_update`** is exported — used by `completeOnboarding` to refresh the JWT's `onboarded` claim without a re-login. (This is the v5-beta API; if it's removed, fall back to a `SessionProvider` — see `auth-stabilization.md` risk table.)

### `src/auth.config.ts:1` — Edge-compatible callbacks
```ts
export const authConfig = {
  pages: { signIn: "/auth" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) { token.sub = user.id; token.role = user.role; token.id = user.id; token.onboarded = user.onboarded; }
      if (trigger === "update" && typeof session?.user?.onboarded === "boolean") token.onboarded = session.user.onboarded;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) { session.user.id = token.sub; session.user.role = token.role; session.user.onboarded = token.onboarded; }
      return session;
    }
  },
  providers: [], // Edge-compatible — full provider in auth.ts
} satisfies NextAuthConfig;
```
- **`jwt` callback:** on first sign-in (`user` is present) it stamps `sub`/`role`/`id`/`onboarded` onto the token. On the `"update"` trigger (from `unstable_update`) it reads `session.user.onboarded` and refreshes the token.
- **`session` callback:** surfaces `token.sub`/`role`/`onboarded` onto `session.user.{id,role,onboarded}` for server reads via `auth()`.
- This split config (Edge-safe `authConfig` + full `auth.ts`) lets the middleware (`proxy.ts`) import only the Edge-safe part.

---

## 11. Email — `src/lib/emails.ts:1`

Built on Resend via `getResend()` (`src/lib/resend.ts:1`). `sendEmail` **no-ops with a console warning** if `RESEND_API_KEY` is unset — so dev environments without Resend still work (verification tokens still get created and stored; the OTP just isn't emailed).

| Function | Subject | Body | Expiry |
|---|---|---|---|
| `sendVerificationOtpEmail(email, otp)` | "Your STUDIO.V verification code" | Large 24px bold letter-spaced OTP + "expires in 10 minutes" | 10 min (token-side) |
| `sendPasswordResetEmail(email, token)` | "Reset your STUDIO.V password" | `<a href="{APP_URL}/auth/reset-password?token={token}">Reset password</a>` + "expires in 1 hour" | 1 hr (token-side) |

`fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"` (the Resend sandbox sender works in dev). `appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"`.

---

## 12. Security properties

- **No user enumeration** — `preflightLogin`, `resendVerificationOtp`, `requestPasswordReset` all return uniform responses for missing/verified/unverified users. (The `auth-stabilization.md` Task 11 tracks normalizing `preflightLogin`/`resendVerificationOtp` fully.)
- **OTP hashing** — OTPs are bcrypt-hashed (`hashPassword`, 12 rounds) before storage; `verifyEmailOtp` uses `verifyPassword` to compare. Plaintext OTPs exist only in the email.
- **Password hashing** — all passwords via `hashPassword`/`verifyPassword` (`src/lib/password.ts:1`, bcrypt 12 rounds).
- **Token expiry** — OTP 10 min, password reset 1 hr, magic-link verify 1 hr. Expired tokens fail the `expires: { gt: new Date() }` filter.
- **Email-verified gate** — `authorize` returns `null` if `!user.emailVerified`, so unverified users cannot obtain a JWT.
- **Canonical principal** — every protected action resolves the user from the DB via `requirePrincipal` (`src/lib/auth-guards.ts:40`), which falls back to email lookup if the JWT id doesn't match a row (handles the v5-beta JWT id-mismatch bug). Never trust `session.user.id`/`role` directly for authorization.
- **DB-backed role enforcement on admin pages** — the proxy (`src/proxy.ts:14`) gates `/admin/*` on the JWT-claim role (Edge runtime cannot talk to Prisma). As defense in depth, every page under `/admin/*` also calls `requirePrincipalOrRedirect({ roles: [Role.ADMIN] })`, which re-fetches the user from the DB and rejects any non-admin (including stolen or tampered JWTs whose DB role doesn't match). A demoted admin's valid JWT is rejected at the page boundary. See `WEBSITE.md` §6.4 (admin page list).
- **Role-aware redirects** — the proxy's `/auth → home` re-visit redirect, the proxy's role-mismatch fallback, and `requirePrincipalOrRedirect`'s `ForbiddenError` fallback all branch on the user's role: ADMIN → `/admin/dashboard`, BRAND → `/dashboard`. An admin never lands on `/dashboard` by accident, and a BRAND never lands on `/admin/dashboard`.
- **Stale session self-healing** — if a user has a valid JWT but the DB record is gone (e.g., DB reset, user deleted), `requirePrincipal` throws `StaleSessionError` (extends `UnauthenticatedError`). Pages use `requirePrincipalOrRedirect()` (`auth-guards.ts:79`) which redirects to `/api/auth/clear-session` — a route handler that calls `signOut({ redirect: false })` (route handlers can modify cookies, unlike server components), then redirects to `/auth`. API routes catch `StaleSessionError` via their existing `UnauthenticatedError` handler and return 401.

---

## File & line index

| Element | Location |
|---|---|
| `/auth` server entry | `src/app/auth/page.tsx:1` |
| `AuthClient` (3-view switch) | `src/app/auth/AuthClient.tsx:1` |
| `/auth/verify` server entry | `src/app/auth/verify/page.tsx:1` |
| `/auth/reset-password` server entry | `src/app/auth/reset-password/page.tsx:1` |
| `SignInForm` | `src/components/auth/SignInForm.tsx:1` |
| `SignUpForm` | `src/components/auth/SignUpForm.tsx:1` |
| `ForgotPasswordForm` | `src/components/auth/ForgotPasswordForm.tsx:1` |
| `ResetPasswordForm` | `src/components/auth/ResetPasswordForm.tsx:1` |
| `OtpInput` | `src/components/auth/OtpInput.tsx:1` |
| Auth server actions | `src/app/actions/auth.ts:1` |
| `preflightLogin` | `auth.ts:66` |
| `resendVerificationOtp` | `auth.ts:82` |
| `registerUser` | `auth.ts:97` |
| `verifyEmail` (magic link) | `auth.ts:140` |
| `requestPasswordReset` | `auth.ts:159` |
| `resetPassword` | `auth.ts:182` |
| `verifyEmailOtp` | `auth.ts:205` |
| `completeOnboarding` | `auth.ts:240` |
| `logout` | `auth.ts:271` |
| NextAuth instance | `src/auth.ts:1` |
| Edge callbacks | `src/auth.config.ts:1` |
| Middleware (proxy) | `src/proxy.ts:1` |
| `requirePrincipal` | `src/lib/auth-guards.ts:40` |
| `requirePrincipalOrRedirect` | `src/lib/auth-guards.ts:79` |
| `StaleSessionError` | `src/lib/auth-guards.ts:21` |
| `hashPassword`/`verifyPassword` | `src/lib/password.ts:1` |
| `sendVerificationOtpEmail`/`sendPasswordResetEmail` | `src/lib/emails.ts:1` |
| `getResend` | `src/lib/resend.ts:1` |
| `Token` model | `prisma/schema.prisma:61` |
| `User` model | `prisma/schema.prisma:10` |
