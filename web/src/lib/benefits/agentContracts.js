import { z } from "zod";

export const BENEFIT_TYPES = [
  "discount",
  "freebie",
  "grant",
  "scholarship",
  "program",
  "hidden_gem",
  "waiver",
  "refund",
  "travel",
  "service",
  "other",
];

export const BENEFIT_CATEGORIES = [
  "food",
  "travel",
  "experiences",
  "housing",
  "technology",
  "recreation",
  "career",
  "financial",
  "shopping",
  "connectivity",
  "apparel",
  "general",
];

export const BENEFIT_AUDIENCES = ["veteran", "active_duty", "first_responder", "family"];

export const AVAILABILITY_SCOPES = [
  "national",
  "statewide",
  "regional",
  "local",
  "participating_locations",
  "online",
  "hybrid",
];

export const EVIDENCE_LEVELS = [
  "official",
  "provider_confirmed",
  "official_local",
  "community_confirmed",
  "community_reported",
  "unverified",
];

export const BenefitSourceSchema = z.object({
  source_url: z.string().url(),
  source_title: z.string().min(1).max(300),
  source_owner: z.string().min(1).max(200),
  source_type: z.enum([
    "government",
    "provider_policy",
    "provider_location",
    "community_report",
    "forum",
    "news",
    "social",
    "other",
  ]),
  claim_supported: z.string().min(1).max(1200),
  evidence_status: z.enum(["supports", "contradicts", "context", "unverified"]),
  is_primary: z.boolean(),
});

export const ScoutLeadSchema = z.object({
  provider_name: z.string().min(1).max(200),
  working_title: z.string().min(1).max(240),
  lead_summary: z.string().min(1).max(1200),
  likely_audiences: z.array(z.enum(BENEFIT_AUDIENCES)).min(1).max(4),
  likely_scope: z.enum(AVAILABILITY_SCOPES),
  state_codes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(20),
  unusual_value: z.string().min(1).max(1000),
  discovery_sources: z.array(BenefitSourceSchema).min(1).max(8),
});

export const ScoutOutputSchema = z.object({
  search_summary: z.string().min(1).max(1500),
  leads: z.array(ScoutLeadSchema).max(8),
});

export const VerificationOutputSchema = z.object({
  disposition: z.enum(["supported", "needs_more_research", "reject"]),
  explanation: z.string().min(1).max(1800),
  provider_name: z.string().min(1).max(200),
  confirmed_title: z.string().min(1).max(240),
  evidence_level: z.enum(EVIDENCE_LEVELS),
  confidence_score: z.number().min(0).max(1),
  risk_level: z.enum(["low", "normal", "high"]),
  availability_scope: z.enum(AVAILABILITY_SCOPES),
  state_codes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(20),
  audience_tags: z.array(z.enum(BENEFIT_AUDIENCES)).min(1).max(4),
  verified_claim: z.string().min(1).max(1800),
  limitations: z.string().min(1).max(1800),
  redemption_evidence: z.string().min(1).max(1600),
  sources: z.array(BenefitSourceSchema).min(1).max(10),
});

export const AgentCandidateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(240),
  provider_name: z.string().min(1).max(200),
  provider_url: z.string().url().nullable(),
  benefit_type: z.enum(BENEFIT_TYPES),
  category_tags: z.array(z.enum(BENEFIT_CATEGORIES)).min(1).max(5),
  audience_tags: z.array(z.enum(BENEFIT_AUDIENCES)).min(1).max(4),
  summary: z.string().min(1).max(900),
  description: z.string().min(1).max(3000),
  eligibility_summary: z.string().min(1).max(1800),
  availability_scope: z.enum(AVAILABILITY_SCOPES),
  state_codes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(20),
  location_notice: z.string().max(1200).nullable(),
  redemption_method: z.enum([
    "automatic",
    "application",
    "in_person",
    "online",
    "phone",
    "mail",
    "lender_or_provider",
    "varies",
  ]),
  redemption_steps: z.array(z.string().min(1).max(600)).min(1).max(10),
  proof_required: z.array(z.string().min(1).max(500)).max(10),
  offer_value_type: z.enum([
    "percent_off",
    "fixed_amount",
    "fee_waiver",
    "free_item",
    "free_admission",
    "non_cash",
    "variable",
  ]),
  offer_value_percent: z.number().min(0).max(100).nullable(),
  offer_value_amount: z.number().min(0).nullable(),
  savings_summary: z.string().max(1200).nullable(),
  terms_summary: z.string().max(1800).nullable(),
  evidence_level: z.enum(EVIDENCE_LEVELS),
  confidence_score: z.number().min(0).max(1),
  risk_level: z.enum(["low", "normal", "high"]),
  reason_for_review: z.string().min(1).max(1800),
  sources: z.array(BenefitSourceSchema).min(1).max(10),
});

