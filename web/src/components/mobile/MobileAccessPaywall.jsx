"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import {
  APP_ACCESS_MEMBERSHIP_DISPLAY_NAME,
  APP_ACCESS_MEMBERSHIP_PRICE_LABEL,
} from "@/lib/membership/appAccess";
import { hasMobileAppAccess } from "@/lib/membership/appAccess";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { useMobileShell } from "@/hooks/useMobileShell";

export default function MobileAccessPaywall() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loadingProfile, profile, entitlements } = useProfileData();
  const isMobileShell = useMobileShell();
  const isNative = isCapacitorNative();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checkoutResult = searchParams.get("checkout");

  useEffect(() => {
    if (!isMobileShell && !isNative) {
      router.replace("/");
    }
  }, [isMobileShell, isNative, router]);

  useEffect(() => {
    if (loadingProfile) return;
    if (!isAuthenticated) {
      router.replace("/mobile");
      return;
    }
    if (
      hasMobileAppAccess(profile, { isPlatformAdmin: !!entitlements?.isPlatformAdmin })
      && checkoutResult !== "cancel"
    ) {
      router.replace("/");
    }
  }, [loadingProfile, isAuthenticated, profile, entitlements, checkoutResult, router]);

  async function startAccessCheckout() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "access", returnPath: "/mobile/access" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.error === "access_billing_not_configured" || data.error === "price_not_configured") {
        setError(
          "App Access checkout is being configured in Stripe. Please try again shortly or contact support@theoutreachproject.app.",
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

  if (!isMobileShell && !isNative) return null;

  return (
    <div className="mobileSplashPage mobileSplashPage--access">
      <div className="mobileSplashPage__inner">
        <div className="mobileSplashPage__brand mobileSplashPage__brand--small">
          <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
        </div>
        <h1 className="mobileSplashPage__title">Activate App Access</h1>
        <p className="mobileSplashPage__lead">
          All mobile app users need an active {APP_ACCESS_MEMBERSHIP_DISPLAY_NAME} membership (
          {APP_ACCESS_MEMBERSHIP_PRICE_LABEL}).
        </p>
        <ul className="mobileSplashPage__benefits">
          <li>Full access to sponsors, trusted resources, and community</li>
          <li>Save favorites and sync your profile</li>
          <li>Optional Support ($1/mo) and Pro ($5.99/mo) upgrades later</li>
        </ul>
        {checkoutResult === "success" ? (
          <p className="mobileSplashPage__notice" role="status">
            Payment received — finishing setup…
          </p>
        ) : null}
        {checkoutResult === "cancel" ? (
          <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="status">
            Checkout was canceled. App access requires an active membership.
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
            disabled={busy || loadingProfile}
          >
            {busy ? "Redirecting to checkout…" : `Continue — ${APP_ACCESS_MEMBERSHIP_PRICE_LABEL}`}
          </button>
          <button type="button" className="btnSoft mobileSplashPage__btn" onClick={() => router.push("/mobile")}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
