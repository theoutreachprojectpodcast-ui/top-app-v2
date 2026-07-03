"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MissionPageTopStrip from "@/components/layout/MissionPageTopStrip";
import MembershipBillingCenter from "@/features/membership/components/MembershipBillingCenter";
import ManageBillingButton from "@/features/profile/components/ManageBillingButton";
import AccountInfoCard from "@/features/profile/components/AccountInfoCard";
import { SUPPORT_EMAIL } from "@/lib/runtime/brandContact";

const DELETE_CONFIRM_PHRASE = "DELETE";

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
  deleteAccount,
}) {
  const isWorkos = sessionKind === "workos";
  const [draft, setDraft] = useState({
    email: profile.email || "",
    displayName: profile.displayName || "",
    city: profile.city || "",
    state: profile.state || "",
  });
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savingSection, setSavingSection] = useState(null);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    setDraft({
      email: profile.email || "",
      displayName: profile.displayName || "",
      city: profile.city || "",
      state: profile.state || "",
    });
  }, [profile.email, profile.displayName, profile.city, profile.state]);

  async function runSave(section, nextProfile) {
    setSavingSection(section);
    setSaveStatus("");
    setSaveError("");
    const result = await persistProfile(nextProfile);
    setSavingSection(null);
    if (!result?.ok) {
      setSaveError(String(result.message || "").trim() || "Could not save your account details. Try again.");
      return;
    }
    setSaveStatus("Saved.");
    window.setTimeout(() => setSaveStatus(""), 2500);
  }

  async function saveIdentityBasics() {
    await runSave("basics", {
      ...profile,
      displayName: draft.displayName.trim(),
      city: draft.city.trim(),
      state: draft.state.trim(),
    });
  }

  async function saveEmail() {
    const next = draft.email.trim();
    if (!next) return;
    await runSave("email", {
      ...profile,
      email: next,
    });
  }

  async function handleDeleteAccount() {
    setDeleteError("");
    if (!deleteAcknowledged) {
      setDeleteError("Confirm that you understand this action cannot be undone.");
      return;
    }
    if (deleteConfirmPhrase.trim() !== DELETE_CONFIRM_PHRASE) {
      setDeleteError(`Type ${DELETE_CONFIRM_PHRASE} to confirm account deletion.`);
      return;
    }
    if (typeof deleteAccount !== "function") {
      setDeleteError("Account deletion is unavailable right now. Contact support.");
      return;
    }
    setDeletingAccount(true);
    const result = await deleteAccount({ confirmPhrase: deleteConfirmPhrase.trim() });
    setDeletingAccount(false);
    if (!result?.ok) {
      setDeleteError(String(result?.message || "").trim() || "Could not delete your account.");
    }
  }

  const deleteReady = deleteAcknowledged && deleteConfirmPhrase.trim() === DELETE_CONFIRM_PHRASE;

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

      {saveError ? (
        <p className="profileEditSaveError" role="alert">
          {saveError}
        </p>
      ) : null}
      {saveStatus ? (
        <p className="applyStatus" role="status">
          {saveStatus}
        </p>
      ) : null}

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
        <label className="sponsorSectionLead" style={{ display: "block" }} htmlFor="top-settings-profile-email">
          Profile email
          <input
            id="top-settings-profile-email"
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
          <button
            type="button"
            className="btnPrimary"
            onClick={() => saveEmail()}
            disabled={!String(draft.email || "").trim() || savingSection === "email"}
          >
            {savingSection === "email" ? "Saving…" : "Save email"}
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
          <button
            type="button"
            className="btnPrimary"
            onClick={() => saveIdentityBasics()}
            disabled={savingSection === "basics"}
          >
            {savingSection === "basics" ? "Saving…" : "Save display name"}
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
          <button
            type="button"
            className="btnPrimary"
            onClick={() => saveIdentityBasics()}
            disabled={savingSection === "basics"}
          >
            {savingSection === "basics" ? "Saving…" : "Save location"}
          </button>
        </div>
      </div>

      <div id="account-membership">
        <MembershipBillingCenter
          isAuthenticated
          currentTierKey={profile.membershipStatus}
          onRequestSignIn={openSignInForMembership}
          sessionKind={sessionKind}
          stripeMemberReady={!!authBackend?.stripe}
          stripePortalReady={!!authBackend?.stripePortal}
          checkoutReturnPath="/settings"
          membershipBillingStatus={profile.membershipBillingStatus}
          stripeCustomerReady={!!profile.stripeCustomerIdSet}
          stripeSubscriptionReady={!!profile.stripeSubscriptionIdSet}
        />
      </div>

      <AccountInfoCard
        firstName={profile.firstName}
        lastName={profile.lastName}
        email={profile.email}
        sessionEmail={workOSAccountEmail}
        displayName={profile.displayName}
        membershipTier={membership.label}
        membershipBillingStatus={profile.membershipBillingStatus}
        membershipSource={profile.membershipSource}
        podcastSponsorLastTierId={profile.podcastSponsorLastTierId}
        podcastSponsorLastCheckoutAt={profile.podcastSponsorLastCheckoutAt}
        profileSource="cloud"
        manageBillingSlot={
          isWorkos ? (
            <ManageBillingButton
              stripeReady={!!authBackend?.stripePortal}
              hasStripeCustomer={!!profile.stripeCustomerIdSet}
              hasStripeSubscription={!!profile.stripeSubscriptionIdSet}
              returnPath="/settings"
            />
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

      <div className="card accountSettingsDangerZone" id="account-delete">
        <h3>Delete account</h3>
        <p className="sponsorSectionLead">
          Permanently delete your account and erase your personal data from The Outreach Project, including your
          profile, saved organizations, notifications, and community activity tied to this account.
          {isWorkos ? " Active Stripe subscriptions are canceled and your sign-in is revoked." : " Demo data on this device is cleared."}
          {" "}This cannot be undone.
        </p>
        <label className="accountSettingsDangerZone__ack">
          <input
            type="checkbox"
            checked={deleteAcknowledged}
            onChange={(e) => {
              setDeleteAcknowledged(e.target.checked);
              if (deleteError) setDeleteError("");
            }}
          />
          <span>I understand this permanently deletes my account and personal data.</span>
        </label>
        <label className="sponsorSectionLead accountSettingsDangerZone__confirmLabel" htmlFor="top-delete-confirm">
          Type <strong>{DELETE_CONFIRM_PHRASE}</strong> to confirm
          <input
            id="top-delete-confirm"
            name="deleteConfirm"
            type="text"
            autoComplete="off"
            value={deleteConfirmPhrase}
            onChange={(e) => {
              setDeleteConfirmPhrase(e.target.value);
              if (deleteError) setDeleteError("");
            }}
            placeholder={DELETE_CONFIRM_PHRASE}
            className="accountSettingsDangerZone__confirmInput"
          />
        </label>
        {deleteError ? (
          <p className="profileEditSaveError" role="alert">
            {deleteError}
          </p>
        ) : null}
        <div className="row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btnSoft accountSettingsDangerZone__deleteBtn"
            onClick={() => handleDeleteAccount()}
            disabled={!deleteReady || deletingAccount}
          >
            {deletingAccount ? "Deleting account…" : "Delete account"}
          </button>
        </div>
        <p className="sponsorSectionLead accountSettingsDangerZone__support">
          Need help instead? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </div>
      <MissionPageTopStrip placement="bottom" />
    </section>
  );
}
