import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { profileTableName } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") || "").trim().toLowerCase();
  const role = String(url.searchParams.get("role") || "").trim().toLowerCase();
  const userType = String(url.searchParams.get("userType") || "").trim().toLowerCase();
  const status = String(url.searchParams.get("status") || "").trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "40", 10) || 40));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);

  let query = ctx.admin
    .from(profileTableName())
    .select(
      "id, workos_user_id, email, display_name, first_name, last_name, platform_role, user_type, user_status, invited_by, permissions, last_login_at, admin_access_enabled, admin_access_granted_by, admin_access_granted_at, membership_tier, membership_status, membership_source, stripe_customer_id, onboarding_completed, onboarding_skipped, onboarding_status, identity_segment, profile_completeness_percentage, profile_completeness_missing_fields, profile_last_updated_at, account_setup_completed_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    const safe = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(
      `email.ilike.%${safe}%,display_name.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`,
    );
  }
  if (role) query = query.eq("platform_role", role);
  if (userType) query = query.eq("user_type", userType);
  if (status) query = query.eq("user_status", status);

  const { data, error } = await query;

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, rows: data || [] });
}
