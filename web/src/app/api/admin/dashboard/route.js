import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { profileTableName } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function countRows(admin, table, filters = []) {
  let query = admin.from(table).select("*", { count: "exact", head: true });
  for (const [key, value] of filters) query = query.eq(key, value);
  const { count, error } = await query;
  if (error) return null;
  return count ?? 0;
}

async function countIn(admin, table, column, values) {
  let query = admin.from(table).select("*", { count: "exact", head: true }).in(column, values);
  const { count, error } = await query;
  if (error) return null;
  return count ?? 0;
}

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const pendingStatuses = ["pending_review", "submitted", "under_review", "in_review"];
  const [
    sponsorsActive,
    communityPending,
    communityDrafts,
    podcastApplications,
    trustedActive,
    users,
    sponsorAppsNew,
    contactNew,
  ] = await Promise.all([
    countRows(ctx.admin, "sponsors_catalog", [["is_active", true]]),
    countIn(ctx.admin, "community_posts", "status", pendingStatuses),
    countRows(ctx.admin, "community_posts", [["status", "draft"]]),
    countRows(ctx.admin, "podcast_guest_applications"),
    countRows(ctx.admin, "trusted_resources", [["listing_status", "active"]]),
    countRows(ctx.admin, profileTableName()),
    countRows(ctx.admin, "sponsor_applications", [["status", "new"]]),
    countRows(ctx.admin, "form_submissions", [["status", "new"]]),
  ]);

  return Response.json({
    ok: true,
    summary: {
      sponsorsActive,
      communityPending,
      communityDrafts,
      podcastApplications,
      trustedActive,
      users,
      sponsorAppsNew,
      contactNew,
    },
  });
}
