"use client";

import Link from "next/link";
import { MOBILE_APP_DEEP_LINK } from "@/lib/capacitor/webAppOrigin";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { useNativeWebAccountFlow } from "@/hooks/useNativeWebAccountFlow";

/**
 * CTA shown on web return pages after external signup / billing (opened from mobile browser).
 */
export default function MobileReturnToAppPanel({ title, message, showSignInHint = false }) {
  const { refreshAccountStatus, refreshing } = useNativeWebAccountFlow();
  const inNativeWebView = isCapacitorNative();

  return (
    <section className="card mobileReturnToAppPanel">
      <h1>{title}</h1>
      <p className="sponsorSectionLead">{message}</p>
      {showSignInHint ? (
        <p className="sponsorSectionLead">
          If you are not signed in inside the app yet, use <strong>Sign in</strong> on the Profile tab after
          returning — your web account and membership sync from the server.
        </p>
      ) : null}
      <div className="row wrap">
        {inNativeWebView ? (
          <button type="button" className="btnPrimary" disabled={refreshing} onClick={() => void refreshAccountStatus()}>
            {refreshing ? "Refreshing…" : "Refresh account in app"}
          </button>
        ) : (
          <>
            <a className="btnPrimary" href={MOBILE_APP_DEEP_LINK}>
              Open The Outreach Project app
            </a>
            <Link className="btnSoft" href="/profile?mobileReturn=account">
              Continue on web
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
