import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOrgAccess } from "@/lib/bulkLicensing/authorization";
import { buildCsv } from "@/lib/bulkLicensing/csv";
import { recordBulkLicenseEvent } from "@/lib/bulkLicensing/events";

export async function GET(_request, context) {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const params = await context.params;
  const organizationId = String(params?.orgId || "").trim();
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const access = await requireOrgAccess(admin, organizationId, auth.user.id, {
    requireLicenses: true,
  });
  if (!access.ok) {
    return Response.json({ error: access.error, message: access.message }, { status: 403 });
  }

  const { data: licenses } = await admin
    .from("bulk_individual_licenses")
    .select(
      "seat_number, display_code, status, assigned_email, assigned_at, redeemed_at, expires_at, revoked_at",
    )
    .eq("organization_id", organizationId)
    .order("seat_number", { ascending: true });

  const csv = buildCsv(
    [
      "seat_number",
      "display_code",
      "status",
      "assigned_email",
      "assigned_at",
      "redeemed_at",
      "expires_at",
      "revoked_at",
    ],
    (licenses || []).map((l) => [
      l.seat_number,
      l.display_code,
      l.status,
      l.assigned_email || "",
      l.assigned_at || "",
      l.redeemed_at || "",
      l.expires_at || "",
      l.revoked_at || "",
    ]),
  );

  await recordBulkLicenseEvent(admin, {
    organizationId,
    eventType: "admin_override",
    actorUserId: auth.user.id,
    actorType: "user",
    metadata: { action: "csv_export", count: (licenses || []).length },
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bulk-licenses-${organizationId.slice(0, 8)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
