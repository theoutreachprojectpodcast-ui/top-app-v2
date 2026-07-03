import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { readHomepageSponsorSettings, writeHomepageSponsorSettings } from "@/lib/admin/homepageSettings";
import { fetchHomepageFeaturedSponsors } from "@/lib/sponsors/homepageFeaturedSponsors";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const settings = await readHomepageSponsorSettings(ctx.admin);
  const preview = await fetchHomepageFeaturedSponsors(ctx.admin, { limit: settings.carouselLimit });

  return Response.json({ ok: true, settings, preview });
}

export async function PATCH(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-homepage-settings" });
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const settings = await writeHomepageSponsorSettings(ctx.admin, body || {});
  const preview = await fetchHomepageFeaturedSponsors(ctx.admin, { limit: settings.carouselLimit });

  return Response.json({ ok: true, settings, preview });
}
