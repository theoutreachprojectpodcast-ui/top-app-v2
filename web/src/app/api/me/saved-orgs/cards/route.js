import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { resolveSavedOrganizationDirectoryRows } from "@/lib/savedOrganizations/resolveSavedOrganizations";
import { requireMembershipApi } from "@/lib/membership/membershipRouteGuard";

const SAVED_TABLE = process.env.NEXT_PUBLIC_SAVED_ORG_TABLE || "top_app_saved_org_eins";

function orderUniqueFromRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows || []) {
    const k = normalizeEinDigits(r?.ein);
    if (k.length !== 9 || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export async function GET() {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ rows: [], items: [], meta: { resolved: 0, unavailable: 0, total: 0 } });
  }
  const membership = await requireMembershipApi(admin, "save_organizations");
  if (!membership.ok) return membership.response;

  const { data, error } = await admin
    .from(SAVED_TABLE)
    .select("ein,sort_order,created_at")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error || !Array.isArray(data)) {
    return Response.json({ rows: [], items: [], meta: { resolved: 0, unavailable: 0, total: 0 } });
  }

  const savedAtByEin = new Map();
  for (const row of data) {
    const k = normalizeEinDigits(row?.ein);
    if (k.length === 9 && !savedAtByEin.has(k)) savedAtByEin.set(k, row.created_at || null);
  }

  const ordered = orderUniqueFromRows(data);
  const rows = await resolveSavedOrganizationDirectoryRows(admin, ordered);

  let resolved = 0;
  let unavailable = 0;
  const items = rows.map((row) => {
    const status = row.savedResolutionStatus === "unavailable" ? "unavailable" : "resolved";
    if (status === "resolved") resolved += 1;
    else unavailable += 1;
    const nonprofitId = row.nonprofitId || normalizeEinDigits(row.ein);
    return {
      id: `${user.id}:${nonprofitId}`,
      userId: user.id,
      nonprofitId,
      savedAt: savedAtByEin.get(nonprofitId) || null,
      nonprofit:
        status === "resolved"
          ? {
              id: nonprofitId,
              name: row.orgName || row.canonicalDisplayName || "",
              displayName: row.canonicalDisplayName || row.orgName || null,
              slug: row.publicSlug || null,
              logoUrl: row.logoUrl || null,
              city: row.city || null,
              state: row.state || null,
              nteeCode: row.nteeCode || null,
              shortDescription: row.shortDescription || null,
            }
          : null,
      row,
    };
  });

  return Response.json({
    rows,
    items,
    meta: { resolved, unavailable, total: ordered.length },
  });
}
