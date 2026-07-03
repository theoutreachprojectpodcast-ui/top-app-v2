import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { profileTableName } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const count = async (table, filters = []) => {
    let q = ctx.admin.from(table).select("*", { count: "exact", head: true });
    for (const [k, v] of filters) q = q.eq(k, v);
    const { count: c, error } = await q;
    return error ? null : c ?? 0;
  };

  const [
    usersTotal,
    usersNewWeek,
    usersNewMonth,
    usersSuspended,
    communityApproved,
    communityRejected,
    communityPending,
    sponsorsActive,
    sponsorsFeatured,
    trustedActive,
    podcastApps,
    podcastApproved,
    membershipActive,
    membershipCanceled,
  ] = await Promise.all([
    count(profileTableName()),
    ctx.admin.from(profileTableName()).select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    ctx.admin.from(profileTableName()).select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
    count(profileTableName(), [["user_status", "suspended"]]),
    count("community_posts", [["status", "approved"]]),
    count("community_posts", [["status", "rejected"]]),
    count("community_posts", [["status", "pending_review"]]),
    count("sponsors_catalog", [["is_active", true]]),
    count("sponsors_catalog", [["featured", true], ["is_active", true]]),
    count("trusted_resources", [["listing_status", "active"]]),
    count("podcast_guest_applications"),
    count("podcast_guest_applications", [["status", "approved"]]),
    count(profileTableName(), [["membership_status", "active"]]),
    count(profileTableName(), [["membership_status", "canceled"]]),
  ]);

  return Response.json({
    ok: true,
    users: {
      total: usersTotal,
      newWeek: usersNewWeek?.count ?? null,
      newMonth: usersNewMonth?.count ?? null,
      suspended: usersSuspended,
      activeEstimate: usersTotal != null && usersSuspended != null ? usersTotal - usersSuspended : null,
    },
    community: {
      approved: communityApproved,
      rejected: communityRejected,
      pending: communityPending,
    },
    sponsors: { active: sponsorsActive, featured: sponsorsFeatured },
    resources: { active: trustedActive },
    podcast: { applications: podcastApps, approved: podcastApproved },
    membership: { active: membershipActive, canceled: membershipCanceled },
    note: "Engagement metrics (views, CTR) require analytics instrumentation—not yet wired.",
  });
}
