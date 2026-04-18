import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { resolveSavedOrganizationDirectoryRows } from "@/lib/savedOrganizations/resolveSavedOrganizations";

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
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ rows: [] });
  }
  const { data, error } = await admin
    .from(SAVED_TABLE)
    .select("ein,sort_order")
    .eq("user_id", auth.user.id)
    .order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) {
    return Response.json({ rows: [] });
  }
  const ordered = orderUniqueFromRows(data);
  const rows = await resolveSavedOrganizationDirectoryRows(admin, ordered);
  return Response.json({ rows });
}
