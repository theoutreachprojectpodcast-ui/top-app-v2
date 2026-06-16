"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { closeExternalBrowserIfOpen } from "@/lib/capacitor/openExternalUrl";
import { appUrl } from "@/lib/capacitor/webAppOrigin";
import { oauthCallbackQueryFromDeepLink } from "@/lib/auth/workosMobileRedirect";
import { parseMobileDeepLinkUrl } from "@/lib/capacitor/mobileDeepLinks";
import { TORP_OAUTH_RETURN_KEY } from "@/components/capacitor/MobileOAuthSessionResume";
import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";

async function exchangeMobileAuthTransferToken(token, returnTo) {
  const params = new URLSearchParams();
  params.set("token", String(token || "").trim());
  const safeReturn = String(returnTo || "/").trim() || "/";
  if (safeReturn !== "/") params.set("returnTo", safeReturn);

  const res = await fetch(`/api/auth/mobile/complete?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) return false;

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(TORP_OAUTH_RETURN_KEY, "1");
  }

  const dest = String(body.returnTo || safeReturn || MOBILE_POST_LOGIN_PATH).trim() || MOBILE_POST_LOGIN_PATH;
  window.location.replace(dest.startsWith("http") ? dest : appUrl(dest));
  return true;
}

/**
 * When WorkOS completes with a mobile redirect URI, forward OAuth params into `/callback`
 * and exchange one-time auth transfer tokens into the WebView session.
 */
export default function MobileOAuthDeepLink() {
  useEffect(() => {
    if (!isCapacitorNative()) return undefined;

    const handleUrl = async (raw) => {
      const parsed = parseMobileDeepLinkUrl(raw);
      if (parsed?.kind === "auth-complete") {
        await closeExternalBrowserIfOpen();
        const ok = await exchangeMobileAuthTransferToken(parsed.token, parsed.returnTo);
        if (!ok) {
          window.location.replace(appUrl("/sign-in?oauth_error=Sign-in%20expired"));
        }
        return;
      }

      const qs = oauthCallbackQueryFromDeepLink(raw);
      if (!qs) return;
      await closeExternalBrowserIfOpen();
      const path = `/callback${qs.startsWith("?") ? qs : `?${qs}`}`;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(TORP_OAUTH_RETURN_KEY, "1");
        if (window.location.pathname + window.location.search !== path) {
          window.location.replace(appUrl(path));
        }
      }
    };

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) handleUrl(launch.url);
    });

    const remove = App.addListener("appUrlOpen", (event) => {
      handleUrl(String(event?.url || ""));
    });

    return () => {
      void remove.then((h) => h.remove());
    };
  }, []);

  return null;
}
