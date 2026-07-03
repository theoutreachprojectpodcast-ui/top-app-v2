"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/shared/Avatar";
import { FormCheckbox } from "@/components/forms/FormChoice";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";
import {
  CONTRIBUTION_INTEREST_KEYS,
  evaluateAccountProfileCompleteness,
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

const SERVICE_SEGMENTS = new Set(["veteran", "first_responder"]);
const ORG_SEGMENTS = new Set(["organization_representative", "sponsor", "resource_partner"]);
const MORE_FOCUS_KEYS = new Set([
  "phone",
  "about",
  "interests",
  "contribution",
  "jobTitle",
  "sponsorOrg",
  "sponsorSite",
  "supportNeeds",
  "communities",
]);

function Field({ id, label, optional, hint, requiredMark, suggested, children }) {
  return (
    <label className="fieldLabel profileEditModal__field" htmlFor={id}>
      <span className="profileEditModal__labelRow">
        {label}
        {requiredMark ? <span className="profileEditModal__required" aria-hidden="true">*</span> : null}
        {optional ? <span className="fieldOptional"> (optional)</span> : null}
      </span>
      {suggested ? <span className="profileEditModal__suggested">Suggested enhancement</span> : null}
      {hint ? <span className="profilePhotoUploadHint">{hint}</span> : null}
      {children}
    </label>
  );
}

function needsAttention(focusKey, incompleteKeys) {
  return Boolean(focusKey && incompleteKeys.has(focusKey));
}

export default function ProfileEditModal({
  editDraft,
  profile,
  sessionKind,
  workOSAccountEmail,
  editIncompleteKeys,
  editFieldFocus = null,
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
  const [moreOpen, setMoreOpen] = useState(false);

  const completenessOpts = useMemo(
    () =>
      sessionKind === "workos"
        ? {
            workOSUser: {
              email: workOSAccountEmail || undefined,
              firstName: editDraft?.firstName,
              lastName: editDraft?.lastName,
            },
          }
        : {},
    [sessionKind, workOSAccountEmail, editDraft],
  );

  const accountCompletion = useMemo(
    () => (editDraft ? evaluateAccountProfileCompleteness(editDraft, completenessOpts) : null),
    [editDraft, completenessOpts],
  );

  const requiredLeft = accountCompletion?.requiredItems?.filter((s) => !s.done).length ?? 0;

  const suggestedFocusKeys = useMemo(() => {
    if (!accountCompletion?.recommendedItems) return new Set();
    return new Set(
      accountCompletion.recommendedItems.filter((s) => !s.done && s.editFocus).map((s) => String(s.editFocus)),
    );
  }, [accountCompletion]);

  const segment = String(editDraft?.identitySegment || "").toLowerCase();
  const showService = SERVICE_SEGMENTS.has(segment);
  const showOrg = ORG_SEGMENTS.has(segment);
  const isSponsorIntent = String(editDraft?.accountIntent || profile?.accountIntent || "").toLowerCase() === "sponsor_user";

  useEffect(() => {
    if (editFieldFocus && MORE_FOCUS_KEYS.has(editFieldFocus)) setMoreOpen(true);
  }, [editFieldFocus]);

  function patchDraft(patch) {
    onMarkTouched?.(patch);
    onDraftChange((d) => {
      const next = { ...d, ...patch };
      const fn = String(next.firstName || "").trim();
      const ln = String(next.lastName || "").trim();
      const derived = [fn, ln].filter(Boolean).join(" ").trim();
      if (derived && !String(next.displayName || "").trim() && ("firstName" in patch || "lastName" in patch)) {
        next.displayName = derived;
      }
      return next;
    });
  }

  function toggleNotificationPref(id) {
    onMarkTouched?.({ notificationPreferences: true });
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
    onMarkTouched?.({ contributionInterests: true });
    onDraftChange((d) => {
      const prev = d.contributionInterests && typeof d.contributionInterests === "object" ? d.contributionInterests : {};
      return { ...d, contributionInterests: { ...prev, [key]: !prev[key] } };
    });
  }

  async function onProfileImageSelected(file) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) return;
    onMarkTouched?.({ avatarUrl: true });
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
      onSaveOk?.("Photo updated.");
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

  const fieldClass = (focusKey) =>
    needsAttention(focusKey, editIncompleteKeys) ? " profileEditModal__field--attention" : "";

  return (
    <div className="modalOverlay modalOverlay--profileEdit" onClick={onClose} role="presentation">
      <div
        className="modalCard modalCard--profileEdit profileEditModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="top-profile-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="profileEditModal__head">
          <div>
            <h3 id="top-profile-edit-title">Edit profile</h3>
            <p className="profileEditModal__intro">
              A photo and a few basics are enough to get started. Membership and billing live in{" "}
              <button type="button" className="accountSettingsInlineLink" onClick={onSettings}>
                Settings
              </button>
              .
            </p>
          </div>
          <button type="button" className="btnSoft profileEditModal__close" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>

        {requiredLeft > 0 ? (
          <p className="profileEditModal__banner" role="status">
            {requiredLeft} required {requiredLeft === 1 ? "field" : "fields"} left — marked with *
          </p>
        ) : null}

        <div className="profileEditModal__body">
          <form
            className="profileEditForm"
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <div
              className={`profileEditModal__photoRow${needsAttention("avatar", editIncompleteKeys) ? " profileEditModal__photoRow--attention" : ""}`}
              data-profile-edit-focus="avatar"
            >
              <Avatar src={editDraft.avatarUrl || emptyProfileAvatarUrl()} alt="" sizes="72px" />
              <div className="profileEditModal__photoCopy">
                <span className="profilePhotoUploadTitle">Profile photo</span>
                <span className="profilePhotoUploadHint">Helps others recognize you (optional).</span>
                <label className="btnSoft profileEditModal__photoBtn">
                  Change photo
                  <input
                    className="profileFileInput"
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => void onProfileImageSelected(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            <div className={`profileEditModal__nameRow${fieldClass("name")}`} data-profile-edit-focus="name">
              <Field id="top-edit-given" label="First name" requiredMark>
                <input
                  id="top-edit-given"
                  name="given-name"
                  autoComplete="given-name"
                  value={editDraft.firstName || ""}
                  onChange={(e) => patchDraft({ firstName: e.target.value })}
                  required
                />
              </Field>
              <Field id="top-edit-family" label="Last name" requiredMark>
                <input
                  id="top-edit-family"
                  name="family-name"
                  autoComplete="family-name"
                  value={editDraft.lastName || ""}
                  onChange={(e) => patchDraft({ lastName: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div className={fieldClass("displayName")} data-profile-edit-focus="displayName">
              <Field
                id="top-edit-display"
                label="Display name"
                requiredMark
                hint="Shown on your profile. We suggest your first and last name if you leave this blank."
              >
                <input
                  id="top-edit-display"
                  name="nickname"
                  autoComplete="nickname"
                  value={editDraft.displayName || ""}
                  onChange={(e) => patchDraft({ displayName: e.target.value })}
                />
              </Field>
            </div>

            <div className={fieldClass("email")} data-profile-edit-focus="email">
              <Field
                id="top-edit-email"
                label="Email"
                requiredMark
                hint={
                  sessionKind === "workos"
                    ? "Saved to your profile. Your sign-in email may still differ until updated with your provider."
                    : null
                }
              >
                <input
                  id="top-edit-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={editDraft.email}
                  onChange={(e) => patchDraft({ email: e.target.value })}
                />
              </Field>
            </div>

            <div className={fieldClass("identitySegment")} data-profile-edit-focus="identitySegment">
              <Field id="top-edit-id-seg" label="I am a…" requiredMark>
                <select
                  id="top-edit-id-seg"
                  value={editDraft.identitySegment || ""}
                  onChange={(e) => patchDraft({ identitySegment: e.target.value })}
                >
                  <option value="">Choose one</option>
                  {IDENTITY_SEGMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {showService ? (
              <div className={fieldClass("serviceBackground")} data-profile-edit-focus="serviceBackground">
                <Field id="top-edit-service" label="Branch or service" requiredMark>
                  <input
                    id="top-edit-service"
                    value={editDraft.serviceBackground || ""}
                    onChange={(e) => patchDraft({ serviceBackground: e.target.value })}
                    placeholder="e.g. Army, Fire, EMS"
                  />
                </Field>
              </div>
            ) : null}

            {showOrg ? (
              <div className={fieldClass("organizationName")} data-profile-edit-focus="organizationName">
                <Field id="top-edit-org" label="Organization" requiredMark>
                  <input
                    id="top-edit-org"
                    value={editDraft.organizationAffiliation || ""}
                    onChange={(e) => patchDraft({ organizationAffiliation: e.target.value })}
                  />
                </Field>
              </div>
            ) : null}

            <div className={`profileEditModal__locationRow${fieldClass("location")}`} data-profile-edit-focus="location">
              <Field id="top-edit-state" label="State" requiredMark>
                <input
                  id="top-edit-state"
                  autoComplete="address-level1"
                  value={editDraft.state || ""}
                  onChange={(e) => patchDraft({ state: e.target.value })}
                  placeholder="e.g. TX"
                />
              </Field>
              <Field id="top-edit-city" label="City" optional>
                <input
                  id="top-edit-city"
                  autoComplete="address-level2"
                  value={editDraft.city || ""}
                  onChange={(e) => patchDraft({ city: e.target.value })}
                />
              </Field>
            </div>

            <div className={fieldClass("reasonForJoining")} data-profile-edit-focus="reasonForJoining">
              <Field id="top-edit-reason" label="Why you joined" requiredMark>
                <textarea
                  id="top-edit-reason"
                  rows={2}
                  value={editDraft.reasonForJoining || ""}
                  onChange={(e) => patchDraft({ reasonForJoining: e.target.value })}
                  placeholder="A sentence or two is plenty."
                />
              </Field>
            </div>

            <div className={fieldClass("supportNeeds")} data-profile-edit-focus="supportNeeds">
              <Field
                id="top-edit-support"
                label="Support needs"
                optional
                suggested={suggestedFocusKeys.has("supportNeeds")}
              >
                <textarea
                  id="top-edit-support"
                  rows={2}
                  value={editDraft.supportNeeds || ""}
                  onChange={(e) => patchDraft({ supportNeeds: e.target.value })}
                  placeholder="What kind of support are you looking for?"
                />
              </Field>
            </div>

            <div className={fieldClass("communities")} data-profile-edit-focus="communities">
              <Field
                id="top-edit-communities"
                label="Communities you identify with"
                optional
                suggested={suggestedFocusKeys.has("communities")}
              >
                <textarea
                  id="top-edit-communities"
                  rows={2}
                  value={editDraft.communities || ""}
                  onChange={(e) => patchDraft({ communities: e.target.value })}
                  placeholder="e.g. veteran, first responder, family"
                />
              </Field>
            </div>

            <div className={fieldClass("preferences")} data-profile-edit-focus="preferences">
              <Field id="top-edit-contact-pref" label="Best way to reach you" requiredMark>
                <select
                  id="top-edit-contact-pref"
                  value={editDraft.preferredContactMethod || ""}
                  onChange={(e) => patchDraft({ preferredContactMethod: e.target.value })}
                >
                  <option value="">Choose one</option>
                  {PREFERRED_CONTACT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <details
              className="profileEditModal__more"
              open={moreOpen}
              onToggle={(e) => setMoreOpen(e.currentTarget.open)}
            >
              <summary className="profileEditModal__moreSummary">More details (optional)</summary>
              <div className="profileEditModal__moreBody">
                <Field id="top-edit-phone" label="Phone" optional>
                  <input
                    id="top-edit-phone"
                    type="tel"
                    autoComplete="tel"
                    value={editDraft.phoneNumber || ""}
                    onChange={(e) => patchDraft({ phoneNumber: e.target.value })}
                  />
                </Field>

                <Field id="top-edit-tagline" label="Short tagline" optional>
                  <input
                    id="top-edit-tagline"
                    value={editDraft.banner || ""}
                    onChange={(e) => patchDraft({ banner: e.target.value })}
                    placeholder="Shown under your name"
                  />
                </Field>

                <Field id="top-edit-bio" label="Bio" optional>
                  <textarea
                    id="top-edit-bio"
                    rows={2}
                    value={editDraft.bio || ""}
                    onChange={(e) => patchDraft({ bio: e.target.value })}
                    placeholder="A few words about you"
                  />
                </Field>

                <Field id="top-edit-title" label="Role / title" optional>
                  <input
                    id="top-edit-title"
                    value={editDraft.jobTitle || ""}
                    onChange={(e) => patchDraft({ jobTitle: e.target.value })}
                  />
                </Field>

                <Field id="top-edit-interests" label="Interests" optional>
                  <input
                    id="top-edit-interests"
                    value={editDraft.causes || ""}
                    onChange={(e) => patchDraft({ causes: e.target.value })}
                    placeholder="Topics you care about"
                  />
                </Field>

                <fieldset className="profileEditFieldset">
                  <legend>How you might help</legend>
                  <div className="dsChoiceGroup profileEditModal__contribGroup">
                    {CONTRIBUTION_INTEREST_KEYS.slice(0, 6).map(([key, label]) => (
                      <FormCheckbox
                        key={key}
                        checked={!!editDraft.contributionInterests?.[key]}
                        onChange={() => toggleContributionInterest(key)}
                      >
                        {label}
                      </FormCheckbox>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="profileEditFieldset">
                  <legend>Notifications</legend>
                  <div className="dsChoiceGroup profileEditModal__notifyGroup">
                    {[
                      ["email", "Email"],
                      ["in_app", "In-app"],
                      ["sms", "SMS"],
                    ].map(([nid, label]) => (
                      <FormCheckbox
                        key={nid}
                        checked={!!editDraft.notificationPreferences?.includes(nid)}
                        onChange={() => toggleNotificationPref(nid)}
                      >
                        {label}
                      </FormCheckbox>
                    ))}
                  </div>
                </fieldset>

                {isSponsorIntent ? (
                  <>
                    <Field id="top-edit-sponsor-org" label="Sponsor organization" optional>
                      <input
                        id="top-edit-sponsor-org"
                        value={editDraft.sponsorOrgName || ""}
                        onChange={(e) => patchDraft({ sponsorOrgName: e.target.value })}
                      />
                    </Field>
                    <Field id="top-edit-sponsor-site" label="Organization website" optional>
                      <input
                        id="top-edit-sponsor-site"
                        type="url"
                        value={editDraft.sponsorWebsite || ""}
                        onChange={(e) => patchDraft({ sponsorWebsite: e.target.value })}
                        placeholder="https://"
                      />
                    </Field>
                  </>
                ) : null}
              </div>
            </details>
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
              {editSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
