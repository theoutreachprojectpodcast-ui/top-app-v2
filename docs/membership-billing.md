# Membership & billing

## Tiers

- **`free`** — default; no recurring Stripe subscription required.
- **`support`** (Support with $1, $1/mo) / **`member`** (Pro, $5.99/mo) / **`sponsor`** — paid paths; billing state on `top_profiles` is updated only from Stripe webhooks (never from the client).

## Environment (QA vs production)

Use **Stripe test mode** keys and test price IDs on QA/local (`sk_test_…`). Use **live** keys and live price IDs on production only. There is no in-app mode toggle — mode follows `STRIPE_SECRET_KEY`.

## Stripe flows

- **Checkout:** `POST /api/billing/checkout` — `tier`: `support` | `member` | `sponsor`; optional `sponsorPackageId` from sponsor opportunities API.
- **Summary:** `GET /api/billing/summary` — renewal, subscription status, masked default card.
- **Invoices:** `GET /api/billing/invoices`
- **Payment methods:** `GET|POST|PATCH|DELETE /api/billing/payment-methods` (add card via Checkout `setup` mode).
- **Sponsor packages:** `GET /api/billing/sponsor-opportunities` — mission, podcast, and monthly sponsor packages from `sponsorTiers` / `podcastSponsorTiers` data (not hardcoded in UI).
- **Customer portal:** `POST /api/billing/portal` — downgrades, cancel at period end, plan changes.
- **Webhooks:** `POST /api/billing/webhook` — `checkout.session.completed`, `customer.subscription.*`, `invoice.paid` / `payment_failed`, `payment_method.attached`.

## Profile UI

- **Profile tab:** `MembershipBillingCenter` — upgrades, sponsor packages, payment methods, billing history.
- **Home:** `HomeMembershipSection` — tier cards with sign-up or checkout CTAs.
- **Admin:** `/admin/membership` — aggregate counts (no Stripe secrets).

## Entitlements (server)

`web/src/lib/account/entitlements.js`:

- **`podcastMemberContent`** — `admin`/`moderator`, or paid tier (`support` / `member` / `sponsor`) with active/trialing billing.
- **`communityStorySubmit`** — `admin`/`moderator`, or **Pro** (`membership_tier` = `member`) with active/trialing billing, a Stripe subscription id (webhook lag), or `membership_source` = `manual` (admin-granted Pro).

Member stories submit as `pending_review` and are approved in **`/admin/community`**.

## Sponsor / invoice side

- Admin invoice workflow uses **`billing_records`** (see `web/supabase/admin_cms_v05_all_in_one.sql`).
- Sponsor catalog fields include `sponsor_status`, `payment_status`, scopes — public catalog filters inactive rows where implemented.

## Env vars (billing)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs for member/support tiers, optional podcast sponsor price env keys — see `web/.env.example` and `web/docs/BILLING_STRIPE_v0.3.md`.
