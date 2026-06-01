"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import ProfileEditModal from "@/features/profile/components/ProfileEditModal";
import { profileFromApiDto } from "@/features/profile/mappers";
import { mergeEditDraftWithProfile } from "@/features/profile/lib/mergeEditDraftWithProfile";
import {
  clearProfileEditSessionHints,
  isProfileEditOpen,
  markPendingProfileEdit,
  markProfileEditOpen,
  peekPendingProfileEdit,
} from "@/features/profile/lib/pendingProfileEdit";
import { getIncompleteEditFocusIds } from "@/lib/profile/profileCompletion";

const ProfileEditContext = createContext(null);

function resolveProfileEditFocusKey(sectionRaw, focusRaw) {
  const section = String(sectionRaw || "").trim().toLowerCase();
  const SECTION_TO_FOCUS = {
    main: "displayName",
    identity: "identitySegment",
    contribution: "contribution",
    interests: "interests",
    preferences: "preferences",
  };
  const rawFocus = String(focusRaw || "").trim();
  const fromSection = section && SECTION_TO_FOCUS[section] ? SECTION_TO_FOCUS[section] : "";
  const focusKey =
    (fromSection && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(fromSection) ? fromSection : "") ||
    (rawFocus && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(rawFocus) ? rawFocus : "");
  return focusKey || null;
}

/**
 * `useSearchParams` must not wrap the context provider — Suspense fallback would render
 * children without ProfileEditContext and crash any page calling `useProfileEdit()`.
 */
function ProfileEditDeepLinkListener({
  isAuthenticated,
  loadingProfile,
  open,
  openProfileEdit,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deepLinkHandledRef = useRef(false);

  useEffect(() => {
    const editFromQuery = searchParams.get("edit") === "1";
    const pending = peekPendingProfileEdit();
    if (editFromQuery) {
      markPendingProfileEdit({
        focus: searchParams.get("focus") || searchParams.get("field") || pending?.focus || "",
        section: searchParams.get("section") || pending?.section || "",
      });
      markProfileEditOpen();
    }

    const wantsOpen = editFromQuery || pending || isProfileEditOpen();
    if (!wantsOpen) {
      deepLinkHandledRef.current = false;
      return;
    }
    if (!isAuthenticated || loadingProfile) return;
    if (open) {
      if (editFromQuery && pathname === "/profile") {
        router.replace("/profile", { scroll: false });
      }
      return;
    }
    if (deepLinkHandledRef.current && !editFromQuery) return;

    const focusKey = resolveProfileEditFocusKey(
      searchParams.get("section") || pending?.section,
      searchParams.get("focus") || searchParams.get("field") || pending?.focus,
    );
    deepLinkHandledRef.current = true;
    openProfileEdit(focusKey);
    if (editFromQuery && pathname === "/profile") {
      router.replace("/profile", { scroll: false });
    }
  }, [pathname, searchParams, loadingProfile, isAuthenticated, open, openProfileEdit, router]);

  return null;
}

export function ProfileEditProvider({ children }) {
  const router = useRouter();
  const { refresh: refreshAuthSession } = useAuthSession();
  const {
    profile,
    persistProfile,
    isAuthenticated,
    loadingProfile,
    sessionKind,
    uploadAvatarFile,
  } = useProfileData();

  const [open, setOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [editFieldFocus, setEditFieldFocus] = useState(null);
  const [editSaveError, setEditSaveError] = useState("");
  const [editSaveOk, setEditSaveOk] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const editDraftTouchedRef = useRef(new Set());
  const prevLoadingProfileForEditRef = useRef(loadingProfile);

  const editIncompleteKeys = open && editDraft ? getIncompleteEditFocusIds(editDraft) : new Set();

  const profileEditMergeKey = useMemo(
    () =>
      [
        profile.profileRecordId,
        profile.firstName,
        profile.lastName,
        profile.displayName,
        profile.email,
        profile.bio,
        profile.banner,
        profile.avatarUrl,
        profile.sponsorOrgName,
        profile.sponsorWebsite,
        profile.missionStatement,
        profile.identityRole,
        profile.city,
        profile.state,
        profile.organizationAffiliation,
        profile.serviceBackground,
        profile.causes,
        profile.skills,
        profile.volunteerInterests,
        profile.supportInterests,
        profile.contributionSummary,
        profile.accountIntent,
        profile.phoneNumber,
        profile.postalCode,
        profile.preferredContactMethod,
        profile.notificationPreferences?.join(","),
        profile.identitySegment,
        profile.jobTitle,
        profile.reasonForJoining,
        profile.supportNeeds,
        profile.communities,
        profile.preferredContributionContact,
        JSON.stringify(profile.contributionInterests || {}),
        profile.onboardingSkipped,
      ].join("\u001f"),
    [profile],
  );

  const openProfileEdit = useCallback(
    (focusKey) => {
      if (!isAuthenticated) return;
      markProfileEditOpen();
      markPendingProfileEdit({ focus: focusKey || "" });
      if (loadingProfile) return;
      setEditSaveError("");
      setEditSaveOk("");
      editDraftTouchedRef.current = new Set();
      setEditDraft(profileFromApiDto(profile));
      setEditFieldFocus(focusKey != null && focusKey !== "" ? focusKey : null);
      setOpen(true);
    },
    [isAuthenticated, loadingProfile, profile],
  );

  const closeProfileEdit = useCallback(() => {
    setEditSaveError("");
    setEditSaveOk("");
    setEditSaving(false);
    editDraftTouchedRef.current = new Set();
    clearProfileEditSessionHints();
    setEditFieldFocus(null);
    setOpen(false);
    setEditDraft(null);
  }, []);

  const saveProfileEdit = useCallback(async () => {
    if (editSaving || !editDraft) return;
    setEditSaving(true);
    setEditSaveError("");
    setEditSaveOk("");
    const result = await persistProfile({ ...profile, ...editDraft });
    setEditSaving(false);
    if (!result.ok) {
      setEditSaveError(String(result.message || "").trim() || "Could not save your profile. Try again.");
      return;
    }
    setEditSaveOk("Profile saved.");
    void refreshAuthSession({ soft: true });
    window.setTimeout(() => {
      closeProfileEdit();
    }, 900);
  }, [editSaving, editDraft, persistProfile, profile, refreshAuthSession, closeProfileEdit]);

  /** Open after profile load when Edit was requested while `loadingProfile` was true. */
  useEffect(() => {
    if (!isAuthenticated || loadingProfile || open) return;
    if (!isProfileEditOpen()) return;
    const pending = peekPendingProfileEdit();
    const focusKey = resolveProfileEditFocusKey(pending?.section, pending?.focus);
    setEditSaveError("");
    setEditSaveOk("");
    editDraftTouchedRef.current = new Set();
    setEditDraft(profileFromApiDto(profile));
    setEditFieldFocus(focusKey);
    setOpen(true);
  }, [loadingProfile, isAuthenticated, open, profile]);

  useEffect(() => {
    const prev = prevLoadingProfileForEditRef.current;
    prevLoadingProfileForEditRef.current = loadingProfile;
    if (!open || loadingProfile) return;
    if (prev === true && loadingProfile === false) {
      setEditDraft(profileFromApiDto(profile));
    }
  }, [open, loadingProfile, profile]);

  useEffect(() => {
    if (!open || !editDraft) return;
    setEditDraft((d) => mergeEditDraftWithProfile(d, profile, editDraftTouchedRef.current));
  }, [open, profileEditMergeKey, profile]);

  useEffect(() => {
    if (!open || !editFieldFocus) return;
    const id = requestAnimationFrame(() => {
      document.querySelector(`[data-profile-edit-focus="${editFieldFocus}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, editFieldFocus]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const value = useMemo(
    () => ({
      open,
      openProfileEdit,
      closeProfileEdit,
      saveProfileEdit,
    }),
    [open, openProfileEdit, closeProfileEdit, saveProfileEdit],
  );

  const modal =
    open && editDraft && typeof document !== "undefined"
      ? createPortal(
          <ProfileEditModal
            editDraft={editDraft}
            profile={profile}
            sessionKind={sessionKind}
            editIncompleteKeys={editIncompleteKeys}
            editSaveError={editSaveError}
            editSaveOk={editSaveOk}
            editSaving={editSaving}
            onClose={closeProfileEdit}
            onSave={() => void saveProfileEdit()}
            onSettings={() => router.push("/settings")}
            onDraftChange={setEditDraft}
            onMarkTouched={() => editDraftTouchedRef.current.add("__any__")}
            uploadAvatarFile={uploadAvatarFile}
            onSaveError={setEditSaveError}
            onSaveOk={setEditSaveOk}
          />,
          document.body,
        )
      : null;

  return (
    <ProfileEditContext.Provider value={value}>
      {children}
      {modal}
      <Suspense fallback={null}>
        <ProfileEditDeepLinkListener
          isAuthenticated={isAuthenticated}
          loadingProfile={loadingProfile}
          open={open}
          openProfileEdit={openProfileEdit}
        />
      </Suspense>
    </ProfileEditContext.Provider>
  );
}

export function useProfileEdit() {
  const ctx = useContext(ProfileEditContext);
  if (!ctx) {
    throw new Error("useProfileEdit must be used within ProfileEditProvider (root layout).");
  }
  return ctx;
}
