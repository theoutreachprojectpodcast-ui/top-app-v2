# Podcast Billing (v0.6)

## Scope

Podcast monetization is split into:

1. **Podcast sponsor checkout** (Stripe payment flow)
2. **Sponsor application lifecycle** (admin approval + activation)

## Stripe checkout path

- Start checkout:
  - `POST /api/billing/podcast-sponsor-checkout`
- Verify session:
  - `GET /api/billing/verify-podcast-session?session_id=...`
- Webhook reconciliation:
  - `POST /api/billing/webhook` (`checkout_kind = podcast_sponsor`)

Requirements:

- Authenticated WorkOS user for paid sponsor path
- `STRIPE_SECRET_KEY` + podcast price IDs configured
- Safe same-origin return path handling

## Application + admin lifecycle

- Submit application:
  - `POST /api/sponsor-applications`
- Admin review/update:
  - `PATCH /api/admin/sponsor-applications`

Admin can:

- approve/reject
- set invoice fields (`invoice_url`, `invoice_amount_cents`, `invoice_reason`)
- update payment/onboarding status
- convert approved sponsor into `sponsors_catalog`

## Public sponsor visibility rules

Podcast page sponsor list is scoped and filtered:

- `sponsor_scope = 'podcast'`
- active/approved payment state per catalog rules

This prevents unpaid/inactive sponsors from appearing publicly.

## Operational checklist

1. Confirm podcast Stripe prices are set (`STRIPE_PRICE_PODCAST_SPONSOR_*`).
2. Confirm webhook secret is configured.
3. Confirm admin review + conversion process in `/api/admin/sponsor-applications`.
4. Confirm paid sponsors appear in podcast sponsors section only after status updates.
