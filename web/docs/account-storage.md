# Account Storage Model (v0.6)

## Source of truth

- Identity provider: WorkOS (session + user id)
- App account/profile storage: Supabase table `torp_profiles`

## User mapping

- Primary key for identity mapping: `torp_profiles.workos_user_id`
- First login/callback:
  - `upsertProfileFromWorkOSUser()` inserts/updates profile shell
- Returning login:
  - find by `workos_user_id`
  - update `last_login_at` (throttled)
  - sync session email only when profile email is empty

## Stored account fields

Core fields include:

- `workos_user_id`
- `email`
- `first_name`, `last_name`, `display_name`
- `profile_photo_url`
- `platform_role`
- `membership_tier`, `membership_status`, `membership_source`
- `onboarding_completed`, `onboarding_status`
- `last_login_at`
- `metadata` (extended profile traits)

## Safety rules

- Profile PATCH does not trust client writes for Stripe-owned membership fields.
- User-entered display/name values are not overwritten with blanks from IdP sync.
- Server routes use service-role client for durable writes.

## Related APIs

- `GET /api/me`
- `PATCH /api/me/profile`
- `POST /api/me/onboarding/complete`
- `GET /api/admin/users`
