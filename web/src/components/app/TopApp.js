"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import HeaderInner from "@/components/layout/HeaderInner";
import FooterInner from "@/components/layout/FooterInner";
import Avatar from "@/components/shared/Avatar";
import AppIcon from "@/components/shared/AppIcon";
import AppHeaderBrand from "@/components/layout/AppHeaderBrand";
import DownloadMobileAppButton from "@/components/layout/DownloadMobileAppButton";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import AccountInfoCard from "@/features/profile/components/AccountInfoCard";
import ManageBillingButton from "@/features/profile/components/ManageBillingButton";
import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";
import TrustedResourceApplicationForm from "@/features/trusted-resources/application/TrustedResourceApplicationForm";
import "@/features/trusted-resources/trusted-resources-cards.css";
import CommunityPage from "@/features/community/components/CommunityPage";
import ProfileHeader from "@/features/profile/components/ProfileHeader";
import ProfileIdentitySection from "@/features/profile/components/ProfileIdentitySection";
import SavedOrganizationsList from "@/features/profile/components/SavedOrganizationsList";
import SiteBottomNavGlyph from "@/components/navigation/SiteBottomNavGlyph";
import {
  isSiteDockNavActive,
  SITE_MOBILE_DOCK_ITEMS,
  SITE_TOP_APP_DOCK_TAB_KEYS,
} from "@/components/navigation/siteBottomNavConfig";
import { SiteHamburgerNavMenu } from "@/components/navigation/SiteMobileNavHamburgerEntries";
import HomeScreen from "@/components/home/HomeScreen";
import { scrollToPageTop } from "@/lib/navigation/scrollToPageTop";
import { SUPPORT_EMAIL } from "@/lib/runtime/brandContact";
import ProfileCompletionPanel from "@/features/profile/components/ProfileCompletionPanel";
import HeaderAccountMenu from "@/components/layout/HeaderAccountMenu";
import AdminConsoleLink from "@/components/admin/AdminConsoleLink";
import HeaderNotificationBell from "@/components/layout/HeaderNotificationBell";
import { useDirectorySearch } from "@/hooks/useDirectorySearch";
import { useMobileShell } from "@/hooks/useMobileShell";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useTrustedResources } from "@/hooks/useTrustedResources";
import { showLocalDemoChrome } from "@/lib/runtime/demoUiVisibility";
import { adminConsoleHref } from "@/lib/runtime/deploymentHosts";
import { useImmersiveHeaderScroll } from "@/hooks/useImmersiveHeaderScroll";
import MembershipAtAGlance from "@/features/membership/components/MembershipAtAGlance";
import MembershipBillingCenter from "@/features/membership/components/MembershipBillingCenter";
import {
  PRO_MEMBERSHIP_PRICE_LABEL,
  SUPPORT_MEMBERSHIP_DISPLAY_NAME,
  SUPPORT_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import {
  membershipAccountMenuHint,
  shouldShowMembershipPickerModal,
  shouldShowMembershipPickerOnProfile,
} from "@/features/membership/membershipAccountDisplay";
import HomeMembershipSection from "@/components/home/HomeMembershipSection";
import MembershipPlansModal from "@/components/membership/MembershipPlansModal";
import ProUpgradeModal from "@/components/membership/ProUpgradeModal";
import { getProUpgradeGateContentForNav } from "@/lib/membership/proUpgradeGateCopy";
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
import { workosSignInLink, workosSignUpHref, MOBILE_POST_AUTH_COMPLETE_PATH } from "@/lib/auth/workosReturnTo";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";
import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import { computeProfileCompletion } from "@/lib/profile/profileCompletion";
import { markPendingProfileEdit } from "@/features/profile/lib/pendingProfileEdit";
import { useProfileEdit } from "@/features/profile/ProfileEditProvider";
import AccountSettingsPage from "@/features/settings/components/AccountSettingsPage";
import { FormCheckbox } from "@/components/forms/FormChoice";
import { resolvePageAtmosphere } from "@/lib/design/pageAtmosphere";
import MissionPageTopStrip from "@/components/layout/MissionPageTopStrip";
import NativeAccountBillingNotice from "@/components/capacitor/NativeAccountBillingNotice";
import CapacitorFooterPortal from "@/components/capacitor/CapacitorFooterPortal";
import {
  openWebBilling,
  openWebMembership,
  openWebSignup,
  openWebLogin,
  openWebSponsorMembership,
  requiresExternalWebAccountFlow,
} from "@/lib/capacitor/webAccountRedirects";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { useNavAuthState } from "@/hooks/useNavAuthState";
import { workosReturnPathFromRouter } from "@/lib/auth/workosReturnTo";
import { shouldUseHostedWorkOSAuth } from "@/lib/auth/hostedWorkOSAuth";

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

const TOP_APP_PRO_NAV_KEYS = new Set(["community", "trusted", "settings"]);

function TopAppInner({ initialNav = "home" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobileShell = useMobileShell();
  const { authed: isLoggedIn } = useNavAuthState();
  const sb = useMemo(() => getSupabaseClient(), []);
  const [nav, setNav] = useState(initialNav);
  const [overlay, setOverlay] = useState(null);
  const [proGateHint, setProGateHint] = useState("");
  const [authMode, setAuthMode] = useState("signin");
  const [authDraft, setAuthDraft] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [demoAuthPasswordVisible, setDemoAuthPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [signupAvatarDataUrl, setSignupAvatarDataUrl] = useState("");
  const signinQueryHandledRef = useRef(false);
  const [contactDraft, setContactDraft] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "" });
  const [contactStatus, setContactStatus] = useState("");
  const [contactError, setContactError] = useState("");
  const [rememberDevice, setRememberDevice] = useState(() =>
    typeof window !== "undefined" ? readRememberDevicePref() : true,
  );
  const [rememberEmail, setRememberEmail] = useState(() =>
    typeof window !== "undefined" ? readRememberEmailPref() : true,
  );

  const mainScrollRef = useRef(null);

  useLayoutEffect(() => {
    scrollToPageTop({ root: mainScrollRef.current });
  }, [nav]);

  useEffect(() => {
    if (overlay !== "signin") setDemoAuthPasswordVisible(false);
  }, [overlay]);

  useEffect(() => {
    if (pathname === "/settings") setNav("settings");
    else if (pathname === "/profile") setNav("profile");
    else if (pathname === "/community") setNav("community");
  }, [pathname]);

  useEffect(() => {
    const tab = String(searchParams.get("nav") || "").trim().toLowerCase();
    const allowed = new Set(["home", "community", "trusted", "profile", "contact", "sponsors"]);
    if (allowed.has(tab)) setNav(tab);
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
    deleteAccount,
    refreshWorkOSProfile,
    entitlements,
  } = useProfileData();
  const { loading: authLoading } = useAuthSession();
  const hostedAuth = shouldUseHostedWorkOSAuth(authBackend);
  const { openProfileEdit } = useProfileEdit();

  const profileCompletion = useMemo(() => {
    if (!isAuthenticated) return null;
    return computeProfileCompletion(profile, {
      workOSUser:
        sessionKind === "workos"
          ? { email: workOSAccountEmail || undefined, firstName: profile.firstName, lastName: profile.lastName }
          : null,
    });
  }, [isAuthenticated, profile, sessionKind, workOSAccountEmail]);

  const hasProAccess = useMemo(
    () =>
      !!(
        entitlements?.fullPlatformAccess ||
        entitlements?.communityViewAccess ||
        entitlements?.isPlatformAdmin ||
        entitlements?.isPrivilegedStaff
      ),
    [entitlements],
  );

  const hasSupportAccess = useMemo(
    () =>
      !!(
        entitlements?.hasActiveMembership ||
        entitlements?.directoryAccess ||
        entitlements?.isPlatformAdmin ||
        entitlements?.isPrivilegedStaff
      ),
    [entitlements],
  );

  const canSaveOrganizations = useMemo(
    () =>
      !!(
        entitlements?.saveOrganizationsAccess ||
        entitlements?.isPlatformAdmin ||
        entitlements?.isPrivilegedStaff
      ),
    [entitlements],
  );

  function openProUpgradeModal(hint = "") {
    if (!isAuthenticated) {
      openSignInOverlay();
      return;
    }
    setProGateHint(String(hint || "generic").trim() || "generic");
  }

  function goToProUpgrade() {
    openProUpgradeModal("generic");
  }

  const showTopAppProGate = useMemo(
    () =>
      pathname === "/" &&
      isAuthenticated &&
      !hasProAccess &&
      TOP_APP_PRO_NAV_KEYS.has(nav),
    [pathname, isAuthenticated, hasProAccess, nav],
  );

  const topAppProGateCopy = useMemo(() => {
    if (showTopAppProGate) return getProUpgradeGateContentForNav(nav);
    if (proGateHint) return getProUpgradeGateContentForNav(proGateHint);
    return null;
  }, [showTopAppProGate, nav, proGateHint]);

  function goToSupportUpgrade() {
    router.push(isCapacitorNative() ? "/mobile/access" : "/access");
  }

  const showMembershipOnProfile = useMemo(
    () =>
      shouldShowMembershipPickerOnProfile({
        isAuthenticated,
        profile,
        tierKey: profile.membershipStatus,
        billingStatus: profile.membershipBillingStatus,
      }),
    [isAuthenticated, profile],
  );
  const showMembershipModal = useMemo(
    () => shouldShowMembershipPickerModal({ isAuthenticated, profile, sessionKind }),
    [isAuthenticated, profile, sessionKind],
  );

  useEffect(() => {
    if (!showMembershipModal || loadingProfile) return;
    setOverlay((current) => {
      if (current === "signin" || current === "membership") return current;
      return "membership";
    });
  }, [showMembershipModal, loadingProfile]);

  useEffect(() => {
    const c = searchParams.get("checkout");
    const pm = searchParams.get("payment_method");
    const mobileReturn = searchParams.get("mobileReturn");
    const billingRefresh =
      (c === "success" ||
        c === "cancel" ||
        pm === "success" ||
        pm === "cancel" ||
        mobileReturn === "account") &&
      sessionKind === "workos";
    if (!billingRefresh) return;
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

  const postAuthMembershipPath = isCapacitorNative() ? "/mobile/access" : "/access";

  const workosSignUpModalHref = useMemo(
    () => workosSignUpHref(postAuthMembershipPath, { rememberDevice, loginHint: authDraft.email }),
    [postAuthMembershipPath, rememberDevice, authDraft.email],
  );

  function persistAuthPrefsBeforeWorkOSRedirect() {
    writeRememberDevicePref(rememberDevice);
    writeRememberEmailPref(rememberEmail);
    if (!rememberEmail) clearLastUsedEmail();
    else if (String(authDraft.email || "").trim()) writeLastUsedEmail(authDraft.email.trim());
  }

  const { filters, setFilters, results, status, meta, page, canGoNext, runSearch, clearSearch } = useDirectorySearch(sb, {
    preferredState: profile.state,
  });
  const { trusted, trustedStatus, loadTrusted } = useTrustedResources(sb);

  /** Auto-fetch roster when the in-shell Trusted tab opens (footer dock, ?nav=trusted, home CTA). */
  useEffect(() => {
    if (nav !== "trusted") return;
    void loadTrusted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when tab activates only
  }, [nav]);

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
    markPendingProfileEdit({});
    router.push("/profile?edit=1");
  }

  function dockNavHome() {
    if (isCapacitorNative() && pathname === "/") {
      setNav("home");
      return;
    }
    if (pathname && pathname !== "/") router.push("/");
    else setNav("home");
  }

  function dockNavPodcast() {
    if (!hasSupportAccess) {
      if (!isAuthenticated) {
        openSignInOverlay();
        return;
      }
      goToSupportUpgrade();
      return;
    }
    if (pathname !== "/podcasts" && !pathname.startsWith("/podcasts/")) {
      router.push("/podcasts");
    }
  }

  function dockNavProfile() {
    if (isCapacitorNative() && pathname === "/") {
      setNav("profile");
      return;
    }
    if (pathname !== "/profile") router.push("/profile");
    else setNav("profile");
  }

  function dockNavCommunity() {
    if (isCapacitorNative()) {
      if (pathname === "/") {
        setNav("community");
        return;
      }
      router.replace("/?nav=community");
      return;
    }
    if (pathname === "/") {
      setNav("community");
      return;
    }
    if (pathname !== "/community") {
      router.push("/community");
      return;
    }
    setNav("community");
  }

  function scrollAppToTop() {
    scrollToPageTop({ root: mainScrollRef.current });
  }

  function dockNavItem(item) {
    const key = String(item?.key || "");
    if (["community", "trusted", "settings"].includes(key) && !hasProAccess) {
      if (!isAuthenticated) {
        openSignInOverlay();
        return;
      }
    }
    if (key === "home") {
      dockNavHome();
      return;
    }
    if (key === "profile") {
      dockNavProfile();
      return;
    }
    if (key === "community") {
      dockNavCommunity();
      return;
    }
    if (key === "podcast") {
      dockNavPodcast();
      return;
    }
    if (pathname === "/" && SITE_TOP_APP_DOCK_TAB_KEYS.has(key)) {
      setNav(key);
      return;
    }
    const href = String(item?.href || "/").trim() || "/";
    if (pathname !== href) router.push(href);
    else if (SITE_TOP_APP_DOCK_TAB_KEYS.has(key)) setNav(key);
  }

  function hamburgerNavItem(item) {
    const key = String(item?.key || "");
    const href = String(item?.href || "").trim() || "/";
    if (["community", "trusted", "contact", "settings"].includes(key) && !hasProAccess) {
      if (!isAuthenticated) {
        openSignInOverlay();
        return;
      }
    }
    if (key === "sponsors") {
      goToSponsorsHub();
      return;
    }
    if (key === "home") {
      dockNavHome();
      return;
    }
    if (key === "podcast") {
      dockNavPodcast();
      return;
    }
    if (key === "profile") {
      dockNavProfile();
      return;
    }
    if (key === "community") {
      dockNavCommunity();
      return;
    }
    if (key === "settings") {
      if (pathname === "/") setNav("settings");
      else if (pathname !== "/settings") router.push("/settings");
      return;
    }
    if (pathname === "/" && SITE_TOP_APP_DOCK_TAB_KEYS.has(key)) {
      setNav(key);
      return;
    }
    if (pathname !== href) router.push(href);
    else if (SITE_TOP_APP_DOCK_TAB_KEYS.has(key)) setNav(key);
  }

  function handleHamburgerNav(item) {
    hamburgerNavItem(item);
    scrollAppToTop();
  }

  function handleDockNav(item) {
    dockNavItem(item);
    scrollAppToTop();
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
    if (requiresExternalWebAccountFlow()) {
      void openWebSponsorMembership();
      return;
    }
    router.push("/sponsors");
  }

  function openMembershipJourney() {
    if (requiresExternalWebAccountFlow()) {
      if (!isAuthenticated) {
        void openWebSignup();
        return;
      }
      void openWebMembership();
      return;
    }
    if (!isAuthenticated) {
      if (hostedAuth) {
        writeRememberDevicePref(rememberDevice);
        window.location.assign(workosSignUpHref(postAuthMembershipPath, { rememberDevice }));
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
    setOverlay(sessionKind === "workos" ? "upgrade" : "membership");
  }

  async function startMembershipCheckoutFromHome(tier) {
    if (requiresExternalWebAccountFlow()) {
      if (!isAuthenticated) {
        void openWebSignup();
        return;
      }
      if (tier === "sponsor") {
        void openWebSponsorMembership();
        return;
      }
      void openWebMembership({ tier });
      return;
    }
    if (!isAuthenticated) {
      openMembershipJourney();
      return;
    }
    if (sessionKind === "workos" && !profile?.onboardingCompleted) {
      router.push("/onboarding");
      return;
    }
    if (tier === "sponsor") {
      router.push("/sponsors?apply=1");
      return;
    }
    if (sessionKind !== "workos" || !authBackend?.stripe) {
      setNav("profile");
      return;
    }
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, returnPath: "/" }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.error === "use_billing_portal") {
        setNav("profile");
        return;
      }
    } catch {
      /* fall through */
    }
    setNav("profile");
  }

  function openCommunity() {
    if (!isAuthenticated) {
      openSignInOverlay();
      return;
    }
    dockNavCommunity();
  }
  const fallbackSavedOrganizations = useMemo(() => {
    const byEin = new Map([...results, ...trusted].map((r) => [String(rowEin(r)), r]));
    return favoriteEins.map((ein) => byEin.get(String(ein)) || { ein, orgName: "Saved organization", city: "", state: "" });
  }, [favoriteEins, results, trusted]);
  const savedOrgsToRender = useMemo(() => {
    if (!favoriteEins.length) return [];
    const byEin = new Map();
    for (const raw of fallbackSavedOrganizations) {
      const card = mapNonprofitCardRow(raw, "directory");
      const key = card.einNormalized || normalizeEinDigits(card.ein);
      if (key.length === 9) byEin.set(key, card);
    }
    for (const card of savedOrganizations) {
      const key = card.einNormalized || normalizeEinDigits(card.ein);
      if (key.length === 9) byEin.set(key, card);
    }
    return favoriteEins
      .map((ein) => {
        const key = normalizeEinDigits(ein);
        if (key.length !== 9) return null;
        return (
          byEin.get(key) ||
          mapNonprofitCardRow({ ein: key, orgName: "Saved organization", city: "", state: "" }, "directory")
        );
      })
      .filter(Boolean);
  }, [savedOrganizations, fallbackSavedOrganizations, favoriteEins]);
  const favoriteEinSet = useMemo(
    () => new Set((favoriteEins || []).map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9)),
    [favoriteEins]
  );
  const favoriteEntitySet = useMemo(
    () => new Set((favoriteEntityKeys || []).map((k) => String(k || "").trim().toLowerCase()).filter(Boolean)),
    [favoriteEntityKeys],
  );

  function buildWorkOSGoPath(returnPathOverride, mode = "signin") {
    const defaultReturn = isCapacitorNative()
      ? mode === "signup"
        ? "/mobile/access"
        : MOBILE_POST_AUTH_COMPLETE_PATH
      : mode === "signup"
        ? "/access"
        : "/";
    const returnPath =
      returnPathOverride ||
      workosReturnPathFromRouter(pathname, searchParams) ||
      defaultReturn;
    return workosGoUrl({
      mode: mode === "signup" ? "signup" : "signin",
      returnTo: returnPath,
      rememberDevice,
      loginHint: authDraft.email,
      native: isCapacitorNative(),
    });
  }

  async function startWorkOSSignIn(returnPathOverride) {
    writeRememberDevicePref(rememberDevice);
    const defaultReturn = isCapacitorNative() ? MOBILE_POST_AUTH_COMPLETE_PATH : "/";
    const returnPath =
      returnPathOverride ||
      workosReturnPathFromRouter(pathname, searchParams) ||
      defaultReturn;
    if (requiresExternalWebAccountFlow()) {
      void openWebLogin({
        returnPath,
        rememberDevice,
        loginHint: authDraft.email,
      });
      return;
    }
    persistAuthPrefsBeforeWorkOSRedirect();
    if (isCapacitorNative()) {
      await launchWorkOSAuth(buildWorkOSGoPath(returnPath, "signin"));
      return;
    }
    window.location.assign(buildWorkOSGoPath(returnPath, "signin"));
  }

  function openSignInOverlay() {
    if (hostedAuth) {
      startWorkOSSignIn();
      return;
    }
    setAuthMode("signin");
    setOverlay("signin");
  }

  function openCreateAccountFlow() {
    if (requiresExternalWebAccountFlow() && hostedAuth) {
      writeRememberDevicePref(rememberDevice);
      void openWebSignup();
      return;
    }
    if (hostedAuth) {
      writeRememberDevicePref(rememberDevice);
      if (isCapacitorNative()) {
        void launchWorkOSAuth(buildWorkOSGoPath(postAuthMembershipPath, "signup"));
        return;
      }
      window.location.assign(workosSignUpModalHref);
      return;
    }
    setAuthMode("signup");
    setOverlay("signin");
  }

  useEffect(() => {
    if (searchParams.get("signin") !== "1" || signinQueryHandledRef.current) return;
    if (loadingProfile || authLoading) return;
    signinQueryHandledRef.current = true;
    if (hostedAuth) {
      if (searchParams.get("signup") === "1") {
        void openCreateAccountFlow();
      } else {
        void startWorkOSSignIn();
      }
      return;
    }
    setAuthMode(searchParams.get("signup") === "1" ? "signup" : "signin");
    setOverlay("signin");
    // Handlers are stable within render; ref prevents duplicate launches.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signinQueryHandledRef
  }, [searchParams, hostedAuth, loadingProfile, authLoading]);

  async function completeInitialMembershipChoice(tierKey = "none") {
    const normalizedTier = String(tierKey || "none").toLowerCase();
    if (sessionKind === "workos") {
      try {
        const res = await fetch("/api/me/onboarding/complete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountIntent:
              normalizedTier === "sponsor"
                ? "sponsor_user"
                : normalizedTier === "member"
                  ? "member_user"
                  : normalizedTier === "support"
                    ? "support_user"
                    : "free_user",
          }),
        });
        if (res.ok) await refreshWorkOSProfile();
      } catch {
        /* modal can be reopened */
      }
      return;
    }
    await persistProfile({
      ...profile,
      membershipStatus: normalizedTier === "none" ? "none" : normalizedTier,
      membershipTier: normalizedTier === "none" ? "none" : normalizedTier,
      membershipBillingStatus: "none",
      onboardingCompleted: true,
    });
  }

  async function dismissMembershipModalAsFree() {
    await completeInitialMembershipChoice("none");
    setOverlay(null);
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
    if (!hostedAuth) {
      writeRememberEmailPref(rememberEmail);
      if (rememberEmail && String(authDraft.email || "").trim()) writeLastUsedEmail(authDraft.email.trim());
      else clearLastUsedEmail();
    }
    setAuthStatus(authMode === "signup" ? "Account created. Welcome in." : "Signed in successfully.");
    setAuthDraft((d) => ({ ...d, password: "" }));
    setSignupAvatarDataUrl("");
    setOverlay("membership");
  }

  function openSignInForMembership() {
    if (hostedAuth) {
      startWorkOSSignIn("/profile");
      return;
    }
    setAuthMode("signin");
    setOverlay("signin");
  }

  const pageAtmosphere = useMemo(() => resolvePageAtmosphere(pathname, nav), [pathname, nav]);
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
    const subject = encodeURIComponent(`Contact Request â€” ${contactDraft.firstName} ${contactDraft.lastName}`);
    const body = encodeURIComponent(
      `Name: ${contactDraft.firstName} ${contactDraft.lastName}\nEmail: ${contactDraft.email}\nPhone: ${contactDraft.phone || "Not provided"}\n\nMessage:\n${contactDraft.message}`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setContactStatus("Your email draft is ready to send.");
  }

  return (
    <main
      ref={mainScrollRef}
      className={`topApp theme-${profile.theme}${immersiveHeaderScroll ? " header-at-top" : ""} ${isLoggedIn ? "topApp--auth-in" : "topApp--auth-out"} appShell--withMobileNavDock`}
      data-page-atmosphere={pageAtmosphere}
    >
      <div className="appSiteHeader">
        <AppHeaderBrand pageAtmosphere={pageAtmosphere} />
        <header className="topbar">
          <HeaderInner className="topbarInner">
            <div className="topbarZone topbarLeft">
              <div className="topbarActionsCluster topbarActionsCluster--start">
                <SiteHamburgerNavMenu
                  shellClass="siteMobileNavMore--phoneOnly"
                  onItemClick={handleHamburgerNav}
                />
                {isMobileShell && pageAtmosphere !== "podcast" ? <ColorSchemeToggle /> : null}
                {isMobileShell && isLoggedIn ? <AdminConsoleLink /> : null}
              </div>
            </div>
            <div className="topbarZone topbarCenter" aria-hidden="true" />
            <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              <SiteHamburgerNavMenu
                shellClass="siteMobileNavMore--desktopOnly"
                align="end"
                onItemClick={handleHamburgerNav}
              />
              {pageAtmosphere === "home" ? <DownloadMobileAppButton /> : null}
              {!isMobileShell && pageAtmosphere !== "podcast" ? <ColorSchemeToggle /> : null}
              {isLoggedIn ? (
                <>
                  {!isMobileShell ? <AdminConsoleLink /> : null}
                  <HeaderNotificationBell skipSessionGate />
                  <HeaderAccountMenu
                    avatarSrc={profile.avatarUrl || emptyProfileAvatarUrl()}
                    displayName={fullName}
                    email={profile.email || workOSAccountEmail}
                    membershipHint={membershipAccountMenuHint({
                      isAuthenticated: isLoggedIn,
                      tierKey: profile.membershipStatus,
                      billingStatus: profile.membershipBillingStatus,
                    })}
                    ariaLabel={`Account menu for ${fullName || profile.email || workOSAccountEmail || "signed-in user"}`}
                    onProfile={() => {
                      if (pathname !== "/profile") router.push("/profile");
                      else setNav("profile");
                    }}
                    onSettings={() => router.push("/settings")}
                    onMembership={() => {
                      if (pathname !== "/profile") router.push("/profile");
                      else setNav("profile");
                    }}
                    onSavedItems={() => setNav("profile")}
                    onSignOut={signOut}
                  />
                </>
              ) : hostedAuth ? (
                <>
                  <button className="btnSoft sponsorBtn" type="button" onClick={openCreateAccountFlow}>
                    <AppIcon name="profile" />
                    Create account
                  </button>
                  <button className="btnSoft sponsorBtn" type="button" onClick={openSignInOverlay}>
                    <AppIcon name="profile" />
                    Sign in
                  </button>
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
      </div>
      <div className="topbarOcclusion" aria-hidden="true" />

      {(nav === "home" || nav === "community") && (
        <section className={nav === "home" ? "shell shell--home" : "shell"}>
          {nav === "home" && (
            <HomeScreen
              isAuthenticated={isAuthenticated}
              onActivateMembership={openMembershipJourney}
              onCreateAccount={openCreateAccountFlow}
              onSignIn={openSignInOverlay}
              onSponsors={goToSponsorsHub}
              onTrusted={() => {
                if (!isAuthenticated) {
                  openSignInOverlay();
                  return;
                }
                if (pathname === "/") {
                  setNav("trusted");
                  return;
                }
                router.push("/trusted");
              }}
              onCommunity={openCommunity}
              onPodcasts={() => {
                if (!hasSupportAccess) {
                  if (!isAuthenticated) {
                    openSignInOverlay();
                    return;
                  }
                  goToSupportUpgrade();
                  return;
                }
                router.push("/podcasts");
              }}
              onProUpgrade={openProUpgradeModal}
              onSupportUpgrade={goToSupportUpgrade}
              hasProAccess={hasProAccess}
              hasSupportAccess={hasSupportAccess}
              canSaveOrganizations={canSaveOrganizations}
              directoryProps={{
                filters,
                setFilters,
                results,
                status,
                meta,
                page,
                canGoNext,
                runSearch,
                clearSearch,
              }}
              favoriteEinSet={favoriteEinSet}
              onToggleFavorite={toggleFavoriteEin}
              onRequestSignIn={!isAuthenticated ? openSignInOverlay : undefined}
            />
          )}

          {nav === "community" && hasProAccess ? (
            <CommunityPage
              supabase={sb}
              userId={userId}
              sessionKind={sessionKind}
              isAuthenticated={isAuthenticated}
              authLoading={loadingProfile}
              authBackend={authBackend}
              canCreatePost={!!entitlements?.communityPostCreate}
              isPlatformAdmin={!!entitlements?.isPlatformAdmin}
              profile={profile}
              onRequestSignIn={() => {
                if (hostedAuth) {
                  startWorkOSSignIn("/community");
                  return;
                }
                setAuthMode("signin");
                setOverlay("signin");
              }}
            />
          ) : null}
          {nav === "community" ? <MissionPageTopStrip placement="bottom" /> : null}
        </section>
      )}

      {nav === "trusted" && hasProAccess ? (
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
                    favoritesEnabled={isAuthenticated && canSaveOrganizations}
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
      ) : null}

      {nav === "profile" && (
        <section className="shell profileTabShell">
          {loadingProfile && !isAuthenticated ? (
            <div className="card profileSessionRestoring">
              <p className="sponsorSectionLead" style={{ margin: 0 }}>
                Loading your profileâ€¦
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
                      if (hostedAuth) {
                        startWorkOSSignIn("/profile");
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
                    onClick={openCreateAccountFlow}
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
                stripeMemberMissingEnv={authBackend?.stripeMemberRecurringMissingEnv || []}
                checkoutReturnPath="/profile"
                membershipBillingStatus={profile.membershipBillingStatus}
                stripeCustomerReady={!!profile.stripeCustomerIdSet}
                stripeSubscriptionReady={!!profile.stripeSubscriptionIdSet}
                stripePortalReady={!!authBackend?.stripePortal}
              />
            </>
          ) : (
            <>
          <ProfileHeader
            avatarSrc={profile.avatarUrl || emptyProfileAvatarUrl()}
            fullName={fullName || "Supporter"}
            email={profile.email || workOSAccountEmail}
            bio={profile.banner}
            missionStatement={profile.missionStatement}
            identityRole={profile.identityRole}
            membershipLabel={membership.label}
            membershipTierKey={profile.membershipStatus}
            isMember={isMember}
            onEdit={() => openProfileEdit()}
          />
          <MembershipBillingCenter
            isAuthenticated={isAuthenticated}
            currentTierKey={profile.membershipStatus}
            onRequestSignIn={openSignInForMembership}
            sessionKind={sessionKind}
            stripeMemberReady={!!authBackend?.stripe}
            stripePortalReady={!!authBackend?.stripePortal}
            checkoutReturnPath="/profile"
            membershipBillingStatus={profile.membershipBillingStatus}
            stripeCustomerReady={!!profile.stripeCustomerIdSet}
            stripeSubscriptionReady={!!profile.stripeSubscriptionIdSet}
            onCheckoutNavigate={() => refreshWorkOSProfile()}
            collapsible
            defaultExpanded={false}
          />
          {canSaveOrganizations ? (
            <SavedOrganizationsList
              organizations={savedOrgsToRender}
              savedEinCount={favoriteEins.length}
              onToggleFavorite={toggleFavoriteEin}
            />
          ) : null}
          {showMembershipOnProfile ? (
            <HomeMembershipSection
              variant="profile"
              isAuthenticated={isAuthenticated}
              loadingAccount={loadingProfile}
              currentTierKey={profile.membershipStatus}
              accountEmail={profile.email || workOSAccountEmail}
              membershipLabel={membership.label}
              membershipBillingStatus={profile.membershipBillingStatus}
              onRequestSignIn={openSignInForMembership}
              onJoinFree={() => setNav("profile")}
              onUpgradeTier={startMembershipCheckoutFromHome}
            />
          ) : null}
          <ProfileCompletionPanel
            completion={profileCompletion}
            profile={profile}
            onEditProfile={() => openProfileEdit()}
            onEditProfileFocus={(key) => openProfileEdit(key)}
            onOpenOnboarding={openOnboardingFlow}
            onOpenMembership={openMembershipJourney}
          />

          <ProfileIdentitySection
            profile={profile}
            onEdit={() => openProfileEdit()}
            savedCount={canSaveOrganizations ? favoriteEins.length : 0}
            showSavedCount={canSaveOrganizations}
          />

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
            profileSource={profileSource}
            manageBillingSlot={
              sessionKind === "workos" ? (
                <ManageBillingButton
                  stripeReady={!!authBackend?.stripePortal}
                  hasStripeCustomer={!!profile.stripeCustomerIdSet}
                  hasStripeSubscription={!!profile.stripeSubscriptionIdSet}
                  returnPath="/profile"
                />
              ) : null
            }
          />
          {!isMember && !showMembershipOnProfile ? (
            <div className="card">
              <h3>Upgrade to Pro</h3>
              <p className="sponsorSectionLead">{membership.hint}</p>
              <div className="row wrap">
                <button type="button" className="btnPrimary" onClick={() => {
                  if (requiresExternalWebAccountFlow()) {
                    void openWebMembership();
                    return;
                  }
                  setOverlay("upgrade");
                }}>
                  View membership options
                </button>
                {hostedAuth && !requiresExternalWebAccountFlow() ? (
                  <a className="btnSoft" href="/onboarding">
                    Open membership onboarding
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
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

      {nav === "settings" && isAuthenticated && hasProAccess ? (
        <AccountSettingsPage
          profile={profile}
          workOSAccountEmail={workOSAccountEmail}
          membership={membership}
          sessionKind={sessionKind}
          authBackend={authBackend}
          persistProfile={persistProfile}
          onOpenEditProfile={() => openProfileEdit()}
          setMembershipStatus={setMembershipStatus}
          openSignInForMembership={openSignInForMembership}
          favoriteEins={favoriteEins}
          deleteAccount={deleteAccount}
        />
      ) : null}

      {nav === "settings" && !isAuthenticated ? (
        <section className="shell profileTabShell">
          <div className="card">
            <h3>Settings</h3>
            <p className="sponsorSectionLead">Sign in to manage your account, membership, and billing.</p>
            <button type="button" className="btnPrimary" onClick={openSignInOverlay}>
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
            <a className="btnPrimary" href="/contact">
              Email The Team
            </a>
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
          <Link className="adminUtilityEntryLink" href={adminConsoleHref()}>
            Admin Console
          </Link>
        </div>
      ) : null}

      {/* Fixed bottom navigation bar (dock). See top-app.css .footerDock / .footerDockBackdrop. */}
      <CapacitorFooterPortal>
        <div className="footerDockBackdrop" aria-hidden="true" />
        <div className="footerDock">
          <FooterInner className="footerNavInner">
            <nav className="bottomNav bottomNav--withIcons bottomNav--mobileDock" aria-label="Bottom navigation">
              {SITE_MOBILE_DOCK_ITEMS.map((item) => {
                const isActive = isSiteDockNavActive(item.key, { nav, pathname });
                return (
                  <button
                    key={item.key}
                    type="button"
                    data-nav-key={item.key}
                    className={`navItem navItem--dockCol navItem--dockPrimary ${isActive ? "isActive" : ""}`}
                    onClick={() => handleDockNav(item)}
                    title={item.linkTitle || item.label}
                  >
                    <SiteBottomNavGlyph navKey={item.key} className="navItemGlyph" />
                    <span className="navItemLabel">{item.label}</span>
                  </button>
                );
              })}
            </nav>
        </FooterInner>
      </div>
      </CapacitorFooterPortal>

      {overlay === "membership" && (
        <MembershipPlansModal
          open
          onClose={() => void dismissMembershipModalAsFree()}
          isAuthenticated={isAuthenticated}
          loadingAccount={loadingProfile}
          currentTierKey={profile.membershipStatus}
          accountEmail={profile.email || workOSAccountEmail}
          membershipLabel={membership.label}
          membershipBillingStatus={profile.membershipBillingStatus}
          onRequestSignIn={openSignInForMembership}
          onJoinFree={() => void dismissMembershipModalAsFree()}
          onUpgradeTier={async (tier) => {
            await completeInitialMembershipChoice(tier === "sponsor" ? "sponsor" : tier);
            setOverlay(null);
            await startMembershipCheckoutFromHome(tier);
          }}
          onGoToProfile={() => {
            setOverlay(null);
            setNav("profile");
          }}
        />
      )}

      {overlay === "upgrade" && (
        <div className="modalOverlay" onClick={() => setOverlay(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Membership &amp; billing</h3>
            <p>
              Pro Membership ({PRO_MEMBERSHIP_PRICE_LABEL}) unlocks saved organizations, profile sync, and community. {SUPPORT_MEMBERSHIP_DISPLAY_NAME} ({SUPPORT_MEMBERSHIP_PRICE_LABEL}) includes the nonprofit directory and podcast hub.
              participation. Use the Membership card above for Stripe checkout, or open onboarding for the full setup flow.
            </p>
            <div className="row wrap">
              <button className="btnSoft" onClick={() => setOverlay(null)} type="button">
                Not now
              </button>
              {hostedAuth ? (
                <button className="btnPrimary" type="button" onClick={() => {
                  setOverlay(null);
                  if (requiresExternalWebAccountFlow()) {
                    void openWebMembership();
                    return;
                  }
                  router.push("/onboarding");
                }}>
                  {requiresExternalWebAccountFlow() ? "Continue on web" : "Open membership onboarding"}
                </button>
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


      {overlay === "signin" && (
        <div className="modalOverlay" onClick={() => setOverlay(null)}>
          <div className="modalCard demoAuthModal" onClick={(e) => e.stopPropagation()}>
            <h3>{authMode === "signup" ? "Create account" : "Sign in"}</h3>
            <p className="demoAuthModal__lede">
              {hostedAuth
                ? authMode === "signup"
                  ? "Create your account with WorkOS (email or Google, depending on what your administrator enabled)."
                  : "Sign in securely with WorkOS. Password reset and additional providers are managed in the hosted auth experience."
                : authMode === "signup"
                  ? "Start with a simple local demo account. Production sign-in is not connected yet."
                  : "Demo sign-in uses email and password stored on this device only."}
            </p>
            {hostedAuth ? (
              <div className="demoAuthModal__providers">
                <p className="demoAuthModal__providersLabel">WorkOS (production / demo users)</p>
                <p className="profilePhotoUploadHint" style={{ marginTop: 0 }}>
                  Optional: add your email to prefill the hosted sign-in screen.
                </p>
                <p className="profilePhotoUploadHint" style={{ marginTop: 0 }}>
                  On localhost, use the same WorkOS Client ID as production and register this originâ€™s callback in the WorkOS
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
                  {isCapacitorNative() ? (
                    <>
                      <button
                        className="btnPrimary"
                        type="button"
                        onClick={() => {
                          persistAuthPrefsBeforeWorkOSRedirect();
                          void startWorkOSSignIn();
                        }}
                      >
                        Sign in
                      </button>
                      <button
                        className="btnSoft"
                        type="button"
                        onClick={() => {
                          persistAuthPrefsBeforeWorkOSRedirect();
                          void openCreateAccountFlow();
                        }}
                      >
                        Create account
                      </button>
                      <button
                        className="btnSoft"
                        type="button"
                        onClick={() => {
                          persistAuthPrefsBeforeWorkOSRedirect();
                          void startWorkOSSignIn();
                        }}
                      >
                        Continue with Google
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        className="btnPrimary"
                        href={workosSignInHereHref}
                        onClick={() => persistAuthPrefsBeforeWorkOSRedirect()}
                      >
                        Sign in
                      </a>
                      <button
                        className="btnSoft"
                        type="button"
                        onClick={() => {
                          persistAuthPrefsBeforeWorkOSRedirect();
                          void openCreateAccountFlow();
                        }}
                      >
                        Create account
                      </button>
                      <a
                        className="btnSoft"
                        href={workosSignInHereHref}
                        onClick={() => persistAuthPrefsBeforeWorkOSRedirect()}
                      >
                        Continue with Google
                      </a>
                    </>
                  )}
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
                    If this box stays empty, open <code className="mono">GET /api/auth/status</code> â€” it lists{" "}
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
                if (!hostedAuth) void onAuthSubmit();
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
                  <label className="demoAuthModal__field" htmlFor="top-demo-auth-given">
                    <span className="fieldLabel">First name</span>
                    <input
                      id="top-demo-auth-given"
                      name="given-name"
                      value={authDraft.firstName}
                      onChange={(e) => setAuthDraft((d) => ({ ...d, firstName: e.target.value }))}
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="demoAuthModal__field" htmlFor="top-demo-auth-family">
                    <span className="fieldLabel">Last name</span>
                    <input
                      id="top-demo-auth-family"
                      name="family-name"
                      value={authDraft.lastName}
                      onChange={(e) => setAuthDraft((d) => ({ ...d, lastName: e.target.value }))}
                      placeholder="Last name"
                      autoComplete="family-name"
                    />
                  </label>
                </>
              ) : null}
              <label className="demoAuthModal__field" htmlFor="top-demo-auth-email">
                <span className="fieldLabel">Email</span>
                <input
                  name="email"
                  id="top-demo-auth-email"
                  value={authDraft.email}
                  onChange={(e) => setAuthDraft((d) => ({ ...d, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                />
              </label>
              {!hostedAuth ? (
                <label className="demoAuthModal__field" htmlFor="top-demo-auth-password">
                  <span className="fieldLabel">Password</span>
                  <div className="demoAuthModal__passwordWrap">
                    <input
                      id="top-demo-auth-password"
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
              {!hostedAuth ? (
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
              {!hostedAuth ? (
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
                {!hostedAuth ? (
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

      {topAppProGateCopy && (showTopAppProGate || proGateHint) ? (
        <ProUpgradeModal
          open
          title={topAppProGateCopy.title}
          message={topAppProGateCopy.message}
          feature={topAppProGateCopy.feature}
          onBack={() => {
            setProGateHint("");
            if (showTopAppProGate) setNav("home");
          }}
        />
      ) : null}

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
      <p style={{ padding: 24 }}>Loadingâ€¦</p>
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
