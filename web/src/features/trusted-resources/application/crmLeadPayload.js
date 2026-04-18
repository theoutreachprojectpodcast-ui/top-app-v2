/**
 * CRM / lead pipeline boundary — shapes application data for future HubSpot, Salesforce, or internal admin queues.
 * Not wired to a live CRM yet; call sites attach this alongside DB insert for forward compatibility.
 */

/**
 * @param {Record<string, unknown>} applicationPayload - raw form + server fields (no secrets)
 * @param {{ submissionId?: string|null, source?: string }} meta
 * @returns {object}
 */
export function buildTrustedResourceCrmLeadPayload(applicationPayload = {}, meta = {}) {
  const p = applicationPayload;
  return {
    objectType: "trusted_resource_application",
    source: meta.source || "torp_web_trusted_resource_form",
    submissionId: meta.submissionId ?? null,
    capturedAt: new Date().toISOString(),
    organization: {
      path: p.organization_path,
      directoryId: p.organization_id ?? null,
      name: String(p.organization_name || "").trim(),
      website: String(p.website || "").trim() || null,
      city: String(p.city || "").trim(),
      state: String(p.state || "").trim(),
      nonprofitType: String(p.nonprofit_type || "").trim(),
    },
    applicant: {
      firstName: String(p.applicant_first_name || "").trim(),
      lastName: String(p.applicant_last_name || "").trim(),
      email: String(p.applicant_email || "").trim(),
      phone: String(p.applicant_phone || "").trim() || null,
    },
    narrative: {
      whyGoodFit: String(p.why_good_fit || "").trim(),
      whoYouServe: String(p.who_you_serve || "").trim(),
      servicesOffered: String(p.services_offered || "").trim(),
      whyJoin: String(p.why_join_trusted_resources || "").trim(),
      referencesOrLinks: String(p.references_or_links || "").trim() || null,
    },
    compliance: {
      agreedToValues: !!p.agreed_to_values,
      agreedInfoAccuracy: !!p.agreed_info_accuracy,
      reviewStatus: String(p.review_status || "submitted"),
    },
    payment: {
      /** Reserved for CRM opportunity stage when billing connects */
      feeStatus: String(p.application_fee_status || "unpaid"),
      demoStatus: String(p.payment_demo_status || "unpaid"),
    },
  };
}
