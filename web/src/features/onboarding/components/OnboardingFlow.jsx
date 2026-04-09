"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/shared/Avatar";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";

const PLANS = [
  {
    id: "free",
    title: "Free Membership",
    price: "$0",
    cadence: "",
    blurb: "Explore the directory, trusted resources, and public community content. No card required.",
  },
  {
    id: "support",
    title: "Support Membership",
    price: "$5",
    cadence: "/month",
    blurb: "Back the mission with a light monthly subscription. Saves and profile stay in sync.",
  },
  {
    id: "member",
    title: "Pro Membership",
    price: "$10",
    cadence: "/month",
    blurb: "Full member flows as they roll out, including community submissions where enabled.",
  },
  {
    id: "sponsor",
    title: "Sponsor Membership",
    price: "$100",
    cadence: "/month",
    blurb: "Platform sponsor tier for aligned organizations (Stripe-backed when configured). Large mission partner packages are applied for separately on the Partners page.",
  },
];

export default function OnboardingFlow({ initialProfile, authBackend }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    displayName: initialProfile?.displayName || "",
    firstName: initialProfile?.firstName || "",
    lastName: initialProfile?.lastName || "",
    bio: initialProfile?.bio || "",
  });
  const [selectedTier, setSelectedTier] = useState("free");

  const checkoutFlash = useMemo(() => searchParams.get("checkout"), [searchParams]);

  async function saveProfileStep() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: draft.displayName,
          firstName: draft.firstName,
          lastName: draft.lastName,
          bio: draft.bio,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not save profile.");
      setStep(2);
    } catch (e) {
      setError(e.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function startPaidCheckout() {
    if (selectedTier === "free") return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setMessage("Billing is not fully connected yet. Choose Free to continue, or configure Stripe in your environment.");
        setSaving(false);
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.message || "Checkout could not start.");
      window.location.href = data.url;
    } catch (e) {
      setError(e.message || "Checkout could not start.");
    } finally {
      setSaving(false);
    }
  }

  async function finishOnboarding() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/me/onboarding/complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipTier: selectedTier,
          membershipStatus: selectedTier === "free" ? "none" : "pending",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not complete onboarding.");
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e.message || "Could not complete onboarding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shell onboardingShell">
      <section className="card onboardingCard">
        <p className="introTagline">Welcome</p>
        <h2>Set up your Outreach Project account</h2>
        <p className="sponsorSectionLead">
          {step === 1 ? "Tell us how to address you. You can refine this anytime in Profile." : "Pick a membership. Free browsing always stays available."}
        </p>
        {checkoutFlash === "success" ? (
          <p className="applyStatus">Checkout completed — confirm your plan below and finish onboarding.</p>
        ) : null}
        {checkoutFlash === "cancel" ? <p className="applyError">Checkout canceled. You can choose Free or try again.</p> : null}
        {message ? <p className="applyStatus">{message}</p> : null}
        {error ? <p className="applyError">{error}</p> : null}

        {step === 1 ? (
          <div className="form onboardingForm">
            <Avatar src={initialProfile?.avatarUrl || emptyProfileAvatarUrl()} alt="" sizes="96px" />
            <p className="profilePhotoUploadHint" style={{ marginTop: 0 }}>
              Profile photo can be updated from Profile → Edit after onboarding.
            </p>
            <input
              value={draft.displayName}
              onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
              placeholder="Display name"
            />
            <div className="form">
              <input
                value={draft.firstName}
                onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                placeholder="First name"
              />
              <input
                value={draft.lastName}
                onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                placeholder="Last name"
              />
            </div>
            <textarea
              rows={3}
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              placeholder="Short bio (optional)"
            />
            <div className="row wrap">
              <button className="btnPrimary" type="button" disabled={saving} onClick={saveProfileStep}>
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="onboardingPlans">
            <div className="onboardingPlanGrid">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`onboardingPlanCard ${selectedTier === p.id ? "isSelected" : ""}`}
                  onClick={() => setSelectedTier(p.id)}
                >
                  <h4>{p.title}</h4>
                  <p className="onboardingPlanPrice">
                    <strong>{p.price}</strong>
                    {p.cadence ? <span>{p.cadence}</span> : null}
                  </p>
                  <p className="onboardingPlanBlurb">{p.blurb}</p>
                </button>
              ))}
            </div>
            {!authBackend?.stripe && selectedTier !== "free" ? (
              <p className="sponsorSectionLead">
                Stripe price IDs are not configured in this environment. Choose <strong>Free</strong> to continue, or add{" "}
                <code>STRIPE_SECRET_KEY</code> and monthly price IDs to enable checkout.
              </p>
            ) : null}
            <div className="row wrap">
              <button className="btnSoft" type="button" disabled={saving} onClick={() => setStep(1)}>
                Back
              </button>
              {selectedTier !== "free" ? (
                <button className="btnSoft" type="button" disabled={saving} onClick={startPaidCheckout}>
                  Continue to secure checkout
                </button>
              ) : null}
              <button className="btnPrimary" type="button" disabled={saving} onClick={finishOnboarding}>
                {selectedTier === "free" ? "Finish with Free" : "Finish onboarding"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
