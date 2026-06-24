"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import {
  SUPPORT_MEMBERSHIP_DISPLAY_NAME,
  SUPPORT_MEMBERSHIP_PRICE_LABEL,
  PRO_MEMBERSHIP_DISPLAY_NAME,
  PRO_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import { hasMobileAppAccess, navCacheHasFreeAccess } from "@/lib/membership/appAccess";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

const SESSION_WAIT_MAX_MS = 10_000;
const CHECKOUT_POLL_MS = 1_500;
const CHECKOUT_POLL_MAX_MS = 45_000;

/**
 * App Access paywall — Support Annual + Pro Membership required before using the product.
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
  const { loading: authLoading, authenticated: authAuthenticated, refresh: refreshAuth } = useAuthSession();
  const { isAuthenticated, loadingProfile, profile, entitlements, refreshWorkOSProfile } = useProfileData();
  const [clientReady, setClientReady] = useState(false);
  const [sessionWaitTimedOut, setSessionWaitTimedOut] = useState(false);
  const [busyTier, setBusyTier] = useState("");
  const [error, setError] = useState("");
  const [checkoutPolling, setCheckoutPolling] = useState(false);
  const checkoutPollStartedRef = useRef(0);

  const checkoutResult = searchParams.get("checkout");

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return undefined;
    if (!loadingProfile && !authLoading) {
      setSessionWaitTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSessionWaitTimedOut(true), SESSION_WAIT_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [clientReady, loadingProfile, authLoading]);

  useEffect(() => {
    if (!clientReady) return;
    const waiting = loadingProfile || authLoading;
    if (waiting && !sessionWaitTimedOut) return;

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
    sessionWaitTimedOut,
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

  useEffect(() => {
    if (checkoutResult !== "success" || checkoutPolling) return undefined;
    let cancelled = false;
    checkoutPollStartedRef.current = Date.now();
    setCheckoutPolling(true);

    const poll = async () => {
      while (!cancelled && Date.now() - checkoutPollStartedRef.current < CHECKOUT_POLL_MAX_MS) {
        try {
          await Promise.all([refreshAuth({ soft: true }), refreshWorkOSProfile()]);
          const res = await fetch("/api/me", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => ({}));
          if (data.authenticated && data.profile) {
            const st = String(data.profile.membershipBillingStatus || "").toLowerCase();
            const tier = String(data.profile.membershipTier || "").toLowerCase();
            if (st === "active" && ["support", "member", "access", "sponsor"].includes(tier)) {
              router.replace(postAccessPath);
              return;
            }
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, CHECKOUT_POLL_MS));
      }
      if (!cancelled) setCheckoutPolling(false);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [checkoutResult, checkoutPolling, postAccessPath, refreshAuth, refreshWorkOSProfile, router]);

  async function startCheckout(tier) {
    setError("");
    setBusyTier(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, returnPath: checkoutReturnPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.error === "access_billing_not_configured" || data.error === "billing_not_configured" || data.error === "price_not_configured") {
        setError(
          "Membership checkout is being configured in Stripe. Please try again shortly or contact support@theoutreachproject.app.",
        );
        return;
      }
      setError(data.message || "Could not start checkout. Please try again.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusyTier("");
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
    !clientReady ||
    (signedInHint && (loadingProfile || authLoading) && !sessionWaitTimedOut) ||
    (hasAccessHint && checkoutResult !== "cancel") ||
    checkoutPolling;

  if (waitingForSession) {
    return (
      <AuthLoadingOverlay
        visible
        variant={checkoutResult === "success" || checkoutPolling ? "authVerify" : "session"}
        loadingLabel={
          checkoutResult === "success" || checkoutPolling
            ? "Activating your membership…"
            : undefined
        }
        error={sessionWaitTimedOut && signedInHint && loadingProfile}
        errorMessage="Your profile is taking longer than expected to load."
        onRetry={
          sessionWaitTimedOut
            ? () => {
                setSessionWaitTimedOut(false);
                void Promise.all([refreshAuth({ soft: false }), refreshWorkOSProfile()]);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="mobileSplashPage mobileSplashPage--access">
      <div className="mobileSplashPage__inner">
        <div className="mobileSplashPage__brand mobileSplashPage__brand--small">
          <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
        </div>
        <h1 className="mobileSplashPage__title">Choose your membership</h1>
        <p className="mobileSplashPage__lead">
          Select Support Annual or Pro Membership to use The Outreach Project on the web and in the mobile app.
        </p>
        <ul className="mobileSplashPage__benefits">
          <li>
            <strong>{SUPPORT_MEMBERSHIP_DISPLAY_NAME}</strong> ({SUPPORT_MEMBERSHIP_PRICE_LABEL}) — full platform access
          </li>
          <li>
            <strong>{PRO_MEMBERSHIP_DISPLAY_NAME}</strong> ({PRO_MEMBERSHIP_PRICE_LABEL}) — community posting and premium tools
          </li>
        </ul>
        {checkoutResult === "success" ? (
          <p className="mobileSplashPage__notice" role="status">
            Payment received — finishing setup…
          </p>
        ) : null}
        {checkoutResult === "cancel" ? (
          <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="status">
            Checkout was canceled. Choose a membership to continue.
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
            onClick={() => startCheckout("support")}
            disabled={!!busyTier}
          >
            {busyTier === "support" ? "Redirecting to checkout…" : `${SUPPORT_MEMBERSHIP_DISPLAY_NAME} — ${SUPPORT_MEMBERSHIP_PRICE_LABEL}`}
          </button>
          <button
            type="button"
            className="btnSoft mobileSplashPage__btn"
            onClick={() => startCheckout("member")}
            disabled={!!busyTier}
          >
            {busyTier === "member" ? "Redirecting to checkout…" : `${PRO_MEMBERSHIP_DISPLAY_NAME} — ${PRO_MEMBERSHIP_PRICE_LABEL}`}
          </button>
          <button type="button" className="btnSoft mobileSplashPage__btn" onClick={() => router.push(backHref)}>
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
