/**
 * v0.8 — Curated public podcast landing strip (ordered slots).
 * Real YouTube rows are matched conservatively from the official playlist pool; unmatched slots stay placeholders.
 */

export const PODCAST_LANDING_CURATED_SLOT_COUNT = 21;

/** Display order for the landing “episode library” strip (curator-facing labels). */
export const PODCAST_LANDING_CURATED_LABELS = [
  "Hometown Hero Outdoors",
  "Veterans Creed Outdoors",
  "Warrior's Refuge",
  "Frontline Healing Foundation",
  "Southern Outdoor Dreams",
  "Freedom Alliance",
  "Justin Brewster",
  "Hero's Journey",
  "Tyler Burgett",
  "Rucking Realty Group",
  "Rope Solutions",
  "Hero to the Line",
  "Brain Treatment Center hosts",
  "Backcountry Heroes",
  "Say When and Remember Him",
  "Christian Mangino",
  "MOS Veteran Adventures",
  "Hoof to Heart Veterans",
  "The Fallen Outdoors",
  "Rope Solutions",
  "Sheepdog Impact Assistance",
];

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "hosts",
  "host",
  "podcast",
  "episode",
  "full",
  "outreach",
  "project",
]);

/**
 * @param {string} label
 * @returns {string[]}
 */
function labelTokens(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * @param {string} label
 * @param {Record<string, unknown>} ep
 */
function episodeMatchScore(label, ep) {
  const tokens = labelTokens(label);
  if (!tokens.length) return 0;
  const hay = `${String(ep.title || "")} ${String(ep.description || "")}`.toLowerCase();
  let hit = 0;
  for (const t of tokens) {
    if (hay.includes(t)) hit += 1;
  }
  const need = Math.min(2, tokens.length);
  return hit >= need ? hit : 0;
}

/**
 * @param {string} label
 * @param {Record<string, unknown>[]} pool
 * @param {Set<string>} usedVideoIds
 * @returns {Record<string, unknown> | null}
 */
function pickBestEpisode(label, pool, usedVideoIds) {
  let best = null;
  let bestScore = 0;
  for (const ep of pool) {
    const vid = String(ep?.youtube_video_id || ep?.video_id || "").trim();
    if (!vid || usedVideoIds.has(vid)) continue;
    const sc = episodeMatchScore(label, ep);
    if (sc > bestScore) {
      bestScore = sc;
      best = ep;
    }
  }
  if (best && bestScore > 0) {
    const vid = String(best?.youtube_video_id || best?.video_id || "").trim();
    if (vid) usedVideoIds.add(vid);
    return best;
  }
  return null;
}

/**
 * Optional DB/admin pins: `sort_order` matches strip index (0-based). When `youtube_video_id` is set,
 * that episode is used for the slot if present in the pool; otherwise a minimal live row is built from the id.
 * @typedef {{ sort_order?: number, curator_label?: string | null, youtube_video_id?: string | null }} PodcastLandingCuratedSlotOverride
 */

/**
 * @param {Record<string, unknown>[]} mergedPlaylistEpisodes accepted, public-listed episodes
 * @param {PodcastLandingCuratedSlotOverride[]} [slotOverrides]
 * @returns {Record<string, unknown>[]}
 */
export function buildCuratedPodcastLandingEpisodes(mergedPlaylistEpisodes = [], slotOverrides = []) {
  const pool = Array.isArray(mergedPlaylistEpisodes) ? [...mergedPlaylistEpisodes] : [];
  const used = new Set();
  /** @type {Map<number, PodcastLandingCuratedSlotOverride>} */
  const overrideByIndex = new Map();
  for (const o of Array.isArray(slotOverrides) ? slotOverrides : []) {
    const idx = Number(o?.sort_order);
    if (!Number.isFinite(idx) || idx < 0 || idx >= PODCAST_LANDING_CURATED_SLOT_COUNT) continue;
    overrideByIndex.set(idx, o);
  }

  const out = [];
  for (let i = 0; i < PODCAST_LANDING_CURATED_LABELS.length; i += 1) {
    const ov = overrideByIndex.get(i);
    const labelFromOv = String(ov?.curator_label || "").trim();
    const label = labelFromOv || PODCAST_LANDING_CURATED_LABELS[i];
    const forcedVid = String(ov?.youtube_video_id || "").trim();

    if (forcedVid) {
      const inPool = pool.find((e) => String(e?.youtube_video_id || e?.video_id || "").trim() === forcedVid);
      if (inPool && !used.has(forcedVid)) {
        used.add(forcedVid);
        out.push({
          ...inPool,
          curated_slot_index: i,
          curated_slot_label: label,
          episode_link_status: "live",
        });
        continue;
      }
      if (!used.has(forcedVid)) {
        used.add(forcedVid);
        out.push({
          id: `curated-slot-${i}-pinned`,
          youtube_video_id: forcedVid,
          youtube_url: `https://www.youtube.com/watch?v=${forcedVid}`,
          title: label,
          description:
            "Pinned episode for this curated slot. Metadata may fill in as the episode is synced in our library.",
          thumbnail_url: "",
          published_at: "",
          view_count: "",
          curated_slot_index: i,
          curated_slot_label: label,
          episode_link_status: "live",
        });
        continue;
      }
    }

    const hit = pickBestEpisode(label, pool, used);
    if (hit) {
      out.push({
        ...hit,
        curated_slot_index: i,
        curated_slot_label: label,
        episode_link_status: "live",
      });
    } else {
      out.push({
        id: `curated-slot-${i}`,
        youtube_video_id: "",
        youtube_url: "",
        title: label,
        description:
          "We are verifying the matching YouTube full episode for this guest or organization. Watch other episodes on the channel while we finalize this link.",
        thumbnail_url: "",
        published_at: "",
        view_count: "",
        curated_slot_index: i,
        curated_slot_label: label,
        episode_link_status: "needs_link",
      });
    }
  }
  return out.slice(0, PODCAST_LANDING_CURATED_SLOT_COUNT);
}
