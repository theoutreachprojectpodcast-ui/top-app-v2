"use client";

import { useCallback, useEffect, useState } from "react";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { PRODUCTION_APEX_HOST } from "@/lib/runtime/appUrls";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isOAuthInProgress } from "@/lib/auth/oauthInProgress";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";

const HEALTH_PATH = "/api/health/mobile";
const CHECK_TIMEOUT_MS = 8000;

/**
 * Capacitor-only: verify production is reachable before first auth. Skips during OAuth or known session.
 */
export default function MobileProductionHealthGate() {
  const native = isCapacitorNative();
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const runCheck = useCallback(async () => {
    setChecking(true);
    setBlocked(false);
    setMessage("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    try {
      const res = await fetch(HEALTH_PATH, { cache: "no-store", signal: controller.signal });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setBlocked(true);
        setMessage(
          `Cannot reach The Outreach Project servers (${PRODUCTION_APEX_HOST}). Check your connection and try again.`,
        );
        return;
      }
      setBlocked(false);
    } catch {
      setBlocked(true);
      setMessage(
        `Server connection failed. Confirm you are online and using ${PRODUCTION_APEX_HOST} (with “the”).`,
      );
    } finally {
      window.clearTimeout(timer);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!native) return undefined;
    if (isOAuthInProgress() || readNavAuthCache()?.authenticated) {
      setChecking(false);
      setBlocked(false);
      return undefined;
    }
    setChecking(true);
    void runCheck();
    return undefined;
  }, [native, runCheck]);

  if (!native || (!checking && !blocked)) return null;

  return (
    <AuthLoadingOverlay
      visible
      variant="health"
      error={blocked}
      errorMessage={message}
      onRetry={blocked ? () => void runCheck() : undefined}
    />
  );
}
