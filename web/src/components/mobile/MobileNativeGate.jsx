"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { hasMobileAppAccess } from "@/lib/membership/appAccess";
import {
  isMembershipExemptPath,
  MOBILE_MEMBERSHIP_PAYWALL_PATH,
  requiresActiveMembershipPath,
} from "@/lib/membership/protectedRoutes";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { isOAuthInProgress } from "@/lib/auth/oauthInProgress";
import { isInMobileOAuthResumeGrace } from "@/lib/auth/mobileOAuthReturn";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

const PROFILE_PENDING_MAX_MS = 8_000;

const MOBILE_GATE_ALLOW = [
  /^\/$/,
  /^\/profile(\/|$)/,
  /^\/settings(\/|$)/,
  /^\/community(\/|$)/,
  /^\/trusted(\/|$)/,
  /^\/podcasts(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/sponsors(\/|$)/,
  /^\/sponsor(\/|$)/,
  /^\/nonprofit(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/membership(\/|$)/,
  /^\/billing(\/|$)/,
  /^\/contact(\/|$)/,
  /^\/mobile(\/|$)/,
  /^\/access(\/|$)/,
  /^\/mobile\/access(\/|$)/,
  /^\/mobile\/auth(\/|$)/,
  /^\/callback(\/|$)/,
  /^\/sign-in(\/|$)/,
  /^\/sign-up(\/|$)/,
  /^\/login(\/|$)/,
  /^\/auth\/sign-in(\/|$)/,
  /^\/auth\/sign-up(\/|$)/,
  /^\/auth\/workos-continue(\/|$)/,
  /^\/auth\/workos-handoff(\/|$)/,
  /^\/auth\/workos-go(\/|$)/,
  /^\/auth\/workos-browser-start(\/|$)/,
  /^\/auth\/workos-native-browser(\/|$)/,
  /^\/api\/auth\//,
  /^\/privacy(\/|$)/,
  /^\/terms(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/admin-login(\/|$)/,
];

const NATIVE_LOGIN_ALIASES = {
  "/login": "/sign-in",
};

function isAllowedPath(pathname) {
  return MOBILE_GATE_ALLOW.some((re) => re.test(pathname || "/"));
}

function accessOpts(entitlements) {
  return {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  };
}

/** @returns {"granted" | "denied" | "pending"} */
function resolveNativeAppAccess({
  loadingProfile,
  profile,
  opts,
  isAuthenticated,
  sessionHint,
  profilePendingTimedOut,
}) {
  if (opts.isPlatformAdmin || opts.isPrivilegedStaff) return "granted";
  if (hasMobileAppAccess(profile, opts)) return "granted";
  const signedIn = isAuthenticated || sessionHint;
  if (signedIn && loadingProfile && !profilePendingTimedOut) return "pending";
  return "denied";
}

/**
 * Signed-in users without membership always land on the mobile paywall (no free onboarding bypass).
 */
function nativeMembershipPath() {
  return MOBILE_MEMBERSHIP_PAYWALL_PATH;
}

/**
 * Capacitor-only router: paywall for signed-in users without App Access; hide store download page.
 * Native app loads from `/` (TopApp) — guests are not forced to `/mobile`.
 */
export default function MobileNativeGate() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navQuery = searchParams?.get("nav") ?? "";
  const { isAuthenticated, loadingProfile, profile, entitlements } = useProfileData();
  const { loading: authLoading } = useAuthSession();
  const lastRedirectRef = useRef("");
  const [profilePendingTimedOut, setProfilePendingTimedOut] = useState(false);

  const opts = accessOpts(entitlements);
  const sessionHint = !!readNavAuthCache()?.authenticated;
  const guest = !isAuthenticated && !sessionHint;
  const oauthBusy = isOAuthInProgress();

  useEffect(() => {
    if (!isCapacitorNative()) return undefined;
    if (!loadingProfile || guest) {
      setProfilePendingTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setProfilePendingTimedOut(true), PROFILE_PENDING_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [loadingProfile, guest]);

  useEffect(() => {
    if (!isCapacitorNative()) return;
    if (oauthBusy || isInMobileOAuthResumeGrace()) return;

    const path = pathname || "/";
    const membershipTarget = nativeMembershipPath();

    if (loadingProfile || authLoading) {
      if (!sessionHint) return;
    }

    if (guest && requiresActiveMembershipPath(path) && !isMembershipExemptPath(path)) {
      const target = `/sign-in?returnTo=${encodeURIComponent(path)}`;
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
      return;
    }

    const loginAlias = NATIVE_LOGIN_ALIASES[path];
    if (loginAlias) {
      const qs = searchParams?.toString?.() || "";
      const target = qs ? `${loginAlias}?${qs}` : loginAlias;
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
      return;
    }

    const access = resolveNativeAppAccess({
      loadingProfile,
      profile,
      opts,
      isAuthenticated,
      sessionHint,
      profilePendingTimedOut,
    });

    if (
      !guest &&
      (path === "/sign-in" || path === "/sign-up" || path === "/auth/sign-in" || path === "/auth/sign-up")
    ) {
      if (access === "pending") return;
      const target = access === "denied" ? membershipTarget : "/";
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
      return;
    }

    const goHome = () => {
      const nav = String(navQuery).trim().toLowerCase();
      const onHomeRoute = path === "/" || path === "";
      const onHomeTab = !nav || nav === "home";
      if (onHomeRoute && onHomeTab) return;
      const target = "/";
      if (lastRedirectRef.current === target) return;
      lastRedirectRef.current = target;
      router.replace(target);
    };

    if (path.startsWith("/download")) {
      if (guest) {
        const target = "/sign-in";
        if (lastRedirectRef.current !== target) {
          lastRedirectRef.current = target;
          router.replace(target);
        }
        return;
      }
      if (access === "pending") return;
      if (access === "granted") {
        goHome();
        return;
      }
      const target = membershipTarget;
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
      return;
    }

    if (isAllowedPath(path)) {
      if ((path === "/access" || path === "/mobile/access") && access === "granted") {
        goHome();
        return;
      }
      if (path === "/mobile" && !guest) {
        if (access === "pending") return;
        if (access === "denied") {
          const target = membershipTarget;
          if (lastRedirectRef.current !== target) {
            lastRedirectRef.current = target;
            router.replace(target);
          }
          return;
        }
        if (access === "granted") {
          goHome();
          return;
        }
      }
      if (path === "/" || path === "") {
        // Public home/directory — guests and non-Pro users may stay.
        return;
      }
      if (isMembershipExemptPath(path)) return;
      if (requiresActiveMembershipPath(path) && access === "denied") {
        const target = membershipTarget;
        if (lastRedirectRef.current !== target) {
          lastRedirectRef.current = target;
          router.replace(target);
        }
      }
      return;
    }

    if (guest) return;

    if (access === "pending") return;

    if (access === "denied" && requiresActiveMembershipPath(path)) {
      const target = membershipTarget;
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
    }
  }, [
    pathname,
    navQuery,
    searchParams,
    isAuthenticated,
    loadingProfile,
    authLoading,
    guest,
    sessionHint,
    profilePendingTimedOut,
    opts.isPlatformAdmin,
    opts.isPrivilegedStaff,
    profile?.membershipStatus,
    profile?.membershipBillingStatus,
    profile?.membershipTier,
    profile?.platformRole,
    profile?.email,
    profile?.onboardingCompleted,
    router,
    oauthBusy,
  ]);

  return null;
}
