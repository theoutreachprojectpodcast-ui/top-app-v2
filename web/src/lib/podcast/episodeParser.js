/**
 * Episode numbering + exclusion heuristics for The Outreach Project podcast YouTube uploads.
 * Pure functions — safe for server and client bundles that only import this module.
 */

/** @type {readonly RegExp[]} */
const EPISODE_NUMBER_PATTERNS = [
  /\bpodcast\s+episode\s*#?\s*(\d{1,4})\b/i,
  /\bepisode\s*#?\s*(\d{1,4})\b/i,
  /\bep\.?\s*#?\s*(\d{1,4})\b/i,
  /\bep\s+(\d{1,4})\b/i,
  /\be(\d{1,4})\b/i,
  /\b#\s*(\d{1,4})\b/,
];

/** Lowercase tokens — title/description checked as substring (bounded words where noted). */
const EXCLUDE_TITLE_SUBSTRINGS = [
  "shorts",
  "#shorts",
  " youtube short",
  " clip",
  " clips",
  " teaser",
  " trailer",
  "highlight reel",
  " highlight reel",
  " highlight:",
  " highlights",
  " preview",
  " coming soon",
  " announcement",
  " promo",
  " snippet",
  " excerpt",
  " after show",
  " behind the scenes",
  " bloopers",
];

const SHORTS_PATH = "/shorts/";

export function minFullEpisodeDurationSeconds() {
  const raw = String(process.env.PODCAST_MIN_FULL_EPISODE_SECONDS || "").trim();
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 0) return n;
  return 420; // 7 minutes — drops typical Shorts; tune via env
}

/**
 * @param {string} text
 * @returns {{ episodeNumber: number, label: string } | null}
 */
export function extractEpisodeNumberFromText(text = "") {
  const hay = String(text || "").trim();
  if (!hay) return null;
  for (const re of EPISODE_NUMBER_PATTERNS) {
    const m = hay.match(re);
    if (!m) continue;
    const raw = m[1] ?? m[2];
    const n = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(n) || n < 1 || n > 5000) continue;
    return { episodeNumber: n, label: String(raw) };
  }
  return null;
}

/**
 * @param {string} title
 * @param {string} [description]
 * @returns {boolean}
 */
export function titleContainsExcludedContentMarker(title = "", description = "") {
  const t = `${String(title || "")} ${String(description || "")}`.toLowerCase();
  for (const sub of EXCLUDE_TITLE_SUBSTRINGS) {
    if (t.includes(sub)) return true;
  }
  return false;
}

/**
 * @param {string} watchUrl
 * @param {string} [videoId]
 */
export function isShortsUrl(watchUrl = "", videoId = "") {
  const u = String(watchUrl || "").toLowerCase();
  if (u.includes(SHORTS_PATH)) return true;
  if (u.includes("youtube.com/shorts")) return true;
  return false;
}

/**
 * @param {number | null | undefined} durationSeconds
 * @returns {boolean} true if should exclude as too short for a full episode
 */
export function isBelowMinEpisodeDuration(durationSeconds) {
  if (durationSeconds == null || durationSeconds === undefined) return false;
  const n = Number(durationSeconds);
  if (!Number.isFinite(n) || n <= 0) return false;
  return n < minFullEpisodeDurationSeconds();
}

/**
 * @param {{
 *   youtube_video_id: string,
 *   title: string,
 *   description?: string,
 *   youtube_url?: string,
 *   duration_seconds?: number | null,
 * }} row
 * @returns {{ ok: true, episodeNumber: number } | { ok: false, reason: string }}
 */
export function classifyPodcastUpload(row) {
  const id = String(row?.youtube_video_id || "").trim();
  const title = String(row?.title || "").trim();
  const description = String(row?.description || "").trim();
  const youtubeUrl = String(row?.youtube_url || "").trim() || (id ? `https://www.youtube.com/watch?v=${id}` : "");

  if (!id) return { ok: false, reason: "missing_video_id" };
  if (isShortsUrl(youtubeUrl, id)) return { ok: false, reason: "shorts_url" };

  const ep = extractEpisodeNumberFromText(title) || extractEpisodeNumberFromText(description);
  if (!ep) return { ok: false, reason: "no_episode_number" };

  if (titleContainsExcludedContentMarker(title, description)) {
    return { ok: false, reason: "excluded_keyword" };
  }

  const dur = row?.duration_seconds;
  if (isBelowMinEpisodeDuration(dur)) {
    return { ok: false, reason: "duration_below_threshold" };
  }

  return { ok: true, episodeNumber: ep.episodeNumber };
}

/**
 * Sort by published_at desc (ISO strings).
 * @param {Array<Record<string, unknown>>} rows
 */
export function sortByPublishedDesc(rows) {
  return [...rows].sort((a, b) => {
    const ta = Date.parse(String(a?.published_at || "")) || 0;
    const tb = Date.parse(String(b?.published_at || "")) || 0;
    return tb - ta;
  });
}
