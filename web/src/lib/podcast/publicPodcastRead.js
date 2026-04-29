import { classifyPodcastUpload, sortByPublishedDesc } from "./episodeParser";
import { takeLatestAccepted, partitionEpisodesPipeline } from "./episodePipeline";
import { fetchRecentUploadsFromRssFallback } from "./youtubeUploadsServer";
import { fetchUploadsUntilAcceptedCount } from "./fetchUploadsUntilAccepted";
import { extractGuestHeuristic } from "./guestHeuristics";

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

  if (admin) {
    const { data: epData, error: epErr } = await admin
      .from("podcast_episodes")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(120);
    if (!epErr && Array.isArray(epData)) {
      episodes = sortByPublishedDesc(epData.filter(episodeRowIsPublicListed)).slice(0, 10);
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
    episodes = takeLatestAccepted(accepted, 10).map((r) => ({
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
  const h = extractGuestHeuristic(String(ep?.title || ""), String(ep?.description || ""));
  const unverified = !h.confidence || h.confidence < 0.75;
  const watch = String(ep?.youtube_url || "").trim() || (vid ? `https://www.youtube.com/watch?v=${vid}` : "");
  return {
    id: slug,
    slug,
    name: h.guestName || "Guest",
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
  const h = extractGuestHeuristic(String(ep?.title || ""), String(ep?.description || ""));
  let name = String(row.guest_name || "").trim();
  const epTitle = String(ep?.title || "").trim();
  if (!name || name.length > 72 || name === epTitle) {
    name = h.guestName || "Guest";
  }
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
