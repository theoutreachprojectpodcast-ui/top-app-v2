# Membership plan availability (Support feature flag)

## Summary

Support Membership ($0.99/year) is **off by default** via a durable platform flag:
`supportMembershipEnabled` in `membership_plan_configuration` (mirrored to `admin_settings`).

The active product is **Pro-only ($5.99/year)** except the public home/directory.

## Public vs protected

**Public (no Pro required):**
- `/` (home / nonprofit directory)
- `/nonprofit/[ein]` (directory detail browsing)
- Auth, legal, checkout/paywall, sponsors marketing routes

**Pro required:**
- `/profile`, `/community`, `/trusted`, `/podcasts`, `/settings`, `/notifications`, `/onboarding`, `/contact`
- Favorites / saved orgs APIs
- Community, trusted catalog, premium podcast APIs

## Admin toggle

**Admin → Memberships** (`/admin/membership`) → Plan availability

- Enable / disable Support with confirmation
- Audited in `membership_configuration_audit_log` + `admin_audit_logs`
- Enabling requires `STRIPE_PRICE_SUPPORT_YEARLY` (or ANNUAL) in env

## Migration

Run in Supabase SQL Editor:

`web/supabase/membership_plan_configuration_2026_07.sql`

## Existing Support users

- Accounts and Stripe history preserved
- Use **Admin → Memberships → Support-to-Pro Migration** to grant complimentary Pro through the original paid period end
- See `docs/support-to-pro-migration.md`
- While Support is disabled: new Support purchases remain blocked

## Rollback

1. Admin → Membership → **Enable Support Membership** (restores purchasable Support), or
2. SQL: `update membership_plan_configuration set support_membership_enabled = true where id = 'default';`
