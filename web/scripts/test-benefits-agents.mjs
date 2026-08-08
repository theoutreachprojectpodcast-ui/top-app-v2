#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertBenefitsAgentQaWriteGate,
  gateBenefitCandidate,
  projectRefFromSupabaseUrl,
} from "@/lib/benefits/agentGate";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`fail - ${name}`);
    throw error;
  }
}

function candidate(overrides = {}) {
  return {
    slug: "example-provider-veteran-benefit",
    title: "Example Provider Veteran Benefit",
    provider_name: "Example Provider",
    provider_url: "https://example.com/benefit",
    benefit_type: "discount",
    category_tags: ["travel"],
    audience_tags: ["veteran"],
    summary: "A clear member-facing summary.",
    description: "A complete description grounded in the attached source.",
    eligibility_summary: "Eligible veterans with accepted proof of service.",
    availability_scope: "national",
    state_codes: [],
    location_notice: null,
    redemption_method: "online",
    redemption_steps: ["Verify eligibility on the provider website."],
    proof_required: ["Accepted proof of service"],
    offer_value_type: "percent_off",
    offer_value_percent: 10,
    offer_value_amount: null,
    savings_summary: "Save 10% on an eligible booking.",
    terms_summary: "Provider terms apply.",
    evidence_level: "official",
    confidence_score: 0.95,
    risk_level: "normal",
    reason_for_review: "Official provider page supports the claim.",
    sources: [
      {
        source_url: "https://example.com/benefit",
        source_title: "Official benefit policy",
        source_owner: "Example Provider",
        source_type: "provider_policy",
        claim_supported: "Confirms a 10% veteran offer.",
        evidence_status: "supports",
        is_primary: true,
      },
    ],
    ...overrides,
  };
}

test("QA project reference is parsed from the Supabase URL", () => {
  assert.equal(
    projectRefFromSupabaseUrl("https://xqtslzmtjcylfzmmzzmv.supabase.co"),
    "xqtslzmtjcylfzmmzzmv",
  );
});

test("QA write gate requires explicit mode, flag, and matching project", () => {
  const result = assertBenefitsAgentQaWriteGate({
    BENEFITS_AGENT_ENV: "qa",
    BENEFITS_AGENT_WRITES_ENABLED: "true",
    BENEFITS_AGENT_QA_PROJECT_REF: "xqtslzmtjcylfzmmzzmv",
    BENEFITS_AGENT_PRODUCTION_PROJECT_REF: "xbtfoundwmhrqrbcuqcw",
    NEXT_PUBLIC_SUPABASE_URL: "https://xqtslzmtjcylfzmmzzmv.supabase.co",
  });
  assert.equal(result.actualRef, "xqtslzmtjcylfzmmzzmv");
});

test("production Supabase project is always blocked", () => {
  assert.throws(
    () =>
      assertBenefitsAgentQaWriteGate({
        BENEFITS_AGENT_ENV: "qa",
        BENEFITS_AGENT_WRITES_ENABLED: "true",
        BENEFITS_AGENT_QA_PROJECT_REF: "xbtfoundwmhrqrbcuqcw",
        BENEFITS_AGENT_PRODUCTION_PROJECT_REF: "xbtfoundwmhrqrbcuqcw",
        NEXT_PUBLIC_SUPABASE_URL: "https://xbtfoundwmhrqrbcuqcw.supabase.co",
      }),
    /production_project/,
  );
});

test("statewide candidates require state codes", () => {
  const result = gateBenefitCandidate(candidate({ availability_scope: "statewide", state_codes: [] }));
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((reason) => reason.includes("state code")));
});

test("national candidates cannot be mislabeled with state codes", () => {
  const result = gateBenefitCandidate(candidate({ availability_scope: "national", state_codes: ["NV"] }));
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((reason) => reason.includes("cannot be restricted")));
});

test("community-only evidence loses exact savings claims", () => {
  const result = gateBenefitCandidate(
    candidate({
      evidence_level: "community_reported",
      sources: [
        {
          source_url: "https://community.example.org/report",
          source_title: "Community report",
          source_owner: "Community member",
          source_type: "forum",
          claim_supported: "One member reported an offer.",
          evidence_status: "supports",
          is_primary: false,
        },
      ],
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.candidate.offer_value_type, "variable");
  assert.equal(result.candidate.offer_value_percent, null);
  assert.equal(result.candidate.savings_summary, null);
  assert.equal(result.candidate.risk_level, "high");
});

test("duplicate catalog entries are rejected", () => {
  const input = candidate();
  const result = gateBenefitCandidate(input, {
    existingBenefits: [{ slug: input.slug, provider_name: input.provider_name, title: input.title }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((reason) => reason.includes("duplicates")));
});

test("category art, review dates, and draft state are deterministic", () => {
  const result = gateBenefitCandidate(candidate(), { now: "2026-08-08T00:00:00.000Z" });
  assert.equal(result.ok, true);
  assert.equal(result.candidate.category_art_key, "travel");
  assert.equal(result.candidate.publication_status, "draft");
  assert.equal(result.candidate.record_origin, "agent");
  assert.equal(result.candidate.next_review_at, "2026-11-06T00:00:00.000Z");
});

test("SQL agent intake cannot insert a Benefit or request publication", () => {
  const sql = fs.readFileSync(path.join(webRoot, "supabase/benefits_v02_agent_review.sql"), "utf8");
  const intake = sql.split("create or replace function public.top_submit_benefit_agent_candidate")[1]
    .split("create or replace function public.top_accept_benefit_agent_candidate")[0]
    .toLowerCase();
  assert.ok(intake.includes("'pending'"));
  assert.ok(intake.includes("'publication_status', 'draft'"));
  assert.ok(intake.includes("top_benefit_agent_runtime_guard"));
  assert.ok(intake.includes("writes_enabled = true"));
  assert.equal(intake.includes("insert into public.top_benefits"), false);
});

console.log("\nAll TOP Benefits agent safety tests passed.");
