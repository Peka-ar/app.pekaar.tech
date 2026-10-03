# Subscription Architecture

> Parent: [`./WEBSITE.md`](./WEBSITE.md) — subscription tiers, credit renewal, contact requests, and admin deal-setting.

## 1. Tiers

Four tiers defined in `src/lib/plans.ts` (client-safe) with `SubscriptionTier` enum in `src/lib/enums.ts`:

| Tier | Price | Monthly Credits | Override |
|---|---|---|---|
| `FREE` | $0 | 6 | No |
| `PREMIUM` | $25/mo | 50 | No |
| `BUSINESS` | $50/mo | 100 | No |
| `ENTERPRISE` | Custom | Custom | Yes (`monthlyCreditOverride`) |

Tier = credits + label only. No feature gating beyond credits. "Model hosting, CDN, AR" are available to all tiers; marketing features are listed on the marketing site's `/pricing` page (apex, sister repo `Peka-ar/pekaar.tech`).

## 2. Data model additions

### Users table columns (console-managed + `ensure-backend`)

| Column | Type | Purpose |
|---|---|---|
| `subscriptionTier` | string(20) | `FREE`/`PREMIUM`/`BUSINESS`/`ENTERPRISE` (null → FREE) |
| `creditsRenewedAt` | datetime | ISO timestamp of last credit grant; rolling 30-day window |
| `monthlyCreditOverride` | integer | Custom monthly credit grant (ENTERPRISE only; null = use tier default) |

### New table: `contact_requests` (provisioned by `ensure-backend`)

| Column | Type | Purpose |
|---|---|---|
| `name` | string(120) | Submitter name |
| `email` | string(320) | Submitter email |
| `company` | string(160) | Company (optional) |
| `message` | string(2000) | Message body |
| `interestedTier` | string(20) | Requested tier |
| `status` | string(20) | `NEW`/`CONTACTED`/`RESOLVED` |
| `sourceIp` | string(64) | IP for abuse tracing (nullable) |

## 3. Credit renewal

**Rolling 30-day window** via `renewMonthlyCredits()` in `subscription.service.ts`, called from `runMaintenance()` (nightly cron). Steps:

1. List all BRAND ACTIVE users.
2. For each: if `creditsRenewedAt` is null → set to now (grace; no credit change).
3. Else if 30 days elapsed → set `usageLimits = monthlyCreditOverride ?? TIER_CREDITS[tier]`, `creditsRenewedAt = now`.
4. Skips ADMIN users.

**Admin context**: `renewMonthlyCredits` does NOT call `requirePrincipal()` — it's called from `runMaintenance` which is authenticated via Bearer token in the cron route handler.

## 4. New user signup

`registerUser` in `src/app/actions/auth.ts` sets:
- `usageLimits: 6`
- `subscriptionTier: "FREE"`
- `creditsRenewedAt: now`

## 5. Admin deal-setting

`adminSetUserTier(userId, tier, monthlyCreditOverride?)` — one enum-validated path:
- ADMIN guard + self-guard
- Sets `subscriptionTier`, `monthlyCreditOverride`, `creditsRenewedAt: now`, `usageLimits: override ?? TIER_CREDITS[tier]`

The free-text `subscriptionTier` field was **removed** from `adminUpdateUser` (single validated path).

## 6. Contact flow

Two intake paths; both end as `contact_requests` rows.

**Billing plan request (primary):** authenticated `submitPlanRequest` server action, used by the `SubscriptionRequestModal` popup on `/billing` (per-plan-card and upgrade-CTA "Contact us" buttons):
- `requirePrincipal()` — logged-in only (the `/billing` route is already proxy + `requirePrincipalOrRedirect` gated; the action re-checks)
- Rate limit: 5/h per userId (`enforceRateLimit`)
- Zod validation (`contactRequestSchema`); `company` is injected server-side from `principal.companyName` — never client-supplied
- Persists to `contact_requests` (status `NEW`), `sourceIp` null

**General queries:** the marketing site's `/contact` page (apex) displays `kaizen3242@gmail.com` (mailto link + copy button). No form, no table write — this app only receives structured `contact_requests` (billing plan requests, managed at `/admin/requests`).

Admin inbox: `/admin/requests` — list, status transitions (NEW→CONTACTED→RESOLVED), delete.

## 7. Pages

| Route | Auth | Purpose |
|---|---|---|
| `/billing` | BRAND/ADMIN | Current plan card, credits remaining, plan comparison with per-plan Contact us → plan-request popup |
| `/admin/requests` | ADMIN | Contact request inbox with status management |

## 8. Server actions

| Action | Auth | Purpose |
|---|---|---|
| `submitPlanRequest` | Session | Billing plan-request popup → `contact_requests` row (company auto-attached from principal) |
| `getSubscriptionOverview` | Session | Billing page data: tier, credits, renewal date |
| `adminSetUserTier` | ADMIN | Set user's tier + credits + renewal date |
| `adminListContactRequests` | ADMIN | List contact requests (optional status filter) |
| `adminUpdateContactRequest` | ADMIN | Update request status |
| `adminDeleteContactRequest` | ADMIN | Delete request (spam cleanup) |

## 9. Security

- Plan request: session-authenticated + zod + rate limit 5/h/userId + length caps = column sizes + ActionResult-only errors; company injected server-side (client cannot spoof it)
- Tier changes: ADMIN guard + self-edit guard + enum-validated single path
- `/billing`, `/admin/requests`: `requirePrincipalOrRedirect` + proxy cookie gate
- Renewal cron: Bearer `CRON_SECRET` fail-closed, idempotent, skips ADMIN
