"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import {
  PRO_MEMBERSHIP_DISPLAY_NAME,
  PRO_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import {
  workosMobileSignInHref,
  workosMobileSignUpHref,
  workosSignInLink,
  workosSignUpHref,
} from "@/lib/auth/workosReturnTo";
import {
  MOBILE_MEMBERSHIP_PAYWALL_PATH,
  WEB_MEMBERSHIP_PAYWALL_PATH,
} from "@/lib/membership/protectedRoutes";
import { readRememberDevicePref } from "@/lib/auth/lastUsedEmail";
import "@/styles/mobile-splash-page.css";

/**
 * Unauthenticated welcome landing — Sign In / Create an Account only.
 * Does not render the main app shell.
 */
export default function WelcomeLandingPage({
  oauthError = "",
  onClearError,
}) {
  const [authBusy, setAuthBusy] = useState("");
  const [localError, setLocalError] = useState("");
  const isNative = isCapacitorNative();
  const rememberDevice = readRememberDevicePref();
  const membershipPath = isNative ? MOBILE_MEMBERSHIP_PAYWALL_PATH : WEB_MEMBERSHIP_PAYWALL_PATH;
  const error = localError || oauthError;

  async function startSignIn() {
    setLocalError("");
    onClearError?.();
    setAuthBusy("signin");
    try {
      if (isNative) {
        await launchWorkOSAuth(workosMobileSignInHref());
        return;
      }
      window.location.assign(workosSignInLink("/", null, "/", { rememberDevice }));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not start sign in.");
      setAuthBusy("");
    }
  }

  async function startCreateAccount() {
    setLocalError("");
    onClearError?.();
    setAuthBusy("signup");
    try {
      if (isNative) {
        await launchWorkOSAuth(workosMobileSignUpHref(membershipPath));
        return;
      }
      window.location.assign(workosSignUpHref(membershipPath, { rememberDevice }));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not start account creation.");
      setAuthBusy("");
    }
  }

  return (
    <div className="authEntryShell" data-auth-entry="welcome">
      <div className="mobileSplashPage mobileSplashPage--landing welcomeLandingPage">
        <div className="mobileSplashPage__inner">
          <div className="mobileSplashPage__brand">
            <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
          </div>
          <h1 className="mobileSplashPage__title">Welcome to the Outreach Project</h1>
          <p className="mobileSplashPage__lead">
            Connect with nonprofits, community members, trusted resources, and opportunities to make an
            impact.
          </p>
          <p className="mobileSplashPage__pricing">
            <strong>{PRO_MEMBERSHIP_DISPLAY_NAME}</strong> is {PRO_MEMBERSHIP_PRICE_LABEL} and is required
            to access the app.
          </p>
          {error ? (
            <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mobileSplashPage__actions">
            <button
              type="button"
              className="btnPrimary mobileSplashPage__btn"
              disabled={!!authBusy}
              onClick={() => void startCreateAccount()}
            >
              {authBusy === "signup" ? "Opening account setup…" : "Create an Account"}
            </button>
            <button
              type="button"
              className="btnSoft mobileSplashPage__btn"
              disabled={!!authBusy}
              onClick={() => void startSignIn()}
            >
              {authBusy === "signin" ? "Opening sign in…" : "Sign In"}
            </button>
          </div>
          <p className="mobileSplashPage__legal">
            By continuing you agree to our <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
