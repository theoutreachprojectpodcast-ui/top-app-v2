"use client";

import { Suspense } from "react";
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
    <Suspense
      fallback={
        <div className="mobileSplashPage">
          <div className="mobileSplashPage__inner">
            <p className="mobileSplashPage__lead">Loading…</p>
          </div>
        </div>
      }
    >
      <WebAccessPaywallInner />
    </Suspense>
  );
}
