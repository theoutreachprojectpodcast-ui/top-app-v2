import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { buildSponsorLogoCandidates } from "@/lib/sponsors/logoDiscoveryServer";

export async function POST(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

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
