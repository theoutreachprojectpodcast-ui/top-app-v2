"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { hasMobileAppAccess } from "@/lib/membership/appAccess";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

const MOBILE_GATE_ALLOW = [
  /^\/mobile(\/|$)/,
  /^\/access(\/|$)/,
  /^\/mobile\/access(\/|$)/,
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
  /^\/api\/auth\//,
  /^\/privacy(\/|$)/,
  /^\/terms(\/|$)/,
  /^\/admin(\/|$)/,
];

/** Native app should never sit on marketing / store pages. */
const MOBILE_NATIVE_REDIRECT_HOME = [
  /^\/download(\/|$)/,
  /^\/$/,
];

function isAllowedPath(pathname) {
  return MOBILE_GATE_ALLOW.some((re) => re.test(pathname || "/"));
}

function shouldRedirectToMobileSplash(pathname) {
  return MOBILE_NATIVE_REDIRECT_HOME.some((re) => re.test(pathname || "/"));
}

function accessOpts(entitlements) {
  return {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  };
}

/** @returns {"granted" | "denied" | "pending"} */
function resolveNativeAppAccess({ loadingProfile, profile, opts, isAuthenticated, sessionHint }) {
  const cache = readNavAuthCache();
  if (cache?.hasFreeAccess) return "granted";
  if (opts.isPlatformAdmin || opts.isPrivilegedStaff) return "granted";
  if (hasMobileAppAccess(profile, opts)) return "granted";
  const signedIn = isAuthenticated || sessionHint;
  if (signedIn && loadingProfile) return "pending";
  return "denied";
}

/**
 * Capacitor-only router: guests → /mobile; signed-in without App Access → /mobile/access.
 */
export default function MobileNativeGate() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navQuery = searchParams?.get("nav") ?? "";
  const { isAuthenticated, loadingProfile, profile, entitlements } = useProfileData();
  const lastRedirectRef = useRef("");

  const opts = accessOpts(entitlements);
  const sessionHint = !!readNavAuthCache()?.authenticated;
  const guest = !isAuthenticated && !sessionHint;

  useEffect(() => {
    if (!isCapacitorNative()) return;

    const path = pathname || "/";
    const access = resolveNativeAppAccess({
      loadingProfile,
      profile,
      opts,
      isAuthenticated,
      sessionHint,
    });

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
        const target = "/mobile";
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
      const target = "/mobile/access";
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
      return;
    }

    if (isAllowedPath(path)) {
      if (path === "/mobile/access" && access === "granted") {
        goHome();
        return;
      }
      if (path === "/mobile" && !guest) {
        if (access === "pending") return;
        if (access === "denied") {
          const target = "/mobile/access";
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
      return;
    }

    if (guest) {
      if (shouldRedirectToMobileSplash(path) || !loadingProfile) {
        const target = "/mobile";
        if (lastRedirectRef.current !== target) {
          lastRedirectRef.current = target;
          router.replace(target);
        }
      }
      return;
    }

    if (path === "/" || path === "") {
      if (access === "pending") return;
      if (access === "granted") {
        goHome();
        return;
      }
      const target = "/mobile/access";
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
      return;
    }

    if (access === "pending") return;

    if (!isAuthenticated && !sessionHint) {
      const target = "/mobile";
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
      return;
    }

    if (access === "denied") {
      const target = "/mobile/access";
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
    }
  }, [
    pathname,
    navQuery,
    isAuthenticated,
    loadingProfile,
    guest,
    sessionHint,
    opts.isPlatformAdmin,
    opts.isPrivilegedStaff,
    profile?.membershipStatus,
    profile?.membershipBillingStatus,
    profile?.membershipTier,
    profile?.platformRole,
    profile?.email,
    router,
  ]);

  return null;
}
