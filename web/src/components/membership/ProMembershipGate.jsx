"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { hasActiveMembership } from "@/lib/membership/appAccess";
import { requirePro } from "@/lib/membership/membershipAccess";
import {
  isMembershipExemptPath,
  membershipUpgradePaywallPath,
  requiresProMembershipPath,
} from "@/lib/membership/protectedRoutes";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

function accessOpts(entitlements) {
  return {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  };
}

/**
 * Support members may use directory + saves only. Pro-only routes redirect to upgrade paywall.
 */
export default function ProMembershipGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loadingProfile, profile, entitlements } = useProfileData();
  const opts = accessOpts(entitlements);

  useEffect(() => {
    const path = pathname || "/";
    if (isMembershipExemptPath(path)) return;
    if (!requiresProMembershipPath(path)) return;

    const sessionHint = readNavAuthCache()?.authenticated;
    const signedIn = isAuthenticated || sessionHint;
    if (!signedIn) return;

    if (requirePro(profile, opts)) return;
    if (loadingProfile && hasActiveMembership(profile, opts)) return;

    router.replace(membershipUpgradePaywallPath(isCapacitorNative()));
  }, [
    pathname,
    isAuthenticated,
    loadingProfile,
    profile,
    entitlements,
    opts.isPlatformAdmin,
    opts.isPrivilegedStaff,
    router,
  ]);

  return null;
}
