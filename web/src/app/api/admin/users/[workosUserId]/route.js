import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

const PLATFORM_ROLES = new Set(["user", "support", "member", "sponsor", "moderator", "admin"]);

export async function PATCH(request, context) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const workosUserId = String(params?.workosUserId || "").trim();
  if (!workosUserId) {
    return Response.json({ ok: false, error: "missing_workos_user_id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const patch = {};
  if (body.platform_role != null) {
    const pr = String(body.platform_role).trim().toLowerCase();
    if (!PLATFORM_ROLES.has(pr)) {
      return Response.json({ ok: false, error: "invalid_platform_role" }, { status: 400 });
    }
    patch.platform_role = pr;
  }
  if (body.membership_status != null) {
    const ms = String(body.membership_status).trim().toLowerCase();
    const allowed = new Set(["none", "pending", "active", "past_due", "canceled", "incomplete"]);
    if (!allowed.has(ms)) {
      return Response.json({ ok: false, error: "invalid_membership_status" }, { status: 400 });
    }
    patch.membership_status = ms;
  }
  if (body.onboarding_status != null) {
    const os = String(body.onboarding_status).trim().toLowerCase();
    const allowed = new Set(["not_started", "in_progress", "completed", "needs_review"]);
    if (!allowed.has(os)) {
      return Response.json({ ok: false, error: "invalid_onboarding_status" }, { status: 400 });
    }
    patch.onboarding_status = os;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ ok: false, error: "no_valid_fields" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await ctx.admin
    .from("torp_profiles")
    .update(patch)
    .eq("workos_user_id", workosUserId)
    .select("id, workos_user_id, email, platform_role, membership_status, onboarding_status, updated_at")
    .maybeSingle();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ ok: false, error: "profile_not_found" }, { status: 404 });
  }

  return Response.json({ ok: true, profile: data });
}
