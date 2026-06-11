"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { hasMobileAppAccess, navCacheHasFreeAccess } from "@/lib/membership/appAccess";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

const WEB_ACCESS_ALLOW = [
  /^\/access(\/|$)/,
  /^\/mobile(\/|$)/,
  /^\/callback(\/|$)/,
  /^\/sign-in(\/|$)/,
  /^\/sign-up(\/|$)/,
  /^\/login(\/|$)/,
  /^\/auth\//,
  /^\/privacy(\/|$)/,
  /^\/terms(\/|$)/,
  /^\/download(\/|$)/,
  /^\/membership(\/|$)/,
  /^\/billing(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/api\//,
];

function isAllowedPath(pathname) {
  return WEB_ACCESS_ALLOW.some((re) => re.test(pathname || "/"));
}

function accessOpts(entitlements) {
  return {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  };
}

/**
 * Web browser gate: signed-in users without App Access → /access ($5.99/yr).
 * Platform admins and staff bypass the paywall.
 */
export default function WebAppAccessGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loadingProfile, profile, entitlements } = useProfileData();

  const opts = accessOpts(entitlements);

  useEffect(() => {
    if (isCapacitorNative()) return;
    if (isAllowedPath(pathname)) return;

    const sessionHint = readNavAuthCache()?.authenticated;
    const freeAccessHint = readNavAuthCache()?.hasFreeAccess;
    if (!isAuthenticated && !sessionHint) return;

    if (freeAccessHint || navCacheHasFreeAccess(profile, entitlements) || hasMobileAppAccess(profile, opts)) return;

    if (loadingProfile) return;

    if (!hasMobileAppAccess(profile, opts)) {
      router.replace("/access");
    }
  }, [pathname, isAuthenticated, loadingProfile, opts.isPlatformAdmin, opts.isPrivilegedStaff, profile, router]);

  return null;
}
