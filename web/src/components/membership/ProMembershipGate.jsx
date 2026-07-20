"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasActiveMembership } from "@/lib/membership/appAccess";
import { requirePro } from "@/lib/membership/membershipAccess";
import { getProUpgradeGateContent } from "@/lib/membership/proUpgradeGateCopy";
import {
  isMembershipExemptPath,
  requiresProMembershipPath,
} from "@/lib/membership/protectedRoutes";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import ProUpgradeModal from "@/components/membership/ProUpgradeModal";

function accessOpts(entitlements) {
  return {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  };
}

/**
 * Support members may use directory, podcast hub, and profile. Pro-only routes show an upgrade modal.
 */
export default function ProMembershipGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loadingProfile, profile, entitlements } = useProfileData();
  const opts = accessOpts(entitlements);
  const [gateOpen, setGateOpen] = useState(false);

  const shouldGate = useMemo(() => {
    const path = pathname || "/";
    if (isMembershipExemptPath(path)) return false;
    if (!requiresProMembershipPath(path)) return false;

    const sessionHint = readNavAuthCache()?.authenticated;
    const signedIn = isAuthenticated || sessionHint;
    if (!signedIn) return false;

    if (requirePro(profile, opts)) return false;
    if (loadingProfile && hasActiveMembership(profile, opts)) return false;

    return true;
  }, [
    pathname,
    isAuthenticated,
    loadingProfile,
    profile,
    opts.isPlatformAdmin,
    opts.isPrivilegedStaff,
  ]);

  useEffect(() => {
    setGateOpen(shouldGate);
  }, [shouldGate]);

  const copy = useMemo(() => getProUpgradeGateContent(pathname || "/"), [pathname]);

  function handleBack() {
    setGateOpen(false);
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace("/");
  }

  return (
    <ProUpgradeModal
      open={gateOpen}
      title={copy.title}
      message={copy.message}
      feature={copy.feature}
      onBack={handleBack}
    />
  );
}
