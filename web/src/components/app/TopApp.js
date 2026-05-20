"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import HeaderInner from "@/components/layout/HeaderInner";
import FooterInner from "@/components/layout/FooterInner";
import Avatar from "@/components/shared/Avatar";
import AppHeaderBrand from "@/components/layout/AppHeaderBrand";
import { Handshake, Mail, Mic, Search, UserRound, Users } from "lucide-react";
import AccountInfoCard from "@/features/profile/components/AccountInfoCard";
import ManageBillingButton from "@/features/profile/components/ManageBillingButton";
import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";
import TrustedResourceApplicationForm from "@/features/trusted-resources/application/TrustedResourceApplicationForm";
import "@/features/trusted-resources/trusted-resources-cards.css";
import CommunityPage from "@/features/community/components/CommunityPage";
import ProfileHeader from "@/features/profile/components/ProfileHeader";
import ProfileIdentitySection from "@/features/profile/components/ProfileIdentitySection";
import ProfileQuickStats from "@/features/profile/components/ProfileQuickStats";
import SavedOrganizationsList from "@/features/profile/components/SavedOrganizationsList";
import SiteBottomNavGlyph from "@/components/navigation/SiteBottomNavGlyph";
import SiteMobileNavMoreMenu from "@/components/navigation/SiteMobileNavMoreMenu";
import HomeProfileProgressNotice from "@/components/app/HomeProfileProgressNotice";
import HomeSponsorBannerPlacements from "@/components/app/HomeSponsorBannerPlacements";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import ProfileCompletionPanel from "@/features/profile/components/ProfileCompletionPanel";
import HeaderAccountMenu from "@/components/layout/HeaderAccountMenu";
import HeaderNotificationBell from "@/components/layout/HeaderNotificationBell";
import { useDirectorySearch } from "@/hooks/useDirectorySearch";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { useTrustedResources } from "@/hooks/useTrustedResources";
import DirectoryCategoryHeader from "@/features/directory/components/DirectoryCategoryHeader";
import DirectoryCategoryQuickPick from "@/features/directory/components/DirectoryCategoryQuickPick";
import { isQaLikeDeployment } from "@/lib/runtime/qaEnv";
import { showLocalDemoChrome } from "@/lib/runtime/demoUiVisibility";
import { useImmersiveHeaderScroll } from "@/hooks/useImmersiveHeaderScroll";
import MembershipAtAGlance from "@/features/membership/components/MembershipAtAGlance";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import { SERVICE_OPTIONS, STATES } from "@/lib/constants";
import { getSupabaseClient } from "@/lib/supabase/client";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";
import { rowEin } from "@/lib/utils";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import {
  clearLastUsedEmail,
  readLastUsedEmail,
  readRememberDevicePref,
  readRememberEmailPref,
  writeLastUsedEmail,
  writeRememberDevicePref,
  writeRememberEmailPref,
} from "@/lib/auth/lastUsedEmail";
import { workosSignInLink, workosSignUpHref } from "@/lib/auth/workosReturnTo";
import { computeProfileCompletion, getIncompleteEditFocusIds } from "@/lib/profile/profileCompletion";
import {
  CONTRIBUTION_INTEREST_KEYS,
  IDENTITY_SEGMENT_OPTIONS,
  PREFERRED_CONTACT_OPTIONS,
} from "@/lib/profile/profileCompletenessModel";
import { profileFromApiDto } from "@/features/profile/mappers";
import { mergeEditDraftWithProfile } from "@/features/profile/lib/mergeEditDraftWithProfile";
import AccountSettingsPage from "@/features/settings/components/AccountSettingsPage";
import { FormCheckbox } from "@/components/forms/FormChoice";
import { resolvePageAtmosphere } from "@/lib/design/pageAtmosphere";
import MissionPageTopStrip from "@/components/layout/MissionPageTopStrip";

const APP_ICON_SIZE = 14;
/** Lucide glyph size for home welcome action cards (matches `.welcomeActionCard--uniform .iconStroke`). */
const WELCOME_ACTION_ICON_SIZE = 42;

function AppIconShell({ children }) {
  return <span className="iconWrap" aria-hidden="true">{children}</span>;
}

/** Shield outline with centered cross (trusted resources). */
function TrustedShieldCrossIcon() {
  return (
    <AppIconShell>
      <svg
        viewBox="0 0 24 24"
        className="iconStroke"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    </AppIconShell>
  );
}

function AppIcon({ name, size = APP_ICON_SIZE }) {
  const lucideProps = {
    className: "iconStroke",
    size,
    strokeWidth: 2,
    absoluteStrokeWidth: true,
    "aria-hidden": true,
    focusable: false,
  };

  switch (name) {
    case "sponsors":
      return (
        <AppIconShell>
          <Handshake {...lucideProps} />
        </AppIconShell>
      );
    case "trusted":
      return <TrustedShieldCrossIcon />;
    case "community":
      return (
        <AppIconShell>
          <Users {...lucideProps} />
        </AppIconShell>
      );
    case "podcast":
      return (
        <AppIconShell>
          <Mic {...lucideProps} />
        </AppIconShell>
      );
    case "profile":
      return (
        <AppIconShell>
          <UserRound {...lucideProps} />
        </AppIconShell>
      );
    case "contact":
      return (
        <AppIconShell>
          <Mail {...lucideProps} />
        </AppIconShell>
      );
    case "search":
    default:
      return (
        <AppIconShell>
          <Search {...lucideProps} />
        </AppIconShell>
      );
  }
}

function DemoAuthPasswordVisibilityIcon({ revealed }) {
  return (
    <svg
      className="demoAuthModal__passwordToggleSvg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {revealed ? (
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function TopAppInner({ initialNav = "home" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sb = useMemo(() => getSupabaseClient(), []);
  const [nav, setNav] = useState(initialNav);
  const [overlay, setOverlay] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editFieldFocus, setEditFieldFocus] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [authDraft, setAuthDraft] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [demoAuthPasswordVisible, setDemoAuthPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [signupAvatarDataUrl, setSignupAvatarDataUrl] = useState("");
  const [editSaveError, setEditSaveError] = useState("");
  const [editSaveOk, setEditSaveOk] = useState("");
  const [contactDraft, setContactDraft] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "" });
  const [contactStatus, setContactStatus] = useState("");
  const [contactError, setContactError] = useState("");
  const [rememberDevice, setRememberDevice] = useState(() =>
    typeof window !== "undefined" ? readRememberDevicePref() : true,
  );
  const [rememberEmail, setRememberEmail] = useState(() =>
    typeof window !== "undefined" ? readRememberEmailPref() : true,
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [nav]);

  useEffect(() => {
    if (overlay !== "signin") setDemoAuthPasswordVisible(false);
  }, [overlay]);

  useEffect(() => {
    if (pathname === "/settings") setNav("settings");
    else if (pathname === "/profile") setNav("profile");
  }, [pathname]);

  useEffect(() => {
    if (searchParams.get("signin") === "1") {
      setAuthMode(searchParams.get("signup") === "1" ? "signup" : "signin");
      setOverlay("signin");
    }
  }, [searchParams]);

  useEffect(() => {
    if (overlay !== "signin") {
      setSignupAvatarDataUrl("");
      return;
    }
    if (authMode === "signin") {
      setSignupAvatarDataUrl("");
    }
  }, [overlay, authMode]);

  useEffect(() => {
    if (overlay !== "signin") return;
    setRememberDevice(readRememberDevicePref());
    setRememberEmail(readRememberEmailPref());
    const last = readLastUsedEmail();
    if (last) setAuthDraft((d) => ({ ...d, email: d.email ? d.email : last }));
  }, [overlay]);

  const {
    userId,
    sessionKind,
    authBackend,
    workOSAccountEmail,
    isAuthenticated,
    loadingProfile,
    profileError,
    profileSource,
    profile,
    persistProfile,
    fullName,
    membership,
    isMember,
    favoriteEins,
    favoriteEntityKeys,
    toggleFavoriteEin,
    toggleFavoriteEntityKey,
    savedOrganizations,
    setMembershipStatus,
    resetDemo,
    createAccount,
    signInWithCredentials,
    signOut,
    uploadAvatarFile,
    refreshWorkOSProfile,
    entitlements,
  } = useProfileData();
  const { refresh: refreshAuthSession } = useAuthSession();

  const profileCompletion = useMemo(() => {
    if (!isAuthenticated) return null;
    return computeProfileCompletion(profile, {
      workOSUser:
        sessionKind === "workos"
          ? { email: workOSAccountEmail || undefined, firstName: profile.firstName, lastName: profile.lastName }
          : null,
    });
  }, [isAuthenticated, profile, sessionKind, workOSAccountEmail]);

  const showHomeProfileHeroNotice = useMemo(
    () =>
      Boolean(
        profileCompletion &&
          !loadingProfile &&
          !profileCompletion.isComplete &&
          profileCompletion.total >= 1,
      ),
    [profileCompletion, loadingProfile],
  );

  const prevLoadingProfileForEditRef = useRef(loadingProfile);

  const editIncompleteKeys =
    overlay === "edit" && editDraft ? getIncompleteEditFocusIds(editDraft) : new Set();

  useEffect(() => {
    const c = searchParams.get("checkout");
    if ((c !== "success" && c !== "cancel") || sessionKind !== "workos") return;
    let cancelled = false;
    (async () => {
      await refreshWorkOSProfile();
      if (cancelled || typeof window === "undefined") return;
      const path = window.location.pathname || "/";
      router.replace(path, { scroll: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, sessionKind, refreshWorkOSProfile, router]);

  const workosSignInHereHref = useMemo(
    () =>
      workosSignInLink(pathname, searchParams, "/", {
        rememberDevice,
        loginHint: authDraft.email,
      }),
    [pathname, searchParams, rememberDevice, authDraft.email],
  );

  const workosSignUpModalHref = useMemo(
    () => workosSignUpHref("/onboarding", { rememberDevice, loginHint: authDraft.email }),
    [rememberDevice, authDraft.email],
  );

  function persistAuthPrefsBeforeWorkOSRedirect() {
    writeRememberDevicePref(rememberDevice);
    writeRememberEmailPref(rememberEmail);
    if (!rememberEmail) clearLastUsedEmail();
    else if (String(authDraft.email || "").trim()) writeLastUsedEmail(authDraft.email.trim());
  }

  const { filters, setFilters, results, status, meta, page, canGoNext, runSearch, clearSearch } = useDirectorySearch(sb);
  const { trusted, trustedStatus, loadTrusted } = useTrustedResources(sb);

  /** Prefill contact form from profile / account email when fields are still empty. */
  useEffect(() => {
    if (nav !== "contact" || !isAuthenticated) return;
    setContactDraft((d) => ({
      ...d,
      firstName: String(d.firstName || "").trim() || String(profile.firstName || "").trim() || "",
      lastName: String(d.lastName || "").trim() || String(profile.lastName || "").trim() || "",
      email: String(d.email || "").trim() || String(profile.email || "").trim() || "",
    }));
  }, [nav, isAuthenticated, profile.email, profile.firstName, profile.lastName]);

  function openOnboardingFlow() {
    if (sessionKind === "workos") {
      router.push("/onboarding");
      return;
    }
    // Demo/local auth does not have server-backed WorkOS onboarding APIs.
    // Route to profile edit instead of bouncing through /onboarding -> signin.
    router.push("/profile?edit=1");
  }

  function openEdit(focusKey) {
    setEditSaveError("");
    setEditDraft(profileFromApiDto(profile));
    setEditFieldFocus(focusKey != null && focusKey !== "" ? focusKey : null);
    setOverlay("edit");
  }

  async function saveEditProfile() {
    setEditSaveError("");
    setEditSaveOk("");
    const result = await persistProfile({ ...profile, ...editDraft });
    if (!result.ok) {
      setEditSaveError(String(result.message || "").trim() || "Could not save your profile. Try again.");
      return;
    }
    setEditSaveOk("Profile saved.");
    void refreshAuthSession({ soft: true });
    window.setTimeout(() => {
      closeEditOverlay();
    }, 900);
  }

  /** Home hero “Finish profile” navigates with ?edit=1 — open overlay only after /api/me profile is loaded on this mount. */
  const openedProfileEditFromQueryRef = useRef(false);
  useEffect(() => {
    if (pathname !== "/profile" || searchParams.get("edit") !== "1") {
      openedProfileEditFromQueryRef.current = false;
      return;
    }
    if (openedProfileEditFromQueryRef.current) return;
    if (loadingProfile || !isAuthenticated) return;
    const section = String(searchParams.get("section") || "").trim().toLowerCase();
    const SECTION_TO_FOCUS = {
      main: "displayName",
      identity: "identitySegment",
      contribution: "contribution",
      interests: "interests",
      preferences: "preferences",
    };
    const rawFocus = String(searchParams.get("focus") || searchParams.get("field") || "").trim();
    const fromSection = section && SECTION_TO_FOCUS[section] ? SECTION_TO_FOCUS[section] : "";
    const focusKey =
      (fromSection && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(fromSection) ? fromSection : "") ||
      (rawFocus && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(rawFocus) ? rawFocus : "");
    openedProfileEditFromQueryRef.current = true;
    setEditSaveError("");
    setEditDraft(profileFromApiDto(profile));
    setEditFieldFocus(focusKey != null && focusKey !== "" ? focusKey : null);
    setOverlay("edit");
    router.replace("/profile", { scroll: false });
  }, [pathname, searchParams, loadingProfile, isAuthenticated, profile, router]);

  /** If Edit Profile opens before cloud profile finishes loading, replace empty draft with real row. */
  useEffect(() => {
    const prev = prevLoadingProfileForEditRef.current;
    prevLoadingProfileForEditRef.current = loadingProfile;
    if (overlay !== "edit" || loadingProfile) return;
    if (prev === true && loadingProfile === false) {
      setEditDraft(profileFromApiDto(profile));
    }
  }, [overlay, loadingProfile, profile]);

  /** When `/api/me` hydrates after opening the modal, merge server fields without wiping typed values. */
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

  useEffect(() => {
    if (overlay !== "edit" || !editDraft) return;
    setEditDraft((d) => mergeEditDraftWithProfile(d, profile));
  }, [overlay, profileEditMergeKey, profile]);

  function closeEditOverlay() {
    setEditSaveError("");
    setEditSaveOk("");
    setEditFieldFocus(null);
    setOverlay(null);
  }

  function toggleEditNotificationPref(id) {
    setEditDraft((d) => {
      const arr = Array.isArray(d.notificationPreferences) ? [...d.notificationPreferences] : [];
      const s = new Set(arr.map((x) => String(x || "").toLowerCase()));
      const k = String(id || "").toLowerCase();
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return { ...d, notificationPreferences: [...s] };
    });
  }

  function toggleEditContributionInterest(key) {
    setEditDraft((d) => {
      const prev = d.contributionInterests && typeof d.contributionInterests === "object" ? d.contributionInterests : {};
      return { ...d, contributionInterests: { ...prev, [key]: !prev[key] } };
    });
  }

  useEffect(() => {
    if (overlay !== "edit" || !editFieldFocus) return;
    const id = requestAnimationFrame(() => {
      document.querySelector(`[data-profile-edit-focus="${editFieldFocus}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [overlay, editFieldFocus]);

  function dockNavHome() {
    if (pathname && pathname !== "/") router.push("/");
    else setNav("home");
  }

  function dockNavProfile() {
    if (pathname !== "/profile") router.push("/profile");
    else setNav("profile");
  }

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

  async function onProfileImageSelected(file) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) return;
    if (sessionKind === "workos" && uploadAvatarFile) {
      const result = await uploadAvatarFile(file);
      if (!result?.ok) {
        setAuthError(result?.message || "Could not upload photo.");
        return;
      }
      await refreshWorkOSProfile?.();
      setEditDraft((d) => ({ ...d, avatarUrl: profile.avatarUrl }));
      closeEditOverlay();
      return;
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      if (!dataUrl) return;
      setEditDraft((d) => ({ ...d, avatarUrl: dataUrl }));
    } catch {
      // keep silent to avoid blocking edit flow
    }
  }

  async function onSignupAvatarSelected(file) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      if (!dataUrl) return;
      setSignupAvatarDataUrl(dataUrl);
    } catch {
      // ignore invalid image
    }
  }

  function goToSponsorsHub() {
    router.push("/sponsors");
  }

  function openMembershipJourney() {
    if (!isAuthenticated) {
      if (authBackend.workos) {
        writeRememberDevicePref(rememberDevice);
        window.location.assign(workosSignUpHref("/onboarding", { rememberDevice }));
        return;
      }
      setAuthMode("signup");
      setOverlay("signin");
      return;
    }
    if (sessionKind === "workos" && !profile?.onboardingCompleted) {
      router.push("/onboarding");
      return;
    }
    setOverlay("upgrade");
  }

  function openCommunity() {
    setNav("community");
  }
  const fallbackSavedOrganizations = useMemo(() => {
    const byEin = new Map([...results, ...trusted].map((r) => [String(rowEin(r)), r]));
    return favoriteEins.map((ein) => byEin.get(String(ein)) || { ein, orgName: "Saved organization", city: "", state: "" });
  }, [favoriteEins, results, trusted]);
  const savedOrgsToRender = useMemo(() => {
    if (savedOrganizations.length) return savedOrganizations;
    if (isAuthenticated && favoriteEins.length) return [];
    return fallbackSavedOrganizations.map((raw) => mapNonprofitCardRow(raw, "saved"));
  }, [savedOrganizations, isAuthenticated, favoriteEins, fallbackSavedOrganizations]);
  const isLoggedIn = isAuthenticated;
  const sponsorsDockActive = Boolean(pathname?.startsWith("/sponsors"));
  const favoriteEinSet = useMemo(
    () => new Set((favoriteEins || []).map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9)),
    [favoriteEins]
  );
  const favoriteEntitySet = useMemo(
    () => new Set((favoriteEntityKeys || []).map((k) => String(k || "").trim().toLowerCase()).filter(Boolean)),
    [favoriteEntityKeys],
  );

  function openSignInOverlay() {
    if (authBackend.workos) {
      writeRememberDevicePref(rememberDevice);
      window.location.assign(workosSignInHereHref);
      return;
    }
    setAuthMode("signin");
    setOverlay("signin");
  }

  async function onAuthSubmit() {
    setAuthError("");
    setAuthStatus("");
    const result =
      authMode === "signup"
        ? await createAccount({ ...authDraft, avatarUrl: signupAvatarDataUrl || "" })
        : await signInWithCredentials({ email: authDraft.email, password: authDraft.password });
    if (!result?.ok) {
      setAuthError(result?.message || "Unable to continue right now.");
      return;
    }
    if (!authBackend.workos) {
      writeRememberEmailPref(rememberEmail);
      if (rememberEmail && String(authDraft.email || "").trim()) writeLastUsedEmail(authDraft.email.trim());
      else clearLastUsedEmail();
    }
    setAuthStatus(authMode === "signup" ? "Account created. Welcome in." : "Signed in successfully.");
    setAuthDraft((d) => ({ ...d, password: "" }));
    setSignupAvatarDataUrl("");
    setOverlay(null);
  }

  function openSignInForMembership() {
    if (authBackend.workos) {
      writeRememberDevicePref(rememberDevice);
      window.location.assign(workosSignInHereHref);
      return;
    }
    setAuthMode("signin");
    setOverlay("signin");
  }

  const pageAtmosphere = useMemo(() => resolvePageAtmosphere(pathname, nav), [pathname, nav]);
  const mainScrollRef = useRef(null);
  const immersiveHeaderScroll = pageAtmosphere !== "podcast";
  useImmersiveHeaderScroll({
    rootRef: mainScrollRef,
    enabled: immersiveHeaderScroll,
    gradientBoost: true,
  });

  function onContactSubmit(e) {
    e.preventDefault();
    setContactError("");
    setContactStatus("");
    const required = ["firstName", "lastName", "email", "message"];
    for (const field of required) {
      if (!String(contactDraft[field] || "").trim()) {
        setContactError("Please complete all required fields.");
        return;
      }
    }
    const subject = encodeURIComponent(`Contact Request — ${contactDraft.firstName} ${contactDraft.lastName}`);
    const body = encodeURIComponent(
      `Name: ${contactDraft.firstName} ${contactDraft.lastName}\nEmail: ${contactDraft.email}\nPhone: ${contactDraft.phone || "Not provided"}\n\nMessage:\n${contactDraft.message}`
    );
    window.location.href = `mailto:hello@theoutreach-project.com?subject=${subject}&body=${body}`;
    setContactStatus("Your email draft is ready to send.");
  }

  return (
    <main
      ref={mainScrollRef}
      className={`topApp theme-${profile.theme}${immersiveHeaderScroll ? " header-at-top" : ""} ${isLoggedIn ? "topApp--auth-in" : "topApp--auth-out"} appShell--withMobileNavDock`}
      data-page-atmosphere={pageAtmosphere}
    >
      <AppHeaderBrand />
      <header className="topbar">
        <HeaderInner className="topbarInner">
          <div className="topbarZone topbarLeft">
            <div className="topbarActionsCluster topbarActionsCluster--start">
              <ColorSchemeToggle />
            </div>
          </div>
          <div className="topbarZone topbarCenter" aria-hidden="true" />
          <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              {isLoggedIn ? (
                <>
                  <HeaderNotificationBell skipSessionGate />
                  <HeaderAccountMenu
                    avatarSrc={profile.avatarUrl || emptyProfileAvatarUrl()}
                    ariaLabel={`Account menu for ${fullName || profile.email || "signed-in user"}`}
                    onProfile={() => {
                      if (pathname !== "/profile") router.push("/profile");
                      else setNav("profile");
                    }}
                    onSettings={() => router.push("/settings")}
                    onMembership={() => {
                      if (!isMember) setOverlay("upgrade");
                      else setNav("profile");
                    }}
                    onSavedItems={() => setNav("profile")}
                    onSignOut={signOut}
                  />
                </>
              ) : authBackend.workos ? (
                <>
                  <a className="btnSoft sponsorBtn" href="/api/auth/workos/signup?returnTo=/onboarding">
                    <AppIcon name="profile" />
                    Create account
                  </a>
                  <a className="btnSoft sponsorBtn" href={workosSignInHereHref}>
                    <AppIcon name="profile" />
                    Sign in
                  </a>
                </>
              ) : (
                <>
                  <button className="btnSoft sponsorBtn" onClick={() => { setAuthMode("signup"); setOverlay("signin"); }} type="button">
                    <AppIcon name="profile" />
                    Create account
                  </button>
                  <button className="btnSoft sponsorBtn" onClick={() => { setAuthMode("signin"); setOverlay("signin"); }} type="button">
                    <AppIcon name="profile" />
                    Sign in
                  </button>
                </>
              )}
              <SiteMobileNavMoreMenu tone="app" align="end">
                <button
                  type="button"
                  className="siteMobileNavMore__entry"
                  onClick={() => {
                    setNav("trusted");
                    if (!trusted.length) loadTrusted(true);
                  }}
                >
                  Trusted Resources
                </button>
                <button type="button" className="siteMobileNavMore__entry" onClick={openCommunity}>
                  Community
                </button>
                <button type="button" className="siteMobileNavMore__entry" onClick={goToSponsorsHub}>
                  Sponsors
                </button>
                <button type="button" className="siteMobileNavMore__entry" onClick={() => router.push("/podcasts")}>
                  Podcast
                </button>
                <button type="button" className="siteMobileNavMore__entry" onClick={goToSponsorsHub}>
                  Become a Sponsor
                </button>
              </SiteMobileNavMoreMenu>
            </div>
          </div>
        </HeaderInner>
      </header>
      <div className="topbarOcclusion" aria-hidden="true" />

      {(nav === "home" || nav === "community") && (
        <section className={nav === "home" ? "shell shell--home" : "shell"}>
          {nav === "home" ? <MissionPageTopStrip placement="top" /> : null}
          {nav === "home" && (
            <>
              <HomeSponsorBannerPlacements />

              {showHomeProfileHeroNotice ? (
                <div className="homeHeroBackdrop">
                  <div className="homeHeroBackdrop__image" aria-hidden="true" />
                  <div className="homeHeroBackdrop__scrim" aria-hidden="true" />
                  <div className="homeHeroBackdrop__content">
                    <div className="homeHeroBackdrop__welcomeBundle">
                      <HomeProfileProgressNotice
                        completion={profileCompletion}
                        onOpenProfile={() => {
                          const focus = String(profileCompletion?.nextStep?.editFocus || "").trim();
                          const qs = new URLSearchParams();
                          qs.set("edit", "1");
                          if (focus) qs.set("focus", focus);
                          router.push(`/profile?${qs.toString()}`);
                        }}
                        onOpenOnboarding={openOnboardingFlow}
                        onOpenMembership={openMembershipJourney}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="welcomeActionLayout">
                <div className="welcomeActionList">
                  <button className="card action welcomeActionCard welcomeActionCard--uniform welcomeActionCard--sponsors" onClick={goToSponsorsHub} type="button">
                    <AppIcon name="sponsors" size={WELCOME_ACTION_ICON_SIZE} />
                    <span className="welcomeActionText">
                      <span className="welcomeActionLabel">Sponsors</span>
                      <span className="welcomeActionHint">Partner page — open packages from there</span>
                    </span>
                  </button>
                  <button className="card action welcomeActionCard welcomeActionCard--uniform welcomeActionCard--trusted" onClick={() => { setNav("trusted"); loadTrusted(true); }} type="button">
                    <AppIcon name="trusted" size={WELCOME_ACTION_ICON_SIZE} />
                    <span className="welcomeActionText">
                      <span className="welcomeActionLabel">Trusted Resources</span>
                      <span className="welcomeActionHint">Real help. Real impact.</span>
                    </span>
                  </button>
                  <button className="card action welcomeActionCard welcomeActionCard--uniform welcomeActionCard--community" onClick={openCommunity} type="button">
                    <AppIcon name="community" size={WELCOME_ACTION_ICON_SIZE} />
                    <span className="welcomeActionText">
                      <span className="welcomeActionLabel">Community</span>
                      <span className="welcomeActionHint">Connect. Share. Support each other.</span>
                    </span>
                  </button>
                  <button className="card action welcomeActionCard welcomeActionCard--uniform welcomeActionCard--podcasts" onClick={() => { router.push("/podcasts"); }} type="button">
                    <AppIcon name="podcast" size={WELCOME_ACTION_ICON_SIZE} />
                    <span className="welcomeActionText">
                      <span className="welcomeActionLabel">Podcasts</span>
                      <span className="welcomeActionHint">Stories that inspire. Voices that matter.</span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="card" id="home-directory">
                <h3><AppIcon name="search" />Nonprofit Directory</h3>
                {!isQaLikeDeployment() ? (
                  <DirectoryCategoryQuickPick
                    value={filters.service}
                    collapsible
                    onChange={(letter) => setFilters((f) => ({ ...f, service: letter }))}
                  />
                ) : null}
                {filters.service ? <DirectoryCategoryHeader letter={filters.service} /> : null}
                <div className="form">
                  <select value={filters.state} onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}>
                    {STATES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                  <input placeholder="City or Organization" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
                  <select value={filters.service} onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))} aria-label="Service category letter">
                    {SERVICE_OPTIONS.map(([v, label]) => <option key={v || "all"} value={v}>{label}</option>)}
                  </select>
                  <select value={filters.audience} onChange={(e) => setFilters((f) => ({ ...f, audience: e.target.value }))}>
                    <option value="all">All</option>
                    <option value="veteran">Veterans</option>
                    <option value="first_responder">First Responders</option>
                  </select>
                </div>
                <div className="row">
                  <button className="btnPrimary" onClick={() => runSearch(1)} type="button">Search</button>
                  <button className="btnSoft" onClick={clearSearch} type="button">Clear</button>
                </div>
                <p>{status}</p>
                <p>{meta}</p>
                <div className="results">
                  {!results.length && !status && (
                    <div className="emptyState">
                      <AppIcon name="search" />
                      <div>
                        <strong>Start by selecting a state</strong>
                        <p>Use filters to quickly surface trusted support organizations.</p>
                      </div>
                    </div>
                  )}
                  {results.map((r) => {
                    const card = mapNonprofitCardRow(r, "directory");
                    const ein = card.ein;
                    const einKey = normalizeEinDigits(ein);
                    return (
                      <NonprofitCard
                        key={`${ein}-${card.name}`}
                        card={card}
                        actionMode="directory"
                        favoritesEnabled={isAuthenticated}
                        isFavorite={einKey.length === 9 && favoriteEinSet.has(einKey)}
                        onToggleFavorite={toggleFavoriteEin}
                        onRequestSignIn={!isAuthenticated ? openSignInOverlay : undefined}
                      />
                    );
                  })}
                </div>
                <div className="row space directoryPager" role="navigation" aria-label="Directory pagination">
                  <button className="btnSoft" disabled={page <= 1} onClick={() => runSearch(page - 1)} type="button">Prev</button>
                  <span className="directoryPagerLabel">Page {page}</span>
                  <button className="btnSoft" disabled={!canGoNext} onClick={() => runSearch(page + 1)} type="button">Next</button>
                </div>
              </div>
            </>
          )}

          {nav === "community" && (
            <CommunityPage
              supabase={sb}
              userId={userId}
              sessionKind={sessionKind}
              isAuthenticated={isAuthenticated}
              authLoading={loadingProfile}
              authBackend={authBackend}
              isMember={isMember}
              fullName={fullName}
              profile={profile}
              onRequestUpgrade={() => {
                if (!isAuthenticated) {
                  if (authBackend.workos) {
                    writeRememberDevicePref(rememberDevice);
                    window.location.assign(workosSignUpHref("/community", { rememberDevice }));
                    return;
                  }
                  setAuthMode("signup");
                  setOverlay("signin");
                  return;
                }
                setOverlay("upgrade");
              }}
              onRequestSignIn={() => {
                if (authBackend.workos) {
                  writeRememberDevicePref(rememberDevice);
                  window.location.assign(
                    workosSignInLink("/community", null, "/community", { rememberDevice }),
                  );
                  return;
                }
                setAuthMode("signin");
                setOverlay("signin");
              }}
            />
          )}
          {nav === "community" ? <MissionPageTopStrip placement="bottom" /> : null}
        </section>
      )}

      {nav === "trusted" && (
        <section className="shell">
          <div className="card trustedRouteCard">
            <div className="ds-page-intro" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
              <h2>
                <AppIcon name="trusted" />
                Trusted Resources
              </h2>
              <p className="ds-page-intro__lead">
                Curated organizations with trusted alignment and mission-driven support.
              </p>
            </div>
            <div className="row">
              <button className="btnPrimary" onClick={() => loadTrusted(true)} type="button">Refresh</button>
              <button className="btnSoft" onClick={() => loadTrusted(false)} type="button">Load More</button>
              <button className="btnSoft" onClick={() => setOverlay("applyTrustedResource")} type="button">Apply to Become a Trusted Resource</button>
            </div>
            <p className="trustedRouteStatus">{trustedStatus}</p>
            <div className="results results--trustedBranded">
              {!trusted.length && !trustedStatus && (
                <div className="emptyState">
                  <AppIcon name="trusted" />
                  <div>
                    <strong>No trusted resources loaded yet</strong>
                    <p>Press Refresh to pull the latest verified organizations.</p>
                  </div>
                </div>
              )}
              {trusted.map((r) => {
                const card = mapNonprofitCardRow(r, "trusted");
                const ein = card.ein;
                const einKey = normalizeEinDigits(ein);
                const trustedKey = String(card.trustedResourceSlug || card.id || card.name || "")
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "");
                const trustedFavoriteKey = trustedKey ? `trusted:${trustedKey}` : "";
                const trustedIsFavorite =
                  (einKey.length === 9 && favoriteEinSet.has(einKey)) ||
                  (trustedFavoriteKey && favoriteEntitySet.has(trustedFavoriteKey));
                return (
                  <NonprofitCard
                    key={`trusted-${ein}-${card.name}`}
                    card={card}
                    actionMode="trustedResource"
                    favoritesEnabled={isAuthenticated}
                    isFavorite={trustedIsFavorite}
                    onToggleFavorite={(key) => {
                      const normalizedEin = normalizeEinDigits(key);
                      if (normalizedEin.length === 9) {
                        toggleFavoriteEin(normalizedEin);
                        return;
                      }
                      if (trustedFavoriteKey) toggleFavoriteEntityKey(trustedFavoriteKey);
                    }}
                    onRequestSignIn={!isAuthenticated ? openSignInOverlay : undefined}
                  />
                );
              })}
            </div>
          </div>
          <MissionPageTopStrip placement="bottom" />
        </section>
      )}

      {nav === "profile" && (
        <section className="shell profileTabShell">
          {loadingProfile && !isAuthenticated ? (
            <div className="card profileSessionRestoring">
              <p className="sponsorSectionLead" style={{ margin: 0 }}>
                Loading your profile…
              </p>
            </div>
          ) : !isAuthenticated ? (
            <>
              <div className="card profileSignedOutCard">
                <h3><AppIcon name="profile" />Your profile</h3>
                <p className="sponsorSectionLead">
                  Sign in or create an account to manage your identity, membership, saved nonprofits, and preferences. Everything stays on this tab once you are signed in.
                </p>
                <div className="row wrap">
                  <button
                    className="btnPrimary"
                    type="button"
                    onClick={() => {
                      if (authBackend.workos) {
                        writeRememberDevicePref(rememberDevice);
                        window.location.assign(workosSignInHereHref);
                        return;
                      }
                      setAuthMode("signin");
                      setOverlay("signin");
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    className="btnSoft"
                    type="button"
                    onClick={() => {
                      if (authBackend.workos) {
                        writeRememberDevicePref(rememberDevice);
                        window.location.assign(workosSignUpHref("/onboarding", { rememberDevice }));
                        return;
                      }
                      setAuthMode("signup");
                      setOverlay("signin");
                    }}
                  >
                    Create an account
                  </button>
                  <button className="btnSoft" type="button" onClick={() => setNav("home")}>Back to home</button>
                  {showLocalDemoChrome() ? (
                    <button className="btnSoft" type="button" onClick={resetDemo}>Reset Demo</button>
                  ) : null}
                </div>
                {showLocalDemoChrome() ? (
                  <p className="sponsorSectionLead profileDemoResetNote">
                    Reset Demo clears local profile, saved organizations, and demo-only application data on this device. You do not need to be signed in.
                  </p>
                ) : null}
              </div>
              <MembershipAtAGlance
                surface="profile"
                isAuthenticated={isAuthenticated}
                currentTierKey={profile.membershipStatus}
                onSelectTier={(id) => setMembershipStatus(id)}
                onRequestSignIn={openSignInForMembership}
                sessionKind={sessionKind}
                stripeMemberReady={!!authBackend?.stripe}
                stripeSponsorSubscriptionReady={!!authBackend?.stripeSponsorSubscription}
                stripeMemberMissingEnv={authBackend?.stripeMemberRecurringMissingEnv || []}
                checkoutReturnPath="/profile"
                membershipBillingStatus={profile.membershipBillingStatus}
                stripeCustomerReady={!!profile.stripeCustomerIdSet}
              />
            </>
          ) : (
            <>
          <ProfileHeader
            avatarSrc={profile.avatarUrl || emptyProfileAvatarUrl()}
            fullName={fullName || "Supporter"}
            email={profile.email}
            bio={profile.banner}
            missionStatement={profile.missionStatement}
            identityRole={profile.identityRole}
            membershipLabel={membership.label}
            isMember={isMember}
            icon={<AppIcon name="profile" />}
            onEdit={openEdit}
          />
          <MembershipAtAGlance
            surface="profile"
            isAuthenticated={isAuthenticated}
            currentTierKey={profile.membershipStatus}
            onSelectTier={(id) => setMembershipStatus(id)}
            onRequestSignIn={openSignInForMembership}
            sessionKind={sessionKind}
            stripeMemberReady={!!authBackend?.stripe}
            stripeSponsorSubscriptionReady={!!authBackend?.stripeSponsorSubscription}
            stripeMemberMissingEnv={authBackend?.stripeMemberRecurringMissingEnv || []}
            checkoutReturnPath="/profile"
            membershipBillingStatus={profile.membershipBillingStatus}
            stripeCustomerReady={!!profile.stripeCustomerIdSet}
          />
          <ProfileCompletionPanel
            completion={profileCompletion}
            profile={profile}
            onEditProfile={() => openEdit()}
            onEditProfileFocus={(key) => openEdit(key)}
            onOpenOnboarding={openOnboardingFlow}
            onOpenMembership={openMembershipJourney}
          />

          <ProfileIdentitySection profile={profile} onEdit={openEdit} savedCount={favoriteEins.length} />

          {loadingProfile && (
            <div className="card">
              <p>Loading profile...</p>
            </div>
          )}
          {!!profileError && (
            <div className="card">
              <p>{profileError}</p>
            </div>
          )}

          <ProfileQuickStats savedCount={favoriteEins.length} />
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
            profileSource={profileSource}
            manageBillingSlot={
              sessionKind === "workos" ? (
                <ManageBillingButton
                  stripeReady={!!authBackend?.stripe}
                  hasStripeCustomer={!!profile.stripeCustomerIdSet}
                />
              ) : null
            }
          />
          {!isMember ? (
            <div className="card">
              <h3>Upgrade to Pro</h3>
              <p className="sponsorSectionLead">{membership.hint}</p>
              <div className="row wrap">
                <button type="button" className="btnPrimary" onClick={() => setOverlay("upgrade")}>
                  View membership options
                </button>
                {authBackend.workos ? (
                  <a className="btnSoft" href="/onboarding">
                    Open membership onboarding
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
          <SavedOrganizationsList
            organizations={savedOrgsToRender}
            savedEinCount={favoriteEins.length}
            onToggleFavorite={toggleFavoriteEin}
            isMember={isMember}
          />
          <div className="card">
            <div className="row wrap">
              {showLocalDemoChrome() ? (
                <button className="btnSoft" onClick={resetDemo} type="button">Reset Demo</button>
              ) : null}
              <button className="btnSoft" onClick={signOut} type="button">Sign Out</button>
            </div>
          </div>
            </>
          )}
          <MissionPageTopStrip placement="bottom" />
        </section>
      )}

      {nav === "settings" && isAuthenticated ? (
        <AccountSettingsPage
          profile={profile}
          workOSAccountEmail={workOSAccountEmail}
          membership={membership}
          sessionKind={sessionKind}
          authBackend={authBackend}
          persistProfile={persistProfile}
          onOpenEditProfile={() => openEdit()}
          setMembershipStatus={setMembershipStatus}
          openSignInForMembership={openSignInForMembership}
          favoriteEins={favoriteEins}
        />
      ) : null}

      {nav === "settings" && !isAuthenticated ? (
        <section className="shell profileTabShell">
          <div className="card">
            <h3>Settings</h3>
            <p className="sponsorSectionLead">Sign in to manage your account, membership, and billing.</p>
            <button type="button" className="btnPrimary" onClick={() => { setAuthMode("signin"); setOverlay("signin"); }}>
              Sign in
            </button>
          </div>
          <MissionPageTopStrip placement="bottom" />
        </section>
      ) : null}

      {nav === "contact" && (
        <section className="shell">
          <div className="card">
            <h3><AppIcon name="contact" />Contact Us</h3>
            <p>If you are in immediate danger, call your local emergency number.</p>
            <p>In the U.S., call or text 988 for the Suicide & Crisis Lifeline.</p>
            <a className="btnPrimary" href="mailto:hello@theoutreach-project.com?subject=Need%20Help%20Finding%20Support">Email The Team</a>
          </div>
          <div className="card">
            <h3>Send us a message</h3>
            <form className="contactForm" onSubmit={onContactSubmit}>
            <div className="form">
              <input
                name="given-name"
                autoComplete="given-name"
                placeholder="First Name *"
                value={contactDraft.firstName}
                onChange={(e) => setContactDraft((d) => ({ ...d, firstName: e.target.value }))}
              />
              <input
                name="family-name"
                autoComplete="family-name"
                placeholder="Last Name *"
                value={contactDraft.lastName}
                onChange={(e) => setContactDraft((d) => ({ ...d, lastName: e.target.value }))}
              />
              <input
                name="email"
                autoComplete="email"
                placeholder="Email *"
                type="email"
                value={contactDraft.email}
                onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
              />
              <input
                name="tel"
                autoComplete="tel"
                placeholder="Phone Number"
                value={contactDraft.phone}
                onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </div>
              <textarea rows={6} placeholder="Message *" value={contactDraft.message} onChange={(e) => setContactDraft((d) => ({ ...d, message: e.target.value }))} />
              {contactError ? <p className="applyError">{contactError}</p> : null}
              {contactStatus ? <p className="applyStatus">{contactStatus}</p> : null}
              <div className="row wrap">
                <button className="btnPrimary" type="submit">Submit Message</button>
              </div>
            </form>
          </div>
          <MissionPageTopStrip placement="bottom" />
        </section>
      )}

      {isAuthenticated && entitlements?.isPlatformAdmin ? (
        <div className="adminUtilityEntry">
          <Link className="adminUtilityEntryLink" href="/admin">
            Admin Console
          </Link>
        </div>
      ) : null}

      {/* Fixed bottom navigation bar (dock). See top-app.css .footerDock / .footerDockBackdrop. */}
      <div className="footerDockBackdrop" aria-hidden="true" />
      <div className="footerDock">
        <FooterInner className="footerNavInner">
          <nav className="bottomNav bottomNav--withIcons bottomNav--mobileDock" aria-label="Bottom navigation">
            <button
              className={`navItem navItem--dockCol navItem--dockPrimary ${nav === "home" && !sponsorsDockActive ? "isActive" : ""}`}
              onClick={dockNavHome}
              type="button"
              title="Home"
            >
              <SiteBottomNavGlyph navKey="home" className="navItemGlyph" />
              <span className="navItemLabel">Home</span>
            </button>
            <button
              className={`navItem navItem--dockCol navItem--dockOverflow ${nav === "trusted" ? "isActive" : ""}`}
              onClick={() => {
                setNav("trusted");
                if (!trusted.length) loadTrusted(true);
              }}
              type="button"
              title="Trusted Resources"
            >
              <SiteBottomNavGlyph navKey="trusted" className="navItemGlyph" />
              <span className="navItemLabel">Trusted</span>
            </button>
            <button
              className={`navItem navItem--dockCol navItem--dockOverflow ${nav === "community" ? "isActive" : ""}`}
              onClick={() => setNav("community")}
              type="button"
              title="Community"
            >
              <SiteBottomNavGlyph navKey="community" className="navItemGlyph" />
              <span className="navItemLabel">Community</span>
            </button>
            <button
              className={`navItem navItem--dockCol navItem--dockOverflow ${sponsorsDockActive ? "isActive" : ""}`}
              onClick={() => router.push("/sponsors")}
              type="button"
              title="Sponsors"
            >
              <SiteBottomNavGlyph navKey="sponsors" className="navItemGlyph" />
              <span className="navItemLabel">Sponsors</span>
            </button>
            <button
              className={`navItem navItem--dockCol navItem--dockPrimary ${nav === "profile" ? "isActive" : ""}`}
              onClick={dockNavProfile}
              type="button"
              title="Profile"
            >
              <SiteBottomNavGlyph navKey="profile" className="navItemGlyph" />
              <span className="navItemLabel">Profile</span>
            </button>
            <button
              className={`navItem navItem--dockCol navItem--dockPrimary ${nav === "contact" ? "isActive" : ""}`}
              onClick={() => setNav("contact")}
              type="button"
              title="Contact"
            >
              <SiteBottomNavGlyph navKey="contact" className="navItemGlyph" />
              <span className="navItemLabel">Contact</span>
            </button>
          </nav>
        </FooterInner>
      </div>

      {overlay === "upgrade" && (
        <div className="modalOverlay" onClick={() => setOverlay(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Membership &amp; billing</h3>
            <p>
              Support Membership ($1.99/mo) and Pro Membership ($5.99/mo) unlock saved organizations, profile sync, and community
              participation. Use the Membership card above for Stripe checkout, or open onboarding for the full setup flow.
            </p>
            <div className="row wrap">
              <button className="btnSoft" onClick={() => setOverlay(null)} type="button">
                Not now
              </button>
              {authBackend.workos ? (
                <a className="btnPrimary" href="/onboarding">
                  Open membership onboarding
                </a>
              ) : showLocalDemoChrome() ? (
                <button
                  className="btnPrimary"
                  onClick={async () => {
                    await setMembershipStatus("member");
                    setOverlay(null);
                  }}
                  type="button"
                >
                  Become a Member (demo)
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {overlay === "edit" && editDraft ? (
        <div className="modalOverlay" onClick={closeEditOverlay}>
          <div
            className="modalCard modalCard--profileEdit"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent?.isComposing) return;
              const t = e.target;
              if (t && (t.tagName === "TEXTAREA" || (typeof t.closest === "function" && t.closest("textarea")))) return;
              if (t && t.tagName === "INPUT" && String(t.type || "").toLowerCase() === "file") return;
              e.preventDefault();
              void saveEditProfile();
            }}
          >
            <h3>Edit profile</h3>
            <p className="ds-page-intro__lead" style={{ margin: 0 }}>
              Sections mirror onboarding. Incomplete checklist items show a green outline. Billing lives in{" "}
              <button type="button" className="accountSettingsInlineLink" onClick={() => router.push("/settings")}>
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
                  onChange={(e) => onProfileImageSelected(e.target.files?.[0])}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, firstName: e.target.value }))}
                placeholder="First name"
              />
              <input
                name="family-name"
                autoComplete="family-name"
                value={editDraft.lastName || ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, lastName: e.target.value }))}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, displayName: e.target.value }))}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
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
                  onChange={(e) => setEditDraft((d) => ({ ...d, city: e.target.value }))}
                  placeholder="City"
                  autoComplete="address-level2"
                />
                <input
                  value={editDraft.state || ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, state: e.target.value }))}
                  placeholder="State / region"
                  autoComplete="address-level1"
                />
              </div>
              <input
                value={editDraft.postalCode || ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, postalCode: e.target.value }))}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, banner: e.target.value }))}
                placeholder="Short tagline (shown under your name)"
              />
              <textarea
                rows={3}
                value={editDraft.bio || ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, bio: e.target.value }))}
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
                  onChange={(e) => setEditDraft((d) => ({ ...d, identitySegment: e.target.value }))}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, organizationAffiliation: e.target.value }))}
                placeholder="Organization name / affiliation"
              />
            </div>
            <div
              className={`profileEditChunk${editIncompleteKeys.has("jobTitle") ? " profileEditChunk--incomplete" : ""}`}
              data-profile-edit-focus="jobTitle"
            >
              <input
                value={editDraft.jobTitle || ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, jobTitle: e.target.value }))}
                placeholder="Role / title"
              />
            </div>
            <div
              className={`profileEditChunk${editIncompleteKeys.has("serviceBackground") ? " profileEditChunk--incomplete" : ""}`}
              data-profile-edit-focus="serviceBackground"
            >
              <input
                value={editDraft.serviceBackground || ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, serviceBackground: e.target.value }))}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, reasonForJoining: e.target.value }))}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, causes: e.target.value }))}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, supportNeeds: e.target.value }))}
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
                onChange={(e) => setEditDraft((d) => ({ ...d, communities: e.target.value }))}
                placeholder="Communities you identify with on the platform"
              />
            </div>
            <div className="profileEditChunk" data-profile-edit-focus="identity">
              <fieldset className="profileEditFieldset">
                <legend>Additional identity (optional)</legend>
                <textarea
                  rows={2}
                  value={editDraft.missionStatement || ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, missionStatement: e.target.value }))}
                  placeholder="Mission or personal statement"
                />
                <input
                  value={editDraft.identityRole || ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, identityRole: e.target.value }))}
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
                        onChange={() => toggleEditContributionInterest(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={editDraft.skills || ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, skills: e.target.value }))}
                  placeholder="Skills or services you can offer"
                />
                <textarea
                  rows={2}
                  value={editDraft.volunteerInterests || ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, volunteerInterests: e.target.value }))}
                  placeholder="Volunteer interests"
                />
                <textarea
                  rows={2}
                  value={editDraft.contributionSummary || ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, contributionSummary: e.target.value }))}
                  placeholder="How you want to contribute (summary)"
                />
                <input
                  value={editDraft.preferredContributionContact || ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, preferredContributionContact: e.target.value }))}
                  placeholder="Preferred contact for opportunities"
                />
                <input
                  value={editDraft.supportInterests || ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, supportInterests: e.target.value }))}
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
                    onChange={(e) => setEditDraft((d) => ({ ...d, sponsorOrgName: e.target.value }))}
                    placeholder="Organization name"
                  />
                </div>
                <div
                  className={`profileEditChunk${editIncompleteKeys.has("sponsorSite") ? " profileEditChunk--incomplete" : ""}`}
                  data-profile-edit-focus="sponsorSite"
                >
                  <input
                    value={editDraft.sponsorWebsite || ""}
                    onChange={(e) => setEditDraft((d) => ({ ...d, sponsorWebsite: e.target.value }))}
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
                  onChange={(e) => setEditDraft((d) => ({ ...d, preferredContactMethod: e.target.value }))}
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
                        onChange={() => toggleEditNotificationPref(nid)}
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
              <button className="btnSoft" onClick={closeEditOverlay} type="button">Cancel</button>
              <button className="btnPrimary" onClick={() => void saveEditProfile()} type="button">
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {overlay === "signin" && (
        <div className="modalOverlay" onClick={() => setOverlay(null)}>
          <div className="modalCard demoAuthModal" onClick={(e) => e.stopPropagation()}>
            <h3>{authMode === "signup" ? "Create account" : "Sign in"}</h3>
            <p className="demoAuthModal__lede">
              {authBackend.workos
                ? authMode === "signup"
                  ? "Create your account with WorkOS (email or Google, depending on what your administrator enabled)."
                  : "Sign in securely with WorkOS. Password reset and additional providers are managed in the hosted auth experience."
                : authMode === "signup"
                  ? "Start with a simple local demo account. Production sign-in is not connected yet."
                  : "Demo sign-in uses email and password stored on this device only."}
            </p>
            {authBackend.workos ? (
              <div className="demoAuthModal__providers">
                <p className="demoAuthModal__providersLabel">WorkOS (production / demo users)</p>
                <p className="profilePhotoUploadHint" style={{ marginTop: 0 }}>
                  Optional: add your email to prefill the hosted sign-in screen.
                </p>
                <p className="profilePhotoUploadHint" style={{ marginTop: 0 }}>
                  On localhost, use the same WorkOS Client ID as production and register this origin’s callback in the WorkOS
                  dashboard (e.g. <code>http://localhost:3000/callback</code> for <code>pnpm dev:alt</code>).
                </p>
                <div className="demoAuthModal__rememberGroup" role="group" aria-label="Sign-in preferences">
                  <FormCheckbox checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)}>
                    Stay signed in (session)
                  </FormCheckbox>
                  <FormCheckbox checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)}>
                    Remember email on this device
                  </FormCheckbox>
                </div>
                <div className="row wrap demoAuthModal__providerRow">
                  <a
                    className="btnPrimary"
                    href={workosSignInHereHref}
                    onClick={() => persistAuthPrefsBeforeWorkOSRedirect()}
                  >
                    Sign in
                  </a>
                  <a
                    className="btnSoft"
                    href={workosSignUpModalHref}
                    onClick={() => persistAuthPrefsBeforeWorkOSRedirect()}
                  >
                    Create account
                  </a>
                  <a
                    className="btnSoft"
                    href={workosSignInHereHref}
                    onClick={() => persistAuthPrefsBeforeWorkOSRedirect()}
                  >
                    Continue with Google
                  </a>
                </div>
                <p className="profilePhotoUploadHint" style={{ marginTop: 8 }}>
                  Forgot your password? Use the reset link on the WorkOS sign-in screen.
                </p>
              </div>
            ) : (
              <div className="demoAuthModal__workosOff">
                <p className="applyStatus" style={{ marginTop: 0 }}>
                  Hosted WorkOS sign-in is not enabled on this deployment. The app is using local demo authentication until the
                  AuthKit environment variables below are set. See{" "}
                  <code className="mono">web/docs/WORKOS_HOSTED_SIGNIN.md</code> and{" "}
                  <code className="mono">web/.env.local.example</code>.
                </p>
                {authBackend.workosMissingEnv?.length ? (
                  <ul className="demoAuthModal__workosMissingList">
                    {authBackend.workosMissingEnv.map((key) => (
                      <li key={key}>
                        <code className="mono">{key}</code>
                      </li>
                    ))}
                  </ul>
                ) : !loadingProfile ? (
                  <p className="profilePhotoUploadHint" style={{ marginTop: 8 }}>
                    If this box stays empty, open <code className="mono">GET /api/auth/status</code> — it lists{" "}
                    <code className="mono">workosMissingEnv</code> when AuthKit is not ready.
                  </p>
                ) : null}
              </div>
            )}
            <form
              className="demoAuthModal__form"
              autoComplete="on"
              onSubmit={(e) => {
                e.preventDefault();
                if (!authBackend.workos) void onAuthSubmit();
              }}
            >
              {authMode === "signup" ? (
                <>
                  <div className="demoAuthModal__avatarBlock">
                    <Avatar src={signupAvatarDataUrl || emptyProfileAvatarUrl()} alt="Profile photo preview" className="demoAuthModal__avatarPreview" sizes="96px" />
                    <div className="demoAuthModal__avatarCopy">
                      <span className="demoAuthModal__avatarLabel">Profile photo</span>
                      <span className="demoAuthModal__avatarHint">Optional. If you skip this, a default placeholder is used until you add one in Profile settings.</span>
                      <label className="demoAuthModal__avatarUpload">
                        <span className="btnSoft demoAuthModal__avatarUploadBtn">Upload image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="profileFileInput"
                          onChange={(e) => onSignupAvatarSelected(e.target.files?.[0])}
                        />
                      </label>
                      {signupAvatarDataUrl ? (
                        <button type="button" className="btnSoft demoAuthModal__avatarRemove" onClick={() => setSignupAvatarDataUrl("")}>
                          Remove photo
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <label className="demoAuthModal__field" htmlFor="torp-demo-auth-given">
                    <span className="fieldLabel">First name</span>
                    <input
                      id="torp-demo-auth-given"
                      name="given-name"
                      value={authDraft.firstName}
                      onChange={(e) => setAuthDraft((d) => ({ ...d, firstName: e.target.value }))}
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="demoAuthModal__field" htmlFor="torp-demo-auth-family">
                    <span className="fieldLabel">Last name</span>
                    <input
                      id="torp-demo-auth-family"
                      name="family-name"
                      value={authDraft.lastName}
                      onChange={(e) => setAuthDraft((d) => ({ ...d, lastName: e.target.value }))}
                      placeholder="Last name"
                      autoComplete="family-name"
                    />
                  </label>
                </>
              ) : null}
              <label className="demoAuthModal__field" htmlFor="torp-demo-auth-email">
                <span className="fieldLabel">Email</span>
                <input
                  name="email"
                  id="torp-demo-auth-email"
                  value={authDraft.email}
                  onChange={(e) => setAuthDraft((d) => ({ ...d, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                />
              </label>
              {!authBackend.workos ? (
                <label className="demoAuthModal__field" htmlFor="torp-demo-auth-password">
                  <span className="fieldLabel">Password</span>
                  <div className="demoAuthModal__passwordWrap">
                    <input
                      id="torp-demo-auth-password"
                      name="password"
                      value={authDraft.password}
                      onChange={(e) => setAuthDraft((d) => ({ ...d, password: e.target.value }))}
                      placeholder="Password (min. 6 characters)"
                      type={demoAuthPasswordVisible ? "text" : "password"}
                      autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      className="demoAuthModal__passwordToggle"
                      onClick={() => setDemoAuthPasswordVisible((v) => !v)}
                      aria-label={demoAuthPasswordVisible ? "Hide password" : "Show password"}
                      aria-pressed={demoAuthPasswordVisible}
                    >
                      <DemoAuthPasswordVisibilityIcon revealed={demoAuthPasswordVisible} />
                    </button>
                  </div>
                </label>
              ) : null}
              {!authBackend.workos ? (
                <div className="demoAuthModal__rememberGroup" role="group" aria-label="Sign-in preferences">
                  <FormCheckbox checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)}>
                    Stay signed in (this browser)
                  </FormCheckbox>
                  <FormCheckbox checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)}>
                    Remember email for next time
                  </FormCheckbox>
                </div>
              ) : null}
              {readLastUsedEmail() ? (
                <button
                  type="button"
                  className="btnSoft demoAuthModal__clearEmail"
                  onClick={() => {
                    clearLastUsedEmail();
                    setAuthDraft((d) => ({ ...d, email: "" }));
                  }}
                >
                  Clear saved email
                </button>
              ) : null}
              {!authBackend.workos ? (
                <div className="demoAuthModal__providers" aria-label="Local demo sign-in">
                  <p className="demoAuthModal__providersLabel">Local demo only</p>
                  <div className="row wrap demoAuthModal__providerRow">
                    <span className="profilePhotoUploadHint">Google and other social login activate when WorkOS is configured.</span>
                  </div>
                </div>
              ) : (
                <hr className="sponsorAdminDivider" style={{ margin: "12px 0" }} aria-hidden="true" />
              )}
              {authError ? <p className="applyError">{authError}</p> : null}
              {authStatus ? <p className="applyStatus">{authStatus}</p> : null}
              <div className="row wrap">
                {!authBackend.workos ? (
                  <button className="btnPrimary" type="submit">{authMode === "signup" ? "Create Account" : "Sign In"}</button>
                ) : null}
                <button className="btnSoft" type="button" onClick={() => setAuthMode((m) => (m === "signup" ? "signin" : "signup"))}>
                  {authMode === "signup" ? "I already have an account" : "Create an account"}
                </button>
                <button className="btnSoft" type="button" onClick={() => setOverlay(null)}>Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {overlay === "applyTrustedResource" && (
        <TrustedResourceApplicationForm
          supabase={sb}
          onClose={() => setOverlay(null)}
        />
      )}
    </main>
  );
}

function TopAppFallback() {
  return (
    <main className="topApp theme-clean" data-page-atmosphere="home">
      <p style={{ padding: 24 }}>Loading…</p>
    </main>
  );
}

export default function TopApp(props) {
  return (
    <Suspense fallback={<TopAppFallback />}>
      <TopAppInner {...props} />
    </Suspense>
  );
}
