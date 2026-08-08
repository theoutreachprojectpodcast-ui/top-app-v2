import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { listAgentBenefitCandidates } from "@/lib/benefits/agentRepository";

export const runtime = "nodejs";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const status = String(url.searchParams.get("status") || "").trim();
  try {
    const candidates = await listAgentBenefitCandidates(ctx.admin, { status, limit: 100 });
    return Response.json({
      ok: true,
      candidates,
      writesEnabled: String(process.env.BENEFITS_AGENT_WRITES_ENABLED || "").toLowerCase() === "true",
    });
  } catch (error) {
    return Response.json({ ok: false, error: String(error?.message || error) }, { status: 400 });
  }
}

