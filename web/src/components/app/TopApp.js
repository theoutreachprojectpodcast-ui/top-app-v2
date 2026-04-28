"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import HeaderInner from "@/components/layout/HeaderInner";
import FooterInner from "@/components/layout/FooterInner";
import Avatar from "@/components/shared/Avatar";
import BrandMark from "@/components/BrandMark";
import IconWrap from "@/components/shared/IconWrap";
import AccountInfoCard from "@/features/profile/components/AccountInfoCard";
import ManageBillingButton from "@/features/profile/components/ManageBillingButton";
import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";
import TrustedResourceApplicationForm from "@/features/trusted-resources/application/TrustedResourceApplicationForm";
import CommunityPage from "@/features/community/components/CommunityPage";
import ProfileHeader from "@/features/profile/components/ProfileHeader";
import ProfileIdentitySection from "@/features/profile/components/ProfileIdentitySection";
import ProfileQuickStats from "@/features/profile/components/ProfileQuickStats";
import SavedOrganizationsList from "@/features/profile/components/SavedOrganizationsList";
import HomeWelcomeSection from "@/components/app/HomeWelcomeSection";
import HomeProfileProgressNotice from "@/components/app/HomeProfileProgressNotice";
import ProfileCompletionPanel from "@/features/profile/components/ProfileCompletionPanel";
import HeaderAccountMenu from "@/components/layout/HeaderAccountMenu";
import HeaderNotificationBell from "@/components/layout/HeaderNotificationBell";
import { useDirectorySearch } from "@/hooks/useDirectorySearch";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { useTrustedResources } from "@/hooks/useTrustedResources";
import DirectoryCategoryQuickPick from "@/features/directory/components/DirectoryCategoryQuickPick";
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
import { profileFromApiDto } from "@/features/profile/mappers";
import { mergeEditDraftWithProfile } from "@/features/profile/lib/mergeEditDraftWithProfile";
import AccountSettingsPage from "@/features/settings/components/AccountSettingsPage";
import { FormCheckbox } from "@/components/forms/FormChoice";

function AppIcon({ name }) {
  const icons = {
    sponsors: "M4 6h16v12H4z M4 10h16",
    trusted: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z",
    community: "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6M3 19c0-2.8 2.8-4 5-4s5 1.2 5 4m3 0c0-2.4 2.3-3.5 5-3.5 2.1 0 5 1 5 3.5",
    podcast:
      "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm7 8v2a7 7 0 0 1-14 0v-2M12 19v3",
    search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14m9 16-4-4",
    profile: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4m-7 8c.5-3.5 3.5-5.5 7-5.5s6.5 2 7 5.5",
    contact: "M3 6h18v12H3z M3 7l9 7 9-7",
  };
  return <IconWrap path={icons[name] || icons.search} />;
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
    toggleFavoriteEin,
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

  const profileCompletion = useMemo(() => {
    if (!isAuthenticated) return null;
    return computeProfileCompletion(profile);
  }, [isAuthenticated, profile]);

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

  useEffect(() => {
    if (sessionKind !== "workos" || !isAuthenticated) return;
    if (profile?.onboardingCompleted) return;
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (path.startsWith("/onboarding")) return;
    if (path.startsWith("/settings")) return;
    router.replace("/onboarding");
  }, [sessionKind, isAuthenticated, profile?.onboardingCompleted, router]);

  function openEdit(focusKey) {
    setEditDraft(profileFromApiDto(profile));
    setEditFieldFocus(focusKey != null && focusKey !== "" ? focusKey : null);
    setOverlay("edit");
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
    const rawFocus = searchParams.get("focus") || "";
    const focusKey =
      rawFocus && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(rawFocus) ? rawFocus : undefined;
    openedProfileEditFromQueryRef.current = true;
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
      ].join("\u001f"),
    [profile],
  );

  useEffect(() => {
    if (overlay !== "edit" || !editDraft) return;
    setEditDraft((d) => mergeEditDraftWithProfile(d, profile));
  }, [overlay, profileEditMergeKey, profile]);

  function closeEditOverlay() {
    setEditFieldFocus(null);
    setOverlay(null);
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

  function scrollToDirectory() {
    document.getElementById("home-directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const favoriteEinSet = useMemo(
    () => new Set((favoriteEins || []).map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9)),
    [favoriteEins]
  );

  function openSignInOverlay() {
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
    setAuthMode("signin");
    setOverlay("signin");
  }

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
    <main className={`topApp theme-${profile.theme}`}>
      <div className="headerBrandStack">
        <BrandMark size="header" />
      </div>
      <header className="topbar">
        <HeaderInner className="topbarInner">
          <div className="topbarZone topbarLeft">
            <div className="topbarActionsCluster topbarActionsCluster--start">
              <ColorSchemeToggle />
              <button className="btnSoft sponsorBtn" onClick={goToSponsorsHub} type="button">
                <AppIcon name="sponsors" />
                Become a Sponsor
              </button>
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
            </div>
          </div>
        </HeaderInner>
      </header>
      <div className="topbarOcclusion" aria-hidden="true" />

      {(nav === "home" || nav === "community") && (
        <section className="shell">
          {nav === "home" && (
            <>
              <div className="homeHeroBackdrop">
                <div className="homeHeroBackdrop__image" aria-hidden="true" />
                <div className="homeHeroBackdrop__scrim" aria-hidden="true" />
                <div className="homeHeroBackdrop__content">
                  {profileCompletion ? (
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
                        onOpenOnboarding={() => router.push("/onboarding")}
                        onOpenMembership={openMembershipJourney}
                      />
                      <div className="card cardHero homeHeroBackdrop__card">
                        <HomeWelcomeSection
                          isAuthenticated={isAuthenticated}
                          isMember={isMember}
                          onOpenTrusted={() => {
                            setNav("trusted");
                            loadTrusted(true);
                          }}
                          onOpenMembershipJourney={openMembershipJourney}
                          onBrowseFree={scrollToDirectory}
                          onOpenProfile={() => {
                            if (pathname !== "/profile") router.push("/profile");
                            else setNav("profile");
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="card cardHero homeHeroBackdrop__card">
                      <HomeWelcomeSection
                        isAuthenticated={isAuthenticated}
                        isMember={isMember}
                        onOpenTrusted={() => {
                          setNav("trusted");
                          loadTrusted(true);
                        }}
                        onOpenMembershipJourney={openMembershipJourney}
                        onBrowseFree={scrollToDirectory}
                        onOpenProfile={() => {
                          if (pathname !== "/profile") router.push("/profile");
                          else setNav("profile");
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="welcomeActionLayout">
                <button className="card action welcomeSponsorsFeatured" onClick={goToSponsorsHub} type="button">
                  <AppIcon name="sponsors" />
                  <span className="welcomeActionLabel">Sponsors</span>
                  <span className="welcomeActionHint">Partner page — open packages from there</span>
                </button>
                <div className="welcomeActionTriplet">
                  <button className="card action welcomeTripletBtn" onClick={() => { setNav("trusted"); loadTrusted(true); }} type="button">
                    <AppIcon name="trusted" />
                    <span className="welcomeActionLabel">Trusted Resources</span>
                  </button>
                  <button className="card action welcomeTripletBtn" onClick={openCommunity} type="button">
                    <AppIcon name="community" />
                    <span className="welcomeActionLabel">Community</span>
                  </button>
                  <button className="card action welcomeTripletBtn" onClick={() => { window.location.href = "/podcasts"; }} type="button">
                    <AppIcon name="podcast" />
                    <span className="welcomeActionLabel">Podcasts</span>
                  </button>
                </div>
              </div>

              <div className="card" id="home-directory">
                <h3><AppIcon name="search" />Nonprofit Directory</h3>
                <DirectoryCategoryQuickPick value={filters.service} onChange={(letter) => setFilters((f) => ({ ...f, service: letter }))} />
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
                <div className="row space">
                  <button className="btnSoft" disabled={page <= 1} onClick={() => runSearch(page - 1)} type="button">Prev</button>
                  <span>Page {page}</span>
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
        </section>
      )}

      {nav === "trusted" && (
        <section className="shell">
          <div className="card">
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
            <p>{trustedStatus}</p>
            <div className="results">
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
                return (
                  <NonprofitCard
                    key={`trusted-${ein}-${card.name}`}
                    card={card}
                    actionMode="trustedResource"
                    favoritesEnabled={isAuthenticated}
                    isFavorite={einKey.length === 9 && favoriteEinSet.has(einKey)}
                    onToggleFavorite={toggleFavoriteEin}
                    onRequestSignIn={!isAuthenticated ? openSignInOverlay : undefined}
                  />
                );
              })}
            </div>
          </div>
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
                  <button className="btnPrimary" type="button" onClick={() => { setAuthMode("signin"); setOverlay("signin"); }}>Sign in</button>
                  <button className="btnSoft" type="button" onClick={() => { setAuthMode("signup"); setOverlay("signin"); }}>Create an account</button>
                  <button className="btnSoft" type="button" onClick={() => setNav("home")}>Back to home</button>
                  <button className="btnSoft" type="button" onClick={resetDemo}>Reset Demo</button>
                </div>
                <p className="sponsorSectionLead profileDemoResetNote">
                  Reset Demo clears local profile, saved organizations, and demo-only application data on this device. You do not need to be signed in.
                </p>
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
            onEditProfile={() => openEdit()}
            onEditProfileFocus={(key) => openEdit(key)}
            onOpenOnboarding={() => router.push("/onboarding")}
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
              <button className="btnSoft" onClick={resetDemo} type="button">Reset Demo</button>
              <button className="btnSoft" onClick={signOut} type="button">Sign Out</button>
            </div>
          </div>
            </>
          )}
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
        </section>
      )}

      <footer className="siteFooter">
        <FooterInner className="footerInner">
          <div>
            <div className="brandName">THE OUTREACH PROJECT</div>
            <p className="footerNote">Mission-first resource navigation for veterans, first responders, and supporters.</p>
          </div>
          <p className="footerNote">Trust-driven support, built for clarity under pressure.</p>
        </FooterInner>
      </footer>

      <div className="footerDockBackdrop" aria-hidden="true" />
      <div className="footerDock">
        <FooterInner className="footerNavInner">
          <nav className="bottomNav" aria-label="Primary navigation">
            <button className={`navItem ${nav === "home" ? "isActive" : ""}`} onClick={dockNavHome} type="button">Home</button>
            <button className={`navItem ${nav === "community" ? "isActive" : ""}`} onClick={() => setNav("community")} type="button">Community</button>
            <button className={`navItem ${nav === "profile" ? "isActive" : ""}`} onClick={dockNavProfile} type="button">Profile</button>
            <button className={`navItem ${nav === "contact" ? "isActive" : ""}`} onClick={() => setNav("contact")} type="button">Contact</button>
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
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}

      {overlay === "edit" && editDraft ? (
        <div className="modalOverlay" onClick={closeEditOverlay}>
          <div className="modalCard modalCard--profileEdit" onClick={(e) => e.stopPropagation()}>
            <h3>Edit profile</h3>
            <p className="ds-page-intro__lead" style={{ margin: 0 }}>
              Core account fields sync when cloud is available. Incomplete items from your profile checklist are highlighted
              in green. Deeper account controls live in{" "}
              <button type="button" className="accountSettingsInlineLink" onClick={() => router.push("/settings")}>
                Settings
              </button>
              .
            </p>
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
                placeholder="Bio (optional longer description, 12+ characters counts toward profile completion)"
              />
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
            <div
              className={`profileEditChunk${editIncompleteKeys.has("identity") ? " profileEditChunk--incomplete" : ""}`}
              data-profile-edit-focus="identity"
            >
              <fieldset className="profileEditFieldset">
                <legend>Identity &amp; contribution</legend>
                <p className="profileEditFieldsetHint">These fields power the Identity &amp; contribution card on your profile.</p>
                <textarea rows={3} value={editDraft.missionStatement || ""} onChange={(e) => setEditDraft((d) => ({ ...d, missionStatement: e.target.value }))} placeholder="Mission or personal statement" />
                <input value={editDraft.identityRole || ""} onChange={(e) => setEditDraft((d) => ({ ...d, identityRole: e.target.value }))} placeholder="Role (e.g. Veteran, First Responder, Nonprofit leader)" />
                <div className="form">
                  <input value={editDraft.city || ""} onChange={(e) => setEditDraft((d) => ({ ...d, city: e.target.value }))} placeholder="City" />
                  <input value={editDraft.state || ""} onChange={(e) => setEditDraft((d) => ({ ...d, state: e.target.value }))} placeholder="State (e.g. TX)" />
                </div>
                <input value={editDraft.organizationAffiliation || ""} onChange={(e) => setEditDraft((d) => ({ ...d, organizationAffiliation: e.target.value }))} placeholder="Organization affiliation" />
                <input value={editDraft.serviceBackground || ""} onChange={(e) => setEditDraft((d) => ({ ...d, serviceBackground: e.target.value }))} placeholder="Service background (branch, years, role)" />
                <input value={editDraft.causes || ""} onChange={(e) => setEditDraft((d) => ({ ...d, causes: e.target.value }))} placeholder="Causes you care about (comma-separated)" />
                <input value={editDraft.skills || ""} onChange={(e) => setEditDraft((d) => ({ ...d, skills: e.target.value }))} placeholder="Skills / ways you help (comma-separated)" />
                <input value={editDraft.volunteerInterests || ""} onChange={(e) => setEditDraft((d) => ({ ...d, volunteerInterests: e.target.value }))} placeholder="Volunteer interests (comma-separated)" />
                <input value={editDraft.supportInterests || ""} onChange={(e) => setEditDraft((d) => ({ ...d, supportInterests: e.target.value }))} placeholder="Support and outreach interests" />
                <textarea rows={2} value={editDraft.contributionSummary || ""} onChange={(e) => setEditDraft((d) => ({ ...d, contributionSummary: e.target.value }))} placeholder="How you contribute on this platform" />
              </fieldset>
            </div>
            <div className="row">
              <button className="btnSoft" onClick={closeEditOverlay} type="button">Cancel</button>
              <button
                className="btnPrimary"
                onClick={async () => {
                  await persistProfile({ ...profile, ...editDraft });
                  closeEditOverlay();
                }}
                type="button"
              >
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
    <main className="topApp theme-clean">
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
