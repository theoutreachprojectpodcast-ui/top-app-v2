"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";
import {
  clearOAuthPollKeyCookie,
  TOP_OAUTH_BROWSER_PENDING,
  TOP_OAUTH_RETURN_KEY,
  TOP_OAUTH_STATE_KEY,
} from "@/lib/auth/oauthMobileHandoff";
export { TOP_OAUTH_RETURN_KEY };

function clearOAuthHandoffState() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(TOP_OAUTH_RETURN_KEY);
  sessionStorage.removeItem(TOP_OAUTH_BROWSER_PENDING);
  sessionStorage.removeItem(TOP_OAUTH_STATE_KEY);
  clearOAuthPollKeyCookie();
}

/**
 * After OAuth return, clear handoff flags immediately and refresh session in the background.
 */
export default function MobileOAuthSessionResume() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh: refreshAuth } = useAuthSession();
  const { refreshWorkOSProfile } = useProfileData();
  const ranRef = useRef(false);

  const oauthReturn =
    searchParams?.get("oauth") === "1" ||
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem(TOP_OAUTH_RETURN_KEY) === "1");

  useLayoutEffect(() => {
    if (!isCapacitorNative() || !oauthReturn) return;
    clearOAuthHandoffState();
  }, [oauthReturn]);

  useEffect(() => {
    if (!isCapacitorNative() || ranRef.current || !oauthReturn) return;
    ranRef.current = true;

    if (pathname === MOBILE_POST_LOGIN_PATH) {
      router.replace("/");
      return;
    }

    if (searchParams?.get("oauth") === "1") {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("oauth");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname || "/", { scroll: false });
    }

    void Promise.all([refreshAuth({ soft: true }), refreshWorkOSProfile()]);
  }, [oauthReturn, pathname, refreshAuth, refreshWorkOSProfile, router, searchParams]);

  return null;
}
