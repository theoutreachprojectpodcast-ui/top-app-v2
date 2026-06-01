# Podcast YouTube Playlist Source

## Source of truth

Official full episodes playlist:

- `https://www.youtube.com/watch?v=OoEMxzQQNaw&list=PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP`

Configured in code:

- `YOUTUBE_FULL_EPISODES_PLAYLIST_ID` env
- fallback default in `fetchOfficialPlaylistAcceptedEpisodes.js`

## Last 10 full episodes behavior

The public podcast landing pipeline:

1. Fetches playlist pages (with pagination).
2. Filters out shorts/clips/trailers/highlights.
3. Accepts strict pipeline matches and playlist full-episode fallback matches.
4. Sorts by `published_at` descending.
5. Returns latest 10 when available.

If API fails or returns insufficient content, degraded state is surfaced via `bundle.degraded`.
