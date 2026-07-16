"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { hasMobileAppAccess, navCacheHasFreeAccess } from "@/lib/membership/appAccess";
import {
  isMembershipExemptPath,
  requiresActiveMembershipPath,
  WEB_MEMBERSHIP_PAYWALL_PATH,
} from "@/lib/membership/protectedRoutes";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

function accessOpts(entitlements) {
  return {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  };
}

/**
 * Web browser gate: guests on protected routes → sign-in; signed-in without Pro → paywall.
 * Public home/directory stays open without membership.
 */
export default function WebAppAccessGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading: authLoading } = useAuthSession();
  const { isAuthenticated, loadingProfile, profile, entitlements } = useProfileData();
  const lastRedirectRef = useRef("");

  const opts = accessOpts(entitlements);

  useEffect(() => {
    if (isCapacitorNative()) return;
    const path = pathname || "/";
    if (isMembershipExemptPath(path)) return;
    if (!requiresActiveMembershipPath(path)) return;

    if (loadingProfile || authLoading) return;

    const sessionHint = readNavAuthCache()?.authenticated;
    const signedIn = isAuthenticated || sessionHint;
    const hasAccess =
      navCacheHasFreeAccess(profile, entitlements) || hasMobileAppAccess(profile, opts);

    if (!signedIn) {
      const target = `/sign-in?returnTo=${encodeURIComponent(path)}`;
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target;
        router.replace(target);
      }
      return;
    }

    if (hasAccess) return;

    const target = WEB_MEMBERSHIP_PAYWALL_PATH;
    if (lastRedirectRef.current !== target) {
      lastRedirectRef.current = target;
      router.replace(target);
    }
  }, [
    pathname,
    isAuthenticated,
    loadingProfile,
    authLoading,
    opts.isPlatformAdmin,
    opts.isPrivilegedStaff,
    profile,
    entitlements,
    router,
  ]);

  return null;
}
