# tORP v0.3 — Auth, onboarding, Supabase profiles, WorkOS, Stripe

This document summarizes the production-oriented scaffolding added for WorkOS authentication, Supabase-backed profiles (with service-role API access), onboarding, profile photos, and Stripe subscription checkout/webhooks.

## What was built

- **WorkOS AuthKit (Next.js)** — `@workos-inc/authkit-nextjs` with `/callback`, optional `authkitProxy` middleware when env is complete, and `/api/auth/workos/signin` + `/signup` redirects. Sign-out: `/sign-out`.
- **Supabase `torp_profiles`** — One row per WorkOS user (`workos_user_id`), storing account fields, membership tier/status, Stripe IDs, onboarding flag, `metadata` JSON for extended profile fields, and timestamps.
- **Server-only access** — RLS on `torp_profiles` denies `anon` and `authenticated` JWT roles; the app reads/writes profiles through Route Handlers using `SUPABASE_SERVICE_ROLE_KEY`.
- **API routes** — `GET /api/me`, `PATCH /api/me/profile`, `POST /api/me/avatar`, `POST /api/me/onboarding/complete`, `GET|PUT /api/me/saved-orgs`, `GET /api/auth/status`, `POST /api/billing/checkout`, `POST /api/billing/webhook`.
- **Onboarding** — `/onboarding` (WorkOS session required): profile basics + membership tier selection; free path always works; paid path uses Stripe Checkout when configured.
- **Client profile hook** — `useProfileData` detects a WorkOS session via `/api/me` and uses the APIs above; demo/local mode remains when WorkOS is not configured.
- **UI** — Account card no longer shows internal user IDs; sign-in modal offers WorkOS links when configured and a clear “not connected” state otherwise.

## Database / migrations

Apply in Supabase SQL editor (or CLI):

- `web/supabase/torp_v03_profiles.sql` — creates `torp_profiles`, RLS deny policies, and `profile-photos` storage bucket + public read policy.

## Storage

- **Bucket:** `profile-photos` (public read). **Writes** are performed with the service role from `POST /api/me/avatar` (bypasses RLS). Max size 5MB; types jpeg/png/webp/gif.

## RLS

- `torp_profiles`: all operations denied for `anon` and `authenticated` so browser anon keys cannot read/write this table directly. Use server routes with the service role.

## Environment variables

See `web/.env.local.example` for the full list. Minimum for **local demo-only** (no WorkOS): existing `NEXT_PUBLIC_SUPABASE_*` as today.

**WorkOS live:**

- `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` (≥32 chars), `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (e.g. `http://localhost:3001/callback`)

**Profiles / API:**

- `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose to the client)

**Stripe live:**

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SUPPORT_MONTHLY`, `STRIPE_PRICE_MEMBER_MONTHLY`, `STRIPE_PRICE_SPONSOR_MONTHLY`
- Optional: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for future client-side Elements

**App URL:**

- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3001`) for Stripe return URLs and similar

## Functional vs placeholder

| Area | Without credentials | With credentials |
|------|---------------------|------------------|
| WorkOS sign-in | Modal shows “not connected”; local demo auth still works | Redirect to AuthKit; session cookie; `/api/me` populated |
| Profile cloud sync | WorkOS flows 503 on PATCH without service role | Rows in `torp_profiles` |
| Avatar upload | 503 without service role + bucket | Upload + `profile_photo_url` |
| Stripe checkout | 503 or inline message on onboarding | Redirect to Checkout |
| Webhook | 503 without secret | Updates tier/status + Stripe IDs |

## How to test (localhost:3001)

1. `pnpm dev` in `web` (already binds to `localhost:3001`).
2. **Demo:** Sign in with local demo credentials; profile still syncs to `top_app_user_profiles` if that table exists and anon RLS allows (legacy behavior).
3. **WorkOS:** Configure dashboard redirect `http://localhost:3001/callback`, set env vars, restart dev server, use **Sign in** / **Create account** / **Continue with Google** in the auth modal (all use AuthKit; Google appears if enabled in WorkOS).
4. **Onboarding:** After first WorkOS login, app redirects to `/onboarding` until `onboarding_completed` is true.
5. **Profile edit:** With WorkOS + service role, edits call `PATCH /api/me/profile`; image upload uses `POST /api/me/avatar`.
6. **Stripe:** Point Stripe CLI webhook to `/api/billing/webhook` with your signing secret; complete a test checkout and confirm `torp_profiles` updates.

## Rollback

A git checkpoint exists before this work: commit message **“checkpoint: pre tORP v0.3 auth, onboarding, WorkOS, Stripe scaffolding”**. Revert or reset to that commit to undo the integration layer.

## Follow-ups (not in this pass)

- Tighten RLS on `top_app_saved_org_eins` and migrate favorites fully off permissive anon policies.
- Customer portal / cancel flows (`stripe.billingPortal.sessions.create`).
- Optional: Supabase custom JWT or Edge sync to allow user-scoped RLS without service role on every request.
