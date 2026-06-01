# Admin User Management (v0.6)

## Current admin user view

- Endpoint: `GET /api/admin/users`
- Source table: `torp_profiles`
- Exposes account records with:
  - name/display/email
  - role fields
  - membership fields
  - onboarding fields
  - created/updated timestamps

## What admins can manage today

- Role/membership/account edits through existing admin profile/account routes and DB-backed updates.
- Community moderation ties back to durable user/profile records.

## Production expectations

- New WorkOS accounts appear in admin users after first successful callback.
- Returning users map to same row by `workos_user_id`.
- Profile changes remain visible in admin list and related moderation screens.

## Recommended follow-up enhancements

- Add explicit last-login and profile-completion columns to admin list UI.
- Add per-user aggregate counters (saved resources, community submissions, follows).
- Add suspend/archive action with guardrails and audit logs.
