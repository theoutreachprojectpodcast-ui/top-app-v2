"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { navigateToMobileAppHomeAfterOAuth } from "@/lib/auth/mobileOAuthReturn";
import { MOBILE_OAUTH_HOME_PATH } from "@/lib/runtime/appUrls";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

const REDIRECT_MAX_MS = 2_000;

/**
 * `/mobile/auth/complete` — legacy post-OAuth landing; hard-navigate home immediately.
 */
export default function MobileAuthCompleteClient() {
  const router = useRouter();
  const { refresh: refreshAuth } = useAuthSession();
  const { refreshWorkOSProfile } = useProfileData();
  const redirectedRef = useRef(false);

  useLayoutEffect(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    if (isCapacitorNative()) {
      navigateToMobileAppHomeAfterOAuth(MOBILE_OAUTH_HOME_PATH);
      return;
    }
    router.replace(MOBILE_OAUTH_HOME_PATH);
  }, [router]);

  useEffect(() => {
    void Promise.all([refreshAuth({ soft: true }), refreshWorkOSProfile()]);
    const timer = window.setTimeout(() => {
      if (isCapacitorNative()) {
        navigateToMobileAppHomeAfterOAuth(MOBILE_OAUTH_HOME_PATH);
      }
    }, REDIRECT_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [refreshAuth, refreshWorkOSProfile]);

  return <AuthLoadingOverlay visible variant="authComplete" loadingLabel="Opening The Outreach Project…" />;
}
