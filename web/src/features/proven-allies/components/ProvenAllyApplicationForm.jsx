"use client";

import { useMemo, useState } from "react";
import {
  searchDirectoryOrganizations,
  submitProvenAllyApplication,
} from "@/features/proven-allies/api/provenAllyApplicationApi";

const FEE_AMOUNT = 49;

const INITIAL_FORM = {
  applicant_first_name: "",
  applicant_last_name: "",
  applicant_email: "",
  applicant_phone: "",
  organization_path: "existing",
  organization_name: "",
  organization_id: "",
  website: "",
  city: "",
  state: "",
  nonprofit_type: "",
  who_you_serve: "",
  services_offered: "",
  veteran_support_experience: "",
  first_responder_support_experience: "",
  community_impact: "",
  why_good_fit: "",
  why_join_proven_allies: "",
  references_or_links: "",
  agreed_to_values: false,
  agreed_info_accuracy: false,
  application_fee_status: "unpaid",
  payment_demo_status: "unpaid",
};

export default function ProvenAllyApplicationForm({ supabase, onClose }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [feePaid, setFeePaid] = useState(false);

  const canSubmit = useMemo(() => {
    const baseValid =
      form.applicant_first_name &&
      form.applicant_last_name &&
      form.applicant_email &&
      form.organization_name &&
      form.city &&
      form.state &&
      form.nonprofit_type &&
      form.why_good_fit &&
      form.who_you_serve &&
      form.services_offered &&
      form.why_join_proven_allies &&
      form.agreed_to_values &&
      form.agreed_info_accuracy;
    if (!baseValid) return false;
    if (form.organization_path === "existing" && !form.organization_id) return false;
    return feePaid;
  }, [form, feePaid]);

  async function runSearch() {
    setSearching(true);
    setError("");
    try {
      const rows = await searchDirectoryOrganizations(supabase, searchTerm, 20);
      setSearchResults(rows);
      if (!rows.length) setStatus("No matching directory organizations found.");
    } catch {
      setError("Directory lookup failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  function selectOrganization(org) {
    setForm((f) => ({
      ...f,
      organization_id: org.id,
      organization_name: org.name,
      website: f.website || org.website || "",
      city: f.city || org.city || "",
      state: f.state || org.state || "",
    }));
    setStatus(`Selected ${org.name}.`);
  }

  function payDemoFee() {
    setFeePaid(true);
    setForm((f) => ({
      ...f,
      application_fee_status: "demo_paid",
      payment_demo_status: "demo_paid",
    }));
    setStatus("Demo application fee marked as paid.");
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    setStatus("");
    try {
      const payload = {
        ...form,
        organization_id: form.organization_id || null,
        review_status: "submitted",
      };
      const result = await submitProvenAllyApplication(supabase, payload);
      if (result.warning) setStatus(result.warning);
      else setStatus("Application submitted successfully.");
      if (result.ok) setForm(INITIAL_FORM);
      if (result.ok) setFeePaid(false);
    } catch {
      setError("Submission failed. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard provenApplyModal" onClick={(e) => e.stopPropagation()}>
        <h3>Apply to Become a Proven Ally</h3>
        <p>Structured review for organizations committed to trusted, mission-first support.</p>

        <form className="provenApplyForm" onSubmit={onSubmit}>
          <section className="applySection">
            <h4>Applicant Info</h4>
            <div className="form">
              <input placeholder="First name" value={form.applicant_first_name} onChange={(e) => setForm((f) => ({ ...f, applicant_first_name: e.target.value }))} />
              <input placeholder="Last name" value={form.applicant_last_name} onChange={(e) => setForm((f) => ({ ...f, applicant_last_name: e.target.value }))} />
              <input placeholder="Email" value={form.applicant_email} onChange={(e) => setForm((f) => ({ ...f, applicant_email: e.target.value }))} />
              <input placeholder="Phone" value={form.applicant_phone} onChange={(e) => setForm((f) => ({ ...f, applicant_phone: e.target.value }))} />
            </div>
          </section>

          <section className="applySection">
            <h4>Organization Path</h4>
            <div className="row wrap">
              <label><input type="radio" name="path" checked={form.organization_path === "existing"} onChange={() => setForm((f) => ({ ...f, organization_path: "existing", organization_id: "" }))} /> I am already listed in the directory</label>
              <label><input type="radio" name="path" checked={form.organization_path === "new"} onChange={() => setForm((f) => ({ ...f, organization_path: "new", organization_id: "" }))} /> I am a new organization</label>
            </div>

            {form.organization_path === "existing" && (
              <div className="applyDirectorySearch">
                <div className="row">
                  <input placeholder="Search organization name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <button className="btnSoft" type="button" onClick={runSearch} disabled={searching || searchTerm.trim().length < 2}>
                    {searching ? "Searching..." : "Search Directory"}
                  </button>
                </div>
                {!!searchResults.length && (
                  <div className="results">
                    {searchResults.map((org) => (
                      <button key={org.id} type="button" className="resultCard applySearchResult" onClick={() => selectOrganization(org)}>
                        <strong>{org.name}</strong>
                        <p>{[org.city, org.state].filter(Boolean).join(", ") || "Location not listed"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="applySection">
            <h4>Organization Info</h4>
            <div className="form">
              <input placeholder="Organization name" value={form.organization_name} onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))} />
              <input placeholder="Website" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
              <input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              <input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              <input placeholder="Nonprofit type/category" value={form.nonprofit_type} onChange={(e) => setForm((f) => ({ ...f, nonprofit_type: e.target.value }))} />
            </div>
          </section>

          <section className="applySection">
            <h4>Why You Should Be a Proven Ally</h4>
            <textarea rows={3} placeholder="Why would your organization be a strong Proven Ally?" value={form.why_good_fit} onChange={(e) => setForm((f) => ({ ...f, why_good_fit: e.target.value }))} />
            <textarea rows={3} placeholder="Who do you serve?" value={form.who_you_serve} onChange={(e) => setForm((f) => ({ ...f, who_you_serve: e.target.value }))} />
            <textarea rows={3} placeholder="What services do you provide?" value={form.services_offered} onChange={(e) => setForm((f) => ({ ...f, services_offered: e.target.value }))} />
            <textarea rows={3} placeholder="Veteran support experience" value={form.veteran_support_experience} onChange={(e) => setForm((f) => ({ ...f, veteran_support_experience: e.target.value }))} />
            <textarea rows={3} placeholder="First responder support experience" value={form.first_responder_support_experience} onChange={(e) => setForm((f) => ({ ...f, first_responder_support_experience: e.target.value }))} />
            <textarea rows={3} placeholder="Community impact" value={form.community_impact} onChange={(e) => setForm((f) => ({ ...f, community_impact: e.target.value }))} />
            <textarea rows={3} placeholder="Why do you want to join Proven Allies?" value={form.why_join_proven_allies} onChange={(e) => setForm((f) => ({ ...f, why_join_proven_allies: e.target.value }))} />
            <textarea rows={2} placeholder="References or links" value={form.references_or_links} onChange={(e) => setForm((f) => ({ ...f, references_or_links: e.target.value }))} />
          </section>

          <section className="applySection">
            <h4>Alignment & Standards</h4>
            <label><input type="checkbox" checked={form.agreed_to_values} onChange={(e) => setForm((f) => ({ ...f, agreed_to_values: e.target.checked }))} /> We align with The Outreach Project values and mission standards.</label>
            <label><input type="checkbox" checked={form.agreed_info_accuracy} onChange={(e) => setForm((f) => ({ ...f, agreed_info_accuracy: e.target.checked }))} /> We confirm submitted information is accurate to the best of our knowledge.</label>
          </section>

          <section className="applySection applyFeeCard">
            <h4>Application Fee (Demo)</h4>
            <p>Application Fee: ${FEE_AMOUNT}</p>
            <p>Status: {feePaid ? "Demo Paid" : "Unpaid"}</p>
            {!feePaid && <button className="btnPrimary" type="button" onClick={payDemoFee}>Pay Application Fee (Demo)</button>}
          </section>

          {error ? <p className="applyError">{error}</p> : null}
          {status ? <p className="applyStatus">{status}</p> : null}

          <div className="row">
            <button className="btnSoft" type="button" onClick={onClose}>Cancel</button>
            <button className="btnPrimary" type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
