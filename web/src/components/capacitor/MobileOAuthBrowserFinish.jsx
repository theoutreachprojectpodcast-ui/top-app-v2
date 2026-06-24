"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { nativeProductionAppOrigin } from "@/lib/capacitor/webAppOrigin";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { closeExternalBrowserIfOpen } from "@/lib/capacitor/openExternalUrl";
import {
  clearOAuthPollKeyCookie,
  readOAuthPollKeyFromDocumentCookie,
  TOP_OAUTH_BROWSER_PENDING,
  TOP_OAUTH_HANDOFF_ERROR,
  TOP_OAUTH_STATE_KEY,
} from "@/lib/auth/oauthMobileHandoff";
import { parseOAuthBrowserDoneDeepLink } from "@/lib/auth/workosMobileRedirect";
import { parseMobileDeepLinkUrl } from "@/lib/capacitor/mobileDeepLinks";
import { TOP_OAUTH_RETURN_KEY } from "@/components/capacitor/MobileOAuthSessionResume";

const POLL_MS = 200;
const POLL_MAX_MS = 30_000;
const BROWSER_DISMISS_RETRIES_MS = [0, 100, 250, 500, 1000, 1800];

async function closeOAuthBrowserSheet() {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await closeExternalBrowserIfOpen();
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }
}

function nativeOAuthUrl(path) {
  const normalized = String(path || "").trim().startsWith("/") ? String(path).trim() : `/${String(path).trim()}`;
  return `${nativeProductionAppOrigin()}${normalized}`;
}

function resolveOAuthPollKey() {
  if (typeof sessionStorage === "undefined") return "";
  const fromSession = String(sessionStorage.getItem(TOP_OAUTH_STATE_KEY) || "").trim();
  if (fromSession) return fromSession;
  return readOAuthPollKeyFromDocumentCookie();
}

function primeOAuthPollKeyFromCookie() {
  if (typeof sessionStorage === "undefined") return;
  if (sessionStorage.getItem(TOP_OAUTH_BROWSER_PENDING) !== "1") return;
  const key = readOAuthPollKeyFromDocumentCookie();
  if (key) sessionStorage.setItem(TOP_OAUTH_STATE_KEY, key);
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
    sessionStorage.getItem(TOP_OAUTH_BROWSER_PENDING) === "1" &&
    !!resolveOAuthPollKey()
  );
}

function primeOAuthHandoff(stateKey) {
  if (typeof sessionStorage === "undefined") return;
  const key = String(stateKey || "").trim();
  if (!key) return;
  sessionStorage.setItem(TOP_OAUTH_STATE_KEY, key);
  sessionStorage.setItem(TOP_OAUTH_BROWSER_PENDING, "1");
}

function clearOAuthHandoffFlags() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(TOP_OAUTH_BROWSER_PENDING);
  sessionStorage.removeItem(TOP_OAUTH_STATE_KEY);
  clearOAuthPollKeyCookie();
}

function completeInWebView(data) {
  clearOAuthHandoffFlags();
  sessionStorage.setItem(TOP_OAUTH_RETURN_KEY, "1");

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

function oauthCancelWithError(message) {
  clearOAuthHandoffFlags();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(TOP_OAUTH_RETURN_KEY);
    if (message) {
      sessionStorage.setItem(TOP_OAUTH_HANDOFF_ERROR, message);
    } else {
      sessionStorage.removeItem(TOP_OAUTH_HANDOFF_ERROR);
    }
  }
}

function oauthCancelSilently() {
  oauthCancelWithError("");
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

      await closeOAuthBrowserSheet();

      try {
        await completeInWebView(data);
      } catch {
        oauthCancelSilently();
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
      const handoff = parseMobileDeepLinkUrl(raw);
      if (handoff?.kind === "oauth-handoff-complete") {
        primeOAuthHandoff(handoff.key);
      }

      const parsed = parseOAuthBrowserDoneDeepLink(raw);
      if (!parsed?.key && handoff?.kind !== "oauth-handoff-complete") return;
      if (parsed?.key) primeOAuthHandoff(parsed.key);

      const pollKey = parsed?.key || handoff?.key || "";
      void (async () => {
        await closeOAuthBrowserSheet();
        for (const delay of BROWSER_DISMISS_RETRIES_MS) {
          if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
          if (await tryFinish(pollKey)) return;
        }
        if (!claimedRef.current) oauthCancelSilently();
      })();
    };

    const startPollingIfNeeded = () => {
      if (!isOAuthPending() || pollIdRef.current) return;
      pollStartedAtRef.current = Date.now();
      pollIdRef.current = window.setInterval(() => {
        if (Date.now() - pollStartedAtRef.current > POLL_MAX_MS) {
          stopPolling();
          if (!claimedRef.current && isOAuthPending()) {
            oauthCancelWithError(
              "Sign-in timed out before the app could finish. Tap Sign in to try again.",
            );
          }
          return;
        }
        void tryFinish();
      }, POLL_MS);
      void tryFinish();
    };

    const tryFinishAfterBrowserDismiss = async () => {
      for (const delay of BROWSER_DISMISS_RETRIES_MS) {
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        if (await tryFinish()) return;
      }
      if (!claimedRef.current) oauthCancelSilently();
    };

    primeOAuthPollKeyFromCookie();
    startPollingIfNeeded();

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) handleBrowserDoneDeepLink(launch.url);
    });

    const browserListener = Browser.addListener("browserFinished", () => {
      void tryFinishAfterBrowserDismiss();
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
