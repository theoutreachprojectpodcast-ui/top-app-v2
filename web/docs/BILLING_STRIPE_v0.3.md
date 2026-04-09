# Billing — WorkOS + Supabase + Stripe (tORP v0.3)

This document describes how **persistent accounts** stay tied to **one Supabase profile** and how **Stripe** updates `membership_tier` / `membership_status` without becoming the identity system.

## Identity and continuity

| Concern | Source of truth |
|--------|------------------|
| Who is signing in? | **WorkOS** (`workos_user_id` on the session) |
| App profile, membership, community author | **`torp_profiles`** in Supabase (via service role from trusted API routes) |
| Payment instrument & subscription lifecycle | **Stripe** (Customer + Subscription objects) |

On every successful WorkOS callback (`/callback`), `upsertProfileFromWorkOSUser` runs with `onConflict: workos_user_id`. The same person signing in again **reconnects to the same row** — no duplicate profile by design.

Community posts use `author_profile_id` → `torp_profiles.id`; that UUID is stable across sessions.

## Environment variables (no hardcoded keys or price IDs)

Copy `web/.env.local.example` to `web/.env.local` and set:

| Variable | Required for | Notes |
|----------|----------------|-------|
| `STRIPE_SECRET_KEY` | Checkout, webhooks, portal | `sk_test_…` or `sk_live_…` — **server only** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Future Elements / client hints | Optional today; not exposed to sensitive logic |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | `whsec_…` from Stripe Dashboard or Stripe CLI |
| `STRIPE_PRICE_SUPPORT_MONTHLY` | Support checkout | Price ID `price_…` |
| `STRIPE_PRICE_MEMBER_MONTHLY` | Member checkout | Price ID `price_…` |
| `STRIPE_PRICE_SPONSOR_MONTHLY` | Sponsor checkout | Price ID `price_…` |
| `APP_BASE_URL` | Redirect URLs | e.g. `http://localhost:3000` (falls back to `NEXT_PUBLIC_APP_URL`) |
| `NEXT_PUBLIC_APP_URL` | Public base URL | Same purpose if `APP_BASE_URL` unset |
| `STRIPE_CUSTOMER_PORTAL_RETURN_URL` | After Customer Portal | Full URL; default `${APP_BASE_URL}/profile` |

**Test vs live:** use only test keys with test price IDs, or only live keys with live price IDs. Do not mix.

If Stripe env is incomplete, the app **returns 503** from billing routes and shows copy like “billing not connected” — it does **not** crash.

## API routes

| Route | Role |
|-------|------|
| `POST /api/billing/checkout` | Authenticated user; requires existing `torp_profiles` row; creates Checkout Session in `subscription` mode; metadata includes `workos_user_id`, `torp_profile_id`, `membership_tier`. |
| `POST /api/billing/webhook` | Stripe-signed; updates `stripe_customer_id`, `stripe_subscription_id`, `membership_tier`, `membership_status`. |
| `POST /api/billing/portal` | Authenticated user with `stripe_customer_id`; returns Stripe Customer Portal URL. |

## Webhook events handled

- `checkout.session.completed` — persists `stripe_customer_id`; loads subscription and syncs tier/status.
- `customer.subscription.created` / `updated` — sync tier + status.
- `customer.subscription.deleted` — sets `membership_tier` to `free`, `membership_status` to `canceled`, clears `stripe_subscription_id` (keeps `stripe_customer_id` for portal).
- `invoice.paid` / `invoice.payment_failed` — re-fetch subscription and sync (e.g. `past_due`).

Resolution of the profile row: primary key is **`workos_user_id` in subscription metadata**. Fallback: **`stripe_customer_id`** on `torp_profiles`, or **`torp_profile_id`** in metadata.

## Membership mapping (Supabase)

| Stripe / product state | `membership_tier` | `membership_status` |
|------------------------|-------------------|---------------------|
| Free (no sub) | `free` | `none` |
| Checkout started (client) | chosen tier | `pending` |
| Subscription incomplete | paid tier | `incomplete` |
| Active / trialing | paid tier | `active` |
| Past due / unpaid (still sub) | paid tier | `past_due` |
| Canceled / deleted | `free` | `canceled` |

`POST /api/me/onboarding/complete` **does not overwrite** `active` / `past_due` / `incomplete` with `pending` if webhooks already advanced billing — so “Finish onboarding” after Checkout stays consistent.

## Stripe Dashboard setup

1. **Products** — create Support / Member / Sponsor (monthly recurring).
2. **Prices** — copy each **Price ID** into the matching `STRIPE_PRICE_*` env var.
3. **Webhooks** — endpoint `https://<your-host>/api/billing/webhook`, events listed above.
4. **Customer portal** — enable in Stripe Dashboard (Billing → Customer portal).

## Local testing

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli), run `stripe listen --forward-to localhost:3000/api/billing/webhook`, copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
2. Set all keys and price IDs in `web/.env.local`.
3. Sign in with WorkOS, complete onboarding step 1 (creates/updates profile), choose a paid tier, complete Checkout with test card `4242…`.
4. Confirm `torp_profiles` updated (`membership_tier`, `membership_status`, Stripe IDs).
5. Sign out, sign in again — same `workos_user_id` → same profile row → same community attribution.
6. Profile tab → **Manage billing** opens Customer Portal when `stripe_customer_id` is set.

## Optional SQL

Run `web/supabase/torp_profiles_stripe_customer_idx.sql` to index `stripe_customer_id` for webhook lookups.
