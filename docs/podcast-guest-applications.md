# Podcast Guest Applications

## Recipient routing

Guest application notifications are routed to:

- `Hodge5403@gmail.com`

Implementation:

- API route: `web/src/app/api/podcasts/apply-guest/route.js`
- Override supported with env: `PODCAST_GUEST_APPLICATION_RECIPIENT`
- Default (if env missing): `Hodge5403@gmail.com`

## Stored fields

Applications are persisted to `podcast_guest_applications` with:

- `full_name`
- `email`
- `phone` (if available)
- `organization`
- `role_title`
- `topic_pitch` (also mapped to `proposed_topic`)
- `why_now`
- `message`
- `website_url`
- `social_links`
- `status` (`submitted`)
- `created_at` (database timestamp)

## Success / error behavior

- Successful save returns `ok: true`.
- If email notification cannot be sent, API returns an `emailWarning` while keeping submission stored.
- Invalid payloads return explicit 4xx errors.
