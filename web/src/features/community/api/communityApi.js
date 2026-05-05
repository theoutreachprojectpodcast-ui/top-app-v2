import { mapCommunityPostRow } from "@/features/community/mappers/mapCommunityPost";
import { COMMUNITY_MEMBER_FAVORITE_ROWS_SEED, COMMUNITY_MEMBERS_SEED } from "@/features/community/data/communitySeed";
import { queryTrustedOrgsByEin } from "@/lib/supabase/queries";
import {
  buildCommunityShareUrl,
  shareCommunityPostNative,
  trackCommunityShareEvent,
} from "@/features/community/domain/shareActions";

const POSTS_TABLE = "community_posts";

/** True when `id` is a torp_profiles row id (UUID) — use author_profile_id in queries. */
export function isAuthorProfileLookupKey(id) {
  const s = String(id || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

const LS_PENDING = "top_community_pending_submissions";
const LS_LOCAL_APPROVED = "top_community_local_approved_posts";
const LS_LIKES = "top_community_liked_posts";
const LS_CONNECTION_REQUESTS = "top_community_connection_requests";

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function getLikedSet(userId) {
  const all = readJson(LS_LIKES, {});
  const set = new Set(all[userId] || []);
  return set;
}

function saveLikedSet(userId, set) {
  const all = readJson(LS_LIKES, {});
  all[userId] = Array.from(set);
  writeJson(LS_LIKES, all);
}

export function getRelativeTime(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

async function fetchPostsApi(scope) {
  try {
    const res = await fetch(`/api/community/posts?scope=${encodeURIComponent(scope)}`, {
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return [];
    const rows = Array.isArray(json.posts) ? json.posts : [];
    return rows.map(mapCommunityPostRow).filter(Boolean);
  } catch {
    return [];
  }
}

/** Public approved feed — Supabase-backed via trusted API (RLS-safe). */
export async function fetchApprovedFeedFromApi() {
  return fetchPostsApi("public");
}

/** @deprecated Prefer fetchApprovedFeedFromApi; anon client cannot satisfy new RLS write path. */
export async function fetchApprovedFeedFromSupabase(supabase) {
  if (!supabase) return fetchApprovedFeedFromApi();
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select("*")
    .eq("status", "approved")
    .is("deleted_at", null)
    .in("visibility", ["community", "public"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return fetchApprovedFeedFromApi();
  return (data || []).map(mapCommunityPostRow).filter(Boolean);
}

export async function fetchPendingFeedFromApi() {
  return fetchPostsApi("pending");
}

/** @deprecated Use fetchPendingFeedFromApi for moderators */
export async function fetchPendingFeedFromSupabase(supabase) {
  const apiRows = await fetchPendingFeedFromApi();
  if (apiRows.length) return apiRows;
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select("*")
    .in("status", ["pending_review", "submitted", "under_review"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return [];
  return (data || []).map(mapCommunityPostRow).filter(Boolean);
}

export async function fetchMyPostsFromApi() {
  return fetchPostsApi("mine");
}

export function getCommunityMemberById(memberId) {
  const id = String(memberId || "").trim();
  if (!id) return null;
  return COMMUNITY_MEMBERS_SEED.find((m) => String(m.id) === id) || null;
}

export function loadLocalApprovedPosts() {
  const list = readJson(LS_LOCAL_APPROVED, []);
  return Array.isArray(list) ? list.map(mapCommunityPostRow).filter(Boolean) : [];
}

export function loadPendingSubmissionsLocal() {
  const list = readJson(LS_PENDING, []);
  return Array.isArray(list) ? list : [];
}

export function savePendingSubmissionsLocal(list) {
  writeJson(LS_PENDING, list);
}

export function approvePendingLocal(pendingId) {
  const pending = loadPendingSubmissionsLocal();
  const item = pending.find((p) => p.id === pendingId);
  if (!item) return { ok: false };
  const nextPending = pending.filter((p) => p.id !== pendingId);
  savePendingSubmissionsLocal(nextPending);
  const approved = loadLocalApprovedPosts();
  const post = mapCommunityPostRow({
    ...item,
    status: "approved",
    reviewed_at: new Date().toISOString(),
    reviewed_by: "demo-moderator",
  });
  approved.unshift(post);
  writeJson(LS_LOCAL_APPROVED, approved);
  return { ok: true, post };
}

export function rejectPendingLocal(pendingId, reason = "") {
  const pending = loadPendingSubmissionsLocal();
  const next = pending.filter((p) => p.id !== pendingId);
  savePendingSubmissionsLocal(next);
  return { ok: true, reason };
}

/**
 * Public feed: approved posts from API (and RLS direct read when available), plus local demo approvals only when offline.
 */
export async function fetchPublicCommunityFeed(supabase) {
  const remote = await fetchApprovedFeedFromApi();
  if (remote.length) {
    return remote.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const viaClient = await fetchApprovedFeedFromSupabase(supabase);
  if (viaClient.length) return viaClient;
  const localApproved = loadLocalApprovedPosts().filter((p) => p && p.status === "approved");
  return localApproved.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function fetchApprovedPostsByMember(supabase, memberId) {
  const id = String(memberId || "").trim();
  if (!id) return [];

  if (!supabase) {
    return [];
  }

  let q = supabase
    .from(POSTS_TABLE)
    .select("*")
    .eq("status", "approved")
    .is("deleted_at", null)
    .in("visibility", ["community", "public"])
    .order("created_at", { ascending: false })
    .limit(30);

  q = isAuthorProfileLookupKey(id) ? q.eq("author_profile_id", id) : q.eq("author_id", id);

  const { data, error } = await q;

  if (error) {
    return [];
  }

  return (data || []).map(mapCommunityPostRow).filter(Boolean);
}

export async function fetchMemberFavoriteRows(supabase, member) {
  const eins = Array.isArray(member?.favoriteEins) ? member.favoriteEins.map((e) => String(e)).filter(Boolean) : [];
  if (!eins.length) return [];

  if (!supabase) {
    return eins.map((ein) => COMMUNITY_MEMBER_FAVORITE_ROWS_SEED[ein]).filter(Boolean);
  }

  const { data, error } = await queryTrustedOrgsByEin(supabase, eins);
  if (error || !Array.isArray(data) || !data.length) {
    return eins.map((ein) => COMMUNITY_MEMBER_FAVORITE_ROWS_SEED[ein]).filter(Boolean);
  }

  const byEin = new Map(data.map((row) => [String(row.ein), row]));
  return eins.map((ein) => byEin.get(ein) || COMMUNITY_MEMBER_FAVORITE_ROWS_SEED[ein]).filter(Boolean);
}

export function isPostLiked(userId, postId) {
  return getLikedSet(userId).has(postId);
}

/** Toggle like for demo; displayCount = seed/base count + 1 when this user has liked */
export function togglePostLike(userId, postId, baseCount) {
  const set = getLikedSet(userId);
  const was = set.has(postId);
  if (was) set.delete(postId);
  else set.add(postId);
  saveLikedSet(userId, set);
  const liked = !was;
  const displayCount = Math.max(0, Number(baseCount) || 0) + (liked ? 1 : 0);
  return { liked, displayCount };
}

export function sharePostDemo(post) {
  const url = buildCommunityShareUrl({ postId: post.id, title: post.title });
  const summary = `${post.title ? `${post.title} — ` : ""}${String(post.body || "").slice(0, 160)}${String(post.body || "").length > 160 ? "…" : ""}`;
  trackCommunityShareEvent({ event: "community_share_attempt", postId: post.id, channel: "ui" });
  if (typeof navigator !== "undefined" && navigator.share) {
    return shareCommunityPostNative({ postId: post.id, title: post.title || "Community story", summary })
      .then((r) => {
        if (r.ok) trackCommunityShareEvent({ event: "community_share_complete", postId: post.id, channel: r.channel });
        return r;
      })
      .catch(() => copyShare(summary, url));
  }
  return copyShare(summary, url);
}

function copyShare(text, url) {
  const payload = `${text}\n${url}`.trim();
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(payload).then(() => ({ ok: true, method: "clipboard" }));
  }
  return Promise.resolve({ ok: false, method: "none" });
}

export async function submitCommunityStory(supabase, payload, { useWorkOSApi = false } = {}) {
  if (useWorkOSApi) {
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          nonprofit_name: payload.nonprofit_name,
          nonprofit_ein: payload.nonprofit_ein ?? "",
          category: payload.category,
          post_type: payload.post_type,
          show_author_name: payload.show_author_name,
          link_url: payload.link_url,
          photo_url: payload.photo_url,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, message: json.message || "Could not submit your story." };
      }
      return {
        ok: true,
        localOnly: false,
        id: json.post?.id,
        message: json.message,
      };
    } catch {
      return { ok: false, message: "Network error while submitting." };
    }
  }

  const record = {
    author_id: payload.author_id,
    author_name: payload.author_name,
    author_avatar_url: payload.author_avatar_url || "",
    title: payload.title || "",
    body: payload.body,
    nonprofit_ein: payload.nonprofit_ein || null,
    nonprofit_name: payload.nonprofit_name || "",
    category: payload.category || "success_story",
    post_type: payload.post_type || "share_story",
    show_author_name: payload.show_author_name !== false,
    link_url: payload.link_url || "",
    photo_url: payload.photo_url || "",
    status: "pending_review",
    visibility: "community",
    like_count: 0,
    share_count: 0,
  };

  const localRecord = {
    id: `pending-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...record,
  };

  if (!supabase) {
    const pending = loadPendingSubmissionsLocal();
    pending.unshift(localRecord);
    savePendingSubmissionsLocal(pending);
    return { ok: true, localOnly: true, id: localRecord.id };
  }

  const { data, error } = await supabase.from(POSTS_TABLE).insert(record).select("id").maybeSingle();
  if (!error) {
    return { ok: true, localOnly: false, id: data?.id };
  }

  const pending = loadPendingSubmissionsLocal();
  pending.unshift({ ...localRecord, supabase_error: error.message });
  savePendingSubmissionsLocal(pending);
  return {
    ok: true,
    localOnly: true,
    warning: "Saved locally for review—cloud table may not be deployed yet.",
    id: localRecord.id,
  };
}

export function loadConnectionRequests(userId) {
  const all = readJson(LS_CONNECTION_REQUESTS, {});
  return all?.[userId] || {};
}

export function saveConnectionRequests(userId, requests) {
  const all = readJson(LS_CONNECTION_REQUESTS, {});
  all[userId] = requests || {};
  writeJson(LS_CONNECTION_REQUESTS, all);
}

export function getConnectionState(userId, targetId, follows = []) {
  if (!userId || !targetId || userId === targetId) return "none";
  const requestState = loadConnectionRequests(userId)?.[targetId];
  if (requestState) return requestState;
  const isConnected = follows.some((f) => f.followerId === userId && f.followingId === targetId);
  return isConnected ? "connected" : "connect";
}

export function sendConnectionRequest(userId, targetId) {
  if (!userId || !targetId || userId === targetId) return { ok: false };
  const current = loadConnectionRequests(userId);
  current[targetId] = "requested";
  saveConnectionRequests(userId, current);
  return { ok: true, state: "requested" };
}

export function isModeratorUser({ userId = "", profile = {} } = {}) {
  const pr = String(profile?.platformRole || "").toLowerCase();
  if (pr === "moderator" || pr === "admin") return true;

  const envUserIds = String(process.env.NEXT_PUBLIC_COMMUNITY_MODERATOR_USER_IDS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const envEmails = String(process.env.NEXT_PUBLIC_COMMUNITY_MODERATOR_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const currentEmail = String(profile?.email || "").trim().toLowerCase();
  const byEnvUserId = !!userId && envUserIds.includes(String(userId));
  const byEnvEmail = !!currentEmail && envEmails.includes(currentEmail);
  const localDevFallback = process.env.NODE_ENV !== "production" && String(userId) === "demo-user";

  return byEnvUserId || byEnvEmail || localDevFallback;
}

/** Author updates their own post (`pending_review` or `approved`). Published posts return to the review queue. */
export async function updateAuthorCommunityPost(postId, payload) {
  const id = String(postId || "").trim();
  if (!id) return { ok: false, message: "Missing post." };
  try {
    const res = await fetch(`/api/community/posts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "author_edit",
        title: payload.title,
        body: payload.body,
        nonprofit_name: payload.nonprofit_name,
        nonprofit_ein: payload.nonprofit_ein,
        category: payload.category,
        post_type: payload.post_type,
        show_author_name: payload.show_author_name,
        link_url: payload.link_url,
        photo_url: payload.photo_url,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: json.message || "Could not save changes." };
    }
    return { ok: true, message: json.message };
  } catch {
    return { ok: false, message: "Network error." };
  }
}

export async function reviewSubmission(supabase, { postId, action, reviewerId, rejectionReason = "" }) {
  if (!postId) return { ok: false, message: "Missing post." };
  const apiAction = action === "reject" ? "reject" : "approve";
  try {
    const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: apiAction,
        rejectionReason: action === "reject" ? rejectionReason : undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (supabase) {
        const normalizedAction = action === "reject" ? "rejected" : "approved";
        const patch = {
          status: normalizedAction,
          reviewed_by: reviewerId || "moderator",
          reviewed_at: new Date().toISOString(),
          rejection_reason: normalizedAction === "rejected" ? String(rejectionReason || "").trim() : null,
        };
        const { error } = await supabase.from(POSTS_TABLE).update(patch).eq("id", postId);
        if (!error) return { ok: true };
      }
      return { ok: false, message: json.message || "Moderation update failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error." };
  }
}

export async function togglePostLikeApi(postId) {
  try {
    const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/like`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: json.message };
    return { ok: true, liked: !!json.liked, likeCount: Number(json.likeCount) || 0 };
  } catch {
    return { ok: false, message: "Network error." };
  }
}

