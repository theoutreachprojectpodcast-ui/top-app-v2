import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { profileTableName } from "@/lib/supabase/admin";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";

export const runtime = "nodejs";

const PLATFORM_ROLES = new Set(["user", "support", "member", "sponsor", "moderator", "admin"]);
const MEMBERSHIP_TIER_OPTIONS = new Set(["free", "support", "member", "sponsor"]);
const USER_TYPES = new Set([
  "member",
  "admin",
  "sponsor",
  "resource_partner",
  "podcast_guest",
  "moderator",
  "organization_owner",
  "guest",
]);
const USER_STATUS = new Set(["active", "invited", "suspended"]);

export async function PATCH(request, context) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-users-patch", limit: 30 });
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
  const table = profileTableName();
  const { data: existing, error: existingErr } = await ctx.admin
    .from(table)
    .select("workos_user_id, email, platform_role, admin_access_enabled")
    .eq("workos_user_id", workosUserId)
    .maybeSingle();
  if (existingErr) return Response.json({ ok: false, error: existingErr.message }, { status: 500 });
  if (!existing) return Response.json({ ok: false, error: "profile_not_found" }, { status: 404 });

  if (body.platform_role != null) {
    const pr = String(body.platform_role).trim().toLowerCase();
    if (!PLATFORM_ROLES.has(pr)) {
      return Response.json({ ok: false, error: "invalid_platform_role" }, { status: 400 });
    }
    const targetEmail = String(existing.email || "").trim().toLowerCase();
    if (isDefaultApprovedAdminEmail(targetEmail) && pr !== "admin") {
      return Response.json({ ok: false, error: "default_admin_cannot_be_demoted" }, { status: 400 });
    }
    patch.platform_role = pr;
    if (pr === "admin") {
      patch.admin_access_enabled = true;
      patch.admin_access_granted_by = String(ctx.user.id || "");
      patch.admin_access_granted_at = new Date().toISOString();
    } else if (String(existing.platform_role || "").toLowerCase() === "admin") {
      patch.admin_access_enabled = false;
    }
  }
  if (body.membership_status != null) {
    const ms = String(body.membership_status).trim().toLowerCase();
    const allowed = new Set(["none", "pending", "active", "past_due", "canceled", "incomplete"]);
    if (!allowed.has(ms)) {
      return Response.json({ ok: false, error: "invalid_membership_status" }, { status: 400 });
    }
    patch.membership_status = ms;
  }
  if (body.membership_tier != null) {
    const mt = String(body.membership_tier).trim().toLowerCase();
    if (!MEMBERSHIP_TIER_OPTIONS.has(mt)) {
      return Response.json({ ok: false, error: "invalid_membership_tier" }, { status: 400 });
    }
    patch.membership_tier = mt;
  }
  if (body.onboarding_status != null) {
    const os = String(body.onboarding_status).trim().toLowerCase();
    const allowed = new Set(["not_started", "in_progress", "completed", "needs_review"]);
    if (!allowed.has(os)) {
      return Response.json({ ok: false, error: "invalid_onboarding_status" }, { status: 400 });
    }
    patch.onboarding_status = os;
  }
  if (body.user_type != null) {
    const ut = String(body.user_type).trim().toLowerCase();
    if (!USER_TYPES.has(ut)) {
      return Response.json({ ok: false, error: "invalid_user_type" }, { status: 400 });
    }
    patch.user_type = ut;
  }
  if (body.user_status != null) {
    const us = String(body.user_status).trim().toLowerCase();
    if (!USER_STATUS.has(us)) {
      return Response.json({ ok: false, error: "invalid_user_status" }, { status: 400 });
    }
    patch.user_status = us;
  }
  if (body.permissions != null) {
    if (!Array.isArray(body.permissions)) {
      return Response.json({ ok: false, error: "invalid_permissions" }, { status: 400 });
    }
    patch.permissions = [...new Set(body.permissions.map((p) => String(p || "").trim()).filter(Boolean))];
  }
  if (body.display_name != null) patch.display_name = String(body.display_name).trim() || null;
  if (body.first_name != null) patch.first_name = String(body.first_name).trim() || null;
  if (body.last_name != null) patch.last_name = String(body.last_name).trim() || null;
  if (body.email != null) patch.email = String(body.email).trim() || null;
  if (body.reset_onboarding === true) {
    patch.onboarding_completed = false;
    patch.onboarding_skipped = false;
    patch.onboarding_status = "not_started";
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ ok: false, error: "no_valid_fields" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();
  console.info("[admin.users.patch]", {
    actor: String(ctx.user?.email || ""),
    targetWorkosUserId: workosUserId,
    fields: Object.keys(patch),
  });

  const { data, error } = await ctx.admin
    .from(table)
    .update(patch)
    .eq("workos_user_id", workosUserId)
    .select("id, workos_user_id, email, display_name, first_name, last_name, platform_role, user_type, user_status, invited_by, permissions, last_login_at, admin_access_enabled, admin_access_granted_by, admin_access_granted_at, membership_tier, membership_status, onboarding_status, updated_at")
    .maybeSingle();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ ok: false, error: "profile_not_found" }, { status: 404 });
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.users.patch",
    resourceType: "torp_profiles",
    resourceId: String(data.id || workosUserId),
    metadata: { targetWorkosUserId: workosUserId, changedFields: Object.keys(patch) },
  });

  return Response.json({ ok: true, profile: data });
}
