# Guest Quote System (v0.6)

## Goal

The “Voices shaping service communities” cards must show **real people** and concise, readable quotes.

## Data model

Canonical admin-managed cards are in `podcast_guests` with fields used by the landing page:

- `name`
- `organization`
- `role_title`
- `quote`
- `image_url` (`avatar_url` in DB)
- `episode_id`
- `source_url`
- `admin_override`
- `display_order`
- `active`

Migration: `web/supabase/podcast_v06_production.sql`.

## Quote extraction order

Landing card quote selection order:

1. Admin quote (`podcast_guests.quote`)
2. Transcript quote (`podcast_episodes.transcript_text` + `extractGuestVoiceQuote`)
3. Fallback short line from episode description

Transcript columns are added by:

- `web/supabase/podcast_episodes_transcript.sql`

If transcript fetch is enabled (`PODCAST_LANDING_TRANSCRIPT_FETCH=1`), captions are fetched and cached into DB.

## Admin controls

Admin API for guest cards:

- `GET/POST/PATCH/DELETE /api/admin/podcasts/guest-cards`

Supports:

- create/edit/delete cards
- show/hide (`active`)
- reorder (`PATCH` with `reorder: true, ids: [...]`)
- image URL updates
- quote edits and override flags

## Safety rules

- No raw metadata blobs in UI.
- Quote text is length-capped and sanitized.
- Fallbacks are always readable short text.
