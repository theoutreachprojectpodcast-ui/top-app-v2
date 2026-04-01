"use client";

import { useMemo, useState } from "react";
import SponsorPaymentDemo from "@/features/sponsors/components/SponsorPaymentDemo";
import { submitSponsorApplication } from "@/features/sponsors/api/sponsorApi";
import { SPONSOR_FAMILY, SPONSOR_TIERS, formatUsd, getTierById } from "@/features/sponsors/data/sponsorTiers";

const INITIAL_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  company_name: "",
  company_website: "",
  company_type: "",
  city: "",
  state: "",
  company_description: "",
  contact_role: "",
  sponsor_family: SPONSOR_FAMILY.SUPPORT,
  sponsor_tier_id: SPONSOR_TIERS[0].id,
  sponsor_interest_notes: "",
  audience_goals: "",
  highlights_requested: "",
  placements_requested: [],
  activation_requests: "",
  assets_ready: "unknown",
  brand_links: "",
  additional_notes: "",
  agreed_to_terms: false,
  agreed_demo_payment: false,
};

const PLACEMENT_OPTIONS = [
  "Website placement",
  "Podcast placement",
  "YouTube placement",
  "Digital announcements",
  "Social media support",
  "All of the above",
];

export default function SponsorApplicationForm({ supabase, selectedTierId, onSelectTier }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentBusy, setPaymentBusy] = useState(false);

  const tier = useMemo(() => getTierById(selectedTierId || form.sponsor_tier_id), [selectedTierId, form.sponsor_tier_id]);
  const tierFamily = tier.family;
  const tierAmount = Number(tier.amount || 0);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.first_name &&
      form.last_name &&
      form.email &&
      form.company_name &&
      form.company_type &&
      form.city &&
      form.state &&
      form.company_description &&
      form.contact_role &&
      form.sponsor_interest_notes &&
      form.audience_goals &&
      form.highlights_requested &&
      form.agreed_to_terms &&
      form.agreed_demo_payment &&
      paymentStatus === "demo_paid",
    );
  }, [form, paymentStatus]);

  function setTier(tierId) {
    const next = getTierById(tierId);
    onSelectTier(next.id);
    setForm((f) => ({ ...f, sponsor_family: next.family, sponsor_tier_id: next.id }));
    setPaymentStatus("unpaid");
  }

  function updatePlacement(option, checked) {
    setForm((f) => {
      const prev = new Set(f.placements_requested || []);
      if (checked) prev.add(option);
      else prev.delete(option);
      return { ...f, placements_requested: Array.from(prev) };
    });
  }

  function beginDemoPayment() {
    setPaymentBusy(true);
    setPaymentStatus("payment_pending");
    setStatus("Demo checkout started. Confirm payment to complete this step.");
    setTimeout(() => {
      setPaymentBusy(false);
    }, 600);
  }

  function completeDemoPayment() {
    setPaymentStatus("demo_paid");
    setStatus("Demo payment marked as successful.");
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
        sponsor_family: tierFamily,
        sponsor_tier_name: tier.name,
        sponsor_tier_amount: tierAmount,
        payment_status: paymentStatus === "demo_paid" ? "paid" : paymentStatus,
        payment_demo_status: paymentStatus,
        application_status: "submitted",
      };
      const result = await submitSponsorApplication(supabase, payload);
      if (result.warning) setStatus(result.warning);
      else setStatus("Sponsor application submitted. Our team will follow up with next-step onboarding.");
      if (result.ok) {
        setForm({ ...INITIAL_FORM, sponsor_family: tierFamily, sponsor_tier_id: tier.id });
        setPaymentStatus("unpaid");
      }
    } catch {
      setError("Sponsor application failed to submit. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card sponsorSection">
      <h3>Sponsor Questionnaire & Application</h3>
      <p>Complete this form to reserve your sponsorship tier and start onboarding.</p>

      <form className="sponsorForm" onSubmit={onSubmit}>
        <section className="applySection">
          <h4>Section 1 - Contact Info</h4>
          <div className="form">
            <input placeholder="First name" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
            <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
        </section>

        <section className="applySection">
          <h4>Section 2 - Company Info</h4>
          <div className="form">
            <input placeholder="Company name" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
            <input placeholder="Company website" value={form.company_website} onChange={(e) => setForm((f) => ({ ...f, company_website: e.target.value }))} />
            <input placeholder="Company type / industry" value={form.company_type} onChange={(e) => setForm((f) => ({ ...f, company_type: e.target.value }))} />
            <input placeholder="Primary contact role/title" value={form.contact_role} onChange={(e) => setForm((f) => ({ ...f, contact_role: e.target.value }))} />
            <input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            <input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          </div>
          <textarea rows={3} placeholder="Company description" value={form.company_description} onChange={(e) => setForm((f) => ({ ...f, company_description: e.target.value }))} />
        </section>

        <section className="applySection">
          <h4>Section 3 - Sponsorship Interest</h4>
          <div className="applyOptionGroup">
            <label className="applyOption">
              <input
                type="radio"
                name="family"
                checked={tierFamily === SPONSOR_FAMILY.SUPPORT}
                onChange={() => setTier("support-1000")}
              />
              <span>Support Sponsor tiers ($1,000 / $2,500 / $5,000)</span>
            </label>
            <label className="applyOption">
              <input
                type="radio"
                name="family"
                checked={tierFamily === SPONSOR_FAMILY.INTEGRATED}
                onChange={() => setTier("integrated-15000-basic")}
              />
              <span>Integrated Sponsorship tiers ($15,000 / $20,000 / $25,000)</span>
            </label>
          </div>
          <select value={tier.id} onChange={(e) => setTier(e.target.value)}>
            {SPONSOR_TIERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}{item.subLabel ? ` - ${item.subLabel}` : ""} ({formatUsd(item.amount)})
              </option>
            ))}
          </select>
        </section>

        <section className="applySection">
          <h4>Section 4 - Brand + Marketing Goals</h4>
          <textarea rows={3} placeholder="Why do you want to sponsor The Outreach Project?" value={form.sponsor_interest_notes} onChange={(e) => setForm((f) => ({ ...f, sponsor_interest_notes: e.target.value }))} />
          <textarea rows={2} placeholder="What audience are you hoping to reach?" value={form.audience_goals} onChange={(e) => setForm((f) => ({ ...f, audience_goals: e.target.value }))} />
          <textarea rows={2} placeholder="What products, services, or mission should be highlighted?" value={form.highlights_requested} onChange={(e) => setForm((f) => ({ ...f, highlights_requested: e.target.value }))} />
          <div className="applyCheckList">
            {PLACEMENT_OPTIONS.map((option) => (
              <label className="applyCheck" key={option}>
                <input
                  type="checkbox"
                  checked={(form.placements_requested || []).includes(option)}
                  onChange={(e) => updatePlacement(option, e.target.checked)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          <textarea rows={2} placeholder="Any specific activation ideas or requests?" value={form.activation_requests} onChange={(e) => setForm((f) => ({ ...f, activation_requests: e.target.value }))} />
        </section>

        <section className="applySection">
          <h4>Section 5 - Creative / Assets</h4>
          <select value={form.assets_ready} onChange={(e) => setForm((f) => ({ ...f, assets_ready: e.target.value }))}>
            <option value="unknown">Assets readiness (select one)</option>
            <option value="ready_now">Yes, assets are ready now</option>
            <option value="in_progress">In progress, support requested</option>
            <option value="need_guidance">Need guidance from your team</option>
          </select>
          <input placeholder="Brand links / media kit URL" value={form.brand_links} onChange={(e) => setForm((f) => ({ ...f, brand_links: e.target.value }))} />
          <textarea rows={2} placeholder="Optional notes about logo, messaging, or campaign support" value={form.additional_notes} onChange={(e) => setForm((f) => ({ ...f, additional_notes: e.target.value }))} />
        </section>

        <section className="applySection">
          <h4>Section 6 - Agreement / Confirmation</h4>
          <div className="applyCheckList">
            <label className="applyCheck">
              <input type="checkbox" checked={form.agreed_to_terms} onChange={(e) => setForm((f) => ({ ...f, agreed_to_terms: e.target.checked }))} />
              <span>We align with The Outreach Project values and understand sponsorship is subject to review and onboarding.</span>
            </label>
            <label className="applyCheck">
              <input type="checkbox" checked={form.agreed_demo_payment} onChange={(e) => setForm((f) => ({ ...f, agreed_demo_payment: e.target.checked }))} />
              <span>We acknowledge this is a demo payment flow placeholder until live billing is enabled.</span>
            </label>
          </div>
        </section>

        <section className="applySection">
          <h4>Section 7 - Payment + Submit</h4>
          <p>
            Selected tier: <strong>{tier.name}</strong>{tier.subLabel ? ` (${tier.subLabel})` : ""} - {formatUsd(tierAmount)}
          </p>
          <SponsorPaymentDemo
            amount={tierAmount}
            paymentStatus={paymentStatus}
            onBegin={beginDemoPayment}
            onComplete={completeDemoPayment}
            busy={paymentBusy}
          />
        </section>

        {error ? <p className="applyError">{error}</p> : null}
        {status ? <p className="applyStatus">{status}</p> : null}

        <div className="row wrap">
          <button className="btnPrimary" type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Submitting..." : "Submit Sponsor Application"}
          </button>
        </div>
      </form>
    </section>
  );
}
