"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isOAuthInProgress } from "@/lib/auth/oauthInProgress";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";

const BOOT_OVERLAY_MAX_MS = 2000;
const BOOT_STALL_MS = 12000;
const SPLASH_HIDE_TIMEOUT_MS = 1200;

/**
 * Native splash → single branded overlay until session is ready. Skips during OAuth return.
 */
export default function MobileBootLoader() {
  const pathname = usePathname();
  const { loading: authLoading, authenticated, refresh } = useAuthSession();
  const { loadingProfile } = useProfileData();
  const [overlayVisible, setOverlayVisible] = useState(isCapacitorNative());
  const [bootError, setBootError] = useState("");
  const [bootForced, setBootForced] = useState(false);
  const native = isCapacitorNative();

  const oauthBusy = isOAuthInProgress();
  const onAuthCompleteRoute = pathname === MOBILE_POST_LOGIN_PATH;
  const sessionHint = !!readNavAuthCache()?.authenticated;

  const bootReady =
    bootForced || (!authLoading && (!authenticated || !loadingProfile));

  const handleRetry = useCallback(() => {
    setBootError("");
    setOverlayVisible(true);
    void refresh({ soft: false });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, [refresh]);

  useEffect(() => {
    if (!native) return undefined;
    void import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.show({ autoHide: false }).catch(() => {}))
      .catch(() => {});
    return undefined;
  }, [native]);

  useEffect(() => {
    if (!native || oauthBusy || onAuthCompleteRoute) {
      setOverlayVisible(false);
      return undefined;
    }
    const maxTimer = window.setTimeout(() => {
      setBootForced(true);
      setOverlayVisible(false);
      void import("@capacitor/splash-screen")
        .then(({ SplashScreen }) => SplashScreen.hide().catch(() => {}))
        .catch(() => {});
    }, BOOT_OVERLAY_MAX_MS);
    return () => window.clearTimeout(maxTimer);
  }, [native, oauthBusy, onAuthCompleteRoute]);

  useEffect(() => {
    if (!native || bootReady || bootError || oauthBusy || onAuthCompleteRoute) return undefined;
    const stallTimer = window.setTimeout(() => {
      setBootError(
        "The Outreach Project servers are taking too long to respond. Check your connection and try again.",
      );
      setOverlayVisible(true);
    }, BOOT_STALL_MS);
    return () => window.clearTimeout(stallTimer);
  }, [
    native,
    bootReady,
    bootError,
    authLoading,
    loadingProfile,
    authenticated,
    oauthBusy,
    onAuthCompleteRoute,
  ]);

  useEffect(() => {
    if (!native || !bootReady || oauthBusy || onAuthCompleteRoute) return undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await Promise.race([
          SplashScreen.hide(),
          new Promise((resolve) => {
            window.setTimeout(resolve, SPLASH_HIDE_TIMEOUT_MS);
          }),
        ]);
      } catch {
        /* splash plugin may be unavailable in older native builds */
      }
      if (!cancelled) {
        setBootError("");
        setOverlayVisible(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [native, bootReady, oauthBusy, onAuthCompleteRoute]);

  if (!native || oauthBusy || onAuthCompleteRoute) return null;

  return (
    <AuthLoadingOverlay
      visible={overlayVisible}
      variant={sessionHint && (authLoading || loadingProfile) ? "session" : "boot"}
      error={!!bootError}
      errorMessage={bootError}
      onRetry={bootError ? handleRetry : undefined}
    />
  );
}
