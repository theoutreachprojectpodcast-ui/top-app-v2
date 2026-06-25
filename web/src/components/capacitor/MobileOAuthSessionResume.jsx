"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { closeExternalBrowserIfOpen } from "@/lib/capacitor/openExternalUrl";
import { hideCapacitorSplash } from "@/lib/capacitor/splashScreen";
import {
  clearMobileOAuthHandoffState,
  isMobileAuthCompletePath,
  isMobileOAuthReturnSearch,
  markMobileOAuthResumeGrace,
  navigateToMobileAppHomeAfterOAuth,
} from "@/lib/auth/mobileOAuthReturn";
import { TOP_OAUTH_RETURN_KEY } from "@/lib/auth/oauthMobileHandoff";
export { TOP_OAUTH_RETURN_KEY };

/**
 * After OAuth return, clear handoff flags immediately and refresh session in the background.
 */
export default function MobileOAuthSessionResume() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh: refreshAuth } = useAuthSession();
  const { refreshWorkOSProfile } = useProfileData();
  const ranRef = useRef(false);

  const oauthReturn =
    searchParams?.get("oauth") === "1" ||
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem(TOP_OAUTH_RETURN_KEY) === "1");

  useLayoutEffect(() => {
    if (!isCapacitorNative()) return;
    if (isMobileAuthCompletePath(pathname)) {
      navigateToMobileAppHomeAfterOAuth();
      return;
    }
    if (searchParams?.get("oauth") === "1") {
      markMobileOAuthResumeGrace();
      clearMobileOAuthHandoffState();
      void hideCapacitorSplash();
      void closeExternalBrowserIfOpen();
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isCapacitorNative() || ranRef.current || !oauthReturn) return;
    if (isMobileAuthCompletePath(pathname)) return;
    ranRef.current = true;

    if (searchParams?.get("oauth") === "1") {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("oauth");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname || "/", { scroll: false });
    }

    void (async () => {
      await refreshAuth({ soft: true });
      await refreshWorkOSProfile();
      for (const delay of [200, 500, 1200]) {
        await new Promise((r) => setTimeout(r, delay));
        await Promise.all([refreshAuth({ soft: true }), refreshWorkOSProfile()]);
      }
    })();
  }, [oauthReturn, pathname, refreshAuth, refreshWorkOSProfile, router, searchParams]);

  return null;
}
