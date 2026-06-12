"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import MobileLoadingOverlay from "@/components/capacitor/MobileLoadingOverlay";

const BOOT_OVERLAY_MAX_MS = 8000;
const SPLASH_HIDE_TIMEOUT_MS = 2000;

/**
 * Keeps the native splash visible until auth bootstrap completes, then shows a branded overlay
 * until profile hydration is ready — prevents the black flash between LaunchScreen and the app.
 */
export default function MobileBootLoader() {
  const { loading: authLoading, authenticated } = useAuthSession();
  const { loadingProfile } = useProfileData();
  const [overlayVisible, setOverlayVisible] = useState(isCapacitorNative());
  const native = isCapacitorNative();

  const bootReady = !authLoading && (!authenticated || !loadingProfile);

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
      if (!cancelled) setOverlayVisible(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [native, bootReady]);

  if (!native) return null;
  return <MobileLoadingOverlay visible={overlayVisible} />;
}
