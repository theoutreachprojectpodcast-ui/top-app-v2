import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

function formatActivity(row) {
  const action = String(row.action || "");
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  let summary = action;
  if (action.includes("community")) summary = "Community moderation";
  else if (action.includes("page-content-blocks")) summary = "Content block saved";
  else if (action.includes("page-images")) summary = "Page image updated";
  else if (action.includes("media-library")) summary = "Media uploaded";
  else if (action.includes("trusted")) summary = "Trusted resource change";
  else if (action.includes("sponsors")) summary = "Sponsor catalog change";
  else if (action.includes("billing")) summary = "Billing record";
  else if (action.includes("users")) summary = "User account change";
  else if (action.includes("podcasts")) summary = "Podcast admin action";
  else if (action.includes("form-submissions")) summary = "Form submission update";

  return {
    id: row.id,
    createdAt: row.created_at,
    action,
    summary,
    actorEmail: row.actor_email,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: meta,
  };
}

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(5, Number.parseInt(url.searchParams.get("limit") || "40", 10) || 40));

  const { data, error } = await ctx.admin
    .from("admin_audit_logs")
    .select("id, created_at, actor_email, action, resource_type, resource_id, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return Response.json({ ok: false, error: error.message, activities: [] }, { status: 500 });
  }

  return Response.json({
    ok: true,
    activities: (data || []).map(formatActivity),
  });
}
