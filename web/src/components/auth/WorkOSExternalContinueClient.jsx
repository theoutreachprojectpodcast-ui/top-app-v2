"use client";

import { Suspense, useEffect } from "react";
import WorkOSAuthShell from "@/components/auth/WorkOSAuthShell";

/**
 * Legacy route — handoff now redirects to WorkOS on the sign-in page itself.
 * Send anyone who lands here back to the mobile splash.
 */
function WorkOSExternalContinueInner({ backHref = "/mobile" }) {
  useEffect(() => {
    window.location.replace(backHref);
  }, [backHref]);

  return (
    <WorkOSAuthShell title="Sign in" lead="Returning to sign in…" busy>
      <p className="workosAuthShell__lead">
        <a href={backHref}>Continue</a>
      </p>
    </WorkOSAuthShell>
  );
}

/** @param {{ backHref?: string }} props */
export default function WorkOSExternalContinueClient({ backHref = "/mobile" }) {
  return (
    <Suspense fallback={<WorkOSAuthShell title="Sign in" lead="Loading…" busy />}>
      <WorkOSExternalContinueInner backHref={backHref} />
    </Suspense>
  );
}
