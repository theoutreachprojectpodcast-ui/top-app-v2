"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/shared/Avatar";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";
import {
  PRO_MEMBERSHIP_PRICE_LABEL,
  SUPPORT_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import { defaultMembershipTierForIntent, normalizePublicAccountIntent } from "@/lib/account/accountModel";

const INTENT_CARDS = [
  {
    id: "free_user",
    title: "Browse for Free",
    blurb: "Explore the directory, trusted resources, and public community content. No card required.",
  },
  {
    id: "support_user",
    title: "Support the Mission",
    blurb: "Back the work with a light monthly subscription. Profile and saves stay in sync.",
  },
  {
    id: "member_user",
    title: "Become a Pro Member",
    blurb: "Submit community stories for review and access member-only experiences as they roll out.",
  },
  {
    id: "sponsor_user",
    title: "Become a Sponsor",
    blurb: "Organizations can subscribe as a platform sponsor or apply for larger partnership packages.",
  },
];

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
    price: SUPPORT_MEMBERSHIP_PRICE_LABEL.replace("/mo", ""),
    cadence: "/month",
    blurb: "Back the mission with a light monthly subscription. Saves and profile stay in sync.",
  },
  {
    id: "member",
    title: "Pro Membership",
    price: PRO_MEMBERSHIP_PRICE_LABEL.replace("/mo", ""),
    cadence: "/month",
    blurb: "Full member flows as they roll out, including community submissions where enabled.",
  },
  {
    id: "sponsor",
    title: "Sponsor Membership",
    price: "Monthly",
    cadence: " — set in Stripe",
    blurb: "Platform sponsor tier for aligned organizations (requires STRIPE_PRICE_SPONSOR_MONTHLY). Large mission partner packages are applied for separately on the Sponsors page.",
  },
];

function deriveInitialStep(profile) {
  const stored = String(profile?.onboardingCurrentStep || "").trim();
  if (stored === "0" || stored === "1" || stored === "2") {
    const intent = normalizePublicAccountIntent(profile?.accountIntent);
    if ((stored === "1" || stored === "2") && !intent) return 0;
    return Number(stored);
  }
  const intent = normalizePublicAccountIntent(profile?.accountIntent);
  if (!intent) return 0;
  const hasName =
    String(profile?.firstName || "").trim() ||
    String(profile?.lastName || "").trim() ||
    String(profile?.displayName || "").trim();
  if (!hasName) return 1;
  return 2;
}

export default function OnboardingFlow({ initialProfile, authBackend }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const normalizedInitialIntent = normalizePublicAccountIntent(initialProfile?.accountIntent);
  const [step, setStep] = useState(() => deriveInitialStep(initialProfile));
  const [accountIntent, setAccountIntent] = useState(normalizedInitialIntent || "");
  const [sponsorSubPath, setSponsorSubPath] = useState(
    String(initialProfile?.sponsorOnboardingPath || "").toLowerCase() === "application"
      ? "application"
      : "subscription",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    displayName: initialProfile?.displayName || "",
    firstName: initialProfile?.firstName || "",
    lastName: initialProfile?.lastName || "",
    bio: initialProfile?.bio || "",
    supportInterests: initialProfile?.supportInterests || "",
    contributionSummary: initialProfile?.contributionSummary || "",
    sponsorOrgName: initialProfile?.sponsorOrgName || "",
    sponsorWebsite: initialProfile?.sponsorWebsite || "",
    sponsorIntentSummary: initialProfile?.sponsorIntentSummary || "",
    sponsorApplicationNotes: initialProfile?.sponsorApplicationNotes || "",
  });
  const [selectedTier, setSelectedTier] = useState(() =>
    normalizedInitialIntent ? defaultMembershipTierForIntent(normalizedInitialIntent) : "free",
  );
  const [autoFinalizing, setAutoFinalizing] = useState(false);
  const autoFinalizeRanRef = useRef(false);

  const checkoutFlash = useMemo(() => searchParams.get("checkout"), [searchParams]);
  const busy = saving || autoFinalizing;

  function persistOnboardingStep(n) {
    void fetch("/api/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onboardingCurrentStep: String(n),
        onboardingStatus: "in_progress",
      }),
    });
  }

  /** After Stripe redirects back, webhooks often activate the subscription before the user clicks “Finish”. */
  useEffect(() => {
    if (checkoutFlash !== "success" || autoFinalizeRanRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include", cache: "no-store" });
        const data = await r.json().catch(() => ({}));
        if (cancelled || !data.authenticated || !data.profile) return;
        const st = String(data.profile.membershipBillingStatus || "").toLowerCase();
        const tier = String(data.profile.membershipTier || "").toLowerCase();
        if (st !== "active" || !["support", "member", "sponsor"].includes(tier)) return;
        autoFinalizeRanRef.current = true;
        setAutoFinalizing(true);
        const res = await fetch("/api/me/onboarding/complete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membershipTier: tier,
            membershipStatus: "active",
            accountIntent: data.profile.accountIntent || undefined,
            sponsorOnboardingPath: tier === "sponsor" ? "subscription" : undefined,
          }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) {
          autoFinalizeRanRef.current = false;
          setAutoFinalizing(false);
          return;
        }
        const dest = typeof out.redirectPath === "string" && out.redirectPath.startsWith("/") ? out.redirectPath : "/";
        router.replace(dest);
        router.refresh();
      } catch {
        autoFinalizeRanRef.current = false;
        setAutoFinalizing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutFlash, router]);

  async function saveIntentStep() {
    const intent = normalizePublicAccountIntent(accountIntent);
    if (!intent) {
      setError("Choose how you want to use The Outreach Project.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountIntent: intent,
          onboardingStatus: "in_progress",
          onboardingCurrentStep: "1",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not save your choice.");
      setSelectedTier(defaultMembershipTierForIntent(intent));
      setStep(1);
    } catch (e) {
      setError(e.message || "Could not save your choice.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfileStep() {
    setSaving(true);
    setError("");
    try {
      const body = {
        displayName: draft.displayName,
        firstName: draft.firstName,
        lastName: draft.lastName,
        bio: draft.bio,
        onboardingStatus: "in_progress",
        onboardingCurrentStep: "2",
      };
      if (accountIntent === "support_user") body.supportInterests = draft.supportInterests;
      if (accountIntent === "member_user") body.contributionSummary = draft.contributionSummary;
      if (accountIntent === "sponsor_user") {
        body.sponsorOrgName = draft.sponsorOrgName;
        body.sponsorWebsite = draft.sponsorWebsite;
        body.sponsorIntentSummary = draft.sponsorIntentSummary;
        body.sponsorApplicationNotes = draft.sponsorApplicationNotes;
      }
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    if (selectedTier === "sponsor" && !authBackend?.stripeSponsorSubscription) {
      setError("Sponsor subscription checkout requires STRIPE_PRICE_SPONSOR_MONTHLY in the server environment.");
      return;
    }
    if (["support", "member"].includes(selectedTier) && !authBackend?.stripeMemberRecurring) {
      setError(
        "Support and Pro checkout require STRIPE_PRICE_SUPPORT_MONTHLY and STRIPE_PRICE_PRO_MONTHLY (or STRIPE_PRICE_MEMBER_MONTHLY).",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier, returnPath: "/onboarding" }),
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

  async function finishOnboarding(opts = {}) {
    setSaving(true);
    setError("");
    try {
      const isSponsorApplication = opts.sponsorApplication === true;
      if (isSponsorApplication) {
        const patchRes = await fetch("/api/me/profile", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sponsorApplicationNotes: draft.sponsorApplicationNotes,
            sponsorOnboardingPath: "application",
          }),
        });
        const patchData = await patchRes.json().catch(() => ({}));
        if (!patchRes.ok) throw new Error(patchData.message || "Could not save sponsor application notes.");
      }
      const res = await fetch("/api/me/onboarding/complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSponsorApplication
            ? {
                sponsorOnboardingPath: "application",
                membershipTier: "free",
                membershipStatus: "none",
                accountIntent: "sponsor_user",
              }
            : {
                membershipTier: selectedTier,
                membershipStatus: selectedTier === "free" ? "none" : "pending",
                accountIntent: accountIntent || undefined,
                sponsorOnboardingPath: selectedTier === "sponsor" ? "subscription" : undefined,
              },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not complete onboarding.");
      const dest = typeof data.redirectPath === "string" && data.redirectPath.startsWith("/") ? data.redirectPath : "/";
      router.replace(dest);
      router.refresh();
    } catch (e) {
      setError(e.message || "Could not complete onboarding.");
    } finally {
      setSaving(false);
    }
  }

  const lead =
    step === 0
      ? "Start by choosing how you plan to participate. Admin and moderator access is assigned separately — it is not offered here."
      : step === 1
        ? "Tell us how to address you. You can refine this anytime in Profile."
        : accountIntent === "sponsor_user"
          ? "Finish sponsor onboarding: subscribe in Stripe or submit a partnership application for staff review."
          : "Confirm your membership. Free browsing always stays available.";

  return (
    <div className="shell onboardingShell">
      <section className="card onboardingCard">
        <p className="introTagline">Welcome</p>
        <h2>Set up your Outreach Project account</h2>
        <p className="sponsorSectionLead">{lead}</p>
        {autoFinalizing ? <p className="applyStatus">Payment confirmed — finalizing your account…</p> : null}
        {checkoutFlash === "success" && !autoFinalizing ? (
          <p className="applyStatus">
            Checkout returned successfully. If your plan is already active, we finish setup automatically; otherwise confirm below and tap{" "}
            <strong>Finish onboarding</strong>.
          </p>
        ) : null}
        {checkoutFlash === "cancel" ? <p className="applyError">Checkout canceled. You can choose Free or try again.</p> : null}
        {message ? <p className="applyStatus">{message}</p> : null}
        {error ? <p className="applyError">{error}</p> : null}

        {step === 0 ? (
          <div className="onboardingPlans">
            <div className="onboardingPlanGrid">
              {INTENT_CARDS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`onboardingPlanCard ${accountIntent === c.id ? "isSelected" : ""}`}
                  onClick={() => setAccountIntent(c.id)}
                >
                  <h4>{c.title}</h4>
                  <p className="onboardingPlanBlurb">{c.blurb}</p>
                </button>
              ))}
            </div>
            <div className="row wrap">
              <button className="btnPrimary" type="button" disabled={busy} onClick={saveIntentStep}>
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="form onboardingForm">
            <Avatar src={initialProfile?.avatarUrl || emptyProfileAvatarUrl()} alt="" sizes="96px" />
            <p className="profilePhotoUploadHint" style={{ marginTop: 0 }}>
              Profile photo can be updated from Profile → Edit after onboarding.
            </p>
            {initialProfile?.email ? (
              <label className="sponsorSectionLead" style={{ display: "block" }}>
                Email (from your sign-in provider)
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  readOnly
                  value={initialProfile.email}
                  style={{ marginTop: 6 }}
                />
              </label>
            ) : null}
            <input
              name="displayName"
              autoComplete="nickname"
              value={draft.displayName}
              onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
              placeholder="Display name"
            />
            <div className="form">
              <input
                name="given-name"
                autoComplete="given-name"
                value={draft.firstName}
                onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                placeholder="First name"
              />
              <input
                name="family-name"
                autoComplete="family-name"
                value={draft.lastName}
                onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                placeholder="Last name"
              />
            </div>
            <textarea
              rows={3}
              name="bio"
              autoComplete="off"
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              placeholder="Short bio (optional)"
            />
            {accountIntent === "support_user" ? (
              <textarea
                rows={3}
                name="supportInterests"
                autoComplete="off"
                value={draft.supportInterests}
                onChange={(e) => setDraft((d) => ({ ...d, supportInterests: e.target.value }))}
                placeholder="What draws you to support this mission? (optional)"
              />
            ) : null}
            {accountIntent === "member_user" ? (
              <textarea
                rows={3}
                name="contributionSummary"
                autoComplete="off"
                value={draft.contributionSummary}
                onChange={(e) => setDraft((d) => ({ ...d, contributionSummary: e.target.value }))}
                placeholder="What do you hope to contribute as a member? (optional)"
              />
            ) : null}
            {accountIntent === "sponsor_user" ? (
              <>
                <input
                  name="organization"
                  autoComplete="organization"
                  value={draft.sponsorOrgName}
                  onChange={(e) => setDraft((d) => ({ ...d, sponsorOrgName: e.target.value }))}
                  placeholder="Organization name"
                />
                <input
                  name="url"
                  type="url"
                  autoComplete="url"
                  inputMode="url"
                  value={draft.sponsorWebsite}
                  onChange={(e) => setDraft((d) => ({ ...d, sponsorWebsite: e.target.value }))}
                  placeholder="Organization website (https://…)"
                />
                <textarea
                  rows={2}
                  autoComplete="off"
                  value={draft.sponsorIntentSummary}
                  onChange={(e) => setDraft((d) => ({ ...d, sponsorIntentSummary: e.target.value }))}
                  placeholder="Sponsor goals or program fit (optional)"
                />
              </>
            ) : null}
            <div className="row wrap">
              <button
                className="btnSoft"
                type="button"
                disabled={busy}
                onClick={() => {
                  persistOnboardingStep(0);
                  setStep(0);
                }}
              >
                Back
              </button>
              <button className="btnPrimary" type="button" disabled={busy} onClick={saveProfileStep}>
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 && accountIntent === "sponsor_user" ? (
          <div className="onboardingPlans">
            <div className="communityPillRow" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className={sponsorSubPath === "subscription" ? "btnPrimary" : "btnSoft"}
                onClick={() => setSponsorSubPath("subscription")}
              >
                Sponsor subscription (Stripe)
              </button>
              <button
                type="button"
                className={sponsorSubPath === "application" ? "btnPrimary" : "btnSoft"}
                onClick={() => setSponsorSubPath("application")}
              >
                Apply for partnership (review)
              </button>
            </div>
            {sponsorSubPath === "application" ? (
              <>
                <textarea
                  rows={4}
                  autoComplete="off"
                  value={draft.sponsorApplicationNotes}
                  onChange={(e) => setDraft((d) => ({ ...d, sponsorApplicationNotes: e.target.value }))}
                  placeholder="Anything else we should know for your partnership inquiry? (optional)"
                />
                <p className="sponsorSectionLead">
                  We will mark your account for staff review. Large packages are coordinated from the Sponsors hub — you can continue there
                  after finishing.
                </p>
                <div className="row wrap">
                  <button
                    className="btnSoft"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      persistOnboardingStep(1);
                      setStep(1);
                    }}
                  >
                    Back
                  </button>
                  <button className="btnPrimary" type="button" disabled={busy} onClick={() => void finishOnboarding({ sponsorApplication: true })}>
                    Submit application &amp; finish
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="onboardingPlanGrid">
                  {PLANS.filter((p) => p.id === "sponsor").map((p) => (
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
                {!authBackend?.stripeSponsorSubscription ? (
                  <p className="sponsorSectionLead">
                    Sponsor subscription checkout needs <code>STRIPE_PRICE_SPONSOR_MONTHLY</code> (and <code>STRIPE_SECRET_KEY</code>).
                    Use the application path or finish with <strong>Free</strong> from step 0.
                  </p>
                ) : null}
                <div className="row wrap">
                  <button
                    className="btnSoft"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      persistOnboardingStep(1);
                      setStep(1);
                    }}
                  >
                    Back
                  </button>
                  <button className="btnSoft" type="button" disabled={busy} onClick={startPaidCheckout}>
                    Continue to secure checkout
                  </button>
                  <button className="btnPrimary" type="button" disabled={busy} onClick={() => void finishOnboarding()}>
                    Finish onboarding
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {step === 2 && accountIntent !== "sponsor_user" ? (
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
            {selectedTier === "sponsor" && !authBackend?.stripeSponsorSubscription ? (
              <p className="sponsorSectionLead">
                Sponsor subscription checkout needs <code>STRIPE_PRICE_SPONSOR_MONTHLY</code> (and <code>STRIPE_SECRET_KEY</code>).
                Choose another plan or finish with <strong>Free</strong>.
              </p>
            ) : null}
            {["support", "member"].includes(selectedTier) && !authBackend?.stripeMemberRecurring ? (
              <p className="sponsorSectionLead">
                Support and Pro checkout need <code>STRIPE_PRICE_SUPPORT_MONTHLY</code> and{" "}
                <code>STRIPE_PRICE_PRO_MONTHLY</code> (or legacy <code>STRIPE_PRICE_MEMBER_MONTHLY</code>), plus{" "}
                <code>STRIPE_SECRET_KEY</code>. Choose <strong>Free</strong> to continue without billing.
              </p>
            ) : null}
            <div className="row wrap">
              <button
                className="btnSoft"
                type="button"
                disabled={busy}
                onClick={() => {
                  persistOnboardingStep(1);
                  setStep(1);
                }}
              >
                Back
              </button>
              {selectedTier !== "free" ? (
                <button className="btnSoft" type="button" disabled={busy} onClick={startPaidCheckout}>
                  Continue to secure checkout
                </button>
              ) : null}
              <button className="btnPrimary" type="button" disabled={busy} onClick={() => void finishOnboarding()}>
                {selectedTier === "free" ? "Finish with Free" : "Finish onboarding"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
