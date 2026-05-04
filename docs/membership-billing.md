# Membership & billing

## Tiers

- **`free`** — default; no recurring Stripe subscription required.
- **`support`** / **`member`** / **`sponsor`** — paid paths; **`membership_status`** must be **`active`** (or **`trialing`** read as entitled at entitlement layer) for member-style capabilities.

## Stripe flows

- **Checkout:** `POST /api/billing/checkout` (member/support paths; metadata includes `workos_user_id` / tier).
- **Customer portal:** `POST /api/billing/portal` returns Stripe billing portal URL.
- **Webhooks:** `POST /api/billing/webhook` — verifies signature, updates `torp_profiles` on subscription create/update/delete. **Do not trust client-reported payment state.**

## Entitlements (server)

`web/src/lib/account/entitlements.js` — **`computeEntitlementsFromProfileRow`** grants `podcastMemberContent` and `communityStorySubmit` when:

- `platform_role` is `admin` or `moderator`, **or**
- `membership_tier` is **`support`**, **`member`**, or **`sponsor`** **and** billing status is active (including trialing at entitlement read).

## Sponsor / invoice side

- Admin invoice workflow uses **`billing_records`** (see `web/supabase/admin_cms_v05_all_in_one.sql`).
- Sponsor catalog fields include `sponsor_status`, `payment_status`, scopes — public catalog filters inactive rows where implemented.

## Env vars (billing)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs for member/support tiers, optional podcast sponsor price env keys — see `web/.env.example` and `web/docs/BILLING_STRIPE_v0.3.md`.
