# Podcast public surface (v0.6)

## Episode list (up to 10)

- Primary source: **`podcast_episodes`** in Supabase, ordered by `published_at`, filtered by **`episodeRowIsPublicListed`** in `web/src/lib/podcast/publicPodcastRead.js` (manual include/exclude and pipeline classifier).
- If fewer than **10** public rows exist, the loader **supplements** from the YouTube uploads playlist (same classifier as the admin pipeline), then RSS as a fallback, merging by **`youtube_video_id`** so DB rows win when both exist.

## Featured guests

- Cards prefer **`podcast_episode_featured_guest`** admin rows. Heuristic extraction from titles/descriptions is used only as a fallback.
- Guest names that look like **episode metadata** (e.g. contain “Episode”, match the full episode title, or are extremely long) are **not** shown as a person’s name; the UI falls back to a neutral **Guest** label until editorial data is set.

## Admin and pipeline

- [podcast-admin.md](./podcast-admin.md)
- [podcast-content-pipeline.md](./podcast-content-pipeline.md)
