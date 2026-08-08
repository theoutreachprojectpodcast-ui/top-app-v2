import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import {
  acceptAgentBenefitCandidateAsDraft,
  setAgentBenefitCandidateStatus,
} from "@/lib/benefits/agentRepository";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  const ctx = await requirePlatformAdminMutation(request, {
    rateKey: "admin-benefit-candidate-review",
    limit: 40,
  });
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = String(body?.action || "").trim();
  const reviewNotes = String(body?.reviewNotes || "").trim();
  const reviewerProfileId = ctx.profileRow?.id || null;

  try {
    let result;
    if (action === "accept_as_draft") {
      result = await acceptAgentBenefitCandidateAsDraft(ctx.admin, id, {
        reviewerProfileId,
        reviewNotes,
      });
    } else if (action === "needs_more_info" || action === "reject") {
      result = await setAgentBenefitCandidateStatus(ctx.admin, id, {
        status: action === "reject" ? "rejected" : "needs_more_info",
        reviewNotes,
        reviewerProfileId,
      });
    } else {
      return Response.json({ ok: false, error: "unsupported_action" }, { status: 400 });
    }

    try {
      await writeAdminAuditLog(ctx.admin, request, {
        actorWorkosUserId: String(ctx.user?.id || ""),
        actorEmail: String(ctx.user?.email || ""),
        action: `admin.benefits_candidate.${action}`,
        resourceType: "top_benefit_review_items",
        resourceId: id,
        metadata: { reviewNotes, result },
      });
    } catch {
      // Optional during the minimal Benefits-only QA bootstrap.
    }

    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json({ ok: false, error: String(error?.message || error) }, { status: 400 });
  }
}

