import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** List organizations the signed-in user administers. */
export async function GET() {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const { data: memberships, error } = await admin
    .from("bulk_organization_members")
    .select("organization_id, role, status")
    .eq("workos_user_id", auth.user.id)
    .eq("status", "active");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const ids = (memberships || []).map((m) => m.organization_id);
  if (!ids.length) {
    return Response.json({ organizations: [] });
  }

  const { data: orgs } = await admin
    .from("bulk_organizations")
    .select("id, name, business_code, status, created_at")
    .in("id", ids)
    .order("created_at", { ascending: false });

  const roleByOrg = Object.fromEntries(
    (memberships || []).map((m) => [m.organization_id, m.role]),
  );

  return Response.json({
    organizations: (orgs || []).map((o) => ({
      ...o,
      role: roleByOrg[o.id] || "viewer",
    })),
  });
}
