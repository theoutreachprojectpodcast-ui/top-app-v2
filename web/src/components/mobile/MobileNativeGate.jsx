"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { hasMobileAppAccess } from "@/lib/membership/appAccess";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

const MOBILE_GATE_ALLOW = [
  /^\/mobile(\/|$)/,
  /^\/callback(\/|$)/,
  /^\/sign-in(\/|$)/,
  /^\/sign-up(\/|$)/,
  /^\/login(\/|$)/,
  /^\/api\/auth\//,
  /^\/privacy(\/|$)/,
  /^\/terms(\/|$)/,
];

function isAllowedPath(pathname) {
  return MOBILE_GATE_ALLOW.some((re) => re.test(pathname || "/"));
}

/**
 * Capacitor-only router: guests → /mobile; signed-in without App Access → /mobile/access.
 */
export default function MobileNativeGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loadingProfile, profile, entitlements } = useProfileData();

  useEffect(() => {
    if (!isCapacitorNative()) return;
    if (isAllowedPath(pathname)) return;
    if (loadingProfile) return;

    if (!isAuthenticated) {
      router.replace("/mobile");
      return;
    }

    const hasAccess = hasMobileAppAccess(profile, {
      isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    });
    if (!hasAccess) {
      router.replace("/mobile/access");
    }
  }, [pathname, isAuthenticated, loadingProfile, profile, entitlements, router]);

  return null;
}
