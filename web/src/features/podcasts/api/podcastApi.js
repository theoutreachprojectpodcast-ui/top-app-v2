const EPISODES_TABLE = "podcast_episodes";
const GUESTS_TABLE = "podcast_guests";
const MEMBER_TABLE = "podcast_member_content";
const APPLICATIONS_TABLE = "podcast_guest_applications";
const LOCAL_APPLICATIONS_KEY = "top_podcast_guest_applications_demo";
const LOCAL_APPLICATION_REVIEWS_KEY = "top_podcast_guest_application_reviews_demo";

export const FALLBACK_EPISODES = [
  {
    id: "fallback-1",
    youtube_video_id: "r4Qh4P7C8xY",
    title: "The Outreach Project Podcast — Featured Episode",
    description: "Mission-first stories from veterans, first responders, and community builders.",
    thumbnail_url: "",
    youtube_url: "https://www.youtube.com/@TheOutreachProjectHq",
    published_at: "2026-01-01T00:00:00.000Z",
    is_featured: true,
    is_member_only: false,
  },
];

export const FALLBACK_GUESTS = [
  {
    id: "guest-1",
    slug: "dr-maya-brooks",
    name: "Dr. Maya Brooks",
    title: "Clinical Director, Bridgepoint Trauma Lab",
    bio: "Leads trauma-informed recovery programs for veterans and first responders.",
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=480&q=80",
    upcoming: true,
    website_url: "https://www.youtube.com/@TheOutreachProjectHq",
  },
  {
    id: "guest-2",
    slug: "captain-luis-ramirez",
    name: "Captain Luis Ramirez",
    title: "Founder, Resilient Response Network",
    bio: "Former fire captain focused on peer support and post-service leadership.",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80",
    upcoming: true,
    website_url: "https://www.youtube.com/@TheOutreachProjectHq",
  },
  {
    id: "guest-3",
    slug: "alina-shah",
    name: "Alina Shah",
    title: "Executive Director, Frontline Family Alliance",
    bio: "Builds family-first programs supporting military transition households.",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=480&q=80",
    upcoming: false,
    website_url: "https://www.youtube.com/@TheOutreachProjectHq",
  },
  {
    id: "guest-4",
    slug: "marcus-cole",
    name: "Marcus Cole",
    title: "Host, Tactical Wellness Podcast",
    bio: "Shares practical mental fitness tools for high-performance teams.",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=480&q=80",
    upcoming: false,
    website_url: "https://www.youtube.com/@TheOutreachProjectHq",
  },
];

export const FALLBACK_MEMBER = [
  {
    id: "member-1",
    title: "Extended Interview: Recovery Leadership Roundtable",
    summary: "Members get the full uncut interview and tactical notes from the panel.",
    content_url: "https://www.youtube.com/@TheOutreachProjectHq",
    access_tier: "member",
    active: true,
  },
  {
    id: "member-2",
    title: "After-Action Breakdown: Episode Playbook",
    summary: "Downloadable recap and implementation checklist for member teams.",
    content_url: "https://www.youtube.com/@TheOutreachProjectHq",
    access_tier: "member",
    active: true,
  },
];

export {
  resolvePodcastMemberContentAccess,
  tierAllowsPodcastMemberContent,
} from "@/lib/podcast/memberAccess";

export async function listPodcastEpisodes(supabase) {
  try {
    if (typeof window !== "undefined") {
      const res = await fetch("/api/podcasts/recent", { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json();
        if (Array.isArray(payload?.episodes) && payload.episodes.length) {
          return payload.episodes.slice(0, 10);
        }
      }
    }
  } catch {
    // fallback to db/local
  }
  if (!supabase) return FALLBACK_EPISODES;
  const { data, error } = await supabase.from(EPISODES_TABLE).select("*").order("published_at", { ascending: false }).limit(100);
  if (error || !Array.isArray(data) || !data.length) return FALLBACK_EPISODES;
  return data.slice(0, 10);
}

export function resolveEpisodeThumbnail(episode = {}) {
  const provided = String(episode.thumbnail_url || "").trim();
  if (provided) {
    if (/ytimg\.com\/vi\/.+\/hqdefault\.jpg/i.test(provided)) {
      return provided.replace(/hqdefault\.jpg/i, "maxresdefault.jpg");
    }
    return provided;
  }
  const videoId = String(episode.youtube_video_id || episode.video_id || "").trim();
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  return "";
}

export function resolveEpisodeThumbnailFallback(episode = {}) {
  const videoId = String(episode.youtube_video_id || episode.video_id || "").trim();
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return "";
}

export function resolveEpisodeWatchUrl(episode = {}) {
  if (episode.youtube_url) return episode.youtube_url;
  if (episode.video_url) return episode.video_url;
  const videoId = String(episode.youtube_video_id || episode.video_id || "").trim();
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  return "https://www.youtube.com/@TheOutreachProjectHq";
}

export function formatEpisodeViewCount(episode = {}) {
  const raw = Number.parseInt(episode.view_count, 10);
  if (!Number.isFinite(raw) || raw < 0) return "Views unavailable";
  return `${raw.toLocaleString()} views`;
}

export function formatEpisodePostedAt(episode = {}) {
  const value = String(episode.published_at || "").trim();
  if (!value) return "Date unavailable";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Date unavailable";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(dt);
  } catch {
    return dt.toISOString().slice(0, 10);
  }
}

export async function listPodcastGuests(supabase) {
  if (!supabase) return FALLBACK_GUESTS;
  const { data, error } = await supabase.from(GUESTS_TABLE).select("*").order("featured", { ascending: false }).order("name", { ascending: true }).limit(200);
  if (error || !Array.isArray(data) || !data.length) return FALLBACK_GUESTS;
  return data;
}

export async function getPodcastGuestProfile(supabase, slug) {
  const key = String(slug || "").trim();
  if (!key) return null;
  if (!supabase) return FALLBACK_GUESTS.find((g) => g.slug === key) || null;
  const { data, error } = await supabase.from(GUESTS_TABLE).select("*").eq("slug", key).maybeSingle();
  if (error || !data) return FALLBACK_GUESTS.find((g) => g.slug === key) || null;
  return data;
}

export async function listPodcastEpisodeGuests(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("podcast_episode_guests")
    .select("episode_id,guest_id,role_label,podcast_guests(*)")
    .limit(1000);
  if (error || !Array.isArray(data)) return [];
  return data;
}

export async function listPodcastEpisodesByGuest(supabase, guestId) {
  if (!guestId) return [];
  if (!supabase) return FALLBACK_EPISODES;
  const { data, error } = await supabase
    .from("podcast_episode_guests")
    .select("podcast_episodes(*)")
    .eq("guest_id", guestId)
    .limit(200);
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => row?.podcast_episodes).filter(Boolean);
}

export async function listPodcastMemberContent(supabase, options = {}) {
  const { canViewMemberContent = true } = options;
  if (!canViewMemberContent) return [];
  if (!supabase) return FALLBACK_MEMBER;
  const { data, error } = await supabase.from(MEMBER_TABLE).select("*").eq("active", true).order("published_at", { ascending: false }).limit(30);
  if (error || !Array.isArray(data) || !data.length) return FALLBACK_MEMBER;
  return data;
}

function pushLocalApplication(payload) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_APPLICATIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({ ...payload, id: `local-${Date.now()}`, created_at: new Date().toISOString(), local_only: true });
    localStorage.setItem(LOCAL_APPLICATIONS_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    // ignore
  }
}

export async function submitPodcastGuestApplication(supabase, payload) {
  const legacyRecord = {
    full_name: String(payload.full_name || "").trim(),
    email: String(payload.email || "").trim(),
    organization: String(payload.organization || "").trim(),
    website_url: String(payload.website_url || "").trim(),
    topic_pitch: String(payload.topic_pitch || "").trim(),
    why_now: String(payload.why_now || "").trim(),
    social_links: String(payload.social_links || "").trim(),
    status: "submitted",
  };
  const record = {
    ...legacyRecord,
    proposed_topic: String(payload.topic_pitch || "").trim(),
    why_you_should_be_on: String(payload.why_now || "").trim(),
    audience_value: String(payload.audience_value || payload.social_links || "").trim(),
    social_url: String(payload.social_url || payload.website_url || "").trim(),
  };
  if (!supabase) {
    pushLocalApplication(record);
    return { ok: true, localOnly: true };
  }
  const { error } = await supabase.from(APPLICATIONS_TABLE).insert(record);
  if (!error) return { ok: true, localOnly: false };
  if (String(error.message || "").toLowerCase().includes("column")) {
    const legacyInsert = await supabase.from(APPLICATIONS_TABLE).insert(legacyRecord);
    if (!legacyInsert.error) return { ok: true, localOnly: false, warning: "Saved with legacy podcast application schema." };
  }
  pushLocalApplication({ ...record, supabase_error: error.message });
  return { ok: true, localOnly: true, warning: "Saved locally because podcast applications table is not deployed yet." };
}

function readLocalApplications() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_APPLICATIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function readLocalReviews() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_APPLICATION_REVIEWS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function writeLocalReviews(next) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_APPLICATION_REVIEWS_KEY, JSON.stringify(next || {}));
  } catch {
    // ignore
  }
}

export async function listPodcastGuestApplications(supabase) {
  if (!supabase) {
    const rows = readLocalApplications();
    const reviews = readLocalReviews();
    return rows.map((row) => ({ ...row, ...(reviews[row.id] || {}) }));
  }
  const { data, error } = await supabase
    .from(APPLICATIONS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !Array.isArray(data)) {
    const rows = readLocalApplications();
    const reviews = readLocalReviews();
    return rows.map((row) => ({ ...row, ...(reviews[row.id] || {}) }));
  }
  return data;
}

export async function updatePodcastGuestApplicationStatus(supabase, applicationId, status, internalNotes = "") {
  const requested = String(status || "").trim().toLowerCase();
  const nextStatus = requested === "accepted" ? "approved" : requested === "declined" ? "denied" : requested;
  if (!applicationId || !nextStatus) return { ok: false, error: "Missing review payload." };

  if (!supabase) {
    const reviews = readLocalReviews();
    reviews[applicationId] = {
      status: nextStatus,
      internal_notes: String(internalNotes || ""),
      reviewed_at: new Date().toISOString(),
    };
    writeLocalReviews(reviews);
    return { ok: true, localOnly: true };
  }

  const patch = {
    status: nextStatus,
    internal_notes: String(internalNotes || ""),
    reviewed_at: new Date().toISOString(),
    accepted_for_upcoming: nextStatus === "approved",
  };
  const { error } = await supabase.from(APPLICATIONS_TABLE).update(patch).eq("id", applicationId);
  if (!error) return { ok: true, localOnly: false };
  if (String(error.message || "").toLowerCase().includes("column")) {
    const legacyPatch = {
      status: nextStatus,
      internal_notes: String(internalNotes || ""),
    };
    const legacyUpdate = await supabase.from(APPLICATIONS_TABLE).update(legacyPatch).eq("id", applicationId);
    if (!legacyUpdate.error) return { ok: true, localOnly: false, warning: "Saved with legacy podcast application schema." };
  }

  const reviews = readLocalReviews();
  reviews[applicationId] = {
    status: nextStatus,
    internal_notes: String(internalNotes || ""),
    reviewed_at: new Date().toISOString(),
  };
  writeLocalReviews(reviews);
  return {
    ok: true,
    localOnly: true,
    warning: "Saved locally because podcast guest applications table is unavailable.",
  };
}

export async function deletePodcastGuestApplication(supabase, applicationId) {
  const id = String(applicationId || "").trim();
  if (!id) return { ok: false, error: "Missing application id." };

  if (!supabase) {
    const rows = readLocalApplications().filter((row) => String(row.id || "") !== id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_APPLICATIONS_KEY, JSON.stringify(rows));
      } catch {
        // ignore
      }
    }
    const reviews = readLocalReviews();
    delete reviews[id];
    writeLocalReviews(reviews);
    return { ok: true, localOnly: true };
  }

  const { error } = await supabase.from(APPLICATIONS_TABLE).delete().eq("id", id);
  if (!error) return { ok: true, localOnly: false };
  return { ok: false, error: error.message || "Could not delete application." };
}

export async function acceptPodcastGuestFromApplication(supabase, application = {}) {
  if (!supabase) return { ok: true, localOnly: true };
  const name = String(application.full_name || "").trim();
  if (!name) return { ok: false, error: "Missing applicant name." };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const payload = {
    slug: slug || `guest-${Date.now()}`,
    name,
    title: String(application.organization || "Upcoming Guest").trim(),
    bio: String(application.topic_pitch || application.why_now || "Podcast guest appearance pending.").trim(),
    website_url: String(application.website_url || "").trim() || null,
    upcoming: true,
    upcoming_note: "Accepted from podcast guest application review.",
    featured: false,
  };
  const { error } = await supabase.from(GUESTS_TABLE).upsert(payload, { onConflict: "slug" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
