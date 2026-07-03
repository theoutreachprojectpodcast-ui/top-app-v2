import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchTrustedResourcesFromSupabase } from "@/features/trusted-resources/api";
import { buildTrustedResourceDetailViewModel } from "@/features/trusted-resources/domain/trustedResourceDetailViewModel";
import { buildTrustedResourceViewModel } from "@/features/trusted-resources/domain/trustedResourceViewModel";
import { TRUSTED_RESOURCE_BY_SLUG } from "@/features/trusted-resources/trustedResourcesRegistry";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";

export const runtime = "nodejs";

export async function GET(request) {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const membership = await requireMembershipApi(admin, "trusted_pro");
    if (!membership.ok) return membership.response;
  }

  const supabase = createSupabaseReadClient();
  const slug = String(new URL(request.url).searchParams.get("slug") || "")
    .trim()
    .toLowerCase();

  try {
    const rows = await fetchTrustedResourcesFromSupabase(supabase);

    if (slug) {
      if (!TRUSTED_RESOURCE_BY_SLUG[slug]) {
        return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      }
      const row =
        rows.find((r) => String(r.trustedResourceSlug || "").trim().toLowerCase() === slug) || null;
      if (!row) {
        return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      }
      const card = buildTrustedResourceViewModel(row);
      const detail = buildTrustedResourceDetailViewModel(card, row);
      return Response.json({ ok: true, row, detail });
    }

    if (!supabase) {
      return Response.json({
        ok: true,
        rows,
        warning: "missing_supabase",
        message: "Set NEXT_PUBLIC_SUPABASE_URL plus anon or SUPABASE_SERVICE_ROLE_KEY for full catalog + directory enrichment.",
      });
    }
    return Response.json({ ok: true, rows });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
