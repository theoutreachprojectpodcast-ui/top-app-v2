import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

const IRS_TABLE = "irs_eo_organizations";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const status = String(url.searchParams.get("status") || "").trim();
  const subsection = String(url.searchParams.get("subsection") || "").trim();
  const state = String(url.searchParams.get("state") || "").trim().toUpperCase();
  const q = String(url.searchParams.get("q") || "").trim();
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  let query = ctx.admin
    .from(IRS_TABLE)
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("directory_status", status);
  if (subsection) query = query.eq("irs_subsection", subsection);
  if (state) query = query.eq("state", state);
  if (q) {
    const term = q.replace(/,/g, " ").trim();
    query = query.or(`org_name.ilike.%${term}%,ein.eq.${term.replace(/\D/g, "")},city.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, rows: data || [], count: count ?? null, limit, offset });
}
