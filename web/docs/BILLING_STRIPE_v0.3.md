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
| `STRIPE_PRICE_SUPPORT_MONTHLY` | Support ($1.99/mo) checkout | Price ID `price_…` |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro ($5.99/mo) checkout | **Preferred** Pro price ID |
| `STRIPE_PRICE_MEMBER_MONTHLY` | Pro (legacy) | Used only if `STRIPE_PRICE_PRO_MONTHLY` is unset |
| `STRIPE_PRICE_SPONSOR_MONTHLY` | Optional **Sponsor Membership** subscription tier | Recurring; onboarding / profile when configured |
| `STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY` | Podcast one-time tier | Required with the other two for live podcast pay |
| `STRIPE_PRICE_PODCAST_SPONSOR_IMPACT` | Podcast one-time tier | Same |
| `STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL` | Podcast one-time tier | Same |
| `APP_BASE_URL` | Redirect URLs | e.g. `http://localhost:3001` (falls back to `NEXT_PUBLIC_APP_URL`) |
| `NEXT_PUBLIC_APP_URL` | Public base URL | Same purpose if `APP_BASE_URL` unset |
| `STRIPE_CUSTOMER_PORTAL_RETURN_URL` | After Customer Portal | Full URL; default `${APP_BASE_URL}/profile` |

**Test vs live:** use only test keys with test price IDs, or only live keys with live price IDs. Do not mix.

If Stripe env is incomplete, billing routes return **503** with a clear error code — the app does **not** crash.

### Supabase migration

Run `web/supabase/torp_profiles_membership_source.sql` so `membership_source` exists (`manual` | `stripe` | `onboarding`). Webhooks and onboarding set this for provenance; it is not a billing authority.

## API routes

| Route | Role |
|-------|------|
| `POST /api/billing/checkout` | Authenticated user; requires existing `torp_profiles` row; creates Checkout Session in `subscription` mode; metadata includes `workos_user_id`, `torp_profile_id`, `membership_tier`, `checkout_kind: membership_subscription`. Optional JSON body `returnPath` (same-origin path only: must start with `/`, not `//`) — default `/profile`. |
| `POST /api/billing/podcast-sponsor-checkout` | Authenticated; one-time **payment** mode for podcast tiers; metadata ties session to WorkOS user / profile. |
| `POST /api/billing/webhook` | Stripe-signed; updates customer/subscription fields and `membership_source` where applicable; merges podcast sponsor metadata into profile after paid podcast checkout. |
| `POST /api/billing/portal` | Authenticated user with `stripe_customer_id`; returns Stripe Customer Portal URL. |
| `GET /api/billing/capabilities` | Non-secret flags: member recurring, sponsor subscription, full onboarding (all three recurring prices), podcast checkout readiness, missing env key lists. |

## Webhook events handled

- `checkout.session.completed` — persists `stripe_customer_id`; loads subscription and syncs tier/status when subscription mode; for podcast one-time checkouts, merges sponsor metadata on the profile.
- `customer.subscription.created` / `updated` — sync tier + status; set `membership_source` to `stripe` when active.
- `customer.subscription.deleted` — sets `membership_tier` to `free`, `membership_status` to `canceled`, clears `stripe_subscription_id` (keeps `stripe_customer_id` for portal); may set `membership_source` to `manual`.
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

`POST /api/me/onboarding/complete` does not spoof paid Stripe state. **`PATCH /api/me/profile` does not accept client writes to `membership_tier` / `membership_status`** for WorkOS users — those fields come from webhooks and server flows.

## Sponsor flows (unified model)

| Surface | Paid today | Application / review |
|---------|------------|----------------------|
| **Profile / onboarding** | Support, Pro, optional Sponsor Membership subscription (`POST /api/billing/checkout`) | — |
| **Podcast — Sponsor the show** | One-time Stripe Checkout when all `STRIPE_PRICE_PODCAST_SPONSOR_*` are set | Always collects application; payment required when live |
| **Mission partners** | Not a fake checkout — **apply** only (`SponsorPaymentDemo` acknowledges demo until live invoicing) | Stored via sponsor applications API |

Podcast paid checkouts update the **same** `torp_profiles` row (WorkOS identity) and record last tier / session metadata for display on the account card. **Account-level `membership_tier`** for recurring Support/Pro/Sponsor Membership is separate from podcast package SKUs.

## Stripe Dashboard setup

1. **Products** — create Support ($1.99/mo), Pro ($5.99/mo), optional Sponsor Membership recurring; podcast one-time products for three tiers.
2. **Prices** — copy each **Price ID** into the matching `STRIPE_PRICE_*` env var.
3. **Webhooks** — endpoint `https://<your-host>/api/billing/webhook`, events listed above.
4. **Customer portal** — enable in Stripe Dashboard (Billing → Customer portal).

## Local testing

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli), run `stripe listen --forward-to localhost:3001/api/billing/webhook`, copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
2. Set keys and price IDs in `web/.env.local` (including `membership_source` migration in Supabase).
3. Sign in with WorkOS, open **Profile** → Support or Pro checkout (or complete onboarding with Stripe).
4. Confirm `torp_profiles` updated (`membership_tier`, `membership_status`, `membership_source`, Stripe IDs).
5. Sign out, sign in again — same `workos_user_id` → same profile row.
6. Profile → **Manage billing** opens Customer Portal when `stripe_customer_id` is set.

## Optional SQL

- `web/supabase/torp_profiles_stripe_customer_idx.sql` — index `stripe_customer_id` for webhook lookups.
- `web/supabase/torp_profiles_membership_source.sql` — `membership_source` column.

See also: `web/docs/TORP_V0_3_MEMBER_SPONSOR_ACCOUNT.md` (implementation notes: profile billing return path, autofill, session mapping).
