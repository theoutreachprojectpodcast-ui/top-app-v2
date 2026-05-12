import {
  classifyPodcastUpload,
  isBelowMinEpisodeDuration,
  isShortsUrl,
  sortByPublishedDesc,
  titleContainsExcludedContentMarker,
} from "./episodeParser";
import { fetchPlaylistItemsPage, fetchVideosByIds } from "./youtubeUploadsServer";

/**
 * Official “full episodes” playlist (env override).
 * Canonical list (The Outreach Project): https://www.youtube.com/playlist?list=PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP
 * Example watch URL with same list param: https://www.youtube.com/watch?v=xvS90sf5Md0&list=PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP
 */
export function officialFullEpisodesPlaylistId() {
  return String(process.env.YOUTUBE_FULL_EPISODES_PLAYLIST_ID || "PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP").trim();
}

/**
 * Walk a single YouTube playlist (not channel uploads), classify items, skip admin-excluded ids,
 * optionally force-include playlist ids that are flagged in CMS, then return accepted rows
 * sorted by `published_at` desc.
 */
export async function fetchOfficialPlaylistAcceptedEpisodes(opts = {}) {
  const maxPages = Math.max(1, Number(opts.maxPages) || 50);
  const maxAccepted = Math.max(10, Number(opts.maxAccepted) || 200);
  const playlistId = String(opts.playlistId || officialFullEpisodesPlaylistId()).trim();
  const excludeVideoIds = opts.excludeVideoIds instanceof Set ? opts.excludeVideoIds : new Set();
  const forceIncludeVideoIds = opts.forceIncludeVideoIds instanceof Set ? opts.forceIncludeVideoIds : new Set();

  if (!playlistId) return { ok: false, error: "missing_playlist_id", videos: [], scannedPages: 0 };

  const accepted = [];
  const seen = new Set();
  let token = "";
  let scannedPages = 0;

  for (; scannedPages < maxPages && accepted.length < maxAccepted; scannedPages += 1) {
    const page = await fetchPlaylistItemsPage(playlistId, token);
    if (!page.ok) return { ok: false, error: page.error, videos: [], scannedPages };

    /** @type {string[]} */
    const ids = [];
    /** Playlist snippet `publishedAt` when `videos` API omits it (rare) — keeps sort stable. */
    const playlistPublishedAtById = new Map();
    for (const it of page.items) {
      const vid = String(it?.contentDetails?.videoId || it?.snippet?.resourceId?.videoId || "").trim();
      if (!vid || seen.has(vid)) continue;
      seen.add(vid);
      const plPub = String(it?.snippet?.publishedAt || "").trim();
      if (plPub) playlistPublishedAtById.set(vid, plPub);
      ids.push(vid);
    }

    if (ids.length) {
      const detail = await fetchVideosByIds(ids);
      if (!detail.ok) return { ok: false, error: detail.error, videos: sortByPublishedDesc(accepted), scannedPages };

      for (const id of ids) {
        if (excludeVideoIds.has(id)) continue;
        const d = detail.byId[id];
        if (!d) continue;
        const thumb =
          d.thumbnails?.maxres?.url ||
          d.thumbnails?.high?.url ||
          d.thumbnails?.medium?.url ||
          d.thumbnails?.default?.url ||
          "";
        const row = {
          youtube_video_id: id,
          title: d.title,
          description: d.description,
          published_at: d.published_at || playlistPublishedAtById.get(id) || null,
          thumbnail_url: thumb,
          youtube_url: `https://www.youtube.com/watch?v=${id}`,
          duration_seconds: d.duration_seconds,
          view_count: null,
        };

        if (forceIncludeVideoIds.has(id)) {
          accepted.push({
            ...row,
            pipeline_decision: "accepted",
            manual_override: "include",
          });
          if (accepted.length >= maxAccepted) break;
          continue;
        }

        if (
          isShortsUrl(row.youtube_url, id) ||
          titleContainsExcludedContentMarker(row.title, row.description) ||
          isBelowMinEpisodeDuration(row.duration_seconds)
        ) {
          continue;
        }

        const c = classifyPodcastUpload(row);
        if (c.ok) {
          accepted.push({
            ...row,
            episode_number: c.episodeNumber,
            pipeline_decision: "accepted",
            pipeline_reason: "matched_rules",
          });
        } else if (String(c.reason || "") === "no_episode_number") {
          // Full-episodes playlist items often omit "Episode N" in the title; duration + exclusion filters still apply above.
          accepted.push({
            ...row,
            episode_number: null,
            pipeline_decision: "accepted",
            pipeline_reason: "playlist_full_episode",
          });
        } else {
          // Curated full-episodes playlist: trust items that already passed Shorts / keyword / duration gates above.
          accepted.push({
            ...row,
            episode_number: null,
            pipeline_decision: "accepted",
            pipeline_reason: "playlist_trust_fallback",
            playlist_classify_note: String(c.reason || ""),
          });
        }
        if (accepted.length >= maxAccepted) break;
      }
    }

    if (!page.nextPageToken) break;
    token = page.nextPageToken;
  }

  return {
    ok: true,
    videos: sortByPublishedDesc(accepted),
    scannedPages,
  };
}
