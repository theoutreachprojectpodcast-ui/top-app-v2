import { classifyPodcastUpload, sortByPublishedDesc } from "./episodeParser";
import { extractGuestHeuristic } from "./guestHeuristics";
import { fetchOfficialPlaylistAcceptedEpisodes } from "./fetchOfficialPlaylistAcceptedEpisodes";
import { extractGuestVoiceQuote } from "./transcriptQuote";
import { fetchTranscriptPlainText } from "./youtubeTranscriptFetch";
import { getDemoFeaturedVoicesForLanding } from "./demoFeaturedVoices";
import { PODCAST_LANDING_RECENT_EPISODE_COUNT } from "./podcastLandingCuratedEpisodes";

/** Episode library card count on the public podcast landing (YouTube playlist order). */
export const PODCAST_LANDING_FULL_EPISODE_COUNT = PODCAST_LANDING_RECENT_EPISODE_COUNT;
const DB_EPISODE_FETCH_LIMIT = 120;
/** Columns needed for landing cards + guest quotes (avoid select *). */
const EPISODE_LIST_COLUMNS =
  "id,youtube_video_id,title,description,thumbnail_url,youtube_url,published_at,view_count,is_featured,episode_link_status,pipeline_decision,pipeline_reason,manual_override,admin_exclude,admin_include,title_override,description_override,thumbnail_override_url,transcript_text,transcript_fetched_at";
/** YouTube playlist walk — only need enough for the public strip. */
const PLAYLIST_MAX_PAGES = 3;
const PLAYLIST_MAX_ACCEPTED = 30;

function transcriptBackfillCap() {
  const raw = String(process.env.PODCAST_LANDING_TRANSCRIPT_BACKFILL ?? "").trim();
  if (raw === "0") return 0;
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 0) return n;
  return process.env.NODE_ENV === "development" ? 4 : 0;
}

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
 * Pull a readable sentence or two from description (no URLs, no timestamps).
 * @param {string} raw
 * @param {number} [maxTotal]
 */
function extractShortQuoteFromDescription(raw = "", maxTotal = 320) {
  const text = String(raw || "")
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/\[[\d:]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const parts = text.split(/(?<=[.!?])\s+/);
  const first = parts[0] || text;
  const second = parts[1] && parts[1].length < 220 ? ` ${parts[1]}` : "";
  const out = (first + second).trim();
  if (out.length > maxTotal) return `${out.slice(0, Math.max(0, maxTotal - 1))}…`;
  return out;
}

function capPullQuote(s, max) {
  const t = String(s || "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trim()}…`;
}

/**
 * Backfill captions into `ep` and Supabase when missing (Voices strip + landing).
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {Record<string, unknown>} ep
 */
async function attachTranscriptIfNeeded(admin, ep) {
  if (!admin || !ep) return;
  if (String(process.env.PODCAST_LANDING_TRANSCRIPT_FETCH || "1").trim() === "0") return;
  const vid = String(ep.youtube_video_id || "").trim();
  if (!vid) return;
  const existing = String(ep.transcript_text || "").trim();
  if (existing.length >= 80) return;
  const fetchedAt = ep.transcript_fetched_at ? new Date(String(ep.transcript_fetched_at)).getTime() : 0;
  if (fetchedAt && Date.now() - fetchedAt < 4 * 3600 * 1000 && existing.length < 40) return;

  let text = "";
  try {
    text = await fetchTranscriptPlainText(vid);
  } catch {
    text = "";
  }
  const now = new Date().toISOString();
  const capped = text && text.length >= 40 ? text.slice(0, 120000) : "";

  try {
    if (capped) {
      ep.transcript_text = capped;
      ep.transcript_fetched_at = now;
      await admin
        .from("podcast_episodes")
        .update({ transcript_text: capped, transcript_fetched_at: now })
        .eq("youtube_video_id", vid);
    } else {
      ep.transcript_fetched_at = now;
      await admin.from("podcast_episodes").update({ transcript_fetched_at: now }).eq("youtube_video_id", vid);
    }
  } catch {
    /* transcript columns may not exist until migration */
  }
}

/**
 * Admin-controlled Voices cards from podcast_guests (v0.6 canonical).
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {Map<string, Record<string, unknown>>} episodeById
 */
async function listActiveGuestVoiceCards(admin, episodeById) {
  if (!admin) return [];
  const { data, error } = await admin
    .from("podcast_guests")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(12);
  if (error || !Array.isArray(data) || !data.length) return [];

  return data
    .map((row) => {
      const ep = row.episode_id ? episodeById.get(String(row.episode_id)) : null;
      return guestCardFromPodcastGuestRow(row, ep);
    })
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown>} row
 */
export function episodeRowIsPublicListed(row) {
  if (!row) return false;
  if (row.admin_exclude === true) return false;
  if (String(row.manual_override || "") === "exclude") return false;
  if (row.admin_include === true) return true;
  if (String(row.manual_override || "") === "include") return true;
  const d = String(row.pipeline_decision || "");
  if (d === "accepted") return true;
  if (d === "rejected") return false;
  const c = classifyPodcastUpload(row);
  return c.ok;
}

/**
 * @param {Record<string, unknown>} runtime
 * @param {Record<string, unknown> | undefined} dbRow
 */
function mergePlaylistRuntimeWithDb(runtime, dbRow) {
  const vid = String(runtime?.youtube_video_id || "").trim();
  if (dbRow && episodeRowIsPublicListed(dbRow)) {
    const titleOverride = String(dbRow.title_override || "").trim();
    const descOverride = String(dbRow.description_override || "").trim();
    const thumbOverride = String(dbRow.thumbnail_override_url || "").trim();
    return {
      ...dbRow,
      ...runtime,
      id: dbRow.id,
      title: titleOverride || String(dbRow.title || runtime.title || "").trim(),
      description: descOverride || String(dbRow.description || runtime.description || "").trim(),
      thumbnail_url:
        thumbOverride ||
        String(runtime.thumbnail_url || "").trim() ||
        String(dbRow.thumbnail_url || "").trim(),
      youtube_url: String(dbRow.youtube_url || runtime.youtube_url || "").trim(),
      /* JSON/cache drops `undefined`; DB null would strip playlist acceptance and break public listing. */
      pipeline_decision: "accepted",
      pipeline_reason: String(runtime.pipeline_reason || dbRow.pipeline_reason || "youtube_playlist+db"),
    };
  }
  return {
    ...runtime,
    id: runtime.youtube_video_id,
    pipeline_decision: "accepted",
    pipeline_reason: String(runtime.pipeline_reason || "youtube_playlist"),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient | null} admin
 * @returns {Promise<{ episodes: any[], featuredGuests: any[], source: string, degraded: boolean, error?: string }>}
 */
export async function loadPublicPodcastLandingData(admin) {
  let episodes = [];
  let featuredGuests = [];
  let source = "youtube_playlist";
  let degraded = false;
  let error;
  let dbPublicEpisodes = [];
  const excludeVideoIds = new Set();
  const forceIncludeVideoIds = new Set();
  /** @type {Map<string, Record<string, unknown>>} */
  let byVideoId = new Map();

  if (admin) {
    const { data: epData, error: epErr } = await admin
      .from("podcast_episodes")
      .select(EPISODE_LIST_COLUMNS)
      .order("published_at", { ascending: false })
      .limit(DB_EPISODE_FETCH_LIMIT);

    if (!epErr && Array.isArray(epData)) {
      byVideoId = new Map(
        epData.map((e) => [String(e.youtube_video_id || "").trim(), e]).filter(([id]) => id),
      );
      dbPublicEpisodes = sortByPublishedDesc(epData.filter((row) => episodeRowIsPublicListed(row)));
      for (const row of epData) {
        const id = String(row.youtube_video_id || "").trim();
        if (!id) continue;
        if (String(row.manual_override || "") === "exclude" || row.admin_exclude === true) {
          excludeVideoIds.add(id);
        }
        if (row.admin_include === true) {
          forceIncludeVideoIds.add(id);
        }
      }
    }
  }

  const useDbFastPath =
    dbPublicEpisodes.length >= PODCAST_LANDING_RECENT_EPISODE_COUNT &&
    String(process.env.PODCAST_LANDING_SKIP_YOUTUBE || "").trim() !== "0";

  if (useDbFastPath) {
    episodes = sortByPublishedDesc(dbPublicEpisodes)
      .slice(0, PODCAST_LANDING_RECENT_EPISODE_COUNT)
      .map((ep) => ({ ...ep, episode_link_status: "live" }));
    source = admin && byVideoId.size ? "supabase_fast_path+recent10" : "supabase_fast_path";
    if (episodes.length < 5) degraded = true;
  } else {
    const pl = await fetchOfficialPlaylistAcceptedEpisodes({
      excludeVideoIds,
      forceIncludeVideoIds,
      maxPages: PLAYLIST_MAX_PAGES,
      maxAccepted: PLAYLIST_MAX_ACCEPTED,
    });

    if (!pl.ok) {
      degraded = true;
      episodes = sortByPublishedDesc(dbPublicEpisodes)
        .slice(0, PODCAST_LANDING_RECENT_EPISODE_COUNT)
        .map((ep) => ({ ...ep, episode_link_status: "live" }));
      source = episodes.length ? "youtube_playlist_failed+supabase_fallback" : "youtube_playlist_failed";
      if (!episodes.length) error = pl.error;
    } else {
      const feedSource = String(pl.source || "youtube_api");
      const merged = (pl.videos || [])
        .map((r) => mergePlaylistRuntimeWithDb(r, byVideoId.get(String(r.youtube_video_id || "").trim())))
        .filter((ep) => episodeRowIsPublicListed(ep));
      const mergedSorted = sortByPublishedDesc(merged);
      episodes = mergedSorted.slice(0, PODCAST_LANDING_RECENT_EPISODE_COUNT).map((ep) => ({
        ...ep,
        episode_link_status: "live",
      }));
      if (!episodes.length && dbPublicEpisodes.length) {
        episodes = sortByPublishedDesc(dbPublicEpisodes)
          .slice(0, PODCAST_LANDING_RECENT_EPISODE_COUNT)
          .map((ep) => ({ ...ep, episode_link_status: "live" }));
        source = `${feedSource}+supabase_only_fallback`;
      } else if (admin && byVideoId.size) {
        source = `${feedSource}+supabase+recent10`;
      } else {
        source = `${feedSource}+recent10`;
      }
      if (episodes.length < 5) degraded = true;
    }
  }

  if (admin && episodes.length) {
    const episodeById = new Map(
      episodes.map((ep) => [String(ep?.id || ""), ep]).filter(([id]) => id),
    );
    const activeGuestCards = await listActiveGuestVoiceCards(admin, episodeById);
    if (activeGuestCards.length) {
      featuredGuests = activeGuestCards.slice(0, 4);
      return { episodes, featuredGuests, source, degraded, error };
    }

    const backfillCap = transcriptBackfillCap();
    for (const ep of episodes.slice(0, backfillCap)) {
      await attachTranscriptIfNeeded(admin, ep);
    }

    const { data: voiceRows } = await admin
      .from("podcast_episode_featured_guest")
      .select("*")
      .eq("card_active", true)
      .order("display_order", { ascending: true, nullsFirst: false })
      .limit(12);

    const curated = Array.isArray(voiceRows) ? voiceRows.filter(Boolean) : [];
    if (curated.length) {
      featuredGuests = [];
      for (const row of curated.slice(0, 4)) {
        const ep =
          episodes.find((e) => String(e.youtube_video_id) === String(row.youtube_video_id)) || {
            youtube_video_id: row.youtube_video_id,
            title: "",
            description: "",
          };
        await attachTranscriptIfNeeded(admin, ep);
        featuredGuests.push(featuredGuestToCardShape(row, ep));
      }
    } else if (process.env.NODE_ENV === "development") {
      const topFour = episodes.slice(0, 4);
      const videoIds = topFour.map((e) => e.youtube_video_id).filter(Boolean);
      if (videoIds.length) {
        const { data: fg } = await admin.from("podcast_episode_featured_guest").select("*").in("youtube_video_id", videoIds);
        const map = new Map((fg || []).map((r) => [r.youtube_video_id, r]));
        featuredGuests = [];
        for (const ep of topFour) {
          await attachTranscriptIfNeeded(admin, ep);
          const row = map.get(ep.youtube_video_id);
          featuredGuests.push(row ? featuredGuestToCardShape(row, ep) : guestShapeFromEpisodeOnly(ep));
        }
      } else {
        featuredGuests = [];
      }
    } else {
      featuredGuests = [];
    }
  } else if (episodes.length && process.env.NODE_ENV === "development") {
    featuredGuests = episodes.slice(0, 4).map((ep) => guestShapeFromEpisodeOnly(ep));
  }

  if (process.env.NODE_ENV === "development" && !featuredGuests.length) {
    featuredGuests = getDemoFeaturedVoicesForLanding().slice(0, 4);
  }

  return { episodes, featuredGuests, source, degraded, error };
}

/**
 * Public guest directory — only guests linked to real, listed episodes (no demo placeholders).
 * @param {import("@supabase/supabase-js").SupabaseClient | null} admin
 * @returns {Promise<{ guests: object[] }>}
 */
export async function loadPublicPodcastGuestDirectory(admin) {
  if (!admin) return { guests: [] };

  const { data: epData } = await admin
    .from("podcast_episodes")
    .select(EPISODE_LIST_COLUMNS)
    .order("published_at", { ascending: false })
    .limit(DB_EPISODE_FETCH_LIMIT);

  const publicEpisodes = sortByPublishedDesc((epData || []).filter((row) => episodeRowIsPublicListed(row)));
  const episodeById = new Map(
    publicEpisodes.map((ep) => [String(ep?.id || ""), ep]).filter(([id]) => id),
  );
  const episodeByVideoId = new Map(
    publicEpisodes.map((ep) => [String(ep.youtube_video_id || "").trim(), ep]).filter(([id]) => id),
  );

  /** @type {Map<string, object>} */
  const bySlug = new Map();

  const addGuest = (card) => {
    if (!card?.slug || !card?.name) return;
    if (card.upcoming) return;
    const watch = String(card.episodeWatchUrl || "").trim();
    const vid = String(card.episodeYoutubeId || "").trim();
    if (!watch && !vid) return;
    const existing = bySlug.get(card.slug);
    if (!existing || (watch && !existing.episodeWatchUrl)) {
      bySlug.set(card.slug, card);
    }
  };

  const activeCards = await listActiveGuestVoiceCards(admin, episodeById);
  for (const card of activeCards) addGuest(card);

  const { data: voiceRows } = await admin
    .from("podcast_episode_featured_guest")
    .select("*")
    .eq("card_active", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .limit(80);

  for (const row of voiceRows || []) {
    const vid = String(row.youtube_video_id || "").trim();
    const ep = episodeByVideoId.get(vid);
    if (!ep) continue;
    addGuest(featuredGuestToCardShape(row, ep));
  }

  const episodeIds = [...episodeById.keys()].slice(0, 200);
  if (episodeIds.length) {
    const { data: links } = await admin
      .from("podcast_episode_guests")
      .select("episode_id,guest_id,role_label,podcast_guests(*)")
      .in("episode_id", episodeIds)
      .limit(500);
    for (const link of links || []) {
      const ep = episodeById.get(String(link.episode_id || ""));
      const guestRow = link.podcast_guests;
      if (!ep || !guestRow || guestRow.upcoming) continue;
      addGuest(guestCardFromPodcastGuestRow(guestRow, ep));
    }
  }

  const guests = [...bySlug.values()].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }),
  );

  return { guests };
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
  const transcript = String(ep?.transcript_text || "").trim();
  const fromTranscript = transcript ? extractGuestVoiceQuote(transcript, guestName, 140) : "";
  const fromDesc = extractShortQuoteFromDescription(String(ep?.description || ""), 130);
  const quote = fromTranscript || fromDesc;
  return {
    id: slug,
    slug,
    name: guestName,
    title: [h.roleTitle, h.organization].filter(Boolean).join(" · ") || "Guest",
    bio: "",
    quote: quote || "We are preparing a short pull-quote from this episode.",
    avatar_url: "",
    upcoming: false,
    unverified,
    discussionSummary: "",
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
  const quoteOverride = !!row.admin_quote_override;
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
  const publicQuote = String(row.public_quote || "").trim();
  const rawDisc = String(row.discussion_summary || "").trim();
  const discOk =
    (verified || quoteOverride) &&
    rawDisc &&
    rawDisc.length <= 280 &&
    !/https?:\/\//i.test(rawDisc) &&
    !rawDisc.includes("{") &&
    !rawDisc.includes("}");

  const transcript = String(ep?.transcript_text || "").trim();
  const fromTranscript = transcript ? extractGuestVoiceQuote(transcript, name, 140) : "";

  const quote =
    capPullQuote(publicQuote, 200) ||
    (discOk ? capPullQuote(rawDisc, 180) : "") ||
    fromTranscript ||
    capPullQuote(extractShortQuoteFromDescription(String(ep?.description || ""), 130), 130) ||
    (verified ? capPullQuote(h.shortBio, 120) : "") ||
    "We are preparing a short pull-quote from this episode.";

  const bio = adminBio || (verified ? h.shortBio : "") || "";

  const watch = String(ep?.youtube_url || "").trim() || (vid ? `https://www.youtube.com/watch?v=${vid}` : "");
  return {
    id: slug,
    slug,
    name,
    title: [String(row.role_title || "").trim(), String(row.organization || "").trim()].filter(Boolean).join(" · ") || "Guest",
    bio,
    quote,
    avatar_url: avatar,
    upcoming: false,
    unverified: !verified && !quoteOverride && (!Number.isFinite(conf) || conf < 0.75),
    discussionSummary: "",
    episodeYoutubeId: vid,
    episodeWatchUrl: watch,
  };
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown> | null} ep
 */
function guestCardFromPodcastGuestRow(row, ep) {
  const id = String(row.id || row.slug || "").trim();
  const slug = String(row.slug || "").trim();
  const name = String(row.name || "").trim();
  if (!id || !slug || !name) return null;

  const vid = String(ep?.youtube_video_id || "").trim();
  const watch = String(ep?.youtube_url || "").trim() || (vid ? `https://www.youtube.com/watch?v=${vid}` : "");
  const transcript = String(ep?.transcript_text || "").trim();
  const fromTranscript = transcript ? extractGuestVoiceQuote(transcript, name, 140) : "";
  const rowQuote = capPullQuote(String(row.quote || "").trim(), 200);
  const fromDesc = capPullQuote(extractShortQuoteFromDescription(String(ep?.description || ""), 130), 130);

  return {
    id,
    slug,
    name,
    title:
      [String(row.role_title || "").trim(), String(row.organization || "").trim()]
        .filter(Boolean)
        .join(" · ") ||
      String(row.title || "").trim() ||
      "Guest",
    bio: String(row.bio || "").trim(),
    quote: rowQuote || fromTranscript || fromDesc || "We are preparing a short pull-quote from this episode.",
    avatar_url: String(row.avatar_url || "").trim(),
    upcoming: false,
    unverified: false,
    discussionSummary: "",
    episodeYoutubeId: vid,
    episodeWatchUrl: watch,
  };
}
