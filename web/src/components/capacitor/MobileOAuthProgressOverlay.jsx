"use client";

import { usePathname } from "next/navigation";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { isOAuthInProgress } from "@/lib/auth/oauthInProgress";
import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";

const DEDICATED_OAUTH_ROUTES = new Set([MOBILE_POST_LOGIN_PATH, "/callback"]);

/**
 * Single branded overlay while native OAuth handoff is in flight (browser open or session resume).
 * Skips routes that render their own auth-complete UI.
 */
export default function MobileOAuthProgressOverlay() {
  const pathname = usePathname() || "/";

  if (!isCapacitorNative() || !isOAuthInProgress() || DEDICATED_OAUTH_ROUTES.has(pathname)) {
    return null;
  }

  return <AuthLoadingOverlay visible variant="authComplete" />;
}
