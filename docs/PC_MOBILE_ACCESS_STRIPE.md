# PC-side: App Access ($5.99/year) + mobile gate

The web app already routes Capacitor users through `/mobile` (sign in / create account) and `/mobile/access` (paywall). Checkout uses `POST /api/billing/checkout` with `{ tier: "access" }`. This doc is what to configure on the PC (Stripe + Supabase + Vercel) before mobile launch.

## Pricing model

| Tier | Price | Required for | Stripe env |
|------|-------|--------------|------------|
| **App Access** | $5.99/year | Native iOS/Android app | `STRIPE_PRICE_ACCESS_YEARLY` |
| Support | $1/mo | Optional upgrade | `STRIPE_PRICE_SUPPORT_MONTHLY` |
| Pro | $5.99/mo | Optional upgrade | `STRIPE_PRICE_PRO_MONTHLY` |
| Sponsor | varies | Optional / packages | existing sponsor prices |

Website users can browse in preview mode without App Access. **Capacitor WebView** users must have active App Access (or Support / Pro / Sponsor with active billing).

## 1. Stripe Dashboard

1. Create product **App Access** (or reuse a renamed product).
2. Add recurring price **$5.99 USD / year**.
3. Copy the price ID (`price_…`).

Test mode first; mirror in live when ready.

## 2. Vercel Production env

Add to **the-outreach-project-app** (Production):

```
STRIPE_PRICE_ACCESS_YEARLY=price_xxxxxxxx
```

Redeploy after setting. Without this, `/mobile/access` shows a friendly “checkout being configured” message and checkout returns `503 access_billing_not_configured`.

## 3. Supabase migration

Run `web/supabase/top_profiles_membership_access_tier.sql` in Supabase SQL editor (prod + QA).

This adds `'access'` to the `membership_tier` check constraint. Webhooks will fail profile updates until this runs.

## 4. Webhook verification

After a test App Access checkout:

1. Stripe subscription metadata should include `membership_tier: access`.
2. `top_profiles.membership_tier` → `access`
3. `top_profiles.membership_status` → `active`
4. Capacitor app should pass `MobileNativeGate` and land on `/` (home).

Use Stripe CLI locally:

```bash
stripe listen --forward-to localhost:3001/api/billing/webhook
```

## 5. Upgrade paths

- **New mobile user:** `/mobile` → Create account → `/mobile/access` → Stripe → home
- **Existing user, no access:** sign in → `/mobile/access` → checkout
- **Support / Pro:** profile → Membership & billing (requires App Access or higher rank first in product terms; checkout API enforces tier rank)

## 6. iOS app

No native code change required for billing — Capacitor loads production URL. After Vercel deploy + Stripe env + Supabase migration, archive and submit as usual.

## Checklist

- [ ] Stripe product + yearly price created
- [ ] `STRIPE_PRICE_ACCESS_YEARLY` on Vercel Production
- [ ] Supabase `access` tier migration applied
- [ ] Test checkout → webhook → profile `access` + `active`
- [ ] Test Capacitor: guest → splash → sign up → paywall → pay → home
- [ ] Test Capacitor: lapsed subscription → redirected to `/mobile/access`
