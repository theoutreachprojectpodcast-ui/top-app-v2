/**
 * YouTube Data API v3 — uploads playlist only (Videos tab equivalent). Server-only; never expose API key.
 */

import {
  discoverChannelId,
  parseYoutubeFeed,
  youtubeFeedUrls,
} from "../../features/podcasts/domain/youtubeFeed";

const API = "https://www.googleapis.com/youtube/v3";

function cleanKey() {
  return String(
    process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || process.env.GOOGLE_API_KEY || ""
  ).trim();
}

export function youtubeApiKeyConfigured() {
  return Boolean(cleanKey());
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

/**
 * Decode a JSON-escaped string captured from YouTube's inline page data.
 * @param {string} raw
 */
function decodeYoutubeInlineString(raw = "") {
  const s = String(raw || "");
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s.replace(/\\u0026/g, "&").replace(/\\"/g, '"');
  }
}

/**
 * Parse public playlist page HTML when Atom RSS is unavailable (404).
 * @param {string} html
 * @param {number} [maxItems]
 */
export function parsePlaylistPageHtmlVideos(html = "", maxItems = 50) {
  const text = String(html || "");
  const cap = Math.max(1, Number(maxItems) || 50);
  const videos = [];
  const seen = new Set();
  const re =
    /"playlistVideoRenderer"\s*:\s*\{[\s\S]*?"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"[\s\S]*?"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = re.exec(text)) && videos.length < cap) {
    const id = match[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const title = decodeYoutubeInlineString(match[2]);
    videos.push({
      youtube_video_id: id,
      title,
      description: "",
      published_at: null,
      thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      youtube_url: `https://www.youtube.com/watch?v=${id}`,
      view_count: null,
    });
  }
  return videos;
}

/**
 * Playlist page scrape — no API key (YouTube playlist Atom feed often 404).
 * @param {string} playlistId
 * @param {{ maxItems?: number }} [opts]
 */
export async function fetchPlaylistVideosFromHtmlFallback(playlistId, opts = {}) {
  const pid = String(playlistId || "").trim();
  if (!pid) return { ok: false, error: "missing_playlist_id", videos: [], source: "playlist_html" };
  const maxItems = Math.max(1, Number(opts.maxItems) || 50);
  const pageUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(pid)}`;
  try {
    const res = await fetch(pageUrl, {
      redirect: "follow",
      next: { revalidate: 0 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheOutreachProject-Podcast/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      return { ok: false, error: `playlist_html_http_${res.status}`, videos: [], source: "playlist_html" };
    }
    const html = await res.text();
    const videos = parsePlaylistPageHtmlVideos(html, maxItems);
    if (!videos.length) {
      return { ok: false, error: "playlist_html_empty", videos: [], source: "playlist_html" };
    }
    return { ok: true, videos, source: "playlist_html" };
  } catch (e) {
    return { ok: false, error: String(e?.message || e || "playlist_html_failed"), videos: [], source: "playlist_html" };
  }
}

/**
 * Official playlist Atom feed — no API key (thumbnails + titles from feed).
 * Falls back to playlist page HTML when the feed returns 404.
 * @param {string} playlistId
 * @param {{ maxItems?: number }} [opts]
 */
export async function fetchPlaylistVideosFromRssFallback(playlistId, opts = {}) {
  const pid = String(playlistId || "").trim();
  if (!pid) return { ok: false, error: "missing_playlist_id", videos: [], source: "playlist_rss" };
  const maxItems = Math.max(1, Number(opts.maxItems) || 50);
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(pid)}`;
  try {
    const res = await fetch(feedUrl, { redirect: "follow", next: { revalidate: 0 } });
    if (res.ok) {
      const xml = await res.text();
      const rows = parseYoutubeFeed(xml).slice(0, maxItems);
      if (rows.length) return { ok: true, videos: rows, source: "playlist_rss" };
    }
  } catch {
    /* try HTML fallback */
  }
  const html = await fetchPlaylistVideosFromHtmlFallback(pid, { maxItems });
  if (html.ok && html.videos.length) return html;
  return {
    ok: false,
    error: html.error || "playlist_rss_unavailable",
    videos: [],
    source: "playlist_rss",
  };
}
