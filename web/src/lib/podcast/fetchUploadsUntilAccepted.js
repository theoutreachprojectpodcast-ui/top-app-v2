import { partitionEpisodesPipeline, takeLatestAccepted } from "./episodePipeline";
import {
  fetchPlaylistItemsPage,
  fetchUploadsPlaylistId,
  fetchVideosByIds,
  resolveYoutubeChannelId,
} from "./youtubeUploadsServer";

/**
 * Walk a YouTube playlist (defaults to channel **uploads** playlist) until enough rows pass the
 * episode pipeline, or page caps are hit. Pass `playlistId` to sync a specific list (e.g. full episodes).
 *
 * @param {{ targetAccepted?: number, maxPages?: number, playlistId?: string }} opts
 */
export async function fetchUploadsUntilAcceptedCount(opts = {}) {
  const target = Number(opts.targetAccepted) > 0 ? Number(opts.targetAccepted) : 10;
  const maxPages = Number(opts.maxPages) > 0 ? Number(opts.maxPages) : 25;

  const customPlaylist = String(opts.playlistId || "").trim();
  let uploadsId = customPlaylist;
  if (!uploadsId) {
    const channelId = await resolveYoutubeChannelId();
    if (!channelId) return { ok: false, error: "missing_channel_id", videos: [] };
    uploadsId = await fetchUploadsPlaylistId(channelId);
    if (!uploadsId) return { ok: false, error: "missing_uploads_playlist", videos: [] };
  }

  const byId = new Map();
  let token = "";
  let pages = 0;

  while (pages < maxPages) {
    const page = await fetchPlaylistItemsPage(uploadsId, token);
    if (!page.ok) return { ok: false, error: page.error, videos: [...byId.values()] };
    const ids = [];
    for (const it of page.items) {
      const vid = String(it?.contentDetails?.videoId || it?.snippet?.resourceId?.videoId || "").trim();
      if (!vid || byId.has(vid)) continue;
      ids.push(vid);
    }
    if (ids.length) {
      const detail = await fetchVideosByIds(ids);
      if (!detail.ok) return { ok: false, error: detail.error, videos: [...byId.values()] };
      for (const id of ids) {
        const d = detail.byId[id];
        if (!d) continue;
        const thumb =
          d.thumbnails?.maxres?.url ||
          d.thumbnails?.high?.url ||
          d.thumbnails?.medium?.url ||
          d.thumbnails?.default?.url ||
          "";
        byId.set(id, {
          youtube_video_id: id,
          title: d.title,
          description: d.description,
          published_at: d.published_at,
          thumbnail_url: thumb,
          youtube_url: `https://www.youtube.com/watch?v=${id}`,
          duration_seconds: d.duration_seconds,
          view_count: null,
        });
      }
    }
    const merged = [...byId.values()];
    const { accepted } = partitionEpisodesPipeline(merged);
    if (takeLatestAccepted(accepted, target).length >= target) {
      return { ok: true, videos: merged };
    }
    pages += 1;
    if (!page.nextPageToken) break;
    token = page.nextPageToken;
  }

  return { ok: true, videos: [...byId.values()] };
}
