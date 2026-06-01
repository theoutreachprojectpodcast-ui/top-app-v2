"use client";

import Avatar from "@/components/shared/Avatar";
import { FormCheckbox } from "@/components/forms/FormChoice";
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

function EditChunk({ focusKey, incompleteKeys, children }) {
  const incomplete = focusKey && incompleteKeys.has(focusKey);
  return (
    <div
      className={`profileEditModal__chunk${incomplete ? " profileEditModal__chunk--incomplete" : ""}`}
      data-profile-edit-focus={focusKey || undefined}
    >
      {children}
    </div>
  );
}

function EditSection({ title, children }) {
  return (
    <section className="profileEditModal__section">
      {title ? <h4 className="profileEditModal__sectionTitle">{title}</h4> : null}
      {children}
    </section>
  );
}

function Field({ id, label, optional, hint, children }) {
  return (
    <label className="fieldLabel profileEditModal__field" htmlFor={id}>
      <span>
        {label}
        {optional ? <span className="fieldOptional"> (optional)</span> : null}
      </span>
      {hint ? <span className="profilePhotoUploadHint">{hint}</span> : null}
      {children}
    </label>
  );
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

  const emailHint =
    sessionKind === "workos"
      ? "Saved to your profile. Your WorkOS sign-in email may still differ until updated with your provider."
      : null;

  return (
    <div className="modalOverlay modalOverlay--profileEdit" onClick={onClose} role="presentation">
      <div
        className="modalCard modalCard--profileEdit profileEditModal"
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
        <header className="profileEditModal__head">
          <div>
            <h3 id="torp-profile-edit-title">Edit profile</h3>
            <p className="profileEditModal__intro">
              Update your account details below. Incomplete checklist items are outlined in green. Membership and billing
              are in{" "}
              <button type="button" className="accountSettingsInlineLink" onClick={onSettings}>
                Settings
              </button>
              .
            </p>
          </div>
          <button type="button" className="btnSoft profileEditModal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="profileEditModal__body">
          <form
            className="form profileEditForm"
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <EditSection title="Main account information">
              <EditChunk focusKey="avatar" incompleteKeys={editIncompleteKeys}>
                <Avatar src={editDraft.avatarUrl || emptyProfileAvatarUrl()} alt="Profile preview" sizes="96px" />
                <label className="profilePhotoUploadLabel">
                  <span className="profilePhotoUploadTitle">Profile photo</span>
                  <span className="profilePhotoUploadHint">
                    Upload or replace the image shown on your profile and membership card.
                  </span>
                  <input
                    className="profileFileInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => void onProfileImageSelected(e.target.files?.[0])}
                  />
                </label>
              </EditChunk>

              <div className="form">
                <EditChunk focusKey="name" incompleteKeys={editIncompleteKeys}>
                  <Field id="torp-edit-given" label="First name">
                    <input
                      id="torp-edit-given"
                      name="given-name"
                      autoComplete="given-name"
                      value={editDraft.firstName || ""}
                      onChange={(e) => patchDraft({ firstName: e.target.value })}
                      required
                    />
                  </Field>
                  <Field id="torp-edit-family" label="Last name">
                    <input
                      id="torp-edit-family"
                      name="family-name"
                      autoComplete="family-name"
                      value={editDraft.lastName || ""}
                      onChange={(e) => patchDraft({ lastName: e.target.value })}
                      required
                    />
                  </Field>
                </EditChunk>
              </div>

              <EditChunk focusKey="displayName" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-display" label="Display name">
                  <input
                    id="torp-edit-display"
                    name="nickname"
                    autoComplete="nickname"
                    value={editDraft.displayName || ""}
                    onChange={(e) => patchDraft({ displayName: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="email" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-email" label="Profile email" hint={emailHint}>
                  <input
                    id="torp-edit-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={editDraft.email}
                    onChange={(e) => patchDraft({ email: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="phone" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-phone" label="Phone number" optional>
                  <input
                    id="torp-edit-phone"
                    type="tel"
                    autoComplete="tel"
                    value={editDraft.phoneNumber || ""}
                    onChange={(e) => patchDraft({ phoneNumber: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="location" incompleteKeys={editIncompleteKeys}>
                <div className="form">
                  <Field id="torp-edit-city" label="City" optional>
                    <input
                      id="torp-edit-city"
                      autoComplete="address-level2"
                      value={editDraft.city || ""}
                      onChange={(e) => patchDraft({ city: e.target.value })}
                    />
                  </Field>
                  <Field id="torp-edit-state" label="State / region" optional>
                    <input
                      id="torp-edit-state"
                      autoComplete="address-level1"
                      value={editDraft.state || ""}
                      onChange={(e) => patchDraft({ state: e.target.value })}
                    />
                  </Field>
                </div>
                <Field id="torp-edit-postal" label="ZIP / postal code" optional>
                  <input
                    id="torp-edit-postal"
                    autoComplete="postal-code"
                    value={editDraft.postalCode || ""}
                    onChange={(e) => patchDraft({ postalCode: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="about" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-tagline" label="Short tagline" optional>
                  <input
                    id="torp-edit-tagline"
                    name="organization-title"
                    autoComplete="organization-title"
                    value={editDraft.banner || ""}
                    onChange={(e) => patchDraft({ banner: e.target.value })}
                    placeholder="Shown under your name"
                  />
                </Field>
                <Field id="torp-edit-bio" label="Bio" optional>
                  <textarea
                    id="torp-edit-bio"
                    rows={3}
                    value={editDraft.bio || ""}
                    onChange={(e) => patchDraft({ bio: e.target.value })}
                  />
                </Field>
              </EditChunk>
            </EditSection>

            <EditSection title="Identity">
              <EditChunk focusKey="identitySegment" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-id-seg" label="How you identify with this community">
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
                </Field>
              </EditChunk>

              <EditChunk focusKey="organizationName" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-org" label="Organization / affiliation" optional>
                  <input
                    id="torp-edit-org"
                    value={editDraft.organizationAffiliation || ""}
                    onChange={(e) => patchDraft({ organizationAffiliation: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="jobTitle" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-title" label="Role / title" optional>
                  <input
                    id="torp-edit-title"
                    value={editDraft.jobTitle || ""}
                    onChange={(e) => patchDraft({ jobTitle: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="serviceBackground" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-service" label="Branch or service affiliation" optional>
                  <input
                    id="torp-edit-service"
                    value={editDraft.serviceBackground || ""}
                    onChange={(e) => patchDraft({ serviceBackground: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="reasonForJoining" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-reason" label="Reason for joining" optional>
                  <textarea
                    id="torp-edit-reason"
                    rows={3}
                    value={editDraft.reasonForJoining || ""}
                    onChange={(e) => patchDraft({ reasonForJoining: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="interests" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-interests" label="Interests / categories" optional>
                  <textarea
                    id="torp-edit-interests"
                    rows={2}
                    value={editDraft.causes || ""}
                    onChange={(e) => patchDraft({ causes: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="supportNeeds" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-support" label="Support needs" optional>
                  <textarea
                    id="torp-edit-support"
                    rows={2}
                    value={editDraft.supportNeeds || ""}
                    onChange={(e) => patchDraft({ supportNeeds: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="communities" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-communities" label="Communities on the platform" optional>
                  <textarea
                    id="torp-edit-communities"
                    rows={2}
                    value={editDraft.communities || ""}
                    onChange={(e) => patchDraft({ communities: e.target.value })}
                  />
                </Field>
              </EditChunk>

              <EditChunk focusKey="identity" incompleteKeys={editIncompleteKeys}>
                <fieldset className="profileEditFieldset">
                  <legend>Additional identity</legend>
                  <Field id="torp-edit-mission" label="Mission or personal statement" optional>
                    <textarea
                      id="torp-edit-mission"
                      rows={2}
                      value={editDraft.missionStatement || ""}
                      onChange={(e) => patchDraft({ missionStatement: e.target.value })}
                    />
                  </Field>
                  <Field id="torp-edit-role-label" label="Legacy role label" optional>
                    <input
                      id="torp-edit-role-label"
                      value={editDraft.identityRole || ""}
                      onChange={(e) => patchDraft({ identityRole: e.target.value })}
                    />
                  </Field>
                </fieldset>
              </EditChunk>
            </EditSection>

            <EditSection title="Contribution">
              <EditChunk focusKey="contribution" incompleteKeys={editIncompleteKeys}>
                <fieldset className="profileEditFieldset">
                  <legend>Ways you want to contribute</legend>
                  <div className="dsChoiceGroup">
                    {CONTRIBUTION_INTEREST_KEYS.map(([key, label]) => (
                      <FormCheckbox
                        key={key}
                        checked={!!editDraft.contributionInterests?.[key]}
                        onChange={() => toggleContributionInterest(key)}
                      >
                        {label}
                      </FormCheckbox>
                    ))}
                  </div>
                  <Field id="torp-edit-skills" label="Skills or services you can offer" optional>
                    <textarea
                      id="torp-edit-skills"
                      rows={2}
                      value={editDraft.skills || ""}
                      onChange={(e) => patchDraft({ skills: e.target.value })}
                    />
                  </Field>
                  <Field id="torp-edit-volunteer" label="Volunteer interests" optional>
                    <textarea
                      id="torp-edit-volunteer"
                      rows={2}
                      value={editDraft.volunteerInterests || ""}
                      onChange={(e) => patchDraft({ volunteerInterests: e.target.value })}
                    />
                  </Field>
                  <Field id="torp-edit-contrib-summary" label="Contribution summary" optional>
                    <textarea
                      id="torp-edit-contrib-summary"
                      rows={2}
                      value={editDraft.contributionSummary || ""}
                      onChange={(e) => patchDraft({ contributionSummary: e.target.value })}
                    />
                  </Field>
                  <Field id="torp-edit-contrib-contact" label="Preferred contact for opportunities" optional>
                    <input
                      id="torp-edit-contrib-contact"
                      value={editDraft.preferredContributionContact || ""}
                      onChange={(e) => patchDraft({ preferredContributionContact: e.target.value })}
                    />
                  </Field>
                  <Field id="torp-edit-outreach" label="Support and outreach interests" optional>
                    <input
                      id="torp-edit-outreach"
                      value={editDraft.supportInterests || ""}
                      onChange={(e) => patchDraft({ supportInterests: e.target.value })}
                    />
                  </Field>
                </fieldset>
              </EditChunk>
            </EditSection>

            {String(editDraft.accountIntent || profile.accountIntent || "").toLowerCase() === "sponsor_user" ? (
              <EditSection title="Sponsor details">
                <EditChunk focusKey="sponsorOrg" incompleteKeys={editIncompleteKeys}>
                  <Field id="torp-edit-sponsor-org" label="Sponsor organization">
                    <input
                      id="torp-edit-sponsor-org"
                      value={editDraft.sponsorOrgName || ""}
                      onChange={(e) => patchDraft({ sponsorOrgName: e.target.value })}
                    />
                  </Field>
                </EditChunk>
                <EditChunk focusKey="sponsorSite" incompleteKeys={editIncompleteKeys}>
                  <Field id="torp-edit-sponsor-site" label="Organization website" optional>
                    <input
                      id="torp-edit-sponsor-site"
                      type="url"
                      value={editDraft.sponsorWebsite || ""}
                      onChange={(e) => patchDraft({ sponsorWebsite: e.target.value })}
                      placeholder="https://"
                    />
                  </Field>
                </EditChunk>
              </EditSection>
            ) : null}

            <EditSection title="Preferences">
              <EditChunk focusKey="preferences" incompleteKeys={editIncompleteKeys}>
                <Field id="torp-edit-contact-pref" label="Preferred contact method" optional>
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
                </Field>
                <fieldset className="profileEditFieldset">
                  <legend>Notification preferences</legend>
                  <div className="dsChoiceGroup profileEditModal__notifyGroup">
                    {["email", "sms", "push", "in_app"].map((nid) => (
                      <FormCheckbox
                        key={nid}
                        checked={!!editDraft.notificationPreferences?.includes(nid)}
                        onChange={() => toggleNotificationPref(nid)}
                      >
                        {nid.replace("_", " ")}
                      </FormCheckbox>
                    ))}
                  </div>
                </fieldset>
              </EditChunk>
            </EditSection>
          </form>
        </div>

        <footer className="profileEditModal__foot">
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
          <div className="row profileEditModal__actions">
            <button className="btnSoft" onClick={onClose} type="button" disabled={editSaving}>
              Cancel
            </button>
            <button className="btnPrimary" onClick={onSave} type="button" disabled={editSaving}>
              {editSaving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
