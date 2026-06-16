"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import {
  SUPPORT_MEMBERSHIP_DISPLAY_NAME,
  SUPPORT_MEMBERSHIP_PRICE_LABEL,
  PRO_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import { hasMobileAppAccess, navCacheHasFreeAccess } from "@/lib/membership/appAccess";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

/**
 * App Access paywall — $5.99/yr required on web and mobile before using the product.
 * @param {{ checkoutReturnPath: string, postAccessPath: string, backHref?: string, backLabel?: string }} props
 */
export default function AppAccessPaywall({
  checkoutReturnPath,
  postAccessPath,
  backHref = "/",
  backLabel = "Back",
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading, authenticated: authAuthenticated } = useAuthSession();
  const { isAuthenticated, loadingProfile, profile, entitlements } = useProfileData();
  const [clientReady, setClientReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checkoutResult = searchParams.get("checkout");

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    if (loadingProfile || authLoading) return;

    const cache = readNavAuthCache();
    const sessionHint = !!cache?.authenticated;
    const signedIn = isAuthenticated || authAuthenticated || sessionHint;
    if (!signedIn) {
      router.replace(backHref === "/mobile" ? "/mobile" : `/login?returnTo=${encodeURIComponent(checkoutReturnPath)}`);
      return;
    }

    const hasAccess =
      cache?.hasFreeAccess ||
      navCacheHasFreeAccess(profile, entitlements) ||
      hasMobileAppAccess(profile, {
        isPlatformAdmin: !!entitlements?.isPlatformAdmin,
        isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
      });
    if (hasAccess && checkoutResult !== "cancel") {
      router.replace(postAccessPath);
    }
  }, [
    clientReady,
    loadingProfile,
    authLoading,
    isAuthenticated,
    authAuthenticated,
    profile,
    entitlements?.isPlatformAdmin,
    entitlements?.isPrivilegedStaff,
    checkoutResult,
    router,
    checkoutReturnPath,
    postAccessPath,
    backHref,
  ]);

  async function startAccessCheckout() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "support", returnPath: checkoutReturnPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.error === "access_billing_not_configured" || data.error === "billing_not_configured" || data.error === "price_not_configured") {
        setError(
          "Support Membership checkout is being configured in Stripe. Please try again shortly or contact support@theoutreachproject.app.",
        );
        return;
      }
      setError(data.message || "Could not start checkout. Please try again.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const cache = readNavAuthCache();
  const sessionHint = !!cache?.authenticated;
  const signedInHint = isAuthenticated || authAuthenticated || sessionHint;
  const hasAccessHint =
    cache?.hasFreeAccess ||
    navCacheHasFreeAccess(profile, entitlements) ||
    !!entitlements?.isPlatformAdmin ||
    !!entitlements?.isPrivilegedStaff;
  const waitingForSession =
    !clientReady || (signedInHint && (loadingProfile || authLoading)) || (hasAccessHint && checkoutResult !== "cancel");

  if (waitingForSession) {
    return <AuthLoadingOverlay visible variant="session" />;
  }

  return (
    <div className="mobileSplashPage mobileSplashPage--access">
      <div className="mobileSplashPage__inner">
        <div className="mobileSplashPage__brand mobileSplashPage__brand--small">
          <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
        </div>
        <h1 className="mobileSplashPage__title">Activate Support Membership</h1>
        <p className="mobileSplashPage__lead">
          {SUPPORT_MEMBERSHIP_DISPLAY_NAME} ({SUPPORT_MEMBERSHIP_PRICE_LABEL}) is required to use The Outreach Project on
          the web and in the mobile app.
        </p>
        <ul className="mobileSplashPage__benefits">
          <li>Trusted resources, nonprofit directory, and community browsing</li>
          <li>Save favorites and sync your profile across devices</li>
          <li>Optional Pro upgrade ({PRO_MEMBERSHIP_PRICE_LABEL}) for posting and premium tools</li>
        </ul>
        {checkoutResult === "success" ? (
          <p className="mobileSplashPage__notice" role="status">
            Payment received — finishing setup…
          </p>
        ) : null}
        {checkoutResult === "cancel" ? (
          <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="status">
            Checkout was canceled. Support Membership is required to continue.
          </p>
        ) : null}
        {error ? (
          <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mobileSplashPage__actions">
          <button
            type="button"
            className="btnPrimary mobileSplashPage__btn"
            onClick={startAccessCheckout}
            disabled={busy || loadingProfile || authLoading}
          >
            {busy ? "Redirecting to checkout…" : `Continue — ${SUPPORT_MEMBERSHIP_PRICE_LABEL}`}
          </button>
          <button type="button" className="btnSoft mobileSplashPage__btn" onClick={() => router.push(backHref)}>
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
