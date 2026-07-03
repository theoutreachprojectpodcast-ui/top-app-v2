"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/shared/Avatar";
import { FormCheckbox } from "@/components/forms/FormChoice";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";
import {
  PRO_MEMBERSHIP_PRICE_LABEL,
  SUPPORT_MEMBERSHIP_DISPLAY_NAME,
  SUPPORT_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import { defaultMembershipTierForIntent, normalizePublicAccountIntent } from "@/lib/account/accountModel";
import {
  CONTRIBUTION_INTEREST_KEYS,
  IDENTITY_SEGMENT_OPTIONS,
  normalizeContributionInterests,
  PREFERRED_CONTACT_OPTIONS,
} from "@/lib/profile/profileCompletenessModel";

const INTENT_CARDS = [
  {
    id: "support_user",
    title: "Support the Mission",
    blurb: "Back the work with Support Membership ($0.99/year). Directory and community viewing included.",
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
    id: "support",
    title: SUPPORT_MEMBERSHIP_DISPLAY_NAME,
    price: SUPPORT_MEMBERSHIP_PRICE_LABEL.replace("/yr", ""),
    cadence: "/year",
    blurb: "Unlock the full platform with annual Support Membership.",
  },
  {
    id: "member",
    title: "Pro Membership",
    price: PRO_MEMBERSHIP_PRICE_LABEL.replace("/yr", ""),
    cadence: "/year",
    blurb: "Community story submission and premium features as they roll out.",
  },
];

const NOTIFICATION_CHOICES = [
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "push", label: "Push" },
  { id: "in_app", label: "In-app" },
];

const SPONSOR_ONBOARDING_PLAN = {
  id: "sponsor",
  title: "Sponsor Membership",
  price: "Packages vary",
  cadence: "",
  blurb: "Platform sponsor subscriptions and mission partner packages live on the Sponsors page.",
};

const STEP_LABELS = ["Main account", "Identity", "Contribution", "Membership"];

function draftFromProfile(p) {
  const ci = normalizeContributionInterests(p?.contributionInterests);
  return {
    displayName: p?.displayName || "",
    firstName: p?.firstName || "",
    lastName: p?.lastName || "",
    bio: p?.bio || "",
    phoneNumber: p?.phoneNumber || "",
    postalCode: p?.postalCode || "",
    city: p?.city || "",
    state: p?.state || "",
    preferredContactMethod: p?.preferredContactMethod || "",
    notificationPreferences: Array.isArray(p?.notificationPreferences) ? [...p.notificationPreferences] : [],
    identitySegment: p?.identitySegment || "",
    organizationAffiliation: p?.organizationAffiliation || "",
    jobTitle: p?.jobTitle || "",
    serviceBackground: p?.serviceBackground || "",
    reasonForJoining: p?.reasonForJoining || "",
    causes: p?.causes || "",
    supportNeeds: p?.supportNeeds || "",
    communities: p?.communities || "",
    contributionInterests: { ...ci },
    skills: p?.skills || "",
    volunteerInterests: p?.volunteerInterests || "",
    contributionSummary: p?.contributionSummary || "",
    preferredContributionContact: p?.preferredContributionContact || "",
    supportInterests: p?.supportInterests || "",
    sponsorOrgName: p?.sponsorOrgName || "",
    sponsorWebsite: p?.sponsorWebsite || "",
    sponsorIntentSummary: p?.sponsorIntentSummary || "",
    sponsorApplicationNotes: p?.sponsorApplicationNotes || "",
    avatarUrl: p?.avatarUrl || "",
  };
}

function mergeDraftFromApi(serverProfile, prev) {
  if (!serverProfile || typeof serverProfile !== "object") return prev;
  const pick = (key) => {
    const sv = String(serverProfile[key] ?? "").trim();
    const pv = String(prev[key] ?? "").trim();
    return sv || pv;
  };
  const next = draftFromProfile(serverProfile);
  return {
    ...next,
    displayName: pick("displayName"),
    firstName: pick("firstName"),
    lastName: pick("lastName"),
    bio: pick("bio"),
    phoneNumber: pick("phoneNumber"),
    postalCode: pick("postalCode"),
    city: pick("city"),
    state: pick("state"),
    reasonForJoining: pick("reasonForJoining"),
    supportNeeds: pick("supportNeeds"),
    communities: pick("communities"),
    skills: pick("skills"),
    causes: pick("causes"),
  };
}

function deriveInitialStep(profile) {
  const stored = String(profile?.onboardingCurrentStep || "").trim();
  if (stored === "0" || stored === "1" || stored === "2" || stored === "3") {
    return Number(stored);
  }
  const intent = normalizePublicAccountIntent(profile?.accountIntent);
  if (intent && String(profile?.onboardingStatus || "").toLowerCase() === "completed") {
    return 3;
  }
  if (intent) return 3;
  if (String(profile?.firstName || "").trim() && String(profile?.reasonForJoining || "").trim()) return 2;
  if (String(profile?.firstName || "").trim()) return 1;
  return 0;
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
  const [draft, setDraft] = useState(() => draftFromProfile(initialProfile));
  const [selectedTier, setSelectedTier] = useState(() =>
    normalizedInitialIntent ? defaultMembershipTierForIntent(normalizedInitialIntent) : "support",
  );
  const [autoFinalizing, setAutoFinalizing] = useState(false);
  const autoFinalizeRanRef = useRef(false);

  const checkoutFlash = useMemo(() => searchParams.get("checkout"), [searchParams]);
  const busy = saving || autoFinalizing;
  const progress = Math.round(((step + 1) / 4) * 100);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include", cache: "no-store" });
        const data = await r.json().catch(() => ({}));
        if (cancelled || !data.authenticated || !data.profile) return;
        const p = data.profile;
        setDraft((prev) => mergeDraftFromApi(p, prev));
        const ni = normalizePublicAccountIntent(p.accountIntent);
        if (ni) setAccountIntent(ni);
        setStep((prev) => Math.max(prev, deriveInitialStep(p)));
        const sp = String(p.sponsorOnboardingPath || "").toLowerCase();
        if (sp === "application") setSponsorSubPath("application");
        else if (sp === "subscription") setSponsorSubPath("subscription");
        if (ni) setSelectedTier(defaultMembershipTierForIntent(ni));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  function toggleNotification(id) {
    setDraft((d) => {
      const set = new Set(d.notificationPreferences || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...d, notificationPreferences: [...set] };
    });
  }

  function toggleContribution(key) {
    setDraft((d) => {
      const ci = { ...normalizeContributionInterests(d.contributionInterests) };
      ci[key] = !ci[key];
      return { ...d, contributionInterests: ci };
    });
  }

  async function patchProfile(body) {
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || "Save failed.");
    if (data.profile && typeof data.profile === "object") {
      setDraft((prev) => mergeDraftFromApi(data.profile, prev));
    }
    return data;
  }

  async function onSkipNonCritical() {
    setSaving(true);
    setError("");
    try {
      await patchProfile({ onboardingSkipped: true, onboardingStatus: "in_progress" });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMainAccountStep() {
    setError("");
    if (!String(draft.firstName || "").trim() || !String(draft.lastName || "").trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!String(draft.displayName || "").trim()) {
      setError("Display name is required.");
      return;
    }
    if (!String(draft.state || "").trim()) {
      setError("State / region is required.");
      return;
    }
    if (!String(draft.preferredContactMethod || "").trim()) {
      setError("Choose a preferred contact method.");
      return;
    }
    setSaving(true);
    try {
      await patchProfile({
        firstName: draft.firstName,
        lastName: draft.lastName,
        displayName: draft.displayName,
        phoneNumber: draft.phoneNumber,
        postalCode: draft.postalCode,
        city: draft.city,
        state: draft.state,
        preferredContactMethod: draft.preferredContactMethod,
        notificationPreferences: draft.notificationPreferences,
        avatarUrl: draft.avatarUrl,
        onboardingStatus: "in_progress",
        onboardingCurrentStep: "1",
      });
      setStep(1);
    } catch (e) {
      setError(e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function saveIdentityStep() {
    setError("");
    if (!String(draft.identitySegment || "").trim()) {
      setError("Select how you identify with this community.");
      return;
    }
    if (!String(draft.reasonForJoining || "").trim()) {
      setError("Tell us why you are joining The Outreach Project.");
      return;
    }
    const seg = String(draft.identitySegment || "").toLowerCase();
    if ((seg === "veteran" || seg === "first_responder") && !String(draft.serviceBackground || "").trim()) {
      setError("Add your branch or service affiliation.");
      return;
    }
    if (
      ["organization_representative", "sponsor", "resource_partner"].includes(seg) &&
      !String(draft.organizationAffiliation || "").trim()
    ) {
      setError("Organization name is required for your selected identity.");
      return;
    }
    setSaving(true);
    try {
      await patchProfile({
        identitySegment: draft.identitySegment,
        organizationAffiliation: draft.organizationAffiliation,
        jobTitle: draft.jobTitle,
        serviceBackground: draft.serviceBackground,
        bio: draft.bio,
        reasonForJoining: draft.reasonForJoining,
        causes: draft.causes,
        supportNeeds: draft.supportNeeds,
        communities: draft.communities,
        onboardingStatus: "in_progress",
        onboardingCurrentStep: "2",
      });
      setStep(2);
    } catch (e) {
      setError(e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function saveContributionStep() {
    setSaving(true);
    setError("");
    try {
      await patchProfile({
        contributionInterests: draft.contributionInterests,
        skills: draft.skills,
        volunteerInterests: draft.volunteerInterests,
        contributionSummary: draft.contributionSummary,
        preferredContributionContact: draft.preferredContributionContact,
        supportInterests: draft.supportInterests,
        onboardingStatus: "in_progress",
        onboardingCurrentStep: "3",
      });
      setStep(3);
    } catch (e) {
      setError(e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function saveIntentAndPlans() {
    const intent = normalizePublicAccountIntent(accountIntent);
    if (!intent) {
      setError("Choose how you want to use The Outreach Project.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await patchProfile({
        accountIntent: intent,
        onboardingStatus: "in_progress",
        onboardingCurrentStep: "3",
      });
      setSelectedTier(defaultMembershipTierForIntent(intent));
    } catch (e) {
      setError(e.message || "Could not save your choice.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const intent = normalizePublicAccountIntent(accountIntent);
    if (intent) setSelectedTier(defaultMembershipTierForIntent(intent));
  }, [accountIntent]);

  async function startPaidCheckout() {
    if (selectedTier === "sponsor" && !authBackend?.stripeSponsorSubscription) {
      setError("Sponsor subscription checkout requires STRIPE_PRICE_SPONSOR_MONTHLY in the server environment.");
      return;
    }
    if (["support", "member"].includes(selectedTier) && !authBackend?.stripeMemberRecurring) {
      setError(
        "Support and Pro checkout require STRIPE_PRICE_SUPPORT_YEARLY and STRIPE_PRICE_PRO_YEARLY (or monthly fallbacks).",
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
        setMessage("Billing is not fully connected yet. Configure Stripe in your environment or try again later.");
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
      if (!res.ok) throw new Error(data.message || data.error || "Could not complete onboarding.");
      const dest = typeof data.redirectPath === "string" && data.redirectPath.startsWith("/") ? data.redirectPath : "/";
      router.replace(dest);
      router.refresh();
    } catch (e) {
      setError(e.message || "Could not complete onboarding.");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarFile(file) {
    if (!file || !String(file.type || "").startsWith("image/")) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    if (dataUrl) setDraft((d) => ({ ...d, avatarUrl: dataUrl }));
  }

  const lead =
    step === 0
      ? "Start with your main account details. Required fields are marked."
      : step === 1
        ? "Help others understand who you are and why you are here."
        : step === 2
          ? "Optional: tell us how you would like to contribute. You can skip individual items and finish later in Profile."
          : accountIntent === "sponsor_user"
            ? "Finish sponsor onboarding: subscribe in Stripe or submit a partnership application for staff review."
            : "Confirm your membership. Support or Pro is required to use the platform.";

  return (
    <div className="shell onboardingShell">
      <section className="card onboardingCard">
        <p className="introTagline">Welcome</p>
        <h2>Set up your Outreach Project account</h2>
        <p className="sponsorSectionLead">{lead}</p>

        <div className="onboardingProgress" aria-label="Onboarding progress">
          <div className="profileCompletionBar" aria-hidden="true">
            <div className="profileCompletionBar__track">
              <div className="profileCompletionBar__fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <p className="profilePhotoUploadHint" style={{ marginTop: 8 }}>
            Step {step + 1} of 4 — {STEP_LABELS[step]}
          </p>
        </div>

        {autoFinalizing ? <p className="applyStatus">Payment confirmed — finalizing your account…</p> : null}
        {checkoutFlash === "success" && !autoFinalizing ? (
          <p className="applyStatus">
            Checkout returned successfully. If your plan is already active, we finish setup automatically; otherwise confirm below
            and tap <strong>Finish onboarding</strong>.
          </p>
        ) : null}
        {checkoutFlash === "cancel" ? <p className="applyError">Checkout canceled. Choose a membership to continue.</p> : null}
        {message ? <p className="applyStatus">{message}</p> : null}
        {error ? <p className="applyError">{error}</p> : null}

        {step === 0 ? (
          <form
            className="form onboardingForm"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <h3 className="introTagline" style={{ marginBottom: 10 }}>
              Main account information
            </h3>
            <div className="profileEditChunk" data-profile-edit-focus="avatar">
              <Avatar src={draft.avatarUrl || initialProfile?.avatarUrl || emptyProfileAvatarUrl()} alt="" sizes="96px" />
              <label className="profilePhotoUploadLabel">
                <span className="profilePhotoUploadTitle">Profile photo (optional)</span>
                <input className="profileFileInput" type="file" accept="image/*" onChange={(e) => void onAvatarFile(e.target.files?.[0])} />
              </label>
            </div>
            {initialProfile?.email ? (
              <label className="fieldLabel" htmlFor="top-onboarding-email">
                Email (from your sign-in provider)
                <input id="top-onboarding-email" type="email" readOnly value={initialProfile.email} />
              </label>
            ) : null}
            <label className="fieldLabel" htmlFor="top-onboarding-display">
              Display name <span className="applyError">*</span>
              <input
                id="top-onboarding-display"
                autoComplete="nickname"
                value={draft.displayName}
                onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                required
              />
            </label>
            <div className="form">
              <label className="fieldLabel" htmlFor="top-onboarding-given">
                First name <span className="applyError">*</span>
                <input
                  id="top-onboarding-given"
                  autoComplete="given-name"
                  value={draft.firstName}
                  onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                  required
                />
              </label>
              <label className="fieldLabel" htmlFor="top-onboarding-family">
                Last name <span className="applyError">*</span>
                <input
                  id="top-onboarding-family"
                  autoComplete="family-name"
                  value={draft.lastName}
                  onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                  required
                />
              </label>
            </div>
            <label className="fieldLabel" htmlFor="top-onboarding-phone">
              Phone number (optional)
              <input
                id="top-onboarding-phone"
                type="tel"
                autoComplete="tel"
                value={draft.phoneNumber}
                onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
              />
            </label>
            <div className="form">
              <label className="fieldLabel" htmlFor="top-onboarding-city">
                City (optional)
                <input
                  id="top-onboarding-city"
                  autoComplete="address-level2"
                  value={draft.city}
                  onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                />
              </label>
              <label className="fieldLabel" htmlFor="top-onboarding-state">
                State / region <span className="applyError">*</span>
                <input
                  id="top-onboarding-state"
                  autoComplete="address-level1"
                  value={draft.state}
                  onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                  required
                />
              </label>
            </div>
            <label className="fieldLabel" htmlFor="top-onboarding-zip">
              ZIP / postal code (optional)
              <input
                id="top-onboarding-zip"
                autoComplete="postal-code"
                value={draft.postalCode}
                onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))}
              />
            </label>
            <label className="fieldLabel" htmlFor="top-onboarding-contactpref">
              Preferred contact method <span className="applyError">*</span>
              <select
                id="top-onboarding-contactpref"
                value={draft.preferredContactMethod}
                onChange={(e) => setDraft((d) => ({ ...d, preferredContactMethod: e.target.value }))}
                required
              >
                <option value="">Select…</option>
                {PREFERRED_CONTACT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="profileEditFieldset">
              <legend>Notification preferences (optional)</legend>
              <div className="dsChoiceGroup profileEditModal__notifyGroup onboardingForm__notifyGroup">
                {NOTIFICATION_CHOICES.map((n) => (
                  <FormCheckbox
                    key={n.id}
                    checked={!!draft.notificationPreferences?.includes(n.id)}
                    onChange={() => toggleNotification(n.id)}
                  >
                    {n.label}
                  </FormCheckbox>
                ))}
              </div>
            </fieldset>
            <div className="row wrap">
              <button className="btnSoft" type="button" disabled={busy} onClick={() => void onSkipNonCritical()}>
                Skip for now
              </button>
              <button className="btnPrimary" type="button" disabled={busy} onClick={() => void saveMainAccountStep()}>
                Save &amp; continue
              </button>
            </div>
          </form>
        ) : null}

        {step === 1 ? (
          <form className="form onboardingForm" onSubmit={(e) => e.preventDefault()}>
            <h3 className="introTagline" style={{ marginBottom: 10 }}>
              Identity
            </h3>
            <label className="fieldLabel" htmlFor="top-id-seg">
              How do you identify with this community? <span className="applyError">*</span>
              <select
                id="top-id-seg"
                value={draft.identitySegment}
                onChange={(e) => setDraft((d) => ({ ...d, identitySegment: e.target.value }))}
                required
              >
                <option value="">Select…</option>
                {IDENTITY_SEGMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="fieldLabel" htmlFor="top-org-affil">
              Organization name {["organization_representative", "sponsor", "resource_partner"].includes(draft.identitySegment) ? <span className="applyError">*</span> : <span>(if applicable)</span>}
              <input
                id="top-org-affil"
                value={draft.organizationAffiliation}
                onChange={(e) => setDraft((d) => ({ ...d, organizationAffiliation: e.target.value }))}
              />
            </label>
            <label className="fieldLabel" htmlFor="top-job">
              Role / title (optional)
              <input id="top-job" value={draft.jobTitle} onChange={(e) => setDraft((d) => ({ ...d, jobTitle: e.target.value }))} />
            </label>
            <label className="fieldLabel" htmlFor="top-service">
              Branch or service affiliation{" "}
              {["veteran", "first_responder"].includes(draft.identitySegment) ? <span className="applyError">*</span> : <span>(if applicable)</span>}
              <input
                id="top-service"
                value={draft.serviceBackground}
                onChange={(e) => setDraft((d) => ({ ...d, serviceBackground: e.target.value }))}
              />
            </label>
            <label className="fieldLabel" htmlFor="top-bio">
              Short bio (optional)
              <textarea
                id="top-bio"
                rows={3}
                value={draft.bio}
                onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              />
            </label>
            <label className="fieldLabel" htmlFor="top-why">
              Why are you joining The Outreach Project? <span className="applyError">*</span>
              <textarea
                id="top-why"
                rows={3}
                value={draft.reasonForJoining}
                onChange={(e) => setDraft((d) => ({ ...d, reasonForJoining: e.target.value }))}
                required
              />
            </label>
            <label className="fieldLabel" htmlFor="top-causes">
              Interests / categories you care about (optional)
              <textarea
                id="top-causes"
                rows={2}
                value={draft.causes}
                onChange={(e) => setDraft((d) => ({ ...d, causes: e.target.value }))}
                placeholder="Topics, causes, or communities you follow"
              />
            </label>
            <label className="fieldLabel" htmlFor="top-support-needs">
              Support needs (optional)
              <textarea
                id="top-support-needs"
                rows={2}
                value={draft.supportNeeds}
                onChange={(e) => setDraft((d) => ({ ...d, supportNeeds: e.target.value }))}
              />
            </label>
            <label className="fieldLabel" htmlFor="top-communities">
              Communities you identify with on the platform (optional)
              <textarea
                id="top-communities"
                rows={2}
                value={draft.communities}
                onChange={(e) => setDraft((d) => ({ ...d, communities: e.target.value }))}
              />
            </label>
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
              <button className="btnSoft" type="button" disabled={busy} onClick={() => void onSkipNonCritical()}>
                Skip for now
              </button>
              <button className="btnPrimary" type="button" disabled={busy} onClick={() => void saveIdentityStep()}>
                Save &amp; continue
              </button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form className="form onboardingForm" onSubmit={(e) => e.preventDefault()}>
            <h3 className="introTagline" style={{ marginBottom: 10 }}>
              Contribution (optional)
            </h3>
            <fieldset className="profileEditFieldset">
              <legend>Ways you want to contribute</legend>
              <p className="profileEditFieldsetHint">Select any that apply. You can refine these later in Profile.</p>
              <div className="dsChoiceGroup profileEditModal__contribGroup onboardingForm__contribGroup">
                {CONTRIBUTION_INTEREST_KEYS.map(([key, label]) => (
                  <FormCheckbox
                    key={key}
                    checked={!!draft.contributionInterests?.[key]}
                    onChange={() => toggleContribution(key)}
                  >
                    {label}
                  </FormCheckbox>
                ))}
              </div>
            </fieldset>
            <label className="fieldLabel" htmlFor="top-skills">
              Skills or services you can offer (optional)
              <textarea
                id="top-skills"
                rows={2}
                value={draft.skills}
                onChange={(e) => setDraft((d) => ({ ...d, skills: e.target.value }))}
              />
            </label>
            <label className="fieldLabel" htmlFor="top-volunteer">
              Volunteer interests (optional)
              <textarea
                id="top-volunteer"
                rows={2}
                value={draft.volunteerInterests}
                onChange={(e) => setDraft((d) => ({ ...d, volunteerInterests: e.target.value }))}
              />
            </label>
            <label className="fieldLabel" htmlFor="top-contrib-sum">
              How you want to contribute (summary, optional)
              <textarea
                id="top-contrib-sum"
                rows={2}
                value={draft.contributionSummary}
                onChange={(e) => setDraft((d) => ({ ...d, contributionSummary: e.target.value }))}
              />
            </label>
            <label className="fieldLabel" htmlFor="top-pref-contrib-contact">
              Preferred ways to be contacted about opportunities (optional)
              <input
                id="top-pref-contrib-contact"
                value={draft.preferredContributionContact}
                onChange={(e) => setDraft((d) => ({ ...d, preferredContributionContact: e.target.value }))}
                placeholder="e.g. Email weekdays, text for events"
              />
            </label>
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
              <button className="btnPrimary" type="button" disabled={busy} onClick={() => void saveContributionStep()}>
                Save &amp; continue
              </button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <div className="onboardingPlans">
            <h3 className="introTagline" style={{ marginBottom: 10 }}>
              Membership path
            </h3>
            <p className="sponsorSectionLead" style={{ marginTop: 0 }}>
              Pick the experience that matches your goals. You can change this later in account settings where billing applies.
            </p>
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
              <button
                className="btnSoft"
                type="button"
                disabled={busy}
                onClick={() => {
                  persistOnboardingStep(2);
                  setStep(2);
                }}
              >
                Back
              </button>
              <button className="btnPrimary" type="button" disabled={busy} onClick={() => void saveIntentAndPlans()}>
                Save membership choice
              </button>
            </div>

            {accountIntent ? (
              <>
                <hr style={{ margin: "20px 0", opacity: 0.2 }} />
                {accountIntent === "sponsor_user" ? (
                  <div className="onboardingPlans">
                    <h3 className="introTagline" style={{ marginBottom: 10 }}>
                      Sponsor membership type
                    </h3>
                    <p className="sponsorSectionLead" style={{ marginTop: 0 }}>
                      Subscribe in Stripe or submit a partnership application. Either option keeps your account on the sponsor path.
                    </p>
                    <div className="row wrap onboardingForm__sponsorPath">
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
                        <label className="fieldLabel" htmlFor="top-sponsor-app-notes">
                          Partnership notes (optional)
                          <textarea
                            id="top-sponsor-app-notes"
                            rows={4}
                            autoComplete="off"
                            value={draft.sponsorApplicationNotes}
                            onChange={(e) => setDraft((d) => ({ ...d, sponsorApplicationNotes: e.target.value }))}
                            placeholder="Anything else we should know for your partnership inquiry?"
                          />
                        </label>
                        <div className="row wrap">
                          <button
                            className="btnPrimary"
                            type="button"
                            disabled={busy}
                            onClick={() => void finishOnboarding({ sponsorApplication: true })}
                          >
                            Submit application &amp; finish
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="onboardingPlanGrid">
                          {[SPONSOR_ONBOARDING_PLAN].map((p) => (
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
                        <div className="row wrap">
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
                ) : (
                  <div className="onboardingPlans">
                    <h3 className="introTagline" style={{ marginBottom: 10 }}>
                      Choose your membership type
                    </h3>
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
                    <div className="row wrap">
                      <button className="btnPrimary" type="button" disabled={busy} onClick={startPaidCheckout}>
                        Continue to secure checkout
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
