import { classifyPodcastUpload, sortByPublishedDesc } from "./episodeParser";
import { fetchPlaylistItemsPage, fetchVideosByIds } from "./youtubeUploadsServer";

/** Official “full episodes” playlist (env override). */
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

    const ids = [];
    for (const it of page.items) {
      const vid = String(it?.contentDetails?.videoId || it?.snippet?.resourceId?.videoId || "").trim();
      if (!vid || seen.has(vid)) continue;
      seen.add(vid);
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
          published_at: d.published_at,
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

        const c = classifyPodcastUpload(row);
        if (!c.ok) continue;
        accepted.push({
          ...row,
          episode_number: c.episodeNumber,
          pipeline_decision: "accepted",
          pipeline_reason: "matched_rules",
        });
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
