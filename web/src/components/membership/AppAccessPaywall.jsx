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
import { sanitizeAuthReturnPath } from "@/lib/auth/authReturnPath";
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
  backLabel = "Not now",
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
  const [billingCapabilities, setBillingCapabilities] = useState(null);
  const checkoutPollStartedRef = useRef(0);

  const supportCheckoutEnabled = billingCapabilities?.tierCheckout?.support?.enabled === true;
  const proCheckoutEnabled = billingCapabilities?.tierCheckout?.member?.enabled === true;
  const supportCheckoutMessage =
    billingCapabilities?.tierCheckout?.support?.message ||
    (billingCapabilities?.supportCheckoutDisabled
      ? "Support Membership checkout is temporarily disabled while pricing is verified."
      : "");

  const checkoutResult = searchParams.get("checkout");

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/capabilities", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setBillingCapabilities(data);
      } catch {
        if (!cancelled) setBillingCapabilities({ ok: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientReady]);

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
      const loginReturn = sanitizeAuthReturnPath(checkoutReturnPath, "/");
      router.replace(backHref === "/mobile" ? "/mobile" : `/sign-in?returnTo=${encodeURIComponent(loginReturn)}`);
      return;
    }

    const hasAccess =
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
      if (
        data.error === "access_billing_not_configured" ||
        data.error === "billing_not_configured" ||
        data.error === "price_not_configured" ||
        data.error === "price_validation_failed" ||
        data.error === "blocked_price_id" ||
        data.error === "amount_mismatch" ||
        data.error === "support_checkout_disabled" ||
        data.error === "checkout_disabled"
      ) {
        setError(
          data.message ||
            "Membership checkout is temporarily unavailable while we verify billing. Please try again shortly or contact support@theoutreachproject.app.",
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

  function handleDecline() {
    const dest = sanitizeAuthReturnPath(backHref, "/");
    const cache = readNavAuthCache();
    const sessionHint = !!cache?.authenticated;
    const signedIn = isAuthenticated || authAuthenticated || sessionHint;
    if (signedIn) {
      window.location.assign(`/sign-out?returnTo=${encodeURIComponent(dest)}`);
      return;
    }
    router.push(dest);
  }

  const cache = readNavAuthCache();
  const sessionHint = !!cache?.authenticated;
  const signedInHint = isAuthenticated || authAuthenticated || sessionHint;
  const waitingForSession =
    !clientReady ||
    (signedInHint && (loadingProfile || authLoading) && !sessionWaitTimedOut) ||
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
      <div className="mobileSplashPage__topBar">
        <button type="button" className="mobileSplashPage__backBtn" onClick={handleDecline}>
          ← {backLabel}
        </button>
      </div>
      <div className="mobileSplashPage__inner">
        <div className="mobileSplashPage__brand mobileSplashPage__brand--small">
          <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
        </div>
        <h1 className="mobileSplashPage__title">Choose your membership</h1>
        <p className="mobileSplashPage__lead">
          The Outreach Project requires an active membership. Select Support or Pro to continue.
        </p>
        <div className="mobileSplashPage__tierGrid">
          <section className="mobileSplashPage__tierCard" aria-labelledby="support-tier-heading">
            <h2 id="support-tier-heading" className="mobileSplashPage__tierTitle">
              {SUPPORT_MEMBERSHIP_DISPLAY_NAME}
            </h2>
            <p className="mobileSplashPage__tierPrice">{SUPPORT_MEMBERSHIP_PRICE_LABEL}</p>
            <ul className="mobileSplashPage__benefits">
              <li>Nonprofit directory search and exploration</li>
              <li>Podcast episodes, guests, and guest applications</li>
              <li>Saving organizations, community, exclusive podcast content, and trusted resources are Pro-only</li>
            </ul>
          </section>
          <section className="mobileSplashPage__tierCard mobileSplashPage__tierCard--pro" aria-labelledby="pro-tier-heading">
            <h2 id="pro-tier-heading" className="mobileSplashPage__tierTitle">
              {PRO_MEMBERSHIP_DISPLAY_NAME}
            </h2>
            <p className="mobileSplashPage__tierPrice">{PRO_MEMBERSHIP_PRICE_LABEL}</p>
            <ul className="mobileSplashPage__benefits">
              <li>Everything in Support</li>
              <li>Save favorite nonprofits</li>
              <li>Create and submit community posts</li>
              <li>Pro-exclusive podcast content (YouTube playlist integration)</li>
              <li>Podcast sponsor opportunities</li>
              <li>Trusted resource discounts and partner offers</li>
            </ul>
          </section>
        </div>
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
        {supportCheckoutMessage && !supportCheckoutEnabled ? (
          <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="status">
            {supportCheckoutMessage}
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
            disabled={!!busyTier || billingCapabilities === null || !supportCheckoutEnabled}
            title={!supportCheckoutEnabled ? supportCheckoutMessage || "Support checkout unavailable" : undefined}
          >
            {busyTier === "support"
              ? "Redirecting to checkout…"
              : billingCapabilities === null
                ? "Loading checkout…"
                : `${SUPPORT_MEMBERSHIP_DISPLAY_NAME} — ${SUPPORT_MEMBERSHIP_PRICE_LABEL}`}
          </button>
          <button
            type="button"
            className="btnSoft mobileSplashPage__btn"
            onClick={() => startCheckout("member")}
            disabled={!!busyTier || billingCapabilities === null || !proCheckoutEnabled}
            title={!proCheckoutEnabled ? "Pro checkout unavailable" : undefined}
          >
            {busyTier === "member"
              ? "Redirecting to checkout…"
              : billingCapabilities === null
                ? "Loading checkout…"
                : `${PRO_MEMBERSHIP_DISPLAY_NAME} — ${PRO_MEMBERSHIP_PRICE_LABEL}`}
          </button>
          <button type="button" className="btnSoft mobileSplashPage__btn" onClick={handleDecline}>
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
