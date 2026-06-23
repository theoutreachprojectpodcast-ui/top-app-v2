import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

const COMMENTS = "community_post_comments";

/** Admin/moderator: list all comments for a post (including hidden). */
export async function GET(request, context) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const postId = String(params?.id || "").trim();
  if (!postId) {
    return Response.json({ comments: [], error: "missing_id" }, { status: 400 });
  }

  const { data, error } = await ctx.admin
    .from(COMMENTS)
    .select(
      `
      id,
      post_id,
      profile_id,
      body,
      status,
      created_at,
      updated_at,
      top_profiles:profile_id (
        display_name,
        first_name,
        last_name
      )
    `,
    )
    .eq("post_id", postId)
    .neq("status", "deleted")
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) {
    return Response.json({ comments: [], error: error.message }, { status: 500 });
  }

  return Response.json({ comments: data || [] });
}
