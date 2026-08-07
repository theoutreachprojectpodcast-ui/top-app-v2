import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canViewFullLicenseCodes,
  requireOrgAccess,
} from "@/lib/bulkLicensing/authorization";
import { maskDisplayCode } from "@/lib/bulkLicensing/licenseCodes";

export async function GET(_request, context) {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const params = await context.params;
  const organizationId = String(params?.orgId || "").trim();
  if (!organizationId) {
    return Response.json({ error: "organization_id_required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const access = await requireOrgAccess(admin, organizationId, auth.user.id);
  if (!access.ok) {
    return Response.json({ error: access.error, message: access.message }, { status: 403 });
  }

  const { data: org } = await admin
    .from("bulk_organizations")
    .select(
      "id, name, business_code, status, purchaser_name, purchaser_email, billing_email, phone, website, organization_type, business_code_locked, created_at",
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (!org) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { data: sub } = await admin
    .from("bulk_subscriptions")
    .select(
      "id, package_size, subscription_status, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_customer_id, latest_invoice_id",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: licenses } = await admin
    .from("bulk_individual_licenses")
    .select(
      "id, seat_number, display_code, status, assigned_email, assigned_at, redeemed_by_user_id, redeemed_at, expires_at, revoked_at",
    )
    .eq("organization_id", organizationId)
    .order("seat_number", { ascending: true })
    .limit(500);

  const showFull = canViewFullLicenseCodes(access.membership.role);
  const seats = (licenses || []).map((lic) => ({
    id: lic.id,
    seatNumber: lic.seat_number,
    displayCode: showFull ? lic.display_code : maskDisplayCode(lic.display_code),
    fullCodeAvailable: showFull,
    status: lic.status,
    assignedEmail: lic.assigned_email,
    assignedAt: lic.assigned_at,
    redeemedByUserId: lic.redeemed_by_user_id,
    redeemedAt: lic.redeemed_at,
    expiresAt: lic.expires_at,
    revokedAt: lic.revoked_at,
  }));

  const counts = {
    total: seats.length,
    available: seats.filter((s) => s.status === "available").length,
    assigned: seats.filter((s) => s.status === "assigned").length,
    redeemed: seats.filter((s) => s.status === "redeemed").length,
    revoked: seats.filter((s) => s.status === "revoked").length,
    expired: seats.filter((s) => s.status === "expired").length,
    suspended: seats.filter((s) => s.status === "suspended").length,
  };

  const { data: events } = await admin
    .from("bulk_license_events")
    .select("id, event_type, actor_user_id, actor_type, metadata, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(40);

  return Response.json({
    organization: org,
    membership: access.membership,
    subscription: sub,
    counts,
    licenses: seats,
    recentActivity: events || [],
  });
}
