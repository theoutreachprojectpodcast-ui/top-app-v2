"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { TORP_OAUTH_BROWSER_PENDING, TORP_OAUTH_STATE_KEY } from "@/lib/auth/oauthMobileHandoff";
import { TORP_OAUTH_RETURN_KEY } from "@/components/capacitor/MobileOAuthSessionResume";

const POLL_MS = 400;
const BROWSER_FINISHED_RETRIES_MS = [0, 150, 350, 700, 1200];

async function pollOAuthPending(stateKey) {
  const url = `/api/mobile/oauth-handoff?key=${encodeURIComponent(stateKey)}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function isOAuthPending() {
  return (
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem(TORP_OAUTH_BROWSER_PENDING) === "1" &&
    !!sessionStorage.getItem(TORP_OAUTH_STATE_KEY)
  );
}

function completeInWebView(data) {
  sessionStorage.removeItem(TORP_OAUTH_BROWSER_PENDING);
  sessionStorage.removeItem(TORP_OAUTH_STATE_KEY);
  sessionStorage.setItem(TORP_OAUTH_RETURN_KEY, "1");

  if (data?.bridge) {
    window.location.replace(String(data.bridge));
    return Promise.resolve();
  }

  const code = String(data?.code || "").trim();
  const state = String(data?.state || "").trim();
  if (!code || !state) {
    return Promise.reject(new Error("Incomplete sign-in response."));
  }

  const qs = new URLSearchParams({ code, state });
  return fetch(`/callback?${qs.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "x-top-callback-fetch": "1",
    },
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) {
      const msg = String(body?.message || body?.error || "").trim();
      throw new Error(msg || "Could not complete sign in.");
    }
    const redirectTo = String(body.redirectTo || "/").trim() || "/";
    if (redirectTo.startsWith("http://") || redirectTo.startsWith("https://")) {
      window.location.replace(redirectTo);
      return;
    }
    window.location.replace(redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`);
  });
}

/**
 * Polls until the in-app browser saves OAuth code/state, then finishes sign-in in the WebView.
 */
export default function MobileOAuthBrowserFinish() {
  const claimedRef = useRef(false);
  const pollIdRef = useRef(0);

  useEffect(() => {
    if (!isCapacitorNative() || typeof sessionStorage === "undefined") return undefined;

    const stopPolling = () => {
      if (pollIdRef.current) {
        window.clearInterval(pollIdRef.current);
        pollIdRef.current = 0;
      }
    };

    const tryFinish = async () => {
      if (claimedRef.current || !isOAuthPending()) {
        stopPolling();
        return false;
      }

      const stateKey = sessionStorage.getItem(TORP_OAUTH_STATE_KEY);
      if (!stateKey) return false;

      const { res, data } = await pollOAuthPending(stateKey);
      if (!res.ok || !data?.ok) return false;

      claimedRef.current = true;
      stopPolling();

      try {
        await Browser.close();
      } catch {
        /* sheet may already be closed */
      }

      try {
        await completeInWebView(data);
      } catch (err) {
        sessionStorage.removeItem(TORP_OAUTH_BROWSER_PENDING);
        sessionStorage.removeItem(TORP_OAUTH_STATE_KEY);
        const msg = err instanceof Error ? err.message : "Could not complete sign in.";
        window.location.replace(`/mobile?oauth_error=${encodeURIComponent(msg || "Sign-in failed.")}`);
      }
      return true;
    };

    const startPollingIfNeeded = () => {
      if (!isOAuthPending() || pollIdRef.current) return;
      pollIdRef.current = window.setInterval(() => {
        void tryFinish();
      }, POLL_MS);
      void tryFinish();
    };

    const tryFinishWithRetries = async () => {
      for (const delay of BROWSER_FINISHED_RETRIES_MS) {
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        if (await tryFinish()) return;
      }

      if (claimedRef.current || !isOAuthPending()) return;

      sessionStorage.removeItem(TORP_OAUTH_BROWSER_PENDING);
      sessionStorage.removeItem(TORP_OAUTH_STATE_KEY);
      window.location.replace(
        `/mobile?oauth_error=${encodeURIComponent("Sign-in did not finish. Please try again.")}`,
      );
    };

    startPollingIfNeeded();

    const browserListener = Browser.addListener("browserFinished", () => {
      void tryFinishWithRetries();
    });

    const appListener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        startPollingIfNeeded();
        void tryFinish();
      }
    });

    return () => {
      stopPolling();
      void browserListener.then((handle) => handle.remove());
      void appListener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
