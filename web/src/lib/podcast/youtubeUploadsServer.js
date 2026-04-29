/**
 * YouTube Data API v3 — uploads playlist only (Videos tab equivalent). Server-only; never expose API key.
 */

import { discoverChannelId, parseYoutubeFeed, youtubeFeedUrls } from "../../features/podcasts/domain/youtubeFeed";

const API = "https://www.googleapis.com/youtube/v3";

function cleanKey() {
  return String(process.env.YOUTUBE_API_KEY || "").trim();
}

export function youtubeChannelIdConfigured() {
  const id = String(process.env.YOUTUBE_CHANNEL_ID || "").trim();
  return Boolean(id);
}

export async function resolveYoutubeChannelId() {
  const fromEnv = String(process.env.YOUTUBE_CHANNEL_ID || "").trim();
  if (fromEnv) return fromEnv;
  return discoverChannelId();
}

async function ytGet(path, params) {
  const key = cleanKey();
  if (!key) return { ok: false, error: "missing_youtube_api_key" };
  const url = new URL(`${API}/${path}`);
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message || `youtube_http_${res.status}` };
  }
  return { ok: true, json };
}

/**
 * @param {string} channelId
 * @returns {Promise<string>}
 */
export async function fetchUploadsPlaylistId(channelId) {
  const id = String(channelId || "").trim();
  if (!id) return "";
  const r = await ytGet("channels", { part: "contentDetails", id });
  if (!r.ok) return "";
  const pl = r.json?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  return String(pl || "").trim();
}

/**
 * ISO 8601 duration to seconds (PT1H2M3S).
 * @param {string} iso
 */
export function parseIso8601DurationSeconds(iso = "") {
  const s = String(iso || "").trim();
  if (!s.startsWith("P")) return null;
  let sec = 0;
  const h = s.match(/(\d+)H/);
  const m = s.match(/(\d+)M/);
  const secMatch = s.match(/(\d+(?:\.\d+)?)S/);
  if (h) sec += Number.parseInt(h[1], 10) * 3600;
  if (m) sec += Number.parseInt(m[1], 10) * 60;
  if (secMatch) sec += Math.round(Number.parseFloat(secMatch[1]));
  return Number.isFinite(sec) ? sec : null;
}

/**
 * @param {string} playlistId
 * @param {string} [pageToken]
 */
export async function fetchPlaylistItemsPage(playlistId, pageToken = "") {
  const pid = String(playlistId || "").trim();
  if (!pid) return { ok: false, error: "missing_playlist_id", items: [], nextPageToken: "" };
  const params = { part: "snippet,contentDetails", playlistId: pid, maxResults: 50 };
  if (pageToken) params.pageToken = pageToken;
  const r = await ytGet("playlistItems", params);
  if (!r.ok) return { ok: false, error: r.error, items: [], nextPageToken: "" };
  const items = Array.isArray(r.json?.items) ? r.json.items : [];
  const next = String(r.json?.nextPageToken || "").trim();
  return { ok: true, items, nextPageToken: next };
}

/**
 * @param {string[]} videoIds
 */
export async function fetchVideosByIds(videoIds) {
  const ids = [...new Set(videoIds.map((x) => String(x || "").trim()).filter(Boolean))];
  if (!ids.length) return { ok: true, byId: {} };
  const byId = {};
  const chunkSize = 45;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const r = await ytGet("videos", { part: "snippet,contentDetails", id: chunk.join(",") });
    if (!r.ok) return { ok: false, error: r.error, byId };
    for (const it of r.json?.items || []) {
      const id = String(it?.id || "").trim();
      if (!id) continue;
      const durIso = String(it?.contentDetails?.duration || "");
      const dur = parseIso8601DurationSeconds(durIso);
      byId[id] = {
        title: String(it?.snippet?.title || "").trim(),
        description: String(it?.snippet?.description || "").trim(),
        published_at: String(it?.snippet?.publishedAt || "").trim() || null,
        duration_seconds: dur,
        thumbnails: it?.snippet?.thumbnails || {},
      };
    }
  }
  return { ok: true, byId };
}

/**
 * Full uploads pipeline: playlist items → video details.
 * @param {{ maxPlaylistItems?: number }} opts
 */
export async function fetchRecentUploadsWithDetails(opts = {}) {
  const maxItems = Number(opts.maxPlaylistItems) > 0 ? Number(opts.maxPlaylistItems) : 50;
  const channelId = await resolveYoutubeChannelId();
  if (!channelId) return { ok: false, error: "missing_channel_id", videos: [] };

  const key = cleanKey();
  if (!key) return { ok: false, error: "missing_youtube_api_key", videos: [] };

  const uploadsId = await fetchUploadsPlaylistId(channelId);
  if (!uploadsId) return { ok: false, error: "missing_uploads_playlist", videos: [] };

  const collected = [];
  let token = "";
  while (collected.length < maxItems) {
    const page = await fetchPlaylistItemsPage(uploadsId, token);
    if (!page.ok) return { ok: false, error: page.error, videos: collected };
    for (const it of page.items) {
      const vid = String(it?.contentDetails?.videoId || it?.snippet?.resourceId?.videoId || "").trim();
      if (!vid) continue;
      collected.push({ youtube_video_id: vid });
      if (collected.length >= maxItems) break;
    }
    if (collected.length >= maxItems || !page.nextPageToken) break;
    token = page.nextPageToken;
  }

  const ids = collected.map((c) => c.youtube_video_id);
  const detail = await fetchVideosByIds(ids);
  if (!detail.ok) return { ok: false, error: detail.error, videos: [] };

  const videos = [];
  for (const id of ids) {
    const d = detail.byId[id];
    if (!d) continue;
    const thumb =
      d.thumbnails?.maxres?.url ||
      d.thumbnails?.high?.url ||
      d.thumbnails?.medium?.url ||
      d.thumbnails?.default?.url ||
      "";
    const views = null;
    videos.push({
      youtube_video_id: id,
      title: d.title,
      description: d.description,
      published_at: d.published_at,
      thumbnail_url: thumb,
      youtube_url: `https://www.youtube.com/watch?v=${id}`,
      duration_seconds: d.duration_seconds,
      view_count: views,
    });
  }
  return { ok: true, videos };
}

/**
 * RSS fallback when API key missing (no duration — parser skips duration rule when null).
 */
export async function fetchRecentUploadsFromRssFallback() {
  const channelId = await resolveYoutubeChannelId();
  const urls = youtubeFeedUrls(channelId);
  for (const feedUrl of urls) {
    const res = await fetch(feedUrl, { redirect: "follow", next: { revalidate: 0 } });
    if (!res.ok) continue;
    const xml = await res.text();
    const rows = parseYoutubeFeed(xml);
    if (rows.length) return { ok: true, videos: rows, source: "rss" };
  }
  return { ok: false, error: "rss_unavailable", videos: [], source: "rss" };
}
