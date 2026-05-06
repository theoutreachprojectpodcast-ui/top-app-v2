# Sponsor CMS Control

## Scope

The sponsor system is fully data-driven through `sponsors_catalog` and admin routes.

Main app sponsor visibility is controlled by:

- `sponsor_scope` (`app` vs `podcast`)
- `sponsor_type` (`foundational_sponsor` for main Sponsors page cards)
- `is_active` (hard show/hide)
- `display_order` (card ordering)

## Admin edit surface

Admin can edit sponsor cards via `Admin -> Sponsors`:

- identity: `name`
- classification: `sponsor_type`, `sponsor_category`, `sponsor_scope`
- presentation: `tagline`, `short_description`, `long_description`
- links: `website_url`, `cta_label`
- social:
  - `social_links` JSON
  - `instagram_url`, `facebook_url`, `linkedin_url`, `twitter_url`, `youtube_url`
- media: `logo_url`, `background_image_url`
- status flags: `is_active`, `featured`, `mission_partner`, `podcast_sponsor`, `supporting_sponsor`, `verified`
- ordering/workflow: `display_order`, `sponsor_status`, `payment_status`, `onboarding_status`, `admin_notes`

## API endpoints

- `GET /api/admin/sponsors`
- `PATCH /api/admin/sponsors/[slug]`
- `GET /api/sponsors/catalog?scope=app`
- `GET /api/sponsors/catalog?scope=podcast`

## Iron Soldiers handling

Iron Soldiers is removed from the main sponsors page through data classification, not UI-only logic.

Use SQL script:

- `web/supabase/qa_sponsor_iron_soldiers_podcast_scope.sql`

This moves Iron Soldiers records to podcast scope and away from app foundational listings.
