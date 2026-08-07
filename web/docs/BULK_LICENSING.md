# Bulk Annual Licensing

Organization packages of **25 / 50 / 100 / 200** annual Outreach memberships, billed through Stripe as recurring yearly subscriptions. Each seat is a unique license (never one shared code).

## Architecture (summary)

| Layer | Implementation |
|-------|----------------|
| Identity | WorkOS (purchaser must be signed in) |
| Data | Supabase tables `bulk_*` (deny-all RLS; service role APIs) |
| Billing | Stripe Checkout + Customer Portal; price IDs via env |
| Entitlement | Profile `membership_source=bulk_org` + `bulk_license_id` |
| Webhooks | Same `/api/billing/webhook`; bulk branch + event ledger |

Migration: [`web/supabase/bulk_licensing_v01.sql`](../supabase/bulk_licensing_v01.sql)

## Customer flow

1. `/bulk-licenses` — select package + business form  
2. `POST /api/bulk-licensing/checkout` — pending org + Stripe Checkout  
3. Verified webhook activates org and generates exactly N hashed licenses  
4. `/organizations/[orgId]` — dashboard (assign, CSV, export, portal)  
5. `/redeem` or `/invite/license/[token]` — member activates seat  

## Env vars

```
STRIPE_BULK_25_PRICE_ID=
STRIPE_BULK_50_PRICE_ID=
STRIPE_BULK_100_PRICE_ID=
STRIPE_BULK_200_PRICE_ID=
```

Use Stripe **test** prices for local/QA. Production live prices only after explicit approval.

Optional: `BULK_LICENSING_FORCE_EMAIL=1` to send Resend emails outside production (default skips).

## Membership rules

Documented in [`membershipRules.js`](../src/lib/bulkLicensing/membershipRules.js):

- One redeemed bulk seat per user  
- Personal Stripe subscriptions are **not** auto-canceled  
- Assignment reserves a seat; cancel invite returns it to available  
- Renewals extend seat `expires_at` and profile `renewal_date` without re-redeem  

## Admin

- UI: `/admin/bulk-licensing`  
- Reconcile: `POST /api/admin/bulk-licensing/reconcile` (`apply: false` report-only)  

## QA test plan

1. Apply `bulk_licensing_v01.sql` on QA Supabase  
2. Configure four test price IDs + webhook (same endpoint)  
3. Purchase each package size in test mode; confirm seat count = package size  
4. Duplicate webhook delivery → no duplicate seats  
5. Assign email + CSV; redeem; second redeem fails  
6. Cancel invite → seat available again  
7. Portal opens for org Stripe customer  
8. Simulate `invoice.payment_failed` → past_due + warning  
9. Simulate renewal `invoice.paid` → expires extended, no new seat minting  

## Production deployment checklist

- [ ] Stripe Products/Prices created (live) for 25/50/100/200 annual  
- [ ] Env vars set on production  
- [ ] Webhook endpoint includes bulk events; signing secret verified  
- [ ] Migration applied; RLS deny-all confirmed  
- [ ] Customer Portal configured for org customers  
- [ ] Email templates / Resend from-address OK  
- [ ] Test purchase + renew + cancel verified in QA  
- [ ] Admin reconcile + revoke verified  
- [ ] **Explicit approval** before enabling live checkout / customer emails  

## Security review notes

- Redeem and code-check endpoints are rate-limited  
- Tokens stored as SHA-256 hashes; UI masks codes for non-export views  
- CSV export sanitizes formula injection; exports are audited  
- Org APIs require membership role checks server-side  
- Never trust client package size / price / org id for activation  

## Support cheat sheet

| Symptom | Check |
|---------|-------|
| Checkout 503 | Bulk price env vars / `STRIPE_SECRET_KEY` |
| 0 licenses after pay | Webhook secret, `bulk_stripe_webhook_events`, metadata `checkout_kind=bulk_licensing` |
| Redeem email mismatch | Assigned email vs signed-in email |
| Personal Pro conflict | Expected warning; user must cancel personal sub in their own portal if desired |
