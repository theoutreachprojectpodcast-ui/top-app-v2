"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { hasMobileAppAccess } from "@/lib/membership/appAccess";
import MobileLoadingOverlay from "@/components/capacitor/MobileLoadingOverlay";

const COMPLETE_STALL_MS = 18_000;

/**
 * Post-OAuth landing inside the Capacitor WebView — refresh session, then route to home or access paywall.
 */
export default function MobileAuthCompleteClient() {
  const router = useRouter();
  const { refresh, authenticated, loading: authLoading } = useAuthSession();
  const { loadingProfile, profile, entitlements, refreshWorkOSProfile } = useProfileData();
  const [error, setError] = useState("");
  const [loadingLabel, setLoadingLabel] = useState("Finishing sign in…");
  const routedRef = useRef(false);
  const bootRef = useRef(false);

  const handleRetry = useCallback(() => {
    setError("");
    routedRef.current = false;
    bootRef.current = false;
    router.replace("/");
  }, [router]);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    void (async () => {
      try {
        setLoadingLabel("Verifying your account…");
        await refresh({ soft: false });
        await refreshWorkOSProfile();
      } catch {
        setError("Could not verify your sign-in. Check your connection and try again.");
      }
    })();
  }, [refresh, refreshWorkOSProfile]);

  useEffect(() => {
    if (routedRef.current || error) return;
    if (authLoading || loadingProfile) return;

    if (!authenticated) {
      setError(
        "Sign-in did not complete. If email verification failed, request a new code and try again.",
      );
      return;
    }

    const opts = {
      isPlatformAdmin: !!entitlements?.isPlatformAdmin,
      isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
    };

    routedRef.current = true;
    if (hasMobileAppAccess(profile, opts)) {
      router.replace("/");
      return;
    }
    router.replace("/access");
  }, [authLoading, loadingProfile, authenticated, profile, entitlements, router, error]);

  useEffect(() => {
    if (error || routedRef.current) return undefined;
    const timer = window.setTimeout(() => {
      if (!routedRef.current && !error) {
        setError(
          "Sign-in is taking longer than expected. Your verification code may have expired — try again.",
        );
      }
    }, COMPLETE_STALL_MS);
    return () => window.clearTimeout(timer);
  }, [error]);

  return (
    <MobileLoadingOverlay
      visible
      error={!!error}
      errorMessage={error}
      loadingLabel={loadingLabel}
      onRetry={error ? handleRetry : undefined}
    />
  );
}
