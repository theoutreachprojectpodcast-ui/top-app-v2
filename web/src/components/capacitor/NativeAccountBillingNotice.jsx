"use client";

import { requiresExternalWebAccountFlow } from "@/lib/capacitor/webAccountRedirects";
import { getWebAppOrigin } from "@/lib/capacitor/webAppOrigin";

/**
 * Shown on native mobile when membership/billing actions open on the website.
 */
export default function NativeAccountBillingNotice() {
  if (!requiresExternalWebAccountFlow()) return null;

  const host = (() => {
    try {
      return new URL(getWebAppOrigin()).host;
    } catch {
      return "theoutreachproject.app";
    }
  })();

  return (
    <p className="nativeAccountBillingNotice" role="note">
      Account upgrades, membership purchases, and billing are completed on{" "}
      <strong>{host}</strong> in your device browser. The mobile app does not collect
      payment details or use Apple in-app purchase.
    </p>
  );
}
