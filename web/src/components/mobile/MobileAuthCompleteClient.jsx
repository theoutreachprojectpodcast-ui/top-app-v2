"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import {
  navigateToMobileAppHomeAfterOAuth,
} from "@/lib/auth/mobileOAuthReturn";
import { MOBILE_OAUTH_HOME_PATH } from "@/lib/runtime/appUrls";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

const REDIRECT_MAX_MS = 4_000;

/**
 * `/mobile/auth/complete` — immediately enter the app home (hard navigation; no RSC redirect stall).
 */
export default function MobileAuthCompleteClient() {
  const router = useRouter();
  const { refresh: refreshAuth } = useAuthSession();
  const { refreshWorkOSProfile } = useProfileData();
  const redirectedRef = useRef(false);
  const [timedOut, setTimedOut] = useState(false);

  const goHome = () => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    void Promise.all([refreshAuth({ soft: true }), refreshWorkOSProfile()]).finally(() => {
      if (isCapacitorNative()) {
        navigateToMobileAppHomeAfterOAuth(MOBILE_OAUTH_HOME_PATH);
        return;
      }
      router.replace(MOBILE_OAUTH_HOME_PATH);
    });
  };

  useLayoutEffect(() => {
    goHome();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!redirectedRef.current) {
        setTimedOut(true);
        navigateToMobileAppHomeAfterOAuth(MOBILE_OAUTH_HOME_PATH);
      }
    }, REDIRECT_MAX_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (timedOut) {
    return (
      <AuthLoadingOverlay
        visible
        variant="authComplete"
        error
        errorMessage="Sign-in finished but navigation stalled. Tap Continue to open the app."
        onRetry={goHome}
      />
    );
  }

  return <AuthLoadingOverlay visible variant="authComplete" loadingLabel="Opening The Outreach Project…" />;
}
