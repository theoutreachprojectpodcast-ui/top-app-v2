"use client";

import { useEffect, useRef, useState } from "react";
import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import "@/styles/mobile-splash-page.css";

/**
 * Starts WorkOS sign-in/sign-up in the Capacitor WebView (no external browser sheet).
 * Used by `/mobile/sign-in` and `/mobile/sign-up` launcher routes.
 *
 * @param {{ goPath: string, label?: string }} props
 */
export default function MobileWorkOSAuthLauncher({ goPath, label = "Opening sign in…" }) {
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void launchWorkOSAuth(goPath).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not start sign in.");
    });
  }, [goPath]);

  if (error) {
    return (
      <div className="mobileSplashPage mobileSplashPage--landing">
        <div className="mobileSplashPage__inner">
          <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="alert">
            {error}
          </p>
          <div className="mobileSplashPage__actions">
            <button
              type="button"
              className="btnPrimary mobileSplashPage__btn"
              onClick={() => {
                setError("");
                void launchWorkOSAuth(goPath).catch((err) => {
                  setError(err instanceof Error ? err.message : "Could not start sign in.");
                });
              }}
            >
              Try again
            </button>
            <a className="btnSoft mobileSplashPage__btn" href="/mobile">
              Back
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobileSplashPage mobileSplashPage--landing">
      <div className="mobileSplashPage__inner">
        <p className="mobileSplashPage__lead">{label}</p>
      </div>
    </div>
  );
}
