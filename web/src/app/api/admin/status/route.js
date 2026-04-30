import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

async function countRows(admin, table, filters = []) {
  let query = admin.from(table).select("*", { count: "exact", head: true });
  for (const [key, value] of filters) query = query.eq(key, value);
  const { count, error } = await query;
  if (error) return null;
  return count ?? 0;
}

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const [sponsors, podcastSponsors, trusted, pendingCommunity, users, podcastApps, sponsorApps, contactNew] = await Promise.all([
    countRows(ctx.admin, "sponsors_catalog", [["is_active", true]]),
    countRows(ctx.admin, "sponsors_catalog", [["sponsor_scope", "podcast"], ["is_active", true]]),
    countRows(ctx.admin, "trusted_resources", [["is_active", true]]),
    countRows(ctx.admin, "community_posts", [["status", "pending"]]),
    countRows(ctx.admin, "torp_profiles"),
    countRows(ctx.admin, "podcast_guest_applications"),
    countRows(ctx.admin, "sponsor_applications"),
    countRows(ctx.admin, "form_submissions", [["status", "new"]]),
  ]);
  return Response.json({
    ok: true,
    stats: {
      sponsors,
      podcastSponsors,
      trusted,
      pendingCommunity,
      users,
      podcastApplications: podcastApps,
      sponsorshipApplications: sponsorApps,
      newContactSubmissions: contactNew,
    },
  });
}
