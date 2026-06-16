"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import {
  APP_ACCESS_MEMBERSHIP_DISPLAY_NAME,
  APP_ACCESS_MEMBERSHIP_PRICE_LABEL,
} from "@/lib/membership/appAccess";
import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import { workosMobileSignInHref, workosMobileSignUpHref } from "@/lib/auth/workosReturnTo";
import { mobileOAuthSplashErrorMessage } from "@/lib/auth/workosCallbackErrors";
import { useMobileShell } from "@/hooks/useMobileShell";

export default function MobileSplashPage() {
  const router = useRouter();
  const isMobileShell = useMobileShell();
  const isNative = isCapacitorNative();
  const [clientReady, setClientReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthErr = String(params.get("oauth_error") || "").trim();
    if (!oauthErr) return;
    setAuthError(mobileOAuthSplashErrorMessage(oauthErr) || oauthErr);
    params.delete("oauth_error");
    const qs = params.toString();
    router.replace(qs ? `/mobile?${qs}` : "/mobile", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!clientReady || isNative) return;
    if (!isMobileShell) {
      router.replace("/");
    }
  }, [clientReady, isMobileShell, isNative, router]);

  async function signIn() {
    setAuthError("");
    setAuthBusy(true);
    try {
      await launchWorkOSAuth(workosMobileSignInHref());
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not start sign in.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function createAccount() {
    setAuthError("");
    setAuthBusy(true);
    try {
      await launchWorkOSAuth(workosMobileSignUpHref());
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not start sign in.");
    } finally {
      setAuthBusy(false);
    }
  }

  if (!clientReady || authBusy) {
    return <AuthLoadingOverlay visible variant={authBusy ? "authLaunch" : "generic"} />;
  }

  if (!isMobileShell && !isNative) {
    return null;
  }

  return (
    <div className="mobileSplashPage mobileSplashPage--landing">
      <div className="mobileSplashPage__inner">
        <div className="mobileSplashPage__brand">
          <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
        </div>
        <h1 className="mobileSplashPage__title">The Outreach Project</h1>
        <p className="mobileSplashPage__lead">
          Veterans, sponsors, trusted resources, and community — in one app.
        </p>
        <p className="mobileSplashPage__pricing">
          <strong>{APP_ACCESS_MEMBERSHIP_DISPLAY_NAME}</strong> — {APP_ACCESS_MEMBERSHIP_PRICE_LABEL} required for web
          and app access. Support and Pro are optional upgrades for members.
        </p>
        {authError ? (
          <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="alert">
            {authError}
          </p>
        ) : null}
        <div className="mobileSplashPage__actions">
          <button type="button" className="btnPrimary mobileSplashPage__btn" disabled={authBusy} onClick={() => void signIn()}>
            {authBusy ? "Opening sign in…" : "Sign in"}
          </button>
          <button type="button" className="btnSoft mobileSplashPage__btn" disabled={authBusy} onClick={() => void createAccount()}>
            Create account
          </button>
        </div>
        <p className="mobileSplashPage__legal">
          By continuing you agree to our{" "}
          <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
