"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";
import { MOBILE_POST_AUTH_COMPLETE_PATH } from "@/lib/auth/workosReturnTo";
import { mobileOAuthSplashErrorMessage } from "@/lib/auth/workosCallbackErrors";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import WorkOSAuthShell from "@/components/auth/WorkOSAuthShell";

function paramsFromSearchParams(searchParams) {
  const raw = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return raw;
}

function WorkOSAuthHandoffInner({ mode, backHref = "/", fallbackReturn }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const native = isCapacitorNative();

  const paramKey = searchParams.toString();

  const startAuth = useCallback(() => {
    const params = paramsFromSearchParams(searchParams);
    if (!params.returnTo && fallbackReturn) {
      params.returnTo = fallbackReturn;
    }

    if (native) {
      const defaultNativeReturn =
        mode === "signup" ? "/onboarding" : MOBILE_POST_AUTH_COMPLETE_PATH;
      const returnTo =
        params.returnTo ||
        fallbackReturn ||
        defaultNativeReturn;
      const go = workosGoUrl({
        mode: mode === "signup" ? "signup" : "signin",
        returnTo,
        rememberDevice: params.remember !== "0",
        loginHint: params.loginHint,
        native: true,
      });
      void launchWorkOSAuth(go)
        .then(() => {
          router.replace("/");
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Could not start secure sign in.");
        });
      return;
    }

    const returnTo = params.returnTo || fallbackReturn || (mode === "signup" ? "/onboarding" : "/");
    window.location.assign(
      workosGoUrl({
        mode: mode === "signup" ? "signup" : "signin",
        returnTo,
        rememberDevice: params.remember !== "0",
        loginHint: params.loginHint,
      }),
    );
  }, [native, mode, searchParams, fallbackReturn, router]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const params = paramsFromSearchParams(searchParams);
    const oauthErr = String(params.oauth_error || "").trim();
    if (oauthErr) {
      setError(mobileOAuthSplashErrorMessage(oauthErr) || oauthErr);
      return;
    }

    startAuth();
  }, [startAuth, paramKey, searchParams]);

  if (error) {
    return (
      <WorkOSAuthShell title="Sign in" error={error}>
        <div className="workosAuthShell__actions">
          <button
            type="button"
            className="btnPrimary mobileSplashPage__btn"
            onClick={() => {
              setError("");
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

  return (
    <AuthLoadingOverlay visible variant="authLaunch" />
  );
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
