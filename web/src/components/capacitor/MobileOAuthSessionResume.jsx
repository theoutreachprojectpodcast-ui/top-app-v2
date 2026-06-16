"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { TORP_OAUTH_RETURN_KEY } from "@/lib/auth/oauthMobileHandoff";
export { TORP_OAUTH_RETURN_KEY };

/**
 * After OAuth deep-link return, hard-refresh session + profile so the native shell is logged in.
 */
export default function MobileOAuthSessionResume() {
  const pathname = usePathname();
  const { refresh: refreshAuth } = useAuthSession();
  const { refreshWorkOSProfile } = useProfileData();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isCapacitorNative() || ranRef.current) return;
    if (typeof sessionStorage === "undefined") return;
    const fromStorage = sessionStorage.getItem(TORP_OAUTH_RETURN_KEY) === "1";
    const fromQuery =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("oauth") === "1";
    if (!fromStorage && !fromQuery) return;

    ranRef.current = true;
    sessionStorage.removeItem(TORP_OAUTH_RETURN_KEY);

    void (async () => {
      await refreshAuth({ soft: true });
      await refreshWorkOSProfile();
    })();
  }, [refreshAuth, refreshWorkOSProfile]);

  return null;
}
