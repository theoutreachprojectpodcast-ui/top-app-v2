"use client";

import { useEffect, useState } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import MobileLoadingOverlay from "@/components/capacitor/MobileLoadingOverlay";

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
    void SplashScreen.show({ autoHide: false }).catch(() => {});
    return undefined;
  }, [native]);

  useEffect(() => {
    if (!native || !bootReady) return;
    let cancelled = false;
    (async () => {
      try {
        await SplashScreen.hide();
      } catch {
        /* native splash may already be hidden */
      }
      if (!cancelled) {
        setOverlayVisible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [native, bootReady]);

  if (!native) return null;
  return <MobileLoadingOverlay visible={overlayVisible} />;
}
