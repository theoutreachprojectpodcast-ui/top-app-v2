"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { hasMobileAppAccess } from "@/lib/membership/appAccess";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { isOAuthInProgress } from "@/lib/auth/oauthInProgress";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

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
 * Capacitor-only router: paywall for signed-in users without App Access; hide store download page.
 * Native app loads from `/` (TopApp) — guests are not forced to `/mobile`.
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
  const oauthBusy = isOAuthInProgress();

  useEffect(() => {
    if (!isCapacitorNative()) return;
    if (oauthBusy) return;

    const path = pathname || "/";

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
    });

    if (
      !guest &&
      (path === "/sign-in" || path === "/sign-up" || path === "/auth/sign-in" || path === "/auth/sign-up")
    ) {
      if (access === "pending") return;
      const target = access === "denied" ? "/access" : "/";
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
      const target = "/access";
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
          const target = "/access";
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
        if (guest) return;
        if (access === "pending") return;
        if (access === "denied") {
          const target = "/access";
          if (lastRedirectRef.current !== target) {
            lastRedirectRef.current = target;
            router.replace(target);
          }
        }
      }
      return;
    }

    if (guest) return;

    if (access === "pending") return;

    if (access === "denied") {
      const target = "/access";
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
    oauthBusy,
  ]);

  return null;
}
