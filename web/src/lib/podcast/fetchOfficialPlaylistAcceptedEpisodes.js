import {
  classifyPodcastUpload,
  isBelowMinEpisodeDuration,
  isShortsUrl,
  sortByPublishedDesc,
  titleContainsExcludedContentMarker,
} from "./episodeParser";
import {
  fetchPlaylistItemsPage,
  fetchPlaylistVideosFromHtmlFallback,
  fetchPlaylistVideosFromRssFallback,
  fetchVideosByIds,
  youtubeApiKeyConfigured,
} from "./youtubeUploadsServer";

/**
 * Official “full episodes” playlist (env override).
 * Canonical list (The Outreach Project): https://www.youtube.com/playlist?list=PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP
 * Example watch URL with same list param: https://www.youtube.com/watch?v=xvS90sf5Md0&list=PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP
 */
export function officialFullEpisodesPlaylistId() {
  return String(process.env.YOUTUBE_FULL_EPISODES_PLAYLIST_ID || "PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP").trim();
}

/**
 * @param {Record<string, unknown>} row
 * @param {Set<string>} excludeVideoIds
 * @param {Set<string>} forceIncludeVideoIds
 * @param {number} maxAccepted
 * @param {Record<string, unknown>[]} acceptedOut
 */
function tryAcceptPlaylistRow(row, excludeVideoIds, forceIncludeVideoIds, maxAccepted, acceptedOut) {
  const id = String(row.youtube_video_id || "").trim();
  if (!id || excludeVideoIds.has(id)) return;
  if (acceptedOut.length >= maxAccepted) return;

  if (forceIncludeVideoIds.has(id)) {
    acceptedOut.push({
      ...row,
      pipeline_decision: "accepted",
      manual_override: "include",
    });
    return;
  }

  if (
    isShortsUrl(row.youtube_url, id) ||
    titleContainsExcludedContentMarker(row.title, row.description) ||
    isBelowMinEpisodeDuration(row.duration_seconds)
  ) {
    return;
  }

  const c = classifyPodcastUpload(row);
  if (c.ok) {
    acceptedOut.push({
      ...row,
      episode_number: c.episodeNumber,
      pipeline_decision: "accepted",
      pipeline_reason: "matched_rules",
    });
  } else if (String(c.reason || "") === "no_episode_number") {
    acceptedOut.push({
      ...row,
      episode_number: null,
      pipeline_decision: "accepted",
      pipeline_reason: "playlist_full_episode",
    });
  } else {
    acceptedOut.push({
      ...row,
      episode_number: null,
      pipeline_decision: "accepted",
      pipeline_reason: "playlist_trust_fallback",
      playlist_classify_note: String(c.reason || ""),
    });
  }
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {{ excludeVideoIds?: Set<string>, forceIncludeVideoIds?: Set<string>, maxAccepted?: number }} opts
 */
function acceptOfficialPlaylistCandidates(rows, opts = {}) {
  const maxAccepted = Math.max(10, Number(opts.maxAccepted) || 200);
  const excludeVideoIds = opts.excludeVideoIds instanceof Set ? opts.excludeVideoIds : new Set();
  const forceIncludeVideoIds = opts.forceIncludeVideoIds instanceof Set ? opts.forceIncludeVideoIds : new Set();
  const accepted = [];
  for (const row of rows) {
    tryAcceptPlaylistRow(row, excludeVideoIds, forceIncludeVideoIds, maxAccepted, accepted);
    if (accepted.length >= maxAccepted) break;
  }
  return sortByPublishedDesc(accepted);
}

/**
 * @param {string} playlistId
 * @param {{ excludeVideoIds?: Set<string>, forceIncludeVideoIds?: Set<string>, maxAccepted?: number }} opts
 */
function mapPlaylistFeedRowsToCandidates(rows) {
  return (rows || []).map((r) => ({
    youtube_video_id: r.youtube_video_id,
    title: r.title,
    description: r.description,
    published_at: r.published_at,
    thumbnail_url: r.thumbnail_url,
    youtube_url: r.youtube_url,
    duration_seconds: r.duration_seconds ?? null,
    view_count: r.view_count ?? null,
  }));
}

async function fetchAcceptedFromPlaylistFeed(playlistId, opts) {
  const maxAccepted = Math.max(10, Number(opts.maxAccepted) || 200);
  const html = await fetchPlaylistVideosFromHtmlFallback(playlistId, { maxItems: maxAccepted + 20 });
  if (html.ok && html.videos.length) {
    const videos = acceptOfficialPlaylistCandidates(mapPlaylistFeedRowsToCandidates(html.videos), opts);
    return { ok: true, videos, scannedPages: 0, source: html.source || "playlist_html" };
  }
  const rss = await fetchPlaylistVideosFromRssFallback(playlistId, { maxItems: maxAccepted + 20 });
  if (!rss.ok) {
    return { ok: false, error: rss.error || html.error, videos: [], scannedPages: 0, source: "playlist_feed" };
  }
  const videos = acceptOfficialPlaylistCandidates(mapPlaylistFeedRowsToCandidates(rss.videos), opts);
  return {
    ok: true,
    videos,
    scannedPages: 0,
    source: rss.source || "playlist_rss",
  };
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

  if (!youtubeApiKeyConfigured()) {
    return fetchAcceptedFromPlaylistFeed(playlistId, { excludeVideoIds, forceIncludeVideoIds, maxAccepted });
  }

  const accepted = [];
  const seen = new Set();
  let token = "";
  let scannedPages = 0;

  for (; scannedPages < maxPages && accepted.length < maxAccepted; scannedPages += 1) {
    const page = await fetchPlaylistItemsPage(playlistId, token);
    if (!page.ok) {
      if (page.error === "missing_youtube_api_key") {
        return fetchAcceptedFromPlaylistRss(playlistId, { excludeVideoIds, forceIncludeVideoIds, maxAccepted });
      }
      const rssFallback = await fetchAcceptedFromPlaylistRss(playlistId, {
        excludeVideoIds,
        forceIncludeVideoIds,
        maxAccepted,
      });
      if (rssFallback.ok && rssFallback.videos.length) return rssFallback;
      return { ok: false, error: page.error, videos: sortByPublishedDesc(accepted), scannedPages };
    }

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
      if (!detail.ok) {
        if (detail.error === "missing_youtube_api_key") {
          return fetchAcceptedFromPlaylistFeed(playlistId, { excludeVideoIds, forceIncludeVideoIds, maxAccepted });
        }
        const feedFallback = await fetchAcceptedFromPlaylistFeed(playlistId, {
          excludeVideoIds,
          forceIncludeVideoIds,
          maxAccepted,
        });
        if (feedFallback.ok && feedFallback.videos.length) return feedFallback;
        return { ok: false, error: detail.error, videos: sortByPublishedDesc(accepted), scannedPages };
      }

      for (const id of ids) {
        if (accepted.length >= maxAccepted) break;
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
        tryAcceptPlaylistRow(row, excludeVideoIds, forceIncludeVideoIds, maxAccepted, accepted);
      }
    }

    if (!page.nextPageToken) break;
    token = page.nextPageToken;
  }

  if (!accepted.length) {
    const feedFallback = await fetchAcceptedFromPlaylistFeed(playlistId, {
      excludeVideoIds,
      forceIncludeVideoIds,
      maxAccepted,
    });
    if (feedFallback.ok && feedFallback.videos.length) return feedFallback;
  }

  return {
    ok: true,
    videos: sortByPublishedDesc(accepted),
    scannedPages,
    source: "youtube_api",
  };
}
