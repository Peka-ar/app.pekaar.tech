# Vercel Deployment Guide

## Prerequisites

All third-party services must be provisioned before deploying:

- **Supabase** — Postgres database (project already exists)
- **UploadThing** — primary file storage (already configured, appId `7r8xhgyw3k`)
- **Google Drive** — backup storage (OAuth 2.0 refresh token for personal account; one-time setup via `scripts/get-gdrive-refresh-token.ts`)
- **Resend** — transactional email
- **Stripe** — billing (optional for initial deploy)

---

## Environment Variables

Set all of the following in Vercel → Project → Settings → Environment Variables.

### Database (Supabase)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Transaction-mode pooler URL (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Session-mode pooler URL (port 5432, no pgbouncer param) |

Both URLs come from Supabase → Project → Settings → Database → Connection string.

### Auth

| Variable | Value |
|---|---|
| `AUTH_SECRET` | Random 32-byte base64 string — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://studiov.vercel.app` |

### UploadThing

| Variable | Value |
|---|---|
| `UPLOADTHING_TOKEN` | From UploadThing dashboard → API Keys |

### Google Drive Backup

> Uses OAuth 2.0 with a refresh token (not a service account — service accounts have zero storage quota for personal accounts). Same env vars in local dev and Vercel.

| Variable | Value |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | From Google Cloud Console → Credentials → OAuth 2.0 Client ID (Desktop app type) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Paired with above |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | From: `npx tsx scripts/get-gdrive-refresh-token.ts` (run locally, one-time) |
| `GDRIVE_BACKUP_FOLDER_ID` | Your Drive folder ID (from the Drive URL — you own it, no sharing needed) |

**One-time setup:**
1. Google Cloud Console → APIs & Services → Library → enable **Google Drive API**.
2. APIs & Services → Credentials → Create Credentials → **OAuth 2.0 Client ID** → Application type: **Desktop app** → Create. Copy Client ID + Secret.
3. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in `.env`.
4. Run `npx tsx scripts/get-gdrive-refresh-token.ts` — opens browser for consent, prints the refresh token.
5. Set `GOOGLE_OAUTH_REFRESH_TOKEN` in `.env`.
6. Set `GDRIVE_BACKUP_FOLDER_ID` to your Drive folder ID (from the folder URL, the string after `/folders/`).

On Vercel, set all 4 vars in Project → Settings → Environment Variables. The refresh token works unattended — no browser needed in production.

### Resend (email)

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | From Resend dashboard → API Keys |
| `RESEND_FROM_EMAIL` | Verified sender address, e.g. `noreply@yourdomain.com` |

### Stripe (billing)

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` from Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` — create a webhook endpoint in Stripe pointing to `https://<your-domain>/api/webhooks/stripe` |
| `STRIPE_PRICE_STARTER` | Price ID for Starter tier |
| `STRIPE_PRICE_GROWTH` | Price ID for Growth tier |
| `STRIPE_PRICE_ENTERPRISE` | Price ID for Enterprise tier |

---

## Database Migration

Vercel does not run `prisma migrate deploy` automatically. Run it manually from your local machine against the production database before or after the first deploy:

```bash
DATABASE_URL="<production-transaction-url>" \
DIRECT_URL="<production-session-url>" \
npx prisma migrate deploy
```

Or add it as a Vercel build command override:

```
npx prisma migrate deploy && next build
```

> Use `DIRECT_URL` (session-mode, port 5432) for migrations — PgBouncer in transaction mode does not support the DDL statements Prisma uses.

---

## Build Configuration

No changes to `next.config.mjs` are needed for Vercel. The remote image pattern `*.ufs.sh` is already configured for UploadThing CDN URLs.

Vercel auto-detects Next.js. Default settings work:

| Setting | Value |
|---|---|
| Framework | Next.js (auto-detected) |
| Build command | `next build` (default) |
| Output directory | `.next` (default) |
| Install command | `npm install` (default) |
| Node version | 20.x or later |

---

## Stripe Webhook

After deploying, register the production webhook in Stripe:

1. Stripe dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://<your-domain>/api/webhooks/stripe`
3. Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Post-Deploy Checklist

- [ ] All env vars set in Vercel
- [ ] `prisma migrate deploy` run against production DB
- [ ] Test file upload (UploadThing) — upload a reference image in the Tasks page
- [ ] Verify GDrive backup — check the Drive folder `studioV Backups` for the uploaded file
- [ ] Test auth flow — sign up, verify email (Resend), sign in
- [ ] Test Stripe checkout (use test mode keys first, then swap to live)
- [ ] Set `NEXT_PUBLIC_APP_URL` to the final production domain (affects Stripe redirect URLs and auth callbacks)

---

## Local vs Production Credential Differences

| Variable | Local dev | Vercel production |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Set | Set |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Set | Set |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Set | Set (same value) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://<your-domain>` |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` | Verified domain address |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
