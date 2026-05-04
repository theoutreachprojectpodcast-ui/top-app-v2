# Stripe webhooks

## Endpoint

**URL:** `https://<your-production-domain>/api/billing/webhook`  
Example: `https://theoutreachproject.app/api/billing/webhook`

## Dashboard setup

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. URL as above for the environment (use a **Stripe CLI** or separate endpoint for local testing).
3. Select events the handler processes (at minimum subscription lifecycle events used in `web/src/app/api/billing/webhook/route.js` — e.g. `customer.subscription.*`, `invoice.payment_*` as applicable to your deployed version).
4. Copy the **signing secret** into **`STRIPE_WEBHOOK_SECRET`** in Vercel.

## Behavior (summary)

- Verifies **`Stripe-Signature`** with `STRIPE_WEBHOOK_SECRET`.
- Resolves **`workos_user_id`** from subscription metadata and/or Stripe customer id mapped to `torp_profiles`.
- Updates **`membership_tier`**, **`membership_status`**, **`stripe_subscription_id`**, **`membership_source: stripe`**, and **`platform_role`** on subscription state changes.

## Local testing

Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/billing/webhook` and set the printed webhook secret in `.env.local` for development.

## Code

- `web/src/app/api/billing/webhook/route.js`
