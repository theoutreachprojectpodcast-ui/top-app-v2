"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopApp from "@/components/app/TopApp";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import WelcomeLandingPage from "@/components/membership/WelcomeLandingPage";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import {
  appAccessStatusLabel,
  resolveAppAccessState,
} from "@/lib/membership/appAccessState";
import {
  MOBILE_MEMBERSHIP_PAYWALL_PATH,
  WEB_MEMBERSHIP_PAYWALL_PATH,
} from "@/lib/membership/protectedRoutes";
import { mobileOAuthSplashErrorMessage } from "@/lib/auth/workosCallbackErrors";
import "@/styles/mobile-splash-page.css";

const PROFILE_WAIT_MAX_MS = 10_000;

/**
 * Root entry: resolve session + Pro membership before rendering the main app.
 * Guests see the welcome landing; unpaid members go to checkout; Pro members see home.
 */
export default function AppEntryBootstrap({ initialNav }) {
  const router = useRouter();
  const { loading: authLoading, refresh: refreshAuth } = useAuthSession();
  const { isAuthenticated, loadingProfile, profile, entitlements, refreshWorkOSProfile, profileSource } =
    useProfileData();
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  const [oauthError, setOauthError] = useState("");
  const [clientReady, setClientReady] = useState(false);
  const [navSnap, setNavSnap] = useState({ authenticated: false, hasFreeAccess: false });

  useLayoutEffect(() => {
    const c = readNavAuthCache();
    if (c) {
      setNavSnap({ authenticated: !!c.authenticated, hasFreeAccess: !!c.hasFreeAccess });
    }
  }, [isAuthenticated, entitlements?.fullPlatformAccess, profileSource]);

  const sessionHint = !!navSnap.authenticated;
  const profileHydrated =
    profileSource === "cloud" || !!String(profile?.profileRecordId || "").trim();
  const accessState = resolveAppAccessState({
    authLoading,
    loadingProfile,
    isAuthenticated,
    sessionHint,
    profile,
    entitlements,
    profileTimedOut,
    profileHydrated,
    navCacheHasAccess: !!navSnap.hasFreeAccess,
  });

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthErr = String(params.get("oauth_error") || "").trim();
    if (!oauthErr) return;
    setOauthError(mobileOAuthSplashErrorMessage(oauthErr) || oauthErr);
    params.delete("oauth_error");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }, [router]);

  useEffect(() => {
    const signedIn = isAuthenticated || sessionHint;
    if (!loadingProfile || !signedIn) {
      setProfileTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setProfileTimedOut(true), PROFILE_WAIT_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [loadingProfile, isAuthenticated, sessionHint]);

  useEffect(() => {
    if (!clientReady) return;
    if (accessState !== "membership_required" && accessState !== "profile_required") return;
    const target = isCapacitorNative() ? MOBILE_MEMBERSHIP_PAYWALL_PATH : WEB_MEMBERSHIP_PAYWALL_PATH;
    router.replace(target);
  }, [clientReady, accessState, router]);

  if (!clientReady || accessState === "loading" || accessState === "membership_pending") {
    return (
      <AuthLoadingOverlay
        visible
        variant="session"
        loadingLabel={appAccessStatusLabel(accessState === "membership_pending" ? accessState : "loading")}
      />
    );
  }

  if (accessState === "unauthenticated") {
    return (
      <WelcomeLandingPage
        oauthError={oauthError}
        onClearError={() => setOauthError("")}
      />
    );
  }

  if (accessState === "membership_required" || accessState === "profile_required") {
    return (
      <AuthLoadingOverlay
        visible
        variant="session"
        loadingLabel={
          accessState === "profile_required"
            ? "Finishing account setup…"
            : "Preparing secure checkout…"
        }
      />
    );
  }

  if (accessState === "suspended") {
    return (
      <AuthLoadingOverlay
        visible
        variant="generic"
        error
        errorMessage="This account is suspended. Contact support@theoutreachproject.app if you need help."
        onRetry={() => {
          void Promise.all([refreshAuth({ soft: false }), refreshWorkOSProfile()]);
        }}
      />
    );
  }

  if (accessState === "error") {
    return (
      <AuthLoadingOverlay
        visible
        variant="generic"
        error
        errorMessage="We could not verify your access. Check your connection and try again."
        onRetry={() => {
          void Promise.all([refreshAuth({ soft: false }), refreshWorkOSProfile()]);
        }}
      />
    );
  }

  return <TopApp initialNav={initialNav} />;
}
