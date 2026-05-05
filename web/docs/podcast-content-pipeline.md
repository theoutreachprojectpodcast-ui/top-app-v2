# Podcast content pipeline (v0.5)

## What was fixed

- **Last 10 full episodes**: The landing grid lists the **10 newest** accepted items from the official full-episodes playlist (newest first), including rows marked member-only; locks are shown on the card, not by hiding rows. Pipeline: `fetchOfficialPlaylistAcceptedEpisodes` + `loadPublicPodcastLandingData` (degraded flag if fewer than 10 accepted items).
- **Voices (featured guests)**: Short pull-quotes prefer **YouTube captions** stored on `podcast_episodes.transcript_text` (backfilled on cached landing rebuild via `youtube-transcript`, capped per rebuild; disable with `PODCAST_LANDING_TRANSCRIPT_FETCH=0`). Otherwise: admin `public_quote`, vetted `discussion_summary`, then trimmed description. Apply `web/supabase/podcast_episodes_transcript.sql` for the transcript columns. Cards use a compact quote layout (`GuestCard` `voiceStrip`).
- **Upcoming guests**: Stored in `podcast_upcoming_guests`. Only `status = published` rows are returned by `GET /api/podcasts/upcoming`. Admin CRUD lives under **Admin → Podcasts → Upcoming guests** (`/api/admin/podcasts/upcoming-guests`).
- **Podcast sponsors**: `sponsors_catalog.sponsor_scope` distinguishes `app` vs `podcast`. The podcast page loads `listSponsorsCatalog(..., { sponsorScope: 'podcast' })` and renders `PodcastSponsorsSection` (same `FeaturedSponsorCard` grid styling as the main hub, two-column responsive).

## Data flow

1. **YouTube → DB**: Platform admin **Refresh podcast data** calls `POST /api/admin/podcasts/sync` → `runPodcastYouTubeSync` → `fetchUploadsUntilAcceptedCount` → upserts episodes + pipeline logs.
2. **Public read**: `getCachedPodcastLandingBundle` / `publicPodcastRead` assemble episodes + featured guest cards for `PodcastsLandingPage` (server + client refresh via `fetchPodcastRecentBundle`).
3. **Sponsors**: `GET /api/sponsors/catalog?scope=app|podcast` → `listSponsorsCatalogWithClient` filters by `sponsor_scope`.
4. **Upcoming**: `GET /api/podcasts/upcoming` (no auth) for published rows.

## How to test

1. Apply `web/supabase/qa_repair_v05_podcast_sponsors_upcoming_community.sql` (adds `sponsor_scope`, seeds seven podcast sponsors, creates `podcast_upcoming_guests`, adds `community_posts.is_demo_seed`).
2. Run admin sync; open `/podcasts` — confirm up to **10** accepted episodes, **4** featured cards with people-shaped names, **Podcast sponsors** grid, **Upcoming** after publishing rows in admin.
3. Verify main `/sponsors` still loads **app** scope only.
