"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";
import { workosOAuthErrorMessage } from "@/lib/auth/workosCallbackErrors";
import "@/styles/mobile-splash-page.css";

/** @param {{ initialError?: string }} props */
function WorkOSCallbackInner({ initialError = "" }) {
  const searchParams = useSearchParams();
  const [error, setError] = useState(initialError);
  const startedRef = useRef(false);

  useEffect(() => {
    if (initialError || startedRef.current) return;
    startedRef.current = true;

    const qs = searchParams.toString();
    if (!qs || (!searchParams.get("code") && !searchParams.get("error"))) {
      setError("Missing sign-in response. Please try again.");
      return;
    }

    if (searchParams.get("error")) {
      setError(
        workosOAuthErrorMessage(
          searchParams.get("error") || "",
          searchParams.get("error_description") || "",
        ),
      );
    }
  }, [searchParams, initialError]);

  const native = isCapacitorNative();
  const tryAgainGo = native
    ? workosGoUrl({ mode: "signin", returnTo: "/community" })
    : "/";

  function tryAgain() {
    if (native) {
      void launchWorkOSAuth(tryAgainGo);
      return;
    }
    window.location.assign(tryAgainGo);
  }

  if (error) {
    return (
      <div className="mobileSplashPage">
        <div className="mobileSplashPage__inner">
          <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="alert">
            {error}
          </p>
          <div className="mobileSplashPage__actions">
            <button type="button" className="btnPrimary mobileSplashPage__btn" onClick={tryAgain}>
              Try again
            </button>
            {native ? (
              <a className="btnSoft mobileSplashPage__btn" href="/mobile">
                Back
              </a>
            ) : (
              <a className="btnSoft mobileSplashPage__btn" href="/">
                Home
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobileSplashPage">
      <div className="mobileSplashPage__inner">
        <p className="mobileSplashPage__lead">Completing sign in…</p>
      </div>
    </div>
  );
}

/** @param {{ initialError?: string }} [props] */
export default function WorkOSCallbackClient({ initialError } = {}) {
  return (
    <Suspense
      fallback={
        <div className="mobileSplashPage">
          <div className="mobileSplashPage__inner">
            <p className="mobileSplashPage__lead">Loading…</p>
          </div>
        </div>
      }
    >
      <WorkOSCallbackInner initialError={initialError} />
    </Suspense>
  );
}
