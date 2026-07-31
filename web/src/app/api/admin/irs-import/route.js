import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { runIrsNonprofitImport } from "@/lib/irs/importService";
import { classificationSummary } from "@/lib/irs/classification";
import { EO_BMF_STATE_KEYS } from "@/lib/irs/eoBmfClient";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_TABLE = "irs_nonprofit_import_batches";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const batchId = url.searchParams.get("batchId");

  if (batchId) {
    const { data: batch, error } = await ctx.admin.from(BATCH_TABLE).select("*").eq("id", batchId).maybeSingle();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    if (!batch) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    const { data: errors } = await ctx.admin
      .from("irs_nonprofit_import_errors")
      .select("*")
      .eq("batch_id", batchId)
      .order("id", { ascending: false })
      .limit(100);
    return Response.json({
      ok: true,
      batch,
      errors: errors || [],
      classification: classificationSummary(),
    });
  }

  const { data, error } = await ctx.admin
    .from(BATCH_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({
    ok: true,
    batches: data || [],
    classification: classificationSummary(),
    stateKeys: EO_BMF_STATE_KEYS,
  });
}

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-irs-import-post", limit: 10 });
  if (!ctx.ok) return ctx.response;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const mode = body.mode === "apply" ? "apply" : "dry_run";
  const statesRaw = body.states ?? body.state ?? "dc";
  const states =
    statesRaw === "all" || (Array.isArray(statesRaw) && statesRaw.includes("all"))
      ? [...EO_BMF_STATE_KEYS]
      : (Array.isArray(statesRaw) ? statesRaw : String(statesRaw).split(","))
          .map((s) => String(s).trim().toLowerCase())
          .filter(Boolean);

  try {
    const result = await runIrsNonprofitImport(ctx.admin, {
      mode,
      states,
      subsection: body.subsection || "19",
      limit: body.limit != null ? Number(body.limit) : null,
      dryRunBatchId: body.dryRunBatchId || body.fromDryRun || null,
      enforceDryRunGate: body.enforceDryRunGate !== false,
      actor: {
        workosUserId: String(ctx.user?.id || ""),
        email: String(ctx.user?.email || ""),
      },
    });

    await writeAdminAuditLog(ctx.admin, request, {
      actorWorkosUserId: String(ctx.user?.id || ""),
      actorEmail: String(ctx.user?.email || ""),
      action: mode === "apply" ? "admin.irs_import.apply" : "admin.irs_import.dry_run",
      resourceType: "irs_nonprofit_import_batches",
      resourceId: result.batch?.id || null,
      metadata: { summary: result.summary, states },
    });

    return Response.json(result);
  } catch (err) {
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 400 });
  }
}
