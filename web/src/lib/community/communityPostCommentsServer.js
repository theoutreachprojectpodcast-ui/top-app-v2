import { buildFounderOnboardingPostRows } from "@/features/community/data/founderOnboardingPosts";
import { profileTableName } from "@/lib/supabase/admin";

const POSTS = "community_posts";
const COMMENTS = "community_post_comments";

const FOUNDER_ROWS_BY_ID = new Map(
  buildFounderOnboardingPostRows().map((row) => [String(row.id), row]),
);

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {Record<string, unknown>} founderRow
 */
async function ensureFounderPostRow(admin, founderRow) {
  const id = String(founderRow.id || "").trim();
  if (!id) return false;

  const { error } = await admin.from(POSTS).upsert(
    {
      ...founderRow,
      comments_enabled: founderRow.comments_enabled !== false,
      is_pinned: !!founderRow.is_pinned,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[top] ensureFounderPostRow", id, error.message);
    return false;
  }
  return true;
}

/**
 * Resolve a published post that accepts comments (DB row or canonical founder guide).
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} postId
 */
export async function loadPostForComments(admin, postId) {
  if (!admin || !postId) return null;

  const { data, error } = await admin
    .from(POSTS)
    .select("id,status,comments_enabled,deleted_at")
    .eq("id", postId)
    .maybeSingle();

  if (!error && data && !data.deleted_at) {
    const status = String(data.status || "").toLowerCase();
    if (status === "approved") {
      if (data.comments_enabled === false) return { ...data, commentsClosed: true };
      return data;
    }
  }

  const founder = FOUNDER_ROWS_BY_ID.get(postId);
  if (!founder) return null;

  await ensureFounderPostRow(admin, founder);
  if (founder.comments_enabled === false) return { ...founder, commentsClosed: true };
  return { id: postId, status: "approved", comments_enabled: true };
}

/**
 * @param {Record<string, unknown>} prof
 */
export function profileRowToCommentAuthor(prof) {
  if (!prof || typeof prof !== "object") {
    return { authorName: "Member", authorAvatarUrl: "" };
  }
  const name =
    [prof.first_name, prof.last_name].filter(Boolean).join(" ").trim() ||
    String(prof.display_name || "").trim() ||
    "Member";
  return {
    authorName: name,
    authorAvatarUrl: String(prof.profile_photo_url || ""),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string[]} profileIds
 */
export async function loadCommentAuthorProfiles(admin, profileIds) {
  const ids = [...new Set(profileIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const map = new Map();
  if (!admin || !ids.length) return map;

  const tables = [];
  const primary = profileTableName();
  tables.push(primary);
  if (primary !== "top_profiles") tables.push("top_profiles");

  for (const table of tables) {
    const missing = ids.filter((id) => !map.has(id));
    if (!missing.length) break;
    const { data, error } = await admin
      .from(table)
      .select("id, display_name, first_name, last_name, profile_photo_url")
      .in("id", missing);
    if (error) {
      console.error("[top] loadCommentAuthorProfiles", table, error.message);
      continue;
    }
    for (const row of data || []) {
      map.set(String(row.id), row);
    }
  }

  return map;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} postId
 */
export async function listPublishedCommentsForPost(admin, postId) {
  const { data, error } = await admin
    .from(COMMENTS)
    .select("id, post_id, profile_id, body, status, created_at, updated_at")
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = data || [];
  const profileMap = await loadCommentAuthorProfiles(
    admin,
    rows.map((row) => row.profile_id),
  );

  const comments = rows.map((row) => {
    const prof = profileMap.get(String(row.profile_id));
    const { authorName, authorAvatarUrl } = profileRowToCommentAuthor(prof);
    return {
      id: row.id,
      postId: row.post_id,
      profileId: row.profile_id,
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName,
      authorAvatarUrl,
    };
  });

  return { ok: true, comments };
}

/**
 * Ensure QA profile id exists in top_profiles for community_post_comments FK.
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {Record<string, unknown>} profileRow
 */
export async function ensureTopProfilesShadowForComment(admin, profileRow) {
  if (!admin || !profileRow?.id) return;
  if (profileTableName() === "top_profiles") return;

  const id = String(profileRow.id);
  const { data: existing } = await admin.from("top_profiles").select("id").eq("id", id).maybeSingle();
  if (existing?.id) return;

  const { error } = await admin.from("top_profiles").upsert(
    {
      id,
      workos_user_id: profileRow.workos_user_id || null,
      email: profileRow.email || null,
      display_name: profileRow.display_name || null,
      first_name: profileRow.first_name || null,
      last_name: profileRow.last_name || null,
      profile_photo_url: profileRow.profile_photo_url || null,
      membership_tier: profileRow.membership_tier || "free",
      membership_status: profileRow.membership_status || "none",
      membership_source: profileRow.membership_source || "manual",
      platform_role: profileRow.platform_role || "user",
      onboarding_status: profileRow.onboarding_status || "not_started",
      payment_method_summary: profileRow.payment_method_summary || {},
      metadata: profileRow.metadata || {},
      created_at: profileRow.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[top] ensureTopProfilesShadowForComment", error.message);
  }
}
