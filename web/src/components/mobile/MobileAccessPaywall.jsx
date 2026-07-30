"use client";

import AppAccessPaywall from "@/components/membership/AppAccessPaywall";
import "@/styles/mobile-splash-page.css";

/** Native Capacitor membership purchase screen — no skip into the app. */
export default function MobileAccessPaywall() {
  return (
    <AppAccessPaywall
      checkoutReturnPath="/mobile/access"
      postAccessPath="/"
      backHref="/"
      backLabel="Sign out"
    />
  );
}
