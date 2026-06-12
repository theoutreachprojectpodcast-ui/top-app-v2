"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import MobileLoadingOverlay from "@/components/capacitor/MobileLoadingOverlay";

const BOOT_OVERLAY_MAX_MS = 8000;
const BOOT_STALL_MS = 14000;
const SPLASH_HIDE_TIMEOUT_MS = 2000;

/**
 * Keeps the native splash visible until auth bootstrap completes, then shows a branded overlay
 * until profile hydration is ready — prevents the black flash between LaunchScreen and the app.
 */
export default function MobileBootLoader() {
  const { loading: authLoading, authenticated, refresh } = useAuthSession();
  const { loadingProfile } = useProfileData();
  const [overlayVisible, setOverlayVisible] = useState(isCapacitorNative());
  const [bootError, setBootError] = useState("");
  const native = isCapacitorNative();

  const bootReady = !authLoading && (!authenticated || !loadingProfile);

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
    if (!native) return undefined;
    const maxTimer = window.setTimeout(() => setOverlayVisible(false), BOOT_OVERLAY_MAX_MS);
    return () => window.clearTimeout(maxTimer);
  }, [native]);

  useEffect(() => {
    if (!native || bootReady || bootError) return undefined;
    const stallTimer = window.setTimeout(() => {
      setBootError(
        "The Outreach Project servers are taking too long to respond. Check your connection and try again.",
      );
      setOverlayVisible(true);
    }, BOOT_STALL_MS);
    return () => window.clearTimeout(stallTimer);
  }, [native, bootReady, bootError, authLoading, loadingProfile, authenticated]);

  useEffect(() => {
    if (!native || !bootReady) return undefined;
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
  }, [native, bootReady]);

  if (!native) return null;
  return (
    <MobileLoadingOverlay
      visible={overlayVisible}
      error={!!bootError}
      errorMessage={bootError}
      onRetry={bootError ? handleRetry : undefined}
    />
  );
}
