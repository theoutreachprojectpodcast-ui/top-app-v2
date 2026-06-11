"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { closeExternalBrowserIfOpen } from "@/lib/capacitor/openExternalUrl";
import { oauthCallbackQueryFromDeepLink } from "@/lib/auth/workosMobileRedirect";
import { TORP_OAUTH_RETURN_KEY } from "@/components/capacitor/MobileOAuthSessionResume";

/**
 * When WorkOS completes with the mobile redirect URI, iOS opens
 * `org.theoutreachproject.torp://callback?code=…` — forward into the WebView `/callback` route.
 */
export default function MobileOAuthDeepLink() {
  useEffect(() => {
    if (!isCapacitorNative()) return undefined;

    const handleUrl = async (raw) => {
      const qs = oauthCallbackQueryFromDeepLink(raw);
      if (!qs) return;
      await closeExternalBrowserIfOpen();
      const path = `/callback${qs.startsWith("?") ? qs : `?${qs}`}`;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(TORP_OAUTH_RETURN_KEY, "1");
        if (window.location.pathname + window.location.search !== path) {
          window.location.replace(path);
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
