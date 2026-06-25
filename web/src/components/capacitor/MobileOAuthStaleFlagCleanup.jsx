"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { clearMobileOAuthHandoffState } from "@/lib/auth/mobileOAuthReturn";

const OAUTH_FLOW_PREFIXES = [
  "/callback",
  "/auth/workos-go",
  "/auth/workos-browser-start",
  "/api/mobile/oauth-handoff",
];

function onActiveOAuthFlowPath(pathname) {
  const path = String(pathname || "/");
  return OAUTH_FLOW_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Drop stale in-app-browser handoff flags left from older builds (they block overlays forever). */
export default function MobileOAuthStaleFlagCleanup() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!isCapacitorNative() || onActiveOAuthFlowPath(pathname)) return;
    clearMobileOAuthHandoffState();
  }, [pathname]);

  return null;
}
