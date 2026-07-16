# Support → Pro complimentary migration

## Purpose

Upgrade every existing **$0.99/year Support** member to **complimentary Pro** for the remainder of their original one-year paid term.

- No new Stripe charges
- No automatic paid Pro subscription
- Support renewals set to `cancel_at_period_end` when still renewing
- Idempotent (`support_to_pro_2026_v1`)
- Email after successful migration (Resend)

## Migration SQL

Run in Supabase SQL Editor **before** executing the migration:

`web/supabase/support_to_pro_migration_2026_07.sql`

Also ensure the plan-availability migration is applied if not already:

`web/supabase/membership_plan_configuration_2026_07.sql`

## Admin UI

**Admin → Memberships** → **Support-to-Pro Migration**

1. **Preview dry run** — classifies all Support/access profiles; no entitlement changes
2. Review eligible / expired / exceptions / Stripe cancel proposals
3. **Run migration** — requires confirmation; upgrades + emails + Stripe cancel@period end

API:

- `GET /api/admin/membership/support-to-pro-migration?preview=1&verify=1`
- `POST` `{ "action": "dry_run" }`
- `POST` `{ "action": "execute", "confirm": true, "sendEmail": true }`
- `POST` `{ "action": "retry_email", "workosUserId": "…" }`

## Date logic (priority)

1. Stripe `current_period_start` / prefer `current_period_end`
2. First paid invoice
3. Profile `renewal_date`
4. Account `created_at` (last resort)
5. Missing dates → **exception** (no guess)

Complimentary Pro expires at the original Support paid period end — never extended from the migration date.

## Entitlement

Migrated users get:

- `membership_tier = member`
- `membership_source = support_to_pro_migration`
- `migrated_to_pro_until = originalSupportPeriodEnd`
- `support_membership_status = migrated_to_pro`

`requirePro` / `hasAppAccess` treat active migrated entitlements as Pro until `migrated_to_pro_until`.

Stripe webhooks will not restore Support or clear Pro early while the migrated entitlement is still active. A later paid Pro checkout (`membership_source = stripe`) supersedes the complimentary entitlement.

## Rollback

1. Do **not** delete migration records.
2. To reverse a single user: set `membership_tier` / `membership_source` back carefully via Admin → Users, and clear `migrated_to_pro_*` only after support review.
3. Stripe `cancel_at_period_end` may already be set — review in Stripe Dashboard before undoing.

## Email

Subject: `Your Outreach Project membership has been upgraded to Pro`  
Idempotency key: `support-pro-migration-email:support_to_pro_2026_v1:{workosUserId}`  
Failed emails do not reverse the membership change; retry via admin API.
