import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "40", 10) || 40));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);

  let query = ctx.admin
    .from("torp_profiles")
    .select(
      "id, workos_user_id, email, display_name, first_name, last_name, platform_role, membership_tier, membership_status, membership_source, stripe_customer_id, onboarding_completed, onboarding_status, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    const safe = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(
      `email.ilike.%${safe}%,display_name.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, rows: data || [] });
}
