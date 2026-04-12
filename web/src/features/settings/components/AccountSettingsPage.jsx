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
    displayName: profile.displayName || "",
    city: profile.city || "",
    state: profile.state || "",
  });

  useEffect(() => {
    setDraft({
      displayName: profile.displayName || "",
      city: profile.city || "",
      state: profile.state || "",
    });
  }, [profile.displayName, profile.city, profile.state]);

  async function saveIdentityBasics() {
    await persistProfile({
      ...profile,
      displayName: draft.displayName.trim(),
      city: draft.city.trim(),
      state: draft.state.trim(),
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
          {isWorkos
            ? "Your email and password are managed by your WorkOS sign-in. Contact support if you need to change the email on file."
            : "Demo accounts use locally stored credentials on this device."}
        </p>
        <p>
          <strong>Email on file:</strong> {profile.email || "—"}
        </p>
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
