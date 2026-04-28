# tORP v0.3 — In-app notifications

## Schema (Supabase)

Run `web/supabase/torp_platform_notifications.sql` in the Supabase SQL editor (or your migration pipeline).

- **`torp_platform_notifications`** — one row per recipient (`recipient_profile_id` → `torp_profiles.id`). Columns include `audience_scope` (`user` | `staff`), `notification_type`, `title`, `message`, `link_path`, `entity_type`, `entity_id`, `status` (`unread` | `read` | `archived`), `priority`, timestamps, `metadata` jsonb, `delivered_email_at` (reserved).
- **`torp_org_public_updates`** — append-only org “update” events used to drive `favorite_org_updated` fan-out.

RLS: **anon** and **authenticated** roles have **no** direct access (same pattern as `torp_profiles`). The Next.js app reads/writes via **service role** in route handlers.

## How notifications are created

Central helper: `web/src/server/notifications/notificationService.js`.

- **`createPlatformNotification(admin, payload)`** — insert one row.
- **`createNotificationDeduped(...)`** — skips insert if the same recipient/type/entity has a recent **unread** row (window from `dedupeHours`).
- **`notifyStaffProfiles(admin, payload)`** — resolves moderator profile IDs from `COMMUNITY_MODERATOR_*` / `NEXT_PUBLIC_COMMUNITY_MODERATOR_*` and inserts **staff**-scoped rows (deduped per recipient).
- **`publishOrgPublicUpdateAndNotifyFans(admin, params)`** — inserts `torp_org_public_updates`, then notifies users who saved that EIN (`NEXT_PUBLIC_SAVED_ORG_TABLE`, default `top_app_saved_org_eins`).

Email/push: **`scheduleOutboundEmailNotification`** is a no-op stub; set `delivered_email_at` when a worker exists.

## User notification types (examples)

| Type | When |
|------|------|
| `community_post_submitted` | User submits a community post |
| `community_post_approved` | Moderator approves their post |
| `favorite_org_updated` | Org public update + user has EIN saved |
| `membership_charge_upcoming` | Stripe `invoice.upcoming` (webhook) |
| `membership_charge_succeeded` | Stripe `invoice.paid` |
| `membership_charge_failed` | Stripe `invoice.payment_failed` |
| `application_received` | Logged-in sponsor applicant after POST |
| `account_update` | Generic (reserved) |

## Staff notification types (examples)

| Type | When |
|------|------|
| `new_user_signup` | First WorkOS profile upsert (`/callback`) |
| `community_post_submitted_for_review` | New community submission |
| `sponsor_application_submitted` | Sponsor application POST |
| `mission_partner_application_submitted` | Mission partner family |
| `trusted_resource_application_submitted` | Trusted Resource application (after verified server trigger) |

## Favorites → org updates

1. Admin approves/curates header imagery → `publishOrgPublicUpdateAndNotifyFans` in `web/src/app/api/admin/orgs/header-image/route.js`.
2. Fans are users with a row in the saved-org table for that **9-digit** EIN.
3. Each fan gets `favorite_org_updated` (deduped per week per org).

## Billing

`web/src/app/api/billing/webhook/route.js` calls **`notifyMembershipFromStripeInvoice`** for `invoice.paid`, `invoice.payment_failed`, and **`invoice.upcoming`**.

- Requires `stripe_customer_id` on `torp_profiles` matching the invoice customer (set during checkout/subscription sync).
- **Upcoming charge**: enable the **`invoice.upcoming`** event for your Stripe webhook (Dashboard → Developers → Webhooks). Without it, only paid/failed invoices generate notices.

## Read / unread

- **GET** `/api/me/notifications` — lists rows for the signed-in user’s profile; paginated with `cursor` + `limit`.
- **GET** `/api/me/notifications?summary=1` — `{ unreadCount }`.
- **PATCH** `/api/me/notifications` — `{ markAllRead: true }` or `{ ids: [...] }`.

**Non-moderator** users only see `audience_scope = user`. Users on the moderator allow-list also see **`staff`** rows addressed to their profile (operational inbox).

## Header UI

- **Home shell (`TopApp`)**: `HeaderNotificationBell` sits **immediately left** of `HeaderAccountMenu` (profile avatar).
- **Subpage shell (`AppShell`)**: same bell **left** of the Profile link (`SubpageTopbarActions`).
- **View all**: `/notifications` (full list + load more).

Styling: `web/src/components/app/top-app.css` (`.headerNotification*`).

## Remaining config

1. Apply SQL migration for notifications tables.
2. Stripe webhook: add **`invoice.upcoming`** if you want renewal reminders.
3. Moderators: `COMMUNITY_MODERATOR_EMAILS` / `COMMUNITY_MODERATOR_WORKOS_USER_IDS` (and/or `NEXT_PUBLIC_*`) so staff rows resolve to real `torp_profiles` rows.
4. Outbound email: implement `scheduleOutboundEmailNotification` + optional `notification_preferences` table when ready.
