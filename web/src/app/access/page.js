"use client";

import { Suspense } from "react";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import AppAccessPaywall from "@/components/membership/AppAccessPaywall";
import "@/styles/mobile-splash-page.css";

function WebAccessPaywallInner() {
  return (
    <AppAccessPaywall
      checkoutReturnPath="/access"
      postAccessPath="/"
      backHref="/login?returnTo=%2Faccess"
      backLabel="Sign in"
    />
  );
}

export default function WebAccessPage() {
  return (
    <Suspense fallback={<AuthLoadingOverlay visible variant="generic" />}>
      <WebAccessPaywallInner />
    </Suspense>
  );
}
