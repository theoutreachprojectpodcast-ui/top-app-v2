"use client";

import { useEffect, useMemo, useState } from "react";
import SponsorPaymentDemo from "@/features/sponsors/components/SponsorPaymentDemo";
import { submitSponsorApplication } from "@/features/sponsors/api/sponsorApi";
import { SPONSOR_PROGRAM_TYPE_PODCAST } from "@/features/sponsors/data/podcastSponsorTiers";
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
  agreed_deferred_billing: false,
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
  /** When returning from Stripe Checkout (podcast flow): { checkout: "success"|"cancel", sessionId } */
  stripeReturn = null,
}) {
  const isPodcastSkin = designContext === "podcast";
  const isPodcast = programType === SPONSOR_PROGRAM_TYPE_PODCAST;
  const tierList = Array.isArray(tiers) && tiers.length ? tiers : SPONSOR_TIERS;
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [podcastBillingLive, setPodcastBillingLive] = useState(false);
  const [podcastMissingEnv, setPodcastMissingEnv] = useState([]);

  const tier = useMemo(
    () => getTierById(selectedTierId || tierList[0]?.id, tierList),
    [selectedTierId, tierList],
  );
  const tierFamily = tier.family;
  const tierAmount = Number(tier.amount || 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/capabilities", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setPodcastBillingLive(!!data.podcastSponsorCheckout);
        setPodcastMissingEnv(Array.isArray(data.podcastSponsorMissingEnv) ? data.podcastSponsorMissingEnv : []);
      } catch {
        if (!cancelled) {
          setPodcastBillingLive(false);
          setPodcastMissingEnv([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPodcast || !podcastBillingLive) return;
    const checkout = String(stripeReturn?.checkout || "").trim();
    const sessionId = String(stripeReturn?.sessionId || "").trim();
    if (checkout !== "success" || !sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/billing/verify-podcast-session?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: "include" },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.paid) {
          setPaymentStatus("stripe_paid");
          setStatus("Payment confirmed. You can submit your podcast sponsor application.");
        } else {
          setStatus("We could not confirm payment for this session. You can try Pay with Stripe again.");
        }
      } catch {
        if (!cancelled) setError("Could not verify payment. Try again or contact support.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPodcast, podcastBillingLive, stripeReturn?.checkout, stripeReturn?.sessionId]);

  const canSubmit = useMemo(() => {
    const baseFields = Boolean(
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
        form.highlights_requested,
    );
    if (!baseFields) return false;

    if (isPodcast) {
      const termsOk = form.agreed_to_terms;
      const deferredOk = !podcastBillingLive && form.agreed_deferred_billing;
      const agreementOk = termsOk && (podcastBillingLive ? true : deferredOk);
      const paymentOk = podcastBillingLive ? paymentStatus === "stripe_paid" : true;
      return agreementOk && paymentOk;
    }

    return Boolean(
      form.agreed_to_terms && form.agreed_demo_payment && paymentStatus === "demo_paid",
    );
  }, [form, isPodcast, podcastBillingLive, paymentStatus]);

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

  async function beginStripePodcastCheckout() {
    setError("");
    setStatus("");
    setPaymentBusy(true);
    try {
      const res = await fetch("/api/billing/podcast-sponsor-checkout", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ podcastTierId: tier.id, returnPath: "/podcasts" }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (res.status === 401) {
        setError("Sign in with your Outreach Project account to complete Stripe checkout.");
        return;
      }
      if (data.error === "podcast_billing_not_configured") {
        setError("Podcast billing is not configured on the server yet. See deployment docs for Stripe price env vars.");
        return;
      }
      setError(data.message || data.error || "Could not start checkout.");
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setPaymentBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    setStatus("");
    try {
      const paymentLabel = (() => {
        if (!isPodcast) {
          return paymentStatus === "demo_paid" ? "paid" : paymentStatus;
        }
        if (podcastBillingLive && paymentStatus === "stripe_paid") return "paid_stripe";
        return "pending_review_no_live_checkout";
      })();

      const payload = {
        ...form,
        sponsor_program_type: programType,
        sponsor_family: tierFamily,
        sponsor_tier_id: tier.id,
        sponsor_tier_name: tier.name,
        sponsor_tier_amount: tierAmount,
        payment_status: paymentLabel,
        payment_demo_status: isPodcast ? paymentStatus : paymentStatus,
        application_status: "submitted",
      };
      const result = await submitSponsorApplication(supabase, payload);
      if (!result.ok) {
        setError(result.error || "Could not submit application.");
        return;
      }
      setStatus("Sponsor application submitted. Our team will follow up with next-step onboarding.");
      setForm({ ...INITIAL_FORM });
      setPaymentStatus("unpaid");
      onSuccessfulSubmit?.();
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
            {isPodcast && podcastBillingLive ? (
              <p className="sponsorSectionLead" style={{ marginTop: 8 }}>
                Pay with Stripe in the next step (signed-in account required). No demo payment placeholder is used for podcast sponsors when billing is live.
              </p>
            ) : null}
            {isPodcast && !podcastBillingLive ? (
              <label className="dsChoice dsChoice--checkbox">
                <input
                  type="checkbox"
                  checked={form.agreed_deferred_billing}
                  onChange={(e) => setForm((f) => ({ ...f, agreed_deferred_billing: e.target.checked }))}
                />
                <span className="dsChoice__control" />
                <span className="dsChoice__text">
                  We understand live Stripe checkout for this tier is not configured yet; we are submitting for review and expect follow-up for payment and activation.
                </span>
              </label>
            ) : null}
            {!isPodcast ? (
              <label className="dsChoice dsChoice--checkbox">
                <input type="checkbox" checked={form.agreed_demo_payment} onChange={(e) => setForm((f) => ({ ...f, agreed_demo_payment: e.target.checked }))} />
                <span className="dsChoice__control" />
                <span className="dsChoice__text">We acknowledge this is a demo payment flow placeholder until live billing is enabled.</span>
              </label>
            ) : null}
          </div>
        </section>

        <section className="applySection">
          <h4>{isPodcast ? "Step 7 — Payment and submit" : "Step 7 — Demo payment and submit"}</h4>
          <p>
            Selected tier: <strong>{tier.name}</strong> — {formatUsd(tierAmount)}
          </p>
          {isPodcast && podcastBillingLive ? (
            <div className="sponsorPaymentCard">
              <h4>Stripe checkout</h4>
              <p>Uses the same Stripe account as membership billing. You will return to the podcast page after payment.</p>
              <p>
                <strong>Status:</strong>{" "}
                {paymentStatus === "stripe_paid" ? "Paid — ready to submit" : "Not paid yet"}
              </p>
              <button
                type="button"
                className="btnPrimary"
                disabled={paymentBusy || paymentStatus === "stripe_paid"}
                onClick={beginStripePodcastCheckout}
              >
                {paymentBusy ? "Redirecting…" : "Pay with Stripe"}
              </button>
            </div>
          ) : null}
          {isPodcast && !podcastBillingLive ? (
            <div className="sponsorPaymentCard sponsorPaymentCard--notice">
              <h4>Stripe env required for live podcast payments</h4>
              <p>Set these in your deployment environment (Stripe Dashboard → Products → one-time Prices):</p>
              <ul>
                {(podcastMissingEnv.length ? podcastMissingEnv : ["STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY", "STRIPE_PRICE_PODCAST_SPONSOR_IMPACT", "STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL"]).map((k) => (
                  <li key={k}>
                    <code>{k}</code>
                  </li>
                ))}
              </ul>
              <p>Also required: <code>STRIPE_SECRET_KEY</code>. Until all are set, you can still submit this application for review using the checkbox in Step 6.</p>
            </div>
          ) : null}
          {!isPodcast ? (
            <SponsorPaymentDemo
              amount={tierAmount}
              paymentStatus={paymentStatus}
              onBegin={beginDemoPayment}
              onComplete={completeDemoPayment}
              busy={paymentBusy}
            />
          ) : null}
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
