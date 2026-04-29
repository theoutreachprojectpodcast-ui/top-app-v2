# Podcast content pipeline (tOP v0.5)

This document describes how the podcast landing page loads **Last 10 full episodes** and **Voices shaping service communities** (four featured guests), how YouTube data is fetched and cached, and how platform admins override content.

## Overview

1. **Source of truth (preferred):** Supabase tables `podcast_episodes`, `podcast_episode_featured_guest`, and `podcast_sync_logs`, populated by a **platform-admin** sync.
2. **Public read path:** `GET /api/podcasts/recent` uses an in-memory ISR-style cache (`unstable_cache`, TTL `PODCAST_CACHE_TTL`, default 900s) built from `getCachedPodcastLandingBundle()`.
3. **Degraded mode:** If there are no acceptable rows in the database yet, the server recomputes from the **YouTube Data API** (uploads playlist) when `YOUTUBE_API_KEY` is set, otherwise from the **public RSS feed** (no duration → duration-based rejection is skipped).

## YouTube uploads (Videos tab equivalent)

When `YOUTUBE_API_KEY` and a channel id are available:

1. `channels.list?part=contentDetails&id=CHANNEL` → `relatedPlaylists.uploads`
2. `playlistItems.list` on the uploads playlist (uploaded videos only — not Community, not Shorts tab).
3. `videos.list?part=snippet,contentDetails` for durations and descriptions.

`YOUTUBE_CHANNEL_ID` overrides HTML scraping from `@TheOutreachProjectHq`.

## Valid “full episode” rules

Implemented in `web/src/lib/podcast/episodeParser.js`:

- Title or description must match an **episode number** pattern (e.g. `Episode 12`, `Ep. 12`, `EP 12`, `E12`, `# 12`, `Podcast Episode 12`).
- Exclude **Shorts** URLs (`/shorts/`).
- Exclude titles/descriptions that match clip-like keywords: short, clip, teaser, trailer, highlight, preview, etc.
- If `duration_seconds` is present, exclude videos shorter than `PODCAST_MIN_FULL_EPISODE_SECONDS` (default **420** = 7 minutes) to drop typical Shorts without blocking API-less RSS fallback (where duration is unknown).

The **10 most recent** rows that pass all checks are shown.

## Featured guests (latest four valid episodes)

For the four newest accepted episodes, the sync writes/updates `podcast_episode_featured_guest` with heuristic fields from `guestHeuristics.js` (title/description parsing only — **no fabricated external research**).

- **Public display:** If `verified_for_public` is false and `confidence_score` &lt; 0.75, the UI shows an **“Unverified”** label.
- **Admin verification:** Admins set `verified_for_public` and can edit copy and `admin_profile_image_url` via **Admin → Podcasts → Featured guest edit** or `PATCH /api/admin/podcasts/featured-guest`.

Guest profile URLs use slugs `ep-{youtubeVideoId}` backed by the API route `GET /api/podcasts/guest/[slug]`.

## Caching

- **HTTP / RSC:** `unstable_cache` key `podcast-public-landing-v1`, tag `podcast-public-landing`, revalidate `PODCAST_CACHE_TTL` seconds.
- **Manual invalidation:** `POST /api/admin/podcasts/sync` calls `revalidateTag("podcast-public-landing")` after a successful sync (when supported by the installed Next.js version).

## Admin overrides

| Action | Endpoint |
|--------|----------|
| List episodes with pipeline fields | `GET /api/admin/podcasts/episodes` |
| Force include / exclude / clear override | `PATCH /api/admin/podcasts/episode-override` body `{ youtubeVideoId, manualOverride: "include" \| "exclude" \| "clear" }` |
| Edit featured guest row | `PATCH /api/admin/podcasts/featured-guest` |
| Sync YouTube → Supabase | `POST /api/admin/podcasts/sync` |
| Sync logs | `GET /api/admin/podcasts/logs` |

All `/api/admin/podcasts/*` routes require **platform admin** (same guard as the rest of `/admin`).

**Note:** `POST /api/podcasts/sync-youtube` is kept for older scripts but now also requires **platform admin** (no longer community-moderator only).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (server only). |
| `YOUTUBE_CHANNEL_ID` | Optional `UC…` channel id. |
| `PODCAST_CACHE_TTL` | Cache TTL in **seconds** for public landing bundle. |
| `PODCAST_MIN_FULL_EPISODE_SECONDS` | Minimum duration when `duration_seconds` is known. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for sync + public bundle DB reads in API routes. |

## Database migration

Apply `web/supabase/podcast_content_pipeline_v05.sql` in Supabase (adds columns, `podcast_sync_logs`, `podcast_episode_featured_guest`, RLS read policies).

## Testing

1. **Parser (no keys):** `pnpm exec node web/scripts/test-episode-parser.mjs` from repo root, or `node scripts/test-episode-parser.mjs` from `web/`.
2. **Build:** `pnpm run build` in `web/`.
3. **Manual QA:** Log in → `/podcasts` → confirm header stays signed-in; refresh; navigate away and back. Throttled `POST /api/auth/activity` bumps idle cookies on pointer activity in addition to proxy-on-navigation.
4. **Admin:** Platform admin opens `/admin/podcasts`, runs **Refresh podcast data**, checks **Episodes & overrides** and **Sync logs**.

## Known limitations

- **Heuristic guests** are only as good as titles/descriptions; admins should verify before clearing “Unverified”.
- **RSS fallback** cannot know duration; Shorts that look like long titles may slip through until API sync runs.
- **WorkOS session length** is still governed by WorkOS dashboard settings; the app enforces a **24h sliding idle** separately (`TOP_SESSION_IDLE_MS` / proxy + `/api/auth/activity`).
- **Transcript-based enrichment** is not implemented (would require additional licensed APIs or manual upload).
