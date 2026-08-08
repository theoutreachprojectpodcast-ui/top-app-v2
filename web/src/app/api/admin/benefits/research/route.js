import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { researchBenefitCandidates } from "@/lib/benefits/agentPipeline";
import {
  loadBenefitDedupeContext,
  persistAgentBenefitCandidate,
} from "@/lib/benefits/agentRepository";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, {
    rateKey: "admin-benefits-agent-research",
    limit: 5,
    windowMs: 60_000,
  });
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const query = String(body?.query || "").trim();
  if (!query) return Response.json({ ok: false, error: "research_query_required" }, { status: 400 });

  try {
    const context = await loadBenefitDedupeContext(ctx.admin);
    const result = await researchBenefitCandidates({
      query,
      audiences: Array.isArray(body.audiences) ? body.audiences : [],
      stateCodes: Array.isArray(body.stateCodes) ? body.stateCodes : [],
      limit: body.limit,
      ...context,
    });

    const persisted = [];
    if (body.persist === true) {
      for (const item of result.candidates) {
        if (!item.gate?.ok) continue;
        const id = await persistAgentBenefitCandidate(ctx.admin, {
          runId: result.runId,
          agentName: "TOP Benefits scout-verifier-curator",
          gate: item.gate,
          explanation: item.verification?.explanation || item.candidate?.reason_for_review,
        });
        persisted.push({ id, dedupeKey: item.gate.dedupeKey });
      }
    }

    try {
      await writeAdminAuditLog(ctx.admin, request, {
        actorWorkosUserId: String(ctx.user?.id || ""),
        actorEmail: String(ctx.user?.email || ""),
        action: body.persist === true ? "admin.benefits_agent.persist" : "admin.benefits_agent.dry_run",
        resourceType: "top_benefit_review_items",
        resourceId: result.runId,
        metadata: {
          query,
          model: result.model,
          found: result.candidates.length,
          passedGate: result.candidates.filter((item) => item.gate?.ok).length,
          persisted: persisted.length,
        },
      });
    } catch {
      // Research results remain useful if the optional admin audit table is not yet installed in a fresh QA project.
    }

    return Response.json({ ok: true, result, persisted });
  } catch (error) {
    const message = String(error?.message || error);
    const status = /missing_openai_api_key|write_blocked|project_mismatch|production_project/.test(message) ? 409 : 400;
    return Response.json({ ok: false, error: message }, { status });
  }
}

