# Account storage model

## Canonical row: `torp_profiles`

Each WorkOS user maps to **one** profile row (service role from Next.js API routes):

| Concern | Column / area |
|---------|----------------|
| Identity | `workos_user_id` (unique), `email`, `first_name`, `last_name`, `display_name`, `profile_photo_url` |
| Membership | `membership_tier` (`free` \| `support` \| `member` \| `sponsor`), `membership_status`, `membership_source` |
| Stripe | `stripe_customer_id`, `stripe_subscription_id` |
| Roles / onboarding | `platform_role`, `account_intent`, `onboarding_status`, `onboarding_completed` |
| Extensible fields | `metadata` jsonb (identity, sponsor notes, color scheme, etc.) |
| Activity | `last_login_at` (v0.6+, throttled updates via `GET /api/me`) |
| Timestamps | `created_at`, `updated_at` |

## QA isolation

When configured for QA previews, the app may use **`top_qa_profiles`** instead of `torp_profiles` (see `PROFILE_TABLE` / deployment docs) so test sign-ups do not touch production profile rows.

## Create / update flows

- **First WorkOS callback:** `upsertProfileFromWorkOSUser` inserts or updates from IdP; preserves user-edited display name when already set.
- **Later logins:** Same upsert path; email sync via `syncProfileEmailWithWorkOSUser` without overwriting a user-chosen profile email.
- **Profile edits:** `PATCH /api/me/profile` updates the row.

There is **no separate `users` table** by design in the current schema; the profile row **is** the internal account record.
