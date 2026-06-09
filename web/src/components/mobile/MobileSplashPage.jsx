"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import {
  APP_ACCESS_MEMBERSHIP_DISPLAY_NAME,
  APP_ACCESS_MEMBERSHIP_PRICE_LABEL,
} from "@/lib/membership/appAccess";
import { workosSignUpHref } from "@/lib/auth/workosReturnTo";
import { useMobileShell } from "@/hooks/useMobileShell";

export default function MobileSplashPage() {
  const router = useRouter();
  const isMobileShell = useMobileShell();
  const isNative = isCapacitorNative();

  useEffect(() => {
    if (!isMobileShell && !isNative) {
      router.replace("/");
    }
  }, [isMobileShell, isNative, router]);

  function signIn() {
    window.location.assign("/api/auth/workos/signin?returnTo=%2Fmobile%2Faccess");
  }

  function createAccount() {
    window.location.assign(workosSignUpHref("/mobile/access"));
  }

  if (!isMobileShell && !isNative) {
    return null;
  }

  return (
    <div className="mobileSplashPage">
      <div className="mobileSplashPage__inner">
        <div className="mobileSplashPage__brand">
          <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
        </div>
        <h1 className="mobileSplashPage__title">The Outreach Project</h1>
        <p className="mobileSplashPage__lead">
          Veterans, sponsors, trusted resources, and community — in one app.
        </p>
        <p className="mobileSplashPage__pricing">
          <strong>{APP_ACCESS_MEMBERSHIP_DISPLAY_NAME}</strong> — {APP_ACCESS_MEMBERSHIP_PRICE_LABEL} required for app
          access. Support and Pro are optional upgrades for members.
        </p>
        <div className="mobileSplashPage__actions">
          <button type="button" className="btnPrimary mobileSplashPage__btn" onClick={signIn}>
            Sign in
          </button>
          <button type="button" className="btnSoft mobileSplashPage__btn" onClick={createAccount}>
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
