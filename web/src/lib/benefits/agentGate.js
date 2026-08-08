import { createHash } from "node:crypto";
import { AgentCandidateSchema, BENEFIT_CATEGORIES } from "@/lib/benefits/agentContracts";

const OFFICIAL_SOURCE_TYPES = new Set(["government", "provider_policy", "provider_location"]);
const GEOGRAPHIC_SCOPES = new Set(["statewide", "regional", "local"]);
const NON_STATE_SCOPES = new Set(["national", "online"]);
const DEFAULT_PRODUCTION_PROJECT_REF = "xbtfoundwmhrqrbcuqcw";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizedKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isoDate(value) {
  return new Date(value).toISOString();
}

function addDays(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function projectRefFromSupabaseUrl(rawUrl) {
  const match = String(rawUrl || "")
    .trim()
    .match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  return match?.[1]?.toLowerCase() || "";
}

export function assertBenefitsAgentQaWriteGate(env = process.env) {
  const mode = String(env.BENEFITS_AGENT_ENV || "").trim().toLowerCase();
  const enabled = String(env.BENEFITS_AGENT_WRITES_ENABLED || "").trim().toLowerCase() === "true";
  const actualRef = projectRefFromSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const expectedRef = String(env.BENEFITS_AGENT_QA_PROJECT_REF || "").trim().toLowerCase();
  const productionRef = String(env.BENEFITS_AGENT_PRODUCTION_PROJECT_REF || DEFAULT_PRODUCTION_PROJECT_REF)
    .trim()
    .toLowerCase();

  if (mode !== "qa") throw new Error("benefits_agent_write_blocked:not_qa_mode");
  if (!enabled) throw new Error("benefits_agent_write_blocked:writes_disabled");
  if (!actualRef || !expectedRef || actualRef !== expectedRef) {
    throw new Error("benefits_agent_write_blocked:qa_project_mismatch");
  }
  if (actualRef === productionRef) throw new Error("benefits_agent_write_blocked:production_project");

  return { actualRef, expectedRef };
}

export function benefitCandidateDedupeKey(candidate) {
  const states = unique(candidate.state_codes || []).sort().join(",");
  const material = [
    normalizedKey(candidate.provider_name),
    normalizedKey(candidate.title),
    normalizedKey(candidate.availability_scope),
    states,
  ].join("|");
  return `agent:${createHash("sha256").update(material).digest("hex")}`;
}

function duplicatesExisting(candidate, existingBenefits = [], existingReviewItems = []) {
  const slug = normalizedKey(candidate.slug);
  const provider = normalizedKey(candidate.provider_name);
  const title = normalizedKey(candidate.title);
  const dedupeKey = benefitCandidateDedupeKey(candidate);

  if (
    existingBenefits.some(
      (item) =>
        normalizedKey(item.slug) === slug ||
        (normalizedKey(item.provider_name) === provider && normalizedKey(item.title) === title),
    )
  ) {
    return true;
  }

  return existingReviewItems.some((item) => String(item.dedupe_key || "") === dedupeKey);
}

function reviewCadenceDays(candidate) {
  if (candidate.evidence_level === "official" && candidate.sources.some((s) => s.source_type === "government")) {
    return 180;
  }
  if (["official", "provider_confirmed"].includes(candidate.evidence_level)) return 90;
  return 30;
}

export function gateBenefitCandidate(rawCandidate, options = {}) {
  const parsed = AgentCandidateSchema.safeParse(rawCandidate);
  if (!parsed.success) {
    return {
      ok: false,
      reasons: parsed.error.issues.map((issue) => `${issue.path.join(".") || "candidate"}: ${issue.message}`),
      candidate: null,
      dedupeKey: null,
    };
  }

  const candidate = structuredClone(parsed.data);
  const reasons = [];
  candidate.state_codes = unique(candidate.state_codes.map((state) => state.toUpperCase())).sort();
  candidate.category_tags = unique(candidate.category_tags);
  candidate.audience_tags = unique(candidate.audience_tags);
  candidate.sources = candidate.sources.filter(
    (source, index, all) => all.findIndex((item) => item.source_url === source.source_url) === index,
  );

  if (GEOGRAPHIC_SCOPES.has(candidate.availability_scope) && candidate.state_codes.length === 0) {
    reasons.push(`${candidate.availability_scope} benefits require at least one state code`);
  }
  if (NON_STATE_SCOPES.has(candidate.availability_scope) && candidate.state_codes.length > 0) {
    reasons.push(`${candidate.availability_scope} benefits cannot be restricted to state codes`);
  }
  if (candidate.availability_scope === "participating_locations" && !candidate.location_notice) {
    reasons.push("participating-location benefits require a member-facing location warning");
  }
  if (!candidate.sources.some((source) => source.evidence_status === "supports")) {
    reasons.push("at least one source must support the proposed claim");
  }
  if (duplicatesExisting(candidate, options.existingBenefits, options.existingReviewItems)) {
    reasons.push("candidate duplicates an existing benefit or pending proposal");
  }

  const hasOfficialSource = candidate.sources.some(
    (source) => OFFICIAL_SOURCE_TYPES.has(source.source_type) && source.evidence_status === "supports",
  );
  const hasExactValue = candidate.offer_value_percent != null || candidate.offer_value_amount != null;
  if (!hasOfficialSource && hasExactValue) {
    candidate.offer_value_percent = null;
    candidate.offer_value_amount = null;
    candidate.offer_value_type = "variable";
    candidate.savings_summary = null;
    candidate.risk_level = "high";
    candidate.evidence_level = "community_reported";
  }

  if (!hasOfficialSource && candidate.evidence_level !== "community_reported") {
    candidate.evidence_level = "community_reported";
    candidate.risk_level = "high";
  }

  const now = options.now ? new Date(options.now) : new Date();
  candidate.category_art_key = BENEFIT_CATEGORIES.includes(candidate.category_tags[0])
    ? candidate.category_tags[0]
    : "general";
  candidate.publication_status = "draft";
  candidate.verification_status = hasOfficialSource ? "in_review" : "unverified";
  candidate.record_origin = "agent";
  candidate.last_checked_at = isoDate(now);
  candidate.next_review_at = addDays(now, reviewCadenceDays(candidate));

  return {
    ok: reasons.length === 0,
    reasons,
    candidate,
    dedupeKey: benefitCandidateDedupeKey(candidate),
  };
}

