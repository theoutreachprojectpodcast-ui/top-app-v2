"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { nativeProductionAppOrigin } from "@/lib/capacitor/webAppOrigin";
import { MOBILE_OAUTH_HOME_PATH } from "@/lib/runtime/appUrls";

/**
 * Capacitor WKWebView sometimes stops following the `/callback` 302 after WorkOS OAuth.
 * Manually read the redirect `Location` and navigate into the logged-in app.
 */
export default function MobileOAuthCallbackStallRecovery() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isCapacitorNative() || ranRef.current) return;
    if (pathname !== "/callback") return;
    if (!searchParams?.get("code") || searchParams?.get("error")) return;

    ranRef.current = true;
    const callbackUrl = window.location.href;

    void (async () => {
      try {
        const res = await fetch(callbackUrl, {
          method: "GET",
          credentials: "include",
          redirect: "manual",
          cache: "no-store",
        });
        if (res.status >= 300 && res.status < 400) {
          const loc = String(res.headers.get("Location") || "").trim();
          if (loc) {
            window.location.replace(
              loc.startsWith("http") ? loc : `${nativeProductionAppOrigin()}${loc.startsWith("/") ? loc : `/${loc}`}`,
            );
            return;
          }
        }
      } catch {
        /* fall through */
      }

      window.setTimeout(() => {
        if (window.location.pathname === "/callback") {
          window.location.replace(`${nativeProductionAppOrigin()}${MOBILE_OAUTH_HOME_PATH}`);
        }
      }, 1200);
    })();
  }, [pathname, searchParams]);

  return null;
}
