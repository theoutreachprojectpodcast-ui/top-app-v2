# Profile + Onboarding Persistence (v0.6)

## Persistence behavior

- On first authenticated callback, a profile row is created (profile shell): `torp_profiles` in production, `top_qa_profiles` on QA (`qa-the-outreach-project.vercel.app` and Preview). Run `web/supabase/top_qa_profiles_v07_onboarding_parity.sql` on the QA Supabase project if profile save returns column errors.
- Profile edits (`/api/me/profile`) are written to Supabase immediately.
- On next login/refresh, `/api/me` rehydrates profile from the same row.
- Onboarding completion updates `onboarding_completed`, `onboarding_status`, and membership intent fields.

## Fields persisted through profile flow

- `display_name`, `first_name`, `last_name`, `email`
- `bio`, `profile_photo_url`, `banner`, `theme`
- account intent and onboarding status fields
- metadata traits (location, mission, interests, contribution summary, sponsor intent, etc.)

## UX consistency goals

- No profile reset between sessions.
- No forced re-login loop for already authenticated users.
- Home/profile/community rely on the same server profile row.

## Community linkage

- Community submissions require authenticated WorkOS user + linked `author_profile_id`.
- Posts are stored as pending review with both:
  - `author_id` (WorkOS user id)
  - `author_profile_id` (Supabase profile UUID)

This keeps moderation and user history attached to one durable account.
