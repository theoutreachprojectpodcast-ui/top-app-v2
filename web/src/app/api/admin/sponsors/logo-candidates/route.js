import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import { buildSponsorLogoCandidates } from "@/lib/sponsors/logoDiscoveryServer";

export async function POST(request) {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();
  const profileRow = admin ? await getProfileRowByWorkOSId(admin, auth.user.id) : null;
  if (!isCommunityModeratorServer({ email: auth.user.email, workosUserId: auth.user.id, profileRow })) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const websiteUrl = String(body.websiteUrl || body.company_website || "").trim();
  const candidates = buildSponsorLogoCandidates(websiteUrl);
  return Response.json({
    candidates,
    note: "Static URL guesses only (no HTML fetch). For full discovery + validation use POST /api/admin/sponsors/logo-enrichment.",
  });
}
