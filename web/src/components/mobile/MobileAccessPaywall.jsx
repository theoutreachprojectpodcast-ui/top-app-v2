"use client";

import { Suspense } from "react";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import AppAccessPaywall from "@/components/membership/AppAccessPaywall";

function MobileAccessPaywallInner() {
  return (
    <AppAccessPaywall
      checkoutReturnPath="/mobile/access"
      postAccessPath="/"
      backHref="/"
      backLabel="Back"
    />
  );
}

export default function MobileAccessPaywall() {
  return (
    <Suspense fallback={<AuthLoadingOverlay visible variant="generic" />}>
      <MobileAccessPaywallInner />
    </Suspense>
  );
}
