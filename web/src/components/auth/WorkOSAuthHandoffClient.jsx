"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";
import { MOBILE_POST_AUTH_COMPLETE_PATH } from "@/lib/auth/workosReturnTo";
import { sanitizeAuthReturnPath } from "@/lib/auth/authReturnPath";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { mobileOAuthSplashErrorMessage } from "@/lib/auth/workosCallbackErrors";
import { isInMobileOAuthResumeGrace } from "@/lib/auth/mobileOAuthReturn";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import WorkOSAuthShell from "@/components/auth/WorkOSAuthShell";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

const AUTH_LAUNCH_COOLDOWN_MS = 4_000;
const AUTH_LAUNCH_KEY = "top_workos_auth_launch_ts";

function paramsFromSearchParams(searchParams) {
  const raw = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return raw;
}

function resolveHandoffReturnTo(params, fallbackReturn, mode, native) {
  const defaultReturn = native
    ? mode === "signup"
      ? "/mobile/access"
      : MOBILE_POST_AUTH_COMPLETE_PATH
    : mode === "signup"
      ? "/access"
      : "/";
  const raw = params.returnTo || fallbackReturn || defaultReturn;
  return sanitizeAuthReturnPath(raw, defaultReturn);
}

function recentAuthLaunch() {
  if (typeof sessionStorage === "undefined") return false;
  const ts = Number(sessionStorage.getItem(AUTH_LAUNCH_KEY) || 0);
  return ts > 0 && Date.now() - ts < AUTH_LAUNCH_COOLDOWN_MS;
}

function markAuthLaunch() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(AUTH_LAUNCH_KEY, String(Date.now()));
}

function WorkOSAuthHandoffInner({ mode, backHref = "/", fallbackReturn }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading, authenticated: authAuthenticated } = useAuthSession();
  const { isAuthenticated, loadingProfile } = useProfileData();
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const native = isCapacitorNative();

  const paramKey = searchParams.toString();

  const startAuth = useCallback(() => {
    const params = paramsFromSearchParams(searchParams);
    if (!params.returnTo && fallbackReturn) {
      params.returnTo = fallbackReturn;
    }

    const returnTo = resolveHandoffReturnTo(params, fallbackReturn, mode, native);
    markAuthLaunch();

    if (native) {
      const go = workosGoUrl({
        mode: mode === "signup" ? "signup" : "signin",
        returnTo,
        rememberDevice: params.remember !== "0",
        loginHint: params.loginHint,
        native: true,
      });
      void launchWorkOSAuth(go).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not start secure sign in.");
      });
      return;
    }

    window.location.assign(
      workosGoUrl({
        mode: mode === "signup" ? "signup" : "signin",
        returnTo,
        rememberDevice: params.remember !== "0",
        loginHint: params.loginHint,
      }),
    );
  }, [native, mode, searchParams, fallbackReturn]);

  useEffect(() => {
    if (startedRef.current) return;
    if (authLoading || loadingProfile) return;

    const params = paramsFromSearchParams(searchParams);
    const oauthErr = String(params.oauth_error || "").trim();
    if (oauthErr) {
      startedRef.current = true;
      setError(mobileOAuthSplashErrorMessage(oauthErr) || oauthErr);
      return;
    }

    const returnTo = resolveHandoffReturnTo(params, fallbackReturn, mode, native);
    const sessionHint = !!readNavAuthCache()?.authenticated;
    const signedIn = isAuthenticated || authAuthenticated || sessionHint;

    if (signedIn) {
      startedRef.current = true;
      router.replace(returnTo);
      return;
    }

    if (isInMobileOAuthResumeGrace()) return;

    startedRef.current = true;
    startAuth();
  }, [
    startAuth,
    paramKey,
    searchParams,
    authLoading,
    loadingProfile,
    isAuthenticated,
    authAuthenticated,
    fallbackReturn,
    mode,
    native,
    router,
  ]);

  if (error) {
    return (
      <WorkOSAuthShell title="Sign in" error={error}>
        <div className="workosAuthShell__actions">
          <button
            type="button"
            className="btnPrimary mobileSplashPage__btn"
            onClick={() => {
              setError("");
              startedRef.current = false;
              if (typeof sessionStorage !== "undefined") {
                sessionStorage.removeItem(AUTH_LAUNCH_KEY);
              }
              const params = new URLSearchParams(searchParams.toString());
              params.delete("oauth_error");
              const qs = params.toString();
              router.replace(qs ? `${window.location.pathname}?${qs}` : window.location.pathname, {
                scroll: false,
              });
              startAuth();
            }}
          >
            Try again
          </button>
          <p className="workosAuthShell__lead">
            <a href={backHref}>Back</a>
          </p>
        </div>
      </WorkOSAuthShell>
    );
  }

  return <AuthLoadingOverlay visible variant="authLaunch" />;
}

/**
 * @param {{ mode?: "signin" | "signup", backHref?: string, fallbackReturn?: string }} props
 */
export default function WorkOSAuthHandoffClient({ mode = "signin", backHref = "/", fallbackReturn }) {
  return (
    <Suspense fallback={<AuthLoadingOverlay visible variant="authLaunch" />}>
      <WorkOSAuthHandoffInner mode={mode} backHref={backHref} fallbackReturn={fallbackReturn} />
    </Suspense>
  );
}
