import { withAuth } from "@workos-inc/authkit-nextjs";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import { buildSponsorLogoCandidates } from "@/lib/sponsors/logoDiscoveryServer";

export async function POST(request) {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isCommunityModeratorServer({ email: auth.user.email, workosUserId: auth.user.id })) {
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
  return Response.json({ candidates, note: "Confirm in UI before writing to sponsors_catalog.logo_url." });
}
