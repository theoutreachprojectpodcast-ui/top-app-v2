# Podcast System (v0.6)

## Source of truth

- Public episode grid uses **only** the official full-episodes playlist:
  - `PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP`
- Fetch path:
  - `fetchOfficialPlaylistAcceptedEpisodes()` (playlist-scoped, not channel-wide)
  - `loadPublicPodcastLandingData()` (merge runtime + DB overrides, then newest-first)
- Exclusions:
  - Shorts, clips, trailers, and rejected rows are filtered by `episodeParser` + pipeline decisions.

## Last 10 behavior

- Landing “Last 10 full episodes” shows `episodes.slice(0, 10)` from the accepted playlist result.
- Ordering is newest-first (`published_at` descending).
- If the playlist cannot provide enough valid episodes, `degraded` mode warning is shown.

## Admin controls

- Include/exclude and override controls live in admin APIs:
  - `POST /api/admin/podcasts/sync`
  - `PATCH /api/admin/podcasts/episode-override`
- Manual include/exclude is persisted in `podcast_episodes` (`admin_include`, `admin_exclude`, `manual_override`).

## Caching

- Public payload is cached by `getCachedPodcastLandingBundle()` (`unstable_cache`) with tag:
  - `podcast-public-landing`
- Cache TTL uses `PODCAST_CACHE_TTL` (default 900 seconds).
- Admin mutations revalidate this tag so updates appear quickly.
