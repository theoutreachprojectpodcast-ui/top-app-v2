"use client";

import { Suspense, useEffect } from "react";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";

/**
 * Legacy route — handoff now redirects to WorkOS on the sign-in page itself.
 * Send anyone who lands here back to the mobile splash.
 */
function WorkOSExternalContinueInner({ backHref = "/mobile" }) {
  useEffect(() => {
    window.location.replace(backHref);
  }, [backHref]);

  return <AuthLoadingOverlay visible variant="authLaunch" />;
}

/** @param {{ backHref?: string }} props */
export default function WorkOSExternalContinueClient({ backHref = "/mobile" }) {
  return (
    <Suspense fallback={<AuthLoadingOverlay visible variant="authLaunch" />}>
      <WorkOSExternalContinueInner backHref={backHref} />
    </Suspense>
  );
}
