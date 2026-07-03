import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchHomepageFeaturedSponsors } from "@/lib/sponsors/homepageFeaturedSponsors";
import { readHomepageSponsorSettings } from "@/lib/admin/homepageSettings";
import { isDemoModeEnabled } from "@/lib/runtime/launchMode";

export const runtime = "nodejs";

export async function GET() {
  const admin = createSupabaseAdminClient();
  const settings = await readHomepageSponsorSettings(admin);
  const { sponsors, source, warning } = await fetchHomepageFeaturedSponsors(admin, {
    limit: settings.carouselLimit,
  });

  return Response.json({
    ok: true,
    sponsors,
    source,
    settings,
    demoFallback: isDemoModeEnabled() && source === "seed",
    warning: warning || null,
  });
}
