"use client";

import { Suspense } from "react";
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
    <Suspense
      fallback={
        <div className="mobileSplashPage">
          <div className="mobileSplashPage__inner">
            <p className="mobileSplashPage__lead">Loading…</p>
          </div>
        </div>
      }
    >
      <MobileAccessPaywallInner />
    </Suspense>
  );
}
