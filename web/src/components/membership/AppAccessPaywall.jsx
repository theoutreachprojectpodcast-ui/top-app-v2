"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import {
  PRO_MEMBERSHIP_DISPLAY_NAME,
  PRO_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import { hasMobileAppAccess, navCacheHasFreeAccess } from "@/lib/membership/appAccess";
import { sanitizeAuthReturnPath } from "@/lib/auth/authReturnPath";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

const SESSION_WAIT_MAX_MS = 10_000;
const CHECKOUT_POLL_MS = 1_500;
const CHECKOUT_POLL_MAX_MS = 45_000;

const PRO_BENEFITS = [
  "Full nonprofit directory access",
  "Community access and posting",
  "Saved organizations",
  "Member connections",
  "Trusted resources",
  "Podcast and sponsor content",
  "Full profile and app access",
];

/**
 * Pro Membership purchase screen ($5.99/yr). No skip into the main app.
 * @param {{ checkoutReturnPath: string, postAccessPath: string, backHref?: string, backLabel?: string }} props
 */
export default function AppAccessPaywall({
  checkoutReturnPath,
  postAccessPath,
  backHref = "/",
  backLabel = "Sign out",
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

  const proCheckoutEnabled = billingCapabilities?.tierCheckout?.member?.enabled === true;
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
      router.replace("/");
      return;
    }

    const profileHydrated = !!String(profile?.profileRecordId || "").trim();
    const hasAccess =
      !!cache?.hasFreeAccess ||
      !!entitlements?.fullPlatformAccess ||
      !!entitlements?.isPlatformAdmin ||
      !!entitlements?.isPrivilegedStaff ||
      (profileHydrated &&
        (navCacheHasFreeAccess(profile, entitlements) ||
          hasMobileAppAccess(profile, {
            isPlatformAdmin: !!entitlements?.isPlatformAdmin,
            isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
          })));

    // Wait for profile hydration before deciding the user still needs checkout.
    if (!hasAccess && !profileHydrated && !sessionWaitTimedOut) return;

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
    entitlements,
    checkoutResult,
    router,
    postAccessPath,
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
            if (st === "active" && ["member", "sponsor"].includes(tier)) {
              router.replace(postAccessPath);
              return;
            }
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, CHECKOUT_POLL_MS));
      }
      if (!cancelled) {
        setCheckoutPolling(false);
        setError(
          "Payment may still be processing. Tap Refresh access in a moment, or contact support if this continues.",
        );
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [checkoutResult, checkoutPolling, postAccessPath, refreshAuth, refreshWorkOSProfile, router]);

  async function startCheckout() {
    setError("");
    setBusyTier("member");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "member", returnPath: checkoutReturnPath }),
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
        data.error === "support_checkout_retired" ||
        data.error === "support_checkout_disabled" ||
        data.error === "checkout_disabled"
      ) {
        setError(
          data.message ||
            "Membership checkout is temporarily unavailable. Please try again shortly or contact support@theoutreachproject.app.",
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

  async function refreshAccess() {
    setError("");
    setBusyTier("refresh");
    try {
      await Promise.all([refreshAuth({ soft: false }), refreshWorkOSProfile()]);
      const res = await fetch("/api/me", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data.authenticated && data.profile) {
        const st = String(data.profile.membershipBillingStatus || "").toLowerCase();
        const tier = String(data.profile.membershipTier || "").toLowerCase();
        if (st === "active" && ["member", "sponsor"].includes(tier)) {
          router.replace(postAccessPath);
          return;
        }
      }
      setError("Membership is not active yet. Complete checkout, then tap Refresh access.");
    } catch {
      setError("Could not refresh membership. Try again.");
    } finally {
      setBusyTier("");
    }
  }

  function handleSignOut() {
    const dest = sanitizeAuthReturnPath(backHref, "/");
    window.location.assign(`/sign-out?returnTo=${encodeURIComponent(dest)}`);
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
            ? "Activating your access…"
            : "Checking your membership…"
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
    <div className="authEntryShell" data-auth-entry="membership">
      <div className="mobileSplashPage mobileSplashPage--access">
        <div className="mobileSplashPage__inner">
          <div className="mobileSplashPage__brand mobileSplashPage__brand--small">
            <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
          </div>
          <h1 className="mobileSplashPage__title">{PRO_MEMBERSHIP_DISPLAY_NAME}</h1>
          <p className="mobileSplashPage__lead">
            Activate your annual membership to enter the Outreach Project. Secure checkout is handled by Stripe.
          </p>
          <section className="mobileSplashPage__tierCard mobileSplashPage__tierCard--pro" aria-labelledby="pro-tier-heading">
            <h2 id="pro-tier-heading" className="mobileSplashPage__tierTitle">
              {PRO_MEMBERSHIP_DISPLAY_NAME}
            </h2>
            <p className="mobileSplashPage__tierPrice">{PRO_MEMBERSHIP_PRICE_LABEL}</p>
            <ul className="mobileSplashPage__benefits">
              {PRO_BENEFITS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          {checkoutResult === "success" ? (
            <p className="mobileSplashPage__notice" role="status">
              Payment received — activating your access…
            </p>
          ) : null}
          {checkoutResult === "cancel" ? (
            <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="status">
              Checkout was canceled. Complete purchase to continue.
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
              onClick={() => void startCheckout()}
              disabled={!!busyTier || billingCapabilities === null || !proCheckoutEnabled}
              title={!proCheckoutEnabled ? "Checkout unavailable" : undefined}
            >
              {busyTier === "member"
                ? "Preparing secure checkout…"
                : billingCapabilities === null
                  ? "Loading checkout…"
                  : `Continue — ${PRO_MEMBERSHIP_PRICE_LABEL}`}
            </button>
            <button
              type="button"
              className="btnSoft mobileSplashPage__btn"
              onClick={() => void refreshAccess()}
              disabled={!!busyTier}
            >
              {busyTier === "refresh" ? "Refreshing…" : "Refresh access"}
            </button>
            <button type="button" className="btnSoft mobileSplashPage__btn" onClick={handleSignOut} disabled={!!busyTier}>
              {backLabel}
            </button>
          </div>
          <p className="mobileSplashPage__legal">
            Membership renews annually. You can manage billing from your profile after access is active.
          </p>
        </div>
      </div>
    </div>
  );
}
