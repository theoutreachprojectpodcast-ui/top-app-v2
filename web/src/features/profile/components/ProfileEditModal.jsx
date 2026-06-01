"use client";

import Avatar from "@/components/shared/Avatar";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";
import {
  CONTRIBUTION_INTEREST_KEYS,
  IDENTITY_SEGMENT_OPTIONS,
  PREFERRED_CONTACT_OPTIONS,
} from "@/lib/profile/profileCompletenessModel";

async function fileToCompressedDataUrl(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  if (!dataUrl) return "";

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const maxSide = 720;
  const width = image.width || 1;
  const height = image.height || 1;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", 0.84);
}

export default function ProfileEditModal({
  editDraft,
  profile,
  sessionKind,
  editIncompleteKeys,
  editSaveError,
  editSaveOk,
  editSaving,
  onClose,
  onSave,
  onSettings,
  onDraftChange,
  onMarkTouched,
  uploadAvatarFile,
  onSaveError,
  onSaveOk,
}) {
  function patchDraft(patch) {
    onMarkTouched();
    onDraftChange((d) => ({ ...d, ...patch }));
  }

  function toggleNotificationPref(id) {
    onMarkTouched();
    onDraftChange((d) => {
      const arr = Array.isArray(d.notificationPreferences) ? [...d.notificationPreferences] : [];
      const s = new Set(arr.map((x) => String(x || "").toLowerCase()));
      const k = String(id || "").toLowerCase();
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return { ...d, notificationPreferences: [...s] };
    });
  }

  function toggleContributionInterest(key) {
    onMarkTouched();
    onDraftChange((d) => {
      const prev = d.contributionInterests && typeof d.contributionInterests === "object" ? d.contributionInterests : {};
      return { ...d, contributionInterests: { ...prev, [key]: !prev[key] } };
    });
  }

  async function onProfileImageSelected(file) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) return;
    onMarkTouched();
    if (sessionKind === "workos" && uploadAvatarFile) {
      onSaveError?.("");
      const result = await uploadAvatarFile(file);
      if (!result?.ok) {
        onSaveError?.(result?.message || "Could not upload photo.");
        return;
      }
      if (result.avatarUrl) {
        onDraftChange((d) => ({ ...d, avatarUrl: result.avatarUrl }));
      }
      onSaveOk?.("Photo updated. Tap Save to keep your other profile changes.");
      return;
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      if (!dataUrl) return;
      onDraftChange((d) => ({ ...d, avatarUrl: dataUrl }));
    } catch {
      /* ignore invalid image */
    }
  }

  return (
    <div className="modalOverlay modalOverlay--profileEdit" onClick={onClose} role="presentation">
      <div
        className="modalCard modalCard--profileEdit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="torp-profile-edit-title"
        onClick={(e) => e.stopPropagation()}
        onChangeCapture={() => onMarkTouched()}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.nativeEvent?.isComposing) return;
          const t = e.target;
          if (t && (t.tagName === "TEXTAREA" || (typeof t.closest === "function" && t.closest("textarea")))) return;
          if (t && t.tagName === "INPUT" && String(t.type || "").toLowerCase() === "file") return;
          e.preventDefault();
          onSave();
        }}
      >
        <h3 id="torp-profile-edit-title">Edit profile</h3>
        <p className="ds-page-intro__lead" style={{ margin: 0 }}>
          Sections mirror onboarding. Incomplete checklist items show a green outline. Billing lives in{" "}
          <button type="button" className="accountSettingsInlineLink" onClick={onSettings}>
            Settings
          </button>
          .
        </p>
        <h4 className="introTagline" style={{ marginTop: 16 }}>
          Main account information
        </h4>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("avatar") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="avatar"
        >
          <Avatar src={editDraft.avatarUrl || emptyProfileAvatarUrl()} alt="Profile preview" />
          <label className="profilePhotoUploadLabel">
            <span className="profilePhotoUploadTitle">Profile photo</span>
            <span className="profilePhotoUploadHint">Upload or replace the image shown on your profile and membership card.</span>
            <input
              className="profileFileInput"
              type="file"
              accept="image/*"
              onChange={(e) => void onProfileImageSelected(e.target.files?.[0])}
            />
          </label>
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("name") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="name"
        >
          <input
            name="given-name"
            autoComplete="given-name"
            value={editDraft.firstName || ""}
            onChange={(e) => patchDraft({ firstName: e.target.value })}
            placeholder="First name"
          />
          <input
            name="family-name"
            autoComplete="family-name"
            value={editDraft.lastName || ""}
            onChange={(e) => patchDraft({ lastName: e.target.value })}
            placeholder="Last name"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("displayName") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="displayName"
        >
          <input
            name="nickname"
            autoComplete="nickname"
            value={editDraft.displayName || ""}
            onChange={(e) => patchDraft({ displayName: e.target.value })}
            placeholder="Display name"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("email") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="email"
        >
          <input
            name="email"
            autoComplete="email"
            value={editDraft.email}
            onChange={(e) => patchDraft({ email: e.target.value })}
            placeholder="Email"
            type="email"
            title={
              sessionKind === "workos"
                ? "Saved to your profile. Change anytime in Settings or here; sign-in email may still be your WorkOS address until updated with your provider."
                : undefined
            }
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("phone") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="phone"
        >
          <input
            type="tel"
            autoComplete="tel"
            value={editDraft.phoneNumber || ""}
            onChange={(e) => patchDraft({ phoneNumber: e.target.value })}
            placeholder="Phone number"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("location") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="location"
        >
          <div className="form">
            <input
              value={editDraft.city || ""}
              onChange={(e) => patchDraft({ city: e.target.value })}
              placeholder="City"
              autoComplete="address-level2"
            />
            <input
              value={editDraft.state || ""}
              onChange={(e) => patchDraft({ state: e.target.value })}
              placeholder="State / region"
              autoComplete="address-level1"
            />
          </div>
          <input
            value={editDraft.postalCode || ""}
            onChange={(e) => patchDraft({ postalCode: e.target.value })}
            placeholder="ZIP / postal code"
            autoComplete="postal-code"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("about") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="about"
        >
          <input
            name="organization-title"
            autoComplete="organization-title"
            value={editDraft.banner || ""}
            onChange={(e) => patchDraft({ banner: e.target.value })}
            placeholder="Short tagline (shown under your name)"
          />
          <textarea
            rows={3}
            value={editDraft.bio || ""}
            onChange={(e) => patchDraft({ bio: e.target.value })}
            placeholder="Bio"
          />
        </div>
        <h4 className="introTagline" style={{ marginTop: 16 }}>
          Identity
        </h4>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("identitySegment") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="identitySegment"
        >
          <label className="fieldLabel" htmlFor="torp-edit-id-seg">
            How you identify with this community
            <select
              id="torp-edit-id-seg"
              value={editDraft.identitySegment || ""}
              onChange={(e) => patchDraft({ identitySegment: e.target.value })}
            >
              <option value="">Select…</option>
              {IDENTITY_SEGMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("organizationName") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="organizationName"
        >
          <input
            value={editDraft.organizationAffiliation || ""}
            onChange={(e) => patchDraft({ organizationAffiliation: e.target.value })}
            placeholder="Organization name / affiliation"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("jobTitle") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="jobTitle"
        >
          <input
            value={editDraft.jobTitle || ""}
            onChange={(e) => patchDraft({ jobTitle: e.target.value })}
            placeholder="Role / title"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("serviceBackground") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="serviceBackground"
        >
          <input
            value={editDraft.serviceBackground || ""}
            onChange={(e) => patchDraft({ serviceBackground: e.target.value })}
            placeholder="Branch or service affiliation"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("reasonForJoining") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="reasonForJoining"
        >
          <textarea
            rows={3}
            value={editDraft.reasonForJoining || ""}
            onChange={(e) => patchDraft({ reasonForJoining: e.target.value })}
            placeholder="Reason for joining The Outreach Project"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("interests") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="interests"
        >
          <textarea
            rows={2}
            value={editDraft.causes || ""}
            onChange={(e) => patchDraft({ causes: e.target.value })}
            placeholder="Interests / categories you care about"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("supportNeeds") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="supportNeeds"
        >
          <textarea
            rows={2}
            value={editDraft.supportNeeds || ""}
            onChange={(e) => patchDraft({ supportNeeds: e.target.value })}
            placeholder="Support needs"
          />
        </div>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("communities") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="communities"
        >
          <textarea
            rows={2}
            value={editDraft.communities || ""}
            onChange={(e) => patchDraft({ communities: e.target.value })}
            placeholder="Communities you identify with on the platform"
          />
        </div>
        <div className="profileEditChunk" data-profile-edit-focus="identity">
          <fieldset className="profileEditFieldset">
            <legend>Additional identity (optional)</legend>
            <textarea
              rows={2}
              value={editDraft.missionStatement || ""}
              onChange={(e) => patchDraft({ missionStatement: e.target.value })}
              placeholder="Mission or personal statement"
            />
            <input
              value={editDraft.identityRole || ""}
              onChange={(e) => patchDraft({ identityRole: e.target.value })}
              placeholder="Legacy role label (optional)"
            />
          </fieldset>
        </div>
        <h4 className="introTagline" style={{ marginTop: 16 }}>
          Contribution
        </h4>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("contribution") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="contribution"
        >
          <fieldset className="profileEditFieldset">
            <legend>Ways you want to contribute</legend>
            <div className="communityPillRow" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
              {CONTRIBUTION_INTEREST_KEYS.map(([key, label]) => (
                <label key={key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={!!editDraft.contributionInterests?.[key]}
                    onChange={() => toggleContributionInterest(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <textarea
              rows={2}
              value={editDraft.skills || ""}
              onChange={(e) => patchDraft({ skills: e.target.value })}
              placeholder="Skills or services you can offer"
            />
            <textarea
              rows={2}
              value={editDraft.volunteerInterests || ""}
              onChange={(e) => patchDraft({ volunteerInterests: e.target.value })}
              placeholder="Volunteer interests"
            />
            <textarea
              rows={2}
              value={editDraft.contributionSummary || ""}
              onChange={(e) => patchDraft({ contributionSummary: e.target.value })}
              placeholder="How you want to contribute (summary)"
            />
            <input
              value={editDraft.preferredContributionContact || ""}
              onChange={(e) => patchDraft({ preferredContributionContact: e.target.value })}
              placeholder="Preferred contact for opportunities"
            />
            <input
              value={editDraft.supportInterests || ""}
              onChange={(e) => patchDraft({ supportInterests: e.target.value })}
              placeholder="Support and outreach interests"
            />
          </fieldset>
        </div>
        {String(editDraft.accountIntent || profile.accountIntent || "").toLowerCase() === "sponsor_user" ? (
          <>
            <div
              className={`profileEditChunk${editIncompleteKeys.has("sponsorOrg") ? " profileEditChunk--incomplete" : ""}`}
              data-profile-edit-focus="sponsorOrg"
            >
              <p className="profileEditFieldsetHint">Sponsor organization</p>
              <input
                value={editDraft.sponsorOrgName || ""}
                onChange={(e) => patchDraft({ sponsorOrgName: e.target.value })}
                placeholder="Organization name"
              />
            </div>
            <div
              className={`profileEditChunk${editIncompleteKeys.has("sponsorSite") ? " profileEditChunk--incomplete" : ""}`}
              data-profile-edit-focus="sponsorSite"
            >
              <input
                value={editDraft.sponsorWebsite || ""}
                onChange={(e) => patchDraft({ sponsorWebsite: e.target.value })}
                placeholder="Organization website URL"
              />
            </div>
          </>
        ) : null}
        <h4 className="introTagline" style={{ marginTop: 16 }}>
          Preferences
        </h4>
        <div
          className={`profileEditChunk${editIncompleteKeys.has("preferences") ? " profileEditChunk--incomplete" : ""}`}
          data-profile-edit-focus="preferences"
        >
          <label className="fieldLabel" htmlFor="torp-edit-contact-pref">
            Preferred contact method
            <select
              id="torp-edit-contact-pref"
              value={editDraft.preferredContactMethod || ""}
              onChange={(e) => patchDraft({ preferredContactMethod: e.target.value })}
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
            <legend>Notification preferences</legend>
            <div className="communityPillRow" style={{ flexWrap: "wrap" }}>
              {["email", "sms", "push", "in_app"].map((nid) => (
                <label key={nid} style={{ display: "inline-flex", gap: 8, marginRight: 12 }}>
                  <input
                    type="checkbox"
                    checked={!!editDraft.notificationPreferences?.includes(nid)}
                    onChange={() => toggleNotificationPref(nid)}
                  />
                  {nid.replace("_", " ")}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {editSaveOk ? (
          <p className="applyStatus" role="status">
            {editSaveOk}
          </p>
        ) : null}
        {editSaveError ? (
          <p className="profileEditSaveError" role="alert">
            {editSaveError}
          </p>
        ) : null}
        <div className="row">
          <button className="btnSoft" onClick={onClose} type="button" disabled={editSaving}>
            Cancel
          </button>
          <button className="btnPrimary" onClick={onSave} type="button" disabled={editSaving}>
            {editSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
