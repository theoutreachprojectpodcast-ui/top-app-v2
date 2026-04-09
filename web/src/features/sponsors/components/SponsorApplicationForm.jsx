"use client";

import { useMemo, useState } from "react";
import SponsorPaymentDemo from "@/features/sponsors/components/SponsorPaymentDemo";
import { submitSponsorApplication } from "@/features/sponsors/api/sponsorApi";
import { SPONSOR_PROGRAM_TYPE_MAIN, SPONSOR_TIERS, formatUsd, getTierById } from "@/features/sponsors/data/sponsorTiers";

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

export default function SponsorApplicationForm({
  supabase,
  selectedTierId,
  onSelectTier,
  variant = "page",
  designContext = "main",
  programType = SPONSOR_PROGRAM_TYPE_MAIN,
  tiers = SPONSOR_TIERS,
  placementOptions = PLACEMENT_OPTIONS,
  onSuccessfulSubmit,
}) {
  const isPodcastSkin = designContext === "podcast";
  const tierList = Array.isArray(tiers) && tiers.length ? tiers : SPONSOR_TIERS;
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentBusy, setPaymentBusy] = useState(false);

  const tier = useMemo(
    () => getTierById(selectedTierId || tierList[0]?.id, tierList),
    [selectedTierId, tierList],
  );
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
    const next = getTierById(tierId, tierList);
    onSelectTier(next.id);
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
        sponsor_program_type: programType,
        sponsor_family: tierFamily,
        sponsor_tier_id: tier.id,
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
        setForm({ ...INITIAL_FORM });
        setPaymentStatus("unpaid");
        onSuccessfulSubmit?.();
      }
    } catch {
      setError("Sponsor application failed to submit. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  const flowLabel =
    programType === SPONSOR_PROGRAM_TYPE_MAIN
      ? "Mission partner application (main Outreach Project sponsors)"
      : "Podcast sponsor application";

  const outerClass = (() => {
    if (isPodcastSkin) {
      return variant === "modal"
        ? "podcastSponsorFlowModal__applyBlock sponsorSection--modalForm"
        : "podcastSection podcastSponsorFlowModal__applyBlock";
    }
    return variant === "modal" ? "sponsorSection sponsorSection--modalForm" : "card sponsorSection";
  })();
  const leadClass = isPodcastSkin ? "podcastSponsorFlowModal__blockLead" : "sponsorSectionLead";
  const formClass = [
    "sponsorForm",
    variant === "modal" ? "sponsorForm--modal" : "",
    isPodcastSkin ? "podcastSponsorApplyForm" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={outerClass}>
      <h3 className={isPodcastSkin ? "podcastSponsorFlowModal__blockTitle" : undefined}>Sponsor questionnaire and application</h3>
      <p className={leadClass}>{flowLabel}</p>

      <form className={formClass} onSubmit={onSubmit}>
        <section className="applySection">
          <h4>Step 1 — Contact</h4>
          <div className="form">
            <input placeholder="First name" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
            <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
        </section>

        <section className="applySection">
          <h4>Step 2 — Organization</h4>
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
          <h4>Step 3 — Tier</h4>
          <p className={leadClass}>Choose the package that matches your goals. Details are available on the options page.</p>
          <label className="sponsorTierSelectLabel" htmlFor="sponsor-tier-select">
            Sponsorship tier
          </label>
          <select id="sponsor-tier-select" className="sponsorTierSelect" value={tier.id} onChange={(e) => setTier(e.target.value)}>
            {tierList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({formatUsd(item.amount)})
              </option>
            ))}
          </select>
        </section>

        <section className="applySection">
          <h4>Step 4 — Goals and placements</h4>
          <textarea rows={3} placeholder="Why do you want to sponsor?" value={form.sponsor_interest_notes} onChange={(e) => setForm((f) => ({ ...f, sponsor_interest_notes: e.target.value }))} />
          <textarea rows={2} placeholder="What audience are you hoping to reach?" value={form.audience_goals} onChange={(e) => setForm((f) => ({ ...f, audience_goals: e.target.value }))} />
          <textarea rows={2} placeholder="What should be highlighted about your brand or mission?" value={form.highlights_requested} onChange={(e) => setForm((f) => ({ ...f, highlights_requested: e.target.value }))} />
          <div className="dsChoiceGroup">
            {placementOptions.map((option) => (
              <label className="dsChoice dsChoice--checkbox" key={option}>
                <input
                  type="checkbox"
                  checked={(form.placements_requested || []).includes(option)}
                  onChange={(e) => updatePlacement(option, e.target.checked)}
                />
                <span className="dsChoice__control" />
                <span className="dsChoice__text">{option}</span>
              </label>
            ))}
          </div>
          <textarea rows={2} placeholder="Activation ideas or special requests" value={form.activation_requests} onChange={(e) => setForm((f) => ({ ...f, activation_requests: e.target.value }))} />
        </section>

        <section className="applySection">
          <h4>Step 5 — Creative / assets</h4>
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
          <h4>Step 6 — Agreement</h4>
          <div className="dsChoiceGroup">
            <label className="dsChoice dsChoice--checkbox">
              <input type="checkbox" checked={form.agreed_to_terms} onChange={(e) => setForm((f) => ({ ...f, agreed_to_terms: e.target.checked }))} />
              <span className="dsChoice__control" />
              <span className="dsChoice__text">We align with The Outreach Project values and understand sponsorship is subject to review and onboarding.</span>
            </label>
            <label className="dsChoice dsChoice--checkbox">
              <input type="checkbox" checked={form.agreed_demo_payment} onChange={(e) => setForm((f) => ({ ...f, agreed_demo_payment: e.target.checked }))} />
              <span className="dsChoice__control" />
              <span className="dsChoice__text">We acknowledge this is a demo payment flow placeholder until live billing is enabled.</span>
            </label>
          </div>
        </section>

        <section className="applySection">
          <h4>Step 7 — Demo payment and submit</h4>
          <p>
            Selected tier: <strong>{tier.name}</strong> — {formatUsd(tierAmount)}
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

        <div className="row wrap sponsorFormActions">
          <button className="btnPrimary" type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Submitting..." : "Submit application"}
          </button>
        </div>
      </form>
    </section>
  );
}
