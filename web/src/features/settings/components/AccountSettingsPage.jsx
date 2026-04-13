"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MembershipAtAGlance from "@/features/membership/components/MembershipAtAGlance";
import ManageBillingButton from "@/features/profile/components/ManageBillingButton";
import AccountInfoCard from "@/features/profile/components/AccountInfoCard";

/**
 * Full-page account settings (WorkOS + demo). Edit Profile stays a quick modal from the profile tab.
 */
export default function AccountSettingsPage({
  profile,
  workOSAccountEmail = "",
  membership,
  sessionKind,
  authBackend,
  persistProfile,
  onOpenEditProfile,
  setMembershipStatus,
  openSignInForMembership,
  favoriteEins,
}) {
  const isWorkos = sessionKind === "workos";
  const [draft, setDraft] = useState({
    email: profile.email || "",
    displayName: profile.displayName || "",
    city: profile.city || "",
    state: profile.state || "",
  });

  useEffect(() => {
    setDraft({
      email: profile.email || "",
      displayName: profile.displayName || "",
      city: profile.city || "",
      state: profile.state || "",
    });
  }, [profile.email, profile.displayName, profile.city, profile.state]);

  async function saveIdentityBasics() {
    await persistProfile({
      ...profile,
      displayName: draft.displayName.trim(),
      city: draft.city.trim(),
      state: draft.state.trim(),
    });
  }

  async function saveEmail() {
    const next = draft.email.trim();
    if (!next) return;
    await persistProfile({
      ...profile,
      email: next,
    });
  }

  return (
    <section className="shell profileTabShell accountSettingsPage">
      <div className="accountSettingsPage__header">
        <h2>Account settings</h2>
        <p className="sponsorSectionLead">
          Manage membership, billing, and account details. For photo and extended identity fields, use{" "}
          <button type="button" className="accountSettingsInlineLink" onClick={onOpenEditProfile}>
            Edit profile
          </button>{" "}
          from your profile tab.
        </p>
        <Link className="btnSoft" href="/profile">
          ← Back to profile
        </Link>
      </div>

      <div className="card" id="account-email">
        <h3>Email &amp; sign-in</h3>
        <p className="sponsorSectionLead">
          {isWorkos ? (
            <>
              Your <strong>profile email</strong> is what we show in the app and use for contact-style flows. It starts as
              your WorkOS sign-in address when your account row has no email yet. Updating it here saves it to your profile;
              your WorkOS login email may still be your old address until you change it with your identity provider or
              support.
            </>
          ) : (
            "Demo accounts use locally stored credentials on this device. You can change the email stored on your profile below."
          )}
        </p>
        {isWorkos && workOSAccountEmail ? (
          <p className="sponsorSectionLead">
            <strong>WorkOS sign-in email:</strong> {workOSAccountEmail}
          </p>
        ) : null}
        <label className="sponsorSectionLead" style={{ display: "block" }} htmlFor="torp-settings-profile-email">
          Profile email
          <input
            id="torp-settings-profile-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            placeholder={workOSAccountEmail || "you@example.com"}
            style={{ marginTop: 8, width: "100%", maxWidth: 420 }}
          />
        </label>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btnPrimary" onClick={() => saveEmail()} disabled={!String(draft.email || "").trim()}>
            Save email
          </button>
        </div>
      </div>

      <div className="card" id="account-username">
        <h3>Display name</h3>
        <p className="sponsorSectionLead">Shown across the app where your name appears.</p>
        <input
          aria-label="Display name"
          value={draft.displayName}
          onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
          placeholder="Display name"
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btnPrimary" onClick={() => saveIdentityBasics()}>
            Save display name
          </button>
        </div>
      </div>

      <div className="card" id="account-location">
        <h3>Location</h3>
        <p className="sponsorSectionLead">City and state shown on your public-facing profile context.</p>
        <div className="form">
          <input
            aria-label="City"
            value={draft.city}
            onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
            placeholder="City"
          />
          <input
            aria-label="State"
            value={draft.state}
            onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
            placeholder="State (e.g. TX)"
          />
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btnPrimary" onClick={() => saveIdentityBasics()}>
            Save location
          </button>
        </div>
      </div>

      <div id="account-membership">
        <MembershipAtAGlance
          surface="settings"
          isAuthenticated
          currentTierKey={profile.membershipStatus}
          onSelectTier={(id) => setMembershipStatus(id)}
          onRequestSignIn={openSignInForMembership}
          sessionKind={sessionKind}
          stripeMemberReady={!!authBackend?.stripe}
          stripeSponsorSubscriptionReady={!!authBackend?.stripeSponsorSubscription}
          stripeMemberMissingEnv={authBackend?.stripeMemberRecurringMissingEnv || []}
          checkoutReturnPath="/settings"
          membershipBillingStatus={profile.membershipBillingStatus}
          stripeCustomerReady={!!profile.stripeCustomerIdSet}
        />
      </div>

      <AccountInfoCard
        firstName={profile.firstName}
        lastName={profile.lastName}
        email={profile.email}
        displayName={profile.displayName}
        membershipTier={membership.label}
        membershipBillingStatus={profile.membershipBillingStatus}
        membershipSource={profile.membershipSource}
        podcastSponsorLastTierId={profile.podcastSponsorLastTierId}
        podcastSponsorLastCheckoutAt={profile.podcastSponsorLastCheckoutAt}
        profileSource="cloud"
        manageBillingSlot={
          isWorkos ? (
            <ManageBillingButton stripeReady={!!authBackend?.stripe} hasStripeCustomer={!!profile.stripeCustomerIdSet} />
          ) : null
        }
      />

      <div className="card">
        <h3>Saved organizations</h3>
        <p className="sponsorSectionLead">
          You have <strong>{favoriteEins.length}</strong> saved {favoriteEins.length === 1 ? "organization" : "organizations"}.
        </p>
        <Link className="btnSoft" href="/profile">
          View on profile
        </Link>
      </div>
    </section>
  );
}
