import "server-only";

import { assertBenefitsAgentQaWriteGate } from "@/lib/benefits/agentGate";

const REVIEW_TABLE = "top_benefit_review_items";

export async function loadBenefitDedupeContext(admin) {
  const [benefitsResult, reviewResult] = await Promise.all([
    admin.from("top_benefits").select("id, slug, title, provider_name").limit(5000),
    admin
      .from(REVIEW_TABLE)
      .select("id, dedupe_key, status")
      .in("status", ["pending", "needs_more_info", "approved"])
      .limit(5000),
  ]);

  if (benefitsResult.error) throw new Error(`benefits_dedupe_load_failed:${benefitsResult.error.message}`);
  if (reviewResult.error) throw new Error(`benefits_review_dedupe_load_failed:${reviewResult.error.message}`);

  return {
    existingBenefits: benefitsResult.data || [],
    existingReviewItems: reviewResult.data || [],
  };
}

export async function listAgentBenefitCandidates(admin, { status = "", limit = 100 } = {}) {
  let query = admin
    .from(REVIEW_TABLE)
    .select("*")
    .eq("origin", "agent")
    .eq("candidate_kind", "new_benefit")
    .order("created_at", { ascending: false })
    .limit(Math.min(200, Math.max(1, Number(limit) || 100)));
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`benefits_candidate_list_failed:${error.message}`);
  return data || [];
}

export async function persistAgentBenefitCandidate(admin, { runId, agentName, gate, explanation }) {
  const runtime = assertBenefitsAgentQaWriteGate();
  if (!gate?.ok || !gate?.candidate || !gate?.dedupeKey) {
    throw new Error("benefits_candidate_write_blocked:gate_not_passed");
  }

  const { data, error } = await admin.rpc("top_submit_benefit_agent_candidate", {
    p_dedupe_key: gate.dedupeKey,
    p_proposed_record: gate.candidate,
    p_evidence: gate.candidate.sources,
    p_explanation: String(explanation || gate.candidate.reason_for_review || "Agent candidate for human review."),
    p_agent_name: String(agentName || "TOP Benefits pipeline"),
    p_agent_run_id: String(runId || ""),
    p_confidence_score: gate.candidate.confidence_score,
    p_risk_level: gate.candidate.risk_level,
    p_project_ref: runtime.actualRef,
  });
  if (error) throw new Error(`benefits_candidate_write_failed:${error.message}`);
  return data;
}

export async function setAgentBenefitCandidateStatus(admin, id, { status, reviewNotes, reviewerProfileId }) {
  const allowed = new Set(["needs_more_info", "rejected"]);
  if (!allowed.has(status)) throw new Error("benefits_candidate_status_not_allowed");
  const { data, error } = await admin
    .from(REVIEW_TABLE)
    .update({
      status,
      review_notes: String(reviewNotes || "").trim() || null,
      reviewed_by_profile_id: reviewerProfileId || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("origin", "agent")
    .eq("candidate_kind", "new_benefit")
    .in("status", ["pending", "needs_more_info"])
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`benefits_candidate_status_failed:${error.message}`);
  if (!data) throw new Error("benefits_candidate_not_found_or_closed");
  return data;
}

export async function acceptAgentBenefitCandidateAsDraft(admin, id, { reviewerProfileId, reviewNotes }) {
  if (!reviewerProfileId) throw new Error("benefits_candidate_reviewer_profile_required");
  const { data, error } = await admin.rpc("top_accept_benefit_agent_candidate", {
    p_review_item_id: id,
    p_reviewer_profile_id: reviewerProfileId,
    p_review_notes: String(reviewNotes || "Accepted as an unpublished draft for catalog review."),
  });
  if (error) throw new Error(`benefits_candidate_accept_failed:${error.message}`);
  return data;
}
