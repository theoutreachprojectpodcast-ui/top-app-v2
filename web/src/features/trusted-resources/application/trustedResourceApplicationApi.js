import {
  TRUSTED_RESOURCES_TABLE,
  buildPendingTrustedResourceRowFromApplication,
  isMissingTrustedResourcesTable,
} from "@/lib/supabase/trustedResourcesCatalog";
import { buildTrustedResourceCrmLeadPayload } from "@/features/trusted-resources/application/crmLeadPayload";

const DIRECTORY_SOURCE = "nonprofits_search_app_v1";
const APPLICATION_TABLE = "trusted_resource_applications";
const LOCAL_FALLBACK_KEY = "top_trusted_resource_applications_demo";

export async function searchDirectoryOrganizations(supabase, term = "", limit = 20) {
  const q = String(term || "").trim();
  if (!supabase || q.length < 2) return [];
  const { data, error } = await supabase
    .from(DIRECTORY_SOURCE)
    .select("ein,org_name,city,state,website")
    .ilike("org_name", `%${q}%`)
    .limit(limit);
  if (error) throw error;
  return (data || []).map((r) => ({
    id: String(r.ein || "").trim(),
    ein: String(r.ein || "").trim(),
    name: String(r.org_name || "").trim(),
    city: String(r.city || "").trim(),
    state: String(r.state || "").trim(),
    website: String(r.website || "").trim(),
  }));
}

function applicationInsertRow(payload) {
  return {
    organization_path: payload.organization_path,
    organization_id: payload.organization_id || null,
    organization_name: String(payload.organization_name || "").trim(),
    applicant_first_name: String(payload.applicant_first_name || "").trim(),
    applicant_last_name: String(payload.applicant_last_name || "").trim(),
    applicant_email: String(payload.applicant_email || "").trim(),
    applicant_phone: String(payload.applicant_phone || "").trim() || null,
    website: String(payload.website || "").trim() || null,
    city: String(payload.city || "").trim(),
    state: String(payload.state || "").trim(),
    nonprofit_type: String(payload.nonprofit_type || "").trim(),
    why_good_fit: String(payload.why_good_fit || "").trim(),
    who_you_serve: String(payload.who_you_serve || "").trim(),
    services_offered: String(payload.services_offered || "").trim(),
    veteran_support_experience: String(payload.veteran_support_experience || "").trim() || null,
    first_responder_support_experience: String(payload.first_responder_support_experience || "").trim() || null,
    community_impact: String(payload.community_impact || "").trim() || null,
    why_join_trusted_resources: String(payload.why_join_trusted_resources || "").trim(),
    references_or_links: String(payload.references_or_links || "").trim() || null,
    agreed_to_values: !!payload.agreed_to_values,
    agreed_info_accuracy: !!payload.agreed_info_accuracy,
    application_fee_status: payload.application_fee_status || "unpaid",
    payment_demo_status: payload.payment_demo_status || "unpaid",
    review_status: payload.review_status || "submitted",
    notes_internal: payload.notes_internal || null,
  };
}

function pushLocalFallback(record) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    // ignore local fallback failures
  }
}

export async function submitTrustedResourceApplication(supabase, payload) {
  const application = applicationInsertRow(payload);

  if (!supabase) {
    pushLocalFallback({
      ...application,
      organization_ein: payload.organization_ein || null,
      local_only: true,
      created_at: new Date().toISOString(),
    });
    return {
      ok: true,
      localOnly: true,
      applicationId: null,
      crmLead: buildTrustedResourceCrmLeadPayload(payload, { submissionId: null, source: "torp_offline_queue" }),
    };
  }

  const { data: inserted, error } = await supabase
    .from(APPLICATION_TABLE)
    .insert(application)
    .select("id")
    .single();

  if (error) {
    pushLocalFallback({
      ...application,
      organization_ein: payload.organization_ein || null,
      local_only: true,
      created_at: new Date().toISOString(),
      supabase_error: error.message,
    });
    return {
      ok: true,
      localOnly: true,
      applicationId: null,
      warning: "Application saved locally because the Supabase applications table is not yet deployed.",
      crmLead: buildTrustedResourceCrmLeadPayload(payload, { submissionId: null, source: "torp_local_fallback" }),
    };
  }

  const crmLead = buildTrustedResourceCrmLeadPayload(
    { ...payload, review_status: application.review_status },
    { submissionId: inserted?.id ?? null, source: "torp_web_trusted_resource_form" }
  );
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.info("[torp:crm:trusted-resource-lead]", crmLead);
  }

  const pendingRow = buildPendingTrustedResourceRowFromApplication(payload, inserted?.id);
  if (!pendingRow) {
    return {
      ok: true,
      localOnly: false,
      applicationId: inserted?.id ?? null,
      crmLead,
      warning:
        "Application submitted. Add a valid 9-digit EIN so this organization can be linked in the Trusted Resources catalog.",
    };
  }

  const { error: catalogError } = await supabase
    .from(TRUSTED_RESOURCES_TABLE)
    .upsert(pendingRow, { onConflict: "ein" });

  if (catalogError) {
    if (isMissingTrustedResourcesTable(catalogError)) {
      return {
        ok: true,
        localOnly: false,
        applicationId: inserted?.id ?? null,
        crmLead,
        warning: "Application submitted. Deploy the Trusted Resources catalog table (`trusted_resources`) in Supabase to store listing rows.",
      };
    }
    return {
      ok: true,
      localOnly: false,
      applicationId: inserted?.id ?? null,
      crmLead,
      warning: `Application submitted; catalog row could not be saved: ${catalogError.message}`,
    };
  }

  return { ok: true, localOnly: false, applicationId: inserted?.id ?? null, crmLead };
}
