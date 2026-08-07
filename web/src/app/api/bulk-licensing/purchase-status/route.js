import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOrgAccess } from "@/lib/bulkLicensing/authorization";

/**
 * Poll purchase activation after Stripe Checkout redirect.
 * GET ?organizationId=
 */
export async function GET(request) {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const organizationId = String(new URL(request.url).searchParams.get("organizationId") || "").trim();
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
    .select("id, name, business_code, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (!org) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { data: sub } = await admin
    .from("bulk_subscriptions")
    .select("package_size, subscription_status, current_period_end")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: total } = await admin
    .from("bulk_individual_licenses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const { count: available } = await admin
    .from("bulk_individual_licenses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "available");

  const { count: redeemed } = await admin
    .from("bulk_individual_licenses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "redeemed");

  const packageSize = Number(sub?.package_size || 0);
  const generated = Number(total || 0);
  const ready =
    org.status === "active" &&
    packageSize > 0 &&
    generated >= packageSize &&
    String(sub?.subscription_status || "") === "active";

  return Response.json({
    ready,
    processing: !ready && (org.status === "pending_payment" || generated < packageSize),
    organization: org,
    packageSize: packageSize || null,
    subscriptionStatus: sub?.subscription_status || null,
    renewalDate: sub?.current_period_end || null,
    counts: {
      total: generated,
      available: Number(available || 0),
      redeemed: Number(redeemed || 0),
      assigned: Math.max(0, generated - Number(available || 0) - Number(redeemed || 0)),
    },
  });
}
