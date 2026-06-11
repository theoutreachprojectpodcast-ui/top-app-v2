"use client";

import { Suspense, useEffect } from "react";
import "@/styles/mobile-splash-page.css";

/**
 * Legacy route — handoff now redirects to WorkOS on the sign-in page itself.
 * Send anyone who lands here back to the mobile splash.
 */
function WorkOSExternalContinueInner({ backHref = "/mobile" }) {
  useEffect(() => {
    window.location.replace(backHref);
  }, [backHref]);

  return (
    <div className="mobileSplashPage">
      <div className="mobileSplashPage__inner">
        <p className="mobileSplashPage__lead">Returning to sign in…</p>
        <p className="mobileSplashPage__lead">
          <a href={backHref}>Continue</a>
        </p>
      </div>
    </div>
  );
}

/** @param {{ backHref?: string }} props */
export default function WorkOSExternalContinueClient({ backHref = "/mobile" }) {
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
      <WorkOSExternalContinueInner backHref={backHref} />
    </Suspense>
  );
}
