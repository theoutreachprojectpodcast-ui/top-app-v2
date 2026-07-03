import { guardFailureResponse, guardMutation } from "@/lib/security/secureRoute";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";

export const runtime = "nodejs";

const PAGE_SOURCES = new Set([
  "main_sponsor_page",
  "sponsor_profile",
  "podcast_sponsor_page",
  "sponsor_hub_card",
]);

const CTA_TYPES = new Set(["website", "inquiry", "promo", "featured_item", "social"]);

function validHttpUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    return /^https?:$/i.test(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}

export async function POST(request) {
  const guard = guardMutation(request, { rateKey: "sponsors-click", limit: 120 });
  if (!guard.ok) return guardFailureResponse(guard);

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const sponsorSlug = String(body?.sponsorSlug || body?.sponsor_slug || "").trim().toLowerCase();
  const targetUrl = validHttpUrl(body?.targetUrl || body?.target_url);
  if (!sponsorSlug || !targetUrl) {
    return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const pageSource = PAGE_SOURCES.has(String(body?.pageSource || "").trim())
    ? String(body.pageSource).trim()
    : "main_sponsor_page";
  const ctaType = CTA_TYPES.has(String(body?.ctaType || "").trim()) ? String(body.ctaType).trim() : "website";
  const sponsorName = String(body?.sponsorName || body?.sponsor_name || "").trim();

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: true, logged: false });
  }

  let sponsorId = null;
  const { data: sponsorRow } = await admin
    .from("sponsors_catalog")
    .select("id, name")
    .eq("slug", sponsorSlug)
    .maybeSingle();
  if (sponsorRow?.id) sponsorId = sponsorRow.id;

  let profileId = null;
  let workosUserId = null;
  const auth = await resolveWorkOSRouteUser();
  if (auth.ok && auth.user?.id) {
    workosUserId = String(auth.user.id);
    const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
    if (profileRow?.id) profileId = profileRow.id;
  }

  const row = {
    sponsor_id: sponsorId,
    sponsor_slug: sponsorSlug,
    sponsor_name: sponsorName || String(sponsorRow?.name || "").trim(),
    profile_id: profileId,
    workos_user_id: workosUserId,
    page_source: pageSource,
    cta_type: ctaType,
    target_url: targetUrl,
  };

  const { error } = await admin.from("sponsor_click_events").insert(row);
  if (error) {
    console.warn("[sponsors/click]", error.message);
    return Response.json({ ok: false, error: "log_failed" }, { status: 500 });
  }

  return Response.json({ ok: true, logged: true });
}
