"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { hideCapacitorSplash } from "@/lib/capacitor/splashScreen";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isOAuthInProgress } from "@/lib/auth/oauthInProgress";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import {
  isInMobileOAuthResumeGrace,
  isMobileAuthCompletePath,
  isMobileOAuthReturnSearch,
} from "@/lib/auth/mobileOAuthReturn";

const BOOT_OVERLAY_MAX_MS = 2000;
const BOOT_STALL_MS = 12_000;
const SPLASH_FORCE_HIDE_MS = 1200;

/**
 * Native boot: branded React overlay until session is ready. Always dismisses the
 * native Capacitor splash (spinner-only) — never call SplashScreen.show() here.
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
  const oauthReturn =
    typeof window !== "undefined" && isMobileOAuthReturnSearch(window.location.search);
  const onAuthCompleteRoute =
    isMobileAuthCompletePath(pathname) || oauthReturn || isInMobileOAuthResumeGrace();
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

  useLayoutEffect(() => {
    if (!native) return undefined;
    if (onAuthCompleteRoute || bootReady) {
      void hideCapacitorSplash();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      void hideCapacitorSplash();
    }, SPLASH_FORCE_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [native, onAuthCompleteRoute, bootReady]);

  useEffect(() => {
    if (!native || oauthBusy || onAuthCompleteRoute) {
      setOverlayVisible(false);
      void hideCapacitorSplash();
      return undefined;
    }
    const maxTimer = window.setTimeout(() => {
      setBootForced(true);
      setOverlayVisible(false);
      void hideCapacitorSplash();
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
      void hideCapacitorSplash();
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
    if (!native || !bootReady || oauthBusy) return undefined;
    void hideCapacitorSplash();
    setBootError("");
    setOverlayVisible(false);
    return undefined;
  }, [native, bootReady, oauthBusy]);

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
