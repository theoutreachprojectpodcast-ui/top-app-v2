import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { profileMaySubmitCommunityStory } from "@/lib/account/entitlements";
import {
  createPlatformNotification,
  notifyStaffProfiles,
} from "@/server/notifications/notificationService";

const REACTIONS = "community_post_reactions";

const TABLE = "community_posts";

export async function GET(request) {
  const admin = createSupabaseAdminClient();
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") || "public";

  if (!admin) {
    return Response.json({ posts: [], warning: "storage_unavailable" });
  }

  if (scope === "public") {
    const { data, error } = await admin
      .from(TABLE)
      .select("*")
      .eq("status", "approved")
      .is("deleted_at", null)
      .in("visibility", ["community", "public"])
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      return Response.json({ posts: [], error: error.message }, { status: 500 });
    }

    const rows = data || [];
    const auth = await withAuth();
    let likedIds = new Set();
    if (auth.user) {
      const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
      if (profileRow?.id) {
        const { data: likes } = await admin
          .from(REACTIONS)
          .select("post_id")
          .eq("profile_id", profileRow.id)
          .eq("reaction_type", "like");
        likedIds = new Set((likes || []).map((r) => r.post_id));
      }
    }

    const enriched = rows.map((row) => ({
      ...row,
      viewer_has_liked: likedIds.has(row.id),
    }));

    return Response.json({ posts: enriched });
  }

  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ posts: [], error: "unauthorized" }, { status: 401 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!profileRow?.id) {
    return Response.json({ posts: [], error: "profile_required" }, { status: 403 });
  }

  if (scope === "mine") {
    const { data, error } = await admin
      .from(TABLE)
      .select("*")
      .eq("author_profile_id", profileRow.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return Response.json({ posts: [], error: error.message }, { status: 500 });
    }
    return Response.json({ posts: data || [] });
  }

  if (scope === "pending") {
    if (
      !isCommunityModeratorServer({
        email: auth.user.email,
        workosUserId: auth.user.id,
        profileRow,
      })
    ) {
      return Response.json({ posts: [], error: "forbidden" }, { status: 403 });
    }
    const { data, error } = await admin
      .from(TABLE)
      .select("*")
      .eq("status", "pending_review")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      return Response.json({ posts: [], error: error.message }, { status: 500 });
    }
    return Response.json({ posts: data || [] });
  }

  if (scope === "bookmarked") {
    if (
      !isPlatformAdminServer({
        email: auth.user.email,
        workosUserId: auth.user.id,
        profileRow,
      })
    ) {
      return Response.json({ posts: [], error: "forbidden" }, { status: 403 });
    }
    const { data, error } = await admin
      .from(TABLE)
      .select("*")
      .eq("admin_bookmark", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return Response.json({ posts: [], error: error.message }, { status: 500 });
    }
    return Response.json({ posts: data || [] });
  }

  return Response.json({ posts: [], error: "invalid_scope" }, { status: 400 });
}

export async function POST(request) {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ ok: false, message: "Sign in to post." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Community storage is not available." }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!profileRow?.id) {
    return Response.json(
      { ok: false, message: "Finish onboarding so we can attach your story to your profile." },
      { status: 403 },
    );
  }

  if (!profileMaySubmitCommunityStory(profileRow)) {
    return Response.json(
      {
        ok: false,
        message:
          "An active Pro membership is required to submit community stories. Upgrade from Profile or complete member checkout.",
      },
      { status: 403 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const title = String(body.title || "").trim().slice(0, 200);
  const text = String(body.body || "").trim();
  if (text.length < 20) {
    return Response.json({ ok: false, message: "Your story should be at least 20 characters." }, { status: 400 });
  }
  if (text.length > 20000) {
    return Response.json({ ok: false, message: "Your story is too long (max 20,000 characters)." }, { status: 400 });
  }

  const displayName =
    [profileRow.first_name, profileRow.last_name].filter(Boolean).join(" ").trim() ||
    String(profileRow.display_name || "").trim() ||
    auth.user.email ||
    "Member";

  const record = {
    author_profile_id: profileRow.id,
    author_id: auth.user.id,
    author_name: displayName,
    author_avatar_url: profileRow.profile_photo_url || "",
    title,
    body: text,
    nonprofit_name: String(body.nonprofit_name || "").trim().slice(0, 200),
    nonprofit_ein: body.nonprofit_ein ? String(body.nonprofit_ein).replace(/\D/g, "").slice(0, 9) || null : null,
    category: String(body.category || "success_story").slice(0, 64),
    post_type: String(body.post_type || "share_story").slice(0, 64),
    show_author_name: body.show_author_name !== false,
    link_url: String(body.link_url || "").trim().slice(0, 500),
    photo_url: typeof body.photo_url === "string" ? body.photo_url.slice(0, 120000) : "",
    status: "pending_review",
    visibility: "community",
    like_count: 0,
    share_count: 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from(TABLE).insert(record).select("id,status,created_at").maybeSingle();

  if (error) {
    return Response.json({ ok: false, message: error.message || "Could not save your story." }, { status: 500 });
  }

  const postId = data?.id ? String(data.id) : "";
  if (postId) {
    await createPlatformNotification(admin, {
      recipientProfileId: profileRow.id,
      audienceScope: "user",
      type: "community_post_submitted",
      title: "Story submitted for review",
      message: "Thanks for sharing — moderators will review your community post shortly.",
      linkPath: "/community",
      entityType: "community_post",
      entityId: postId,
      metadata: { post_id: postId },
    });
    await notifyStaffProfiles(admin, {
      type: "community_post_submitted_for_review",
      title: "New community post to review",
      message: title ? `“${title.slice(0, 80)}${title.length > 80 ? "…" : ""}”` : "A member submitted a story for moderation.",
      linkPath: "/community",
      entityType: "community_post",
      entityId: postId,
      dedupeHours: 12,
      metadata: { post_id: postId, author_profile_id: profileRow.id },
    });
  }

  return Response.json({
    ok: true,
    post: data,
    message: "Your story was submitted for review. You will see it in the feed after a moderator approves it.",
  });
}
