# Podcast System (v0.6)

## YouTube Data API v3 (podcast page + sync)

The podcast landing page and admin sync call **YouTube Data API v3** from **server-only** code (`youtubeUploadsServer.js`, `fetchOfficialPlaylistAcceptedEpisodes.js`). The browser never sees your key.

### 1. Create a key (Google Cloud)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select or create a project.
2. **APIs & Services → Library** → enable **YouTube Data API v3**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. **Restrict the key** (recommended): under “API restrictions”, choose “Restrict key” and allow only **YouTube Data API v3**. For a server-side Next.js app on Vercel, “Application restrictions” are optional; IP restriction is awkward on serverless—prefer API restriction only until you have a stable egress IP.

### 2. Environment variables

Set **one** of these (same value; aliases for convenience):

| Variable | Notes |
|----------|--------|
| `YOUTUBE_API_KEY` | Preferred name in `.env.local.example` |
| `YOUTUBE_DATA_API_KEY` | Alias |
| `GOOGLE_API_KEY` | Alias |

**Optional:**

- `YOUTUBE_CHANNEL_ID` — UC… channel id. If omitted, the app discovers the channel id from `@TheOutreachProjectHq` HTML (no API quota).
- `YOUTUBE_FULL_EPISODES_PLAYLIST_ID` — Defaults to The Outreach Project full-episodes playlist id in code; override for another channel.

**Never** use `NEXT_PUBLIC_*` for the YouTube key (that would expose it to the client bundle).

**Local:** add variables to `web/.env.local`.

**Vercel:** Project → Settings → Environment Variables → add the same keys for Preview / Production as needed.

### 3. Verify and sync

From `web/`:

```bash
pnpm run verify:youtube-podcast
```

This loads `.env.local` and fetches one to two playlist pages through the same code path as production (with episode filters applied).

After the key works, populate Supabase episode rows (requires Supabase service role):

```bash
pnpm run sync:podcast-youtube
```

Or trigger **POST** `/api/admin/podcasts/sync` (platform admin session) — or the legacy **POST** `/api/podcasts/sync-youtube` route.

### 4. Caching

Public `/podcasts` data is cached (`PODCAST_CACHE_TTL`, default 900s). After fixing API keys, wait for TTL expiry or revalidate the `podcast-public-landing` cache path used by your deployment.

---

## Source of truth

- Public episode grid uses **only** the official full-episodes playlist:
  - `PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP` ([playlist on YouTube](https://www.youtube.com/playlist?list=PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP); [example video in list](https://www.youtube.com/watch?v=xvS90sf5Md0&list=PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP))
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

## QA validation checklist

- 10 latest full episodes appear from the official playlist path.
- No Shorts / clips / trailers in the public ten.
- Voices cards show human names + concise quotes (no metadata leaks).
- Upcoming guests reflect admin CRUD and published state.
- Apply form saves submissions and returns explicit email-warning state when notify fails.
- Podcast sponsors are filtered by podcast scope and paid/active workflow.
