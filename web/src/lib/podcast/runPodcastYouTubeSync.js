import { createClient } from "@supabase/supabase-js";
import { extractGuestHeuristic } from "./guestHeuristics";
import { takeLatestAccepted, partitionEpisodesPipeline } from "./episodePipeline";
import { fetchRecentUploadsFromRssFallback, fetchRecentUploadsWithDetails } from "./youtubeUploadsServer";

const EPISODES_TABLE = "podcast_episodes";
const LOG_TABLE = "podcast_sync_logs";
const FEATURED_TABLE = "podcast_episode_featured_guest";

function publicSlugForVideo(videoId) {
  return `ep-${String(videoId || "").trim()}`;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
async function writeLog(supabase, level, message, meta = {}) {
  try {
    await supabase.from(LOG_TABLE).insert({ level, message, meta: meta || {} });
  } catch {
    // table may not exist yet
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ dryRun?: boolean }} [opts]
 */
export async function runPodcastYouTubeSync(supabase, opts = {}) {
  const dryRun = !!opts.dryRun;
  const apiTry = await fetchRecentUploadsWithDetails({ maxPlaylistItems: 60 });
  let videos = [];
  let source = "youtube_api";
  if (!apiTry.ok || !apiTry.videos?.length) {
    const rss = await fetchRecentUploadsFromRssFallback();
    if (!rss.ok || !rss.videos?.length) {
      await writeLog(supabase, "error", "podcast_sync_no_source", { apiError: apiTry.error, rssError: rss.error });
      return { ok: false, error: apiTry.error || rss.error || "no_videos", synced: 0 };
    }
    videos = rss.videos;
    source = rss.source || "rss";
    await writeLog(supabase, "warn", "podcast_sync_using_rss_fallback", { apiError: apiTry.error });
  } else {
    videos = apiTry.videos;
  }

  const { accepted, rejected } = partitionEpisodesPipeline(videos);
  const topAccepted = takeLatestAccepted(accepted, 50);
  const topRejectedSample = rejected.slice(0, 30);

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      source,
      acceptedPreview: takeLatestAccepted(accepted, 10),
      rejectedCount: rejected.length,
    };
  }

  const nowIso = new Date().toISOString();
  const rowsForDb = [...topAccepted, ...rejected.slice(0, 80)].map((row) => {
    const isAcc = row.pipeline_decision === "accepted";
    return {
      youtube_video_id: row.youtube_video_id,
      title: row.title,
      description: row.description || "",
      published_at: row.published_at || null,
      thumbnail_url: row.thumbnail_url || "",
      youtube_url: row.youtube_url || "",
      duration_seconds: row.duration_seconds ?? null,
      view_count: row.view_count ?? null,
      episode_number: isAcc ? row.episode_number : null,
      pipeline_decision: row.pipeline_decision,
      pipeline_reason: row.pipeline_reason || null,
      pipeline_evaluated_at: nowIso,
      content_source: source,
      updated_at: nowIso,
    };
  });

  const { data: upsertedRows, error: upErr } = await supabase
    .from(EPISODES_TABLE)
    .upsert(rowsForDb, { onConflict: "youtube_video_id" })
    .select("id,youtube_video_id");

  if (upErr) {
    await writeLog(supabase, "error", "podcast_sync_upsert_failed", { message: upErr.message });
    return { ok: false, error: upErr.message, synced: 0 };
  }

  const idByVid = new Map((upsertedRows || []).map((r) => [r.youtube_video_id, r.id]));

  await writeLog(supabase, "info", "podcast_sync_complete", {
    source,
    accepted: topAccepted.length,
    rejected: rejected.length,
    sampleRejected: topRejectedSample.map((r) => ({
      id: r.youtube_video_id,
      reason: r.reject_reason,
      title: String(r.title || "").slice(0, 80),
    })),
  });

  const featuredIds = takeLatestAccepted(topAccepted, 4).map((r) => r.youtube_video_id);
  for (const vid of featuredIds) {
    const ep = topAccepted.find((e) => e.youtube_video_id === vid);
    if (!ep) continue;
    const h = extractGuestHeuristic(ep.title, ep.description);
    const slug = publicSlugForVideo(vid);
    const episodeUuid = idByVid.get(vid) || null;
    const payload = {
      youtube_video_id: vid,
      episode_id: episodeUuid,
      public_slug: slug,
      guest_name: h.guestName,
      organization: h.organization || null,
      role_title: h.roleTitle || null,
      short_bio: h.shortBio,
      discussion_summary: h.discussionSummary,
      profile_image_url: null,
      admin_profile_image_url: null,
      source_urls: h.sourceUrls || [],
      confidence_score: h.confidence,
      last_enriched_at: nowIso,
      verified_for_public: false,
      updated_at: nowIso,
    };
    try {
      await supabase.from(FEATURED_TABLE).upsert(payload, { onConflict: "youtube_video_id" });
    } catch {
      // featured table may not exist until migration applied
    }
  }

  return { ok: true, synced: rowsForDb.length, source, featured: featuredIds.length };
}

export function createServiceSupabase(url, serviceKey) {
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
