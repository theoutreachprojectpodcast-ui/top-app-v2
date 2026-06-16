"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { nativeProductionAppOrigin } from "@/lib/capacitor/webAppOrigin";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { closeExternalBrowserIfOpen } from "@/lib/capacitor/openExternalUrl";
import {
  readOAuthPollKeyFromDocumentCookie,
  TORP_OAUTH_BROWSER_PENDING,
  TORP_OAUTH_STATE_KEY,
} from "@/lib/auth/oauthMobileHandoff";
import { parseOAuthBrowserDoneDeepLink } from "@/lib/auth/workosMobileRedirect";
import { TORP_OAUTH_RETURN_KEY } from "@/components/capacitor/MobileOAuthSessionResume";

const POLL_MS = 400;
const POLL_MAX_MS = 30_000;
const BROWSER_FINISHED_RETRIES_MS = [0, 200, 500, 1000, 2000, 3500, 5000, 8000, 12_000, 18_000, 25_000];

function nativeOAuthUrl(path) {
  const normalized = String(path || "").trim().startsWith("/") ? String(path).trim() : `/${String(path).trim()}`;
  return `${nativeProductionAppOrigin()}${normalized}`;
}

function resolveOAuthPollKey() {
  if (typeof sessionStorage === "undefined") return "";
  const fromSession = String(sessionStorage.getItem(TORP_OAUTH_STATE_KEY) || "").trim();
  if (fromSession) return fromSession;
  return readOAuthPollKeyFromDocumentCookie();
}

function primeOAuthPollKeyFromCookie() {
  const key = readOAuthPollKeyFromDocumentCookie();
  if (key) primeOAuthHandoff(key);
}

async function pollOAuthPending(stateKey) {
  const url = nativeOAuthUrl(`/api/mobile/oauth-handoff?key=${encodeURIComponent(stateKey)}`);
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
    !!resolveOAuthPollKey()
  );
}

function primeOAuthHandoff(stateKey) {
  if (typeof sessionStorage === "undefined") return;
  const key = String(stateKey || "").trim();
  if (!key) return;
  sessionStorage.setItem(TORP_OAUTH_STATE_KEY, key);
  sessionStorage.setItem(TORP_OAUTH_BROWSER_PENDING, "1");
}

function clearOAuthHandoffFlags() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(TORP_OAUTH_BROWSER_PENDING);
  sessionStorage.removeItem(TORP_OAUTH_STATE_KEY);
}

function completeInWebView(data) {
  clearOAuthHandoffFlags();
  sessionStorage.setItem(TORP_OAUTH_RETURN_KEY, "1");

  if (data?.complete) {
    const dest = String(data.complete);
    window.location.replace(dest.startsWith("http") ? dest : nativeOAuthUrl(dest));
    return Promise.resolve();
  }

  if (data?.bridge) {
    const dest = String(data.bridge);
    window.location.replace(dest.startsWith("http") ? dest : nativeOAuthUrl(dest));
    return Promise.resolve();
  }

  return Promise.reject(
    new Error("Sign-in did not finish in the app. Please try again."),
  );
}

function oauthErrorRedirect(message) {
  clearOAuthHandoffFlags();
  window.location.replace(
    nativeOAuthUrl(`/sign-in?oauth_error=${encodeURIComponent(message || "Sign-in failed.")}`),
  );
}

/**
 * Polls until the in-app browser saves OAuth code/state, then finishes sign-in in the WebView.
 * Also handles `://oauth/browser-done` deep links that dismiss the in-app browser sheet.
 */
export default function MobileOAuthBrowserFinish() {
  const claimedRef = useRef(false);
  const pollIdRef = useRef(0);
  const pollStartedAtRef = useRef(0);

  useEffect(() => {
    if (!isCapacitorNative() || typeof sessionStorage === "undefined") return undefined;

    const stopPolling = () => {
      if (pollIdRef.current) {
        window.clearInterval(pollIdRef.current);
        pollIdRef.current = 0;
      }
    };

    const finishFromHandoff = async (stateKey) => {
      const key = String(stateKey || "").trim();
      if (!key || claimedRef.current) return false;

      const { res, data } = await pollOAuthPending(key);
      if (!res.ok || !data?.ok) return false;

      claimedRef.current = true;
      stopPolling();

      await closeExternalBrowserIfOpen();

      try {
        await completeInWebView(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not complete sign in.";
        oauthErrorRedirect(msg);
      }
      return true;
    };

    const tryFinish = async (forcedKey = "") => {
      if (claimedRef.current) {
        stopPolling();
        return false;
      }

      const stateKey = String(forcedKey || resolveOAuthPollKey() || "").trim();
      if (!stateKey) return false;
      if (!forcedKey && !isOAuthPending()) {
        stopPolling();
        return false;
      }

      return finishFromHandoff(stateKey);
    };

    const handleBrowserDoneDeepLink = (raw) => {
      const parsed = parseOAuthBrowserDoneDeepLink(raw);
      if (!parsed?.key) return;
      primeOAuthHandoff(parsed.key);
      void (async () => {
        await closeExternalBrowserIfOpen();
        for (const delay of BROWSER_FINISHED_RETRIES_MS) {
          if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
          if (await tryFinish(parsed.key)) return;
        }
        if (!claimedRef.current) {
          oauthErrorRedirect("Sign-in did not finish. Please try again.");
        }
      })();
    };

    const startPollingIfNeeded = () => {
      if (!isOAuthPending() || pollIdRef.current) return;
      pollStartedAtRef.current = Date.now();
      pollIdRef.current = window.setInterval(() => {
        if (Date.now() - pollStartedAtRef.current > POLL_MAX_MS) {
          stopPolling();
          if (!claimedRef.current && isOAuthPending()) {
            oauthErrorRedirect("Sign-in timed out. Please try again.");
          }
          return;
        }
        void tryFinish();
      }, POLL_MS);
      void tryFinish();
    };

    const tryFinishWithRetries = async () => {
      for (const delay of BROWSER_FINISHED_RETRIES_MS) {
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        if (await tryFinish()) return;
      }

      if (claimedRef.current) return;
      if (isOAuthPending()) {
        oauthErrorRedirect("Sign-in did not finish. Please try again.");
        return;
      }
      if (sessionStorage.getItem(TORP_OAUTH_BROWSER_PENDING) === "1") {
        clearOAuthHandoffFlags();
      }
    };

    primeOAuthPollKeyFromCookie();
    startPollingIfNeeded();

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) handleBrowserDoneDeepLink(launch.url);
    });

    const browserListener = Browser.addListener("browserFinished", () => {
      void tryFinishWithRetries();
    });

    const appUrlListener = App.addListener("appUrlOpen", (event) => {
      handleBrowserDoneDeepLink(String(event?.url || ""));
    });

    const appListener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        primeOAuthPollKeyFromCookie();
        startPollingIfNeeded();
        void tryFinish();
      }
    });

    return () => {
      stopPolling();
      void browserListener.then((handle) => handle.remove());
      void appUrlListener.then((handle) => handle.remove());
      void appListener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
