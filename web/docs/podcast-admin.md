# Podcast Admin Controls (v0.6)

## Episodes

- Sync latest playlist data:
  - `POST /api/admin/podcasts/sync`
- Override include/exclude or copy edits:
  - `PATCH /api/admin/podcasts/episode-override`
- Review sync logs:
  - `GET /api/admin/podcasts/logs`

## Voices cards

- Admin-managed cards endpoint:
  - `GET/POST/PATCH/DELETE /api/admin/podcasts/guest-cards`
- `active = true` controls visibility.
- `display_order` controls card sequence.

## Upcoming guests

Admin CRUD:

- `GET/POST/PATCH/DELETE /api/admin/podcasts/upcoming-guests`

Public read:

- `GET /api/podcasts/upcoming` (published rows only)

Display behavior:

- 2-column responsive grid on landing page (1-column on narrow mobile).

## Apply-to-be-on-the-show

Submission API:

- `POST /api/podcasts/apply-guest`

Behavior:

- Persists to `podcast_guest_applications`
- Sends email notification to Admin Contact recipient when configured
- Returns success + warning if notification fails, instead of fake success

## Sponsor workflow (podcast scope)

- Applications are stored in `sponsor_applications` with `sponsor_program_type = podcast`.
- Payment verification uses Stripe checkout session validation for paid podcast flows.
- Admin status updates live in:
  - `PATCH /api/admin/sponsor-applications`
