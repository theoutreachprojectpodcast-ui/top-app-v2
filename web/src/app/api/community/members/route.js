import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";
import { searchCommunityMembers } from "@/lib/community/communityMembersServer";

export const runtime = "nodejs";

export async function GET(request) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, members: [], total: 0, error: "storage_unavailable" }, { status: 503 });
  }

  const membership = await requireMembershipApi(admin, "community_view");
  if (!membership.ok) return membership.response;

  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") || "").trim();
  const profileId = String(url.searchParams.get("id") || "").trim();
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "24", 10) || 24));

  const result = await searchCommunityMembers(admin, { q, limit, profileId });
  if (!result.ok) {
    return Response.json(
      { ok: false, members: [], total: 0, error: result.error || "search_failed" },
      { status: profileId ? 404 : 500 },
    );
  }

  return Response.json({
    ok: true,
    members: result.members,
    total: result.total,
  });
}
