import { classifyPodcastUpload, sortByPublishedDesc } from "./episodeParser";
import { takeLatestAccepted, partitionEpisodesPipeline } from "./episodePipeline";
import { fetchRecentUploadsFromRssFallback } from "./youtubeUploadsServer";
import { fetchUploadsUntilAcceptedCount } from "./fetchUploadsUntilAccepted";
import { extractGuestHeuristic } from "./guestHeuristics";

const MIN_PUBLIC_EPISODES = 10;
const DB_EPISODE_FETCH_LIMIT = 400;

/**
 * Avoid showing playlist / episode titles as a person's name on featured cards.
 * @param {string} name
 * @param {string} epTitle
 */
function guestNameLooksLikeEpisodeMetadata(name, epTitle) {
  const n = String(name || "").trim();
  const t = String(epTitle || "").trim();
  if (!n) return true;
  if (t && n === t) return true;
  if (t && n.length > 20 && (t.includes(n) || n.includes(t))) return true;
  const lower = n.toLowerCase();
  if (/\b(ep\.?|episode|e\d+|season\s*\d+|#\d{2,}|full episode|clip|highlight|podcast)\b/i.test(lower)) return true;
  if (n.length > 96) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} row
 */
export function episodeRowIsPublicListed(row) {
  if (!row) return false;
  if (String(row.manual_override || "") === "exclude") return false;
  if (String(row.manual_override || "") === "include") return true;
  const d = String(row.pipeline_decision || "");
  if (d === "accepted") return true;
  if (d === "rejected") return false;
  const c = classifyPodcastUpload(row);
  return c.ok;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient | null} admin
 * @returns {Promise<{ episodes: any[], featuredGuests: any[], source: string, degraded: boolean, error?: string }>}
 */
export async function loadPublicPodcastLandingData(admin) {
  let episodes = [];
  let featuredGuests = [];
  let source = "supabase";
  let degraded = false;
  let error;

  async function mergeRuntimeAcceptedIntoMap(byVideoId, minTotal) {
    const apiTry = await fetchUploadsUntilAcceptedCount({
      targetAccepted: Math.max(18, minTotal + 8),
      maxPages: 42,
    });
    let raw = [];
    if (apiTry.ok && apiTry.videos?.length) {
      raw = apiTry.videos;
      if (source === "supabase") source = "supabase+youtube_api_runtime";
    } else {
      const rss = await fetchRecentUploadsFromRssFallback();
      raw = rss.videos || [];
      if (source === "supabase") source = rss.ok ? "supabase+rss_runtime" : "supabase+rss_failed";
      if (!rss.ok) error = apiTry.error || rss.error;
    }
    const { accepted } = partitionEpisodesPipeline(raw);
    const runtimeSorted = sortByPublishedDesc(accepted);
    for (const r of runtimeSorted) {
      const vid = String(r.youtube_video_id || "").trim();
      if (!vid || byVideoId.has(vid)) continue;
      byVideoId.set(vid, {
        ...r,
        id: vid,
        pipeline_decision: "accepted",
      });
      if (byVideoId.size >= minTotal) break;
    }
  }

  if (admin) {
    const { data: epData, error: epErr } = await admin
      .from("podcast_episodes")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(DB_EPISODE_FETCH_LIMIT);
    if (!epErr && Array.isArray(epData)) {
      const allListed = sortByPublishedDesc(epData.filter(episodeRowIsPublicListed));
      const byVideoId = new Map(
        allListed.map((e) => [String(e.youtube_video_id || "").trim(), e]).filter(([id]) => id),
      );
      episodes = sortByPublishedDesc([...byVideoId.values()])
        .filter(episodeRowIsPublicListed)
        .slice(0, MIN_PUBLIC_EPISODES);

      if (episodes.length < MIN_PUBLIC_EPISODES) {
        degraded = true;
        await mergeRuntimeAcceptedIntoMap(byVideoId, MIN_PUBLIC_EPISODES);
        episodes = sortByPublishedDesc([...byVideoId.values()])
          .filter(episodeRowIsPublicListed)
          .slice(0, MIN_PUBLIC_EPISODES);
      }
    }
    const topFour = episodes.slice(0, 4);
    const videoIds = topFour.map((e) => e.youtube_video_id).filter(Boolean);
    if (videoIds.length) {
      const { data: fg } = await admin.from("podcast_episode_featured_guest").select("*").in("youtube_video_id", videoIds);
      const map = new Map((fg || []).map((r) => [r.youtube_video_id, r]));
      featuredGuests = topFour.map((ep) => {
        const row = map.get(ep.youtube_video_id);
        if (!row) return guestShapeFromEpisodeOnly(ep);
        return featuredGuestToCardShape(row, ep);
      });
    } else {
      featuredGuests = [];
    }
  }

  if (!episodes.length) {
    degraded = true;
    const apiTry = await fetchUploadsUntilAcceptedCount({ targetAccepted: 14, maxPages: 30 });
    let raw = [];
    if (apiTry.ok && apiTry.videos?.length) {
      raw = apiTry.videos;
      source = "youtube_api_runtime";
    } else {
      const rss = await fetchRecentUploadsFromRssFallback();
      raw = rss.videos || [];
      source = rss.ok ? "rss_runtime" : "none";
      if (!rss.ok) error = apiTry.error || rss.error;
    }
    const { accepted } = partitionEpisodesPipeline(raw);
    episodes = takeLatestAccepted(accepted, MIN_PUBLIC_EPISODES).map((r) => ({
      ...r,
      id: r.youtube_video_id,
      pipeline_decision: "accepted",
    }));
    featuredGuests = episodes.slice(0, 4).map((ep) => guestShapeFromEpisodeOnly(ep));
  }

  return { episodes, featuredGuests, source, degraded, error };
}

/**
 * @param {Record<string, unknown>} ep
 */
function guestShapeFromEpisodeOnly(ep) {
  const vid = String(ep?.youtube_video_id || "");
  const slug = `ep-${vid}`;
  const epTitle = String(ep?.title || "");
  const h = extractGuestHeuristic(epTitle, String(ep?.description || ""));
  let guestName = String(h.guestName || "").trim() || "Guest";
  if (guestNameLooksLikeEpisodeMetadata(guestName, epTitle)) guestName = "Guest";
  const unverified = !h.confidence || h.confidence < 0.75 || guestName === "Guest";
  const watch = String(ep?.youtube_url || "").trim() || (vid ? `https://www.youtube.com/watch?v=${vid}` : "");
  return {
    id: slug,
    slug,
    name: guestName,
    title: [h.roleTitle, h.organization].filter(Boolean).join(" · ") || "Podcast guest",
    bio: h.shortBio || "Profile details are being verified by the editorial team.",
    avatar_url: "",
    upcoming: false,
    unverified,
    discussionSummary: h.discussionSummary,
    episodeYoutubeId: vid,
    episodeWatchUrl: watch,
  };
}

/**
 * @param {Record<string, unknown>} row featured_guest row
 * @param {Record<string, unknown>} ep episode row
 */
function featuredGuestToCardShape(row, ep) {
  const vid = String(row.youtube_video_id || ep.youtube_video_id || "");
  const slug = String(row.public_slug || `ep-${vid}`);
  const verified = !!row.verified_for_public;
  const conf = Number(row.confidence_score);
  const epTitle = String(ep?.title || "").trim();
  const h = extractGuestHeuristic(epTitle, String(ep?.description || ""));
  let name = String(row.guest_name || "").trim();
  if (!name || name.length > 72 || name === epTitle || guestNameLooksLikeEpisodeMetadata(name, epTitle)) {
    name = String(h.guestName || "").trim() || "Guest";
  }
  if (guestNameLooksLikeEpisodeMetadata(name, epTitle)) name = "Guest";
  const avatar =
    String(row.admin_profile_image_url || "").trim() ||
    String(row.profile_image_url || "").trim() ||
    "";
  const adminBio = String(row.short_bio || "").trim();
  const bio =
    adminBio ||
    (verified ? h.shortBio : h.shortBio || "We are confirming guest details from this episode before publishing a full bio.");
  const rawDisc = String(row.discussion_summary || "").trim();
  const discOk = verified && rawDisc && rawDisc.length <= 260 && !/https?:\/\//i.test(rawDisc);
  const discussionSummary = discOk ? rawDisc : h.discussionSummary;
  const watch = String(ep?.youtube_url || "").trim() || (vid ? `https://www.youtube.com/watch?v=${vid}` : "");
  return {
    id: slug,
    slug,
    name,
    title: [String(row.role_title || "").trim(), String(row.organization || "").trim()].filter(Boolean).join(" · ") || "Podcast guest",
    bio: bio || guestShapeFromEpisodeOnly(ep).bio,
    avatar_url: avatar,
    upcoming: false,
    unverified: !verified && (!Number.isFinite(conf) || conf < 0.75),
    discussionSummary,
    episodeYoutubeId: vid,
    episodeWatchUrl: watch,
  };
}
