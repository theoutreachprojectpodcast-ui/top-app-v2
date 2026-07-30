"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WelcomeLandingPage from "@/components/membership/WelcomeLandingPage";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { mobileOAuthSplashErrorMessage } from "@/lib/auth/workosCallbackErrors";
import { useMobileShell } from "@/hooks/useMobileShell";
import "@/styles/mobile-splash-page.css";

/**
 * Legacy `/mobile` splash — same welcome experience as `/` for guests.
 * Native Capacitor cold-starts prefer `/` via AppEntryBootstrap.
 */
export default function MobileSplashPage() {
  const router = useRouter();
  const isMobileShell = useMobileShell();
  const isNative = isCapacitorNative();
  const [clientReady, setClientReady] = useState(false);
  const [oauthError, setOauthError] = useState("");

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthErr = String(params.get("oauth_error") || "").trim();
    if (!oauthErr) return;
    setOauthError(mobileOAuthSplashErrorMessage(oauthErr) || oauthErr);
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

  if (!clientReady) {
    return <AuthLoadingOverlay visible variant="generic" />;
  }

  if (!isMobileShell && !isNative) {
    return null;
  }

  return (
    <WelcomeLandingPage oauthError={oauthError} onClearError={() => setOauthError("")} />
  );
}
