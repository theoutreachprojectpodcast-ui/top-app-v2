"use client";

import { useLayoutEffect } from "react";
import { capacitorServerUrl, PRODUCTION_ORIGIN } from "@/lib/capacitor/webAppOrigin";
import { isCapacitorNative } from "@/lib/capacitor/platform";

function isLocalShellLocation() {
  if (typeof window === "undefined") return false;
  try {
    const host = (window.location.hostname || "").toLowerCase();
    const protocol = (window.location.protocol || "").toLowerCase();
    if (!host || host === "localhost" || host === "127.0.0.1") return true;
    return protocol === "capacitor:" || protocol === "ionic:";
  } catch {
    return true;
  }
}

/**
 * Old TestFlight builds without `server.url` load capacitor://localhost — bounce to production.
 */
export default function CapacitorRemoteBootstrap() {
  useLayoutEffect(() => {
    if (!isCapacitorNative() || !isLocalShellLocation()) return;
    const target = capacitorServerUrl(PRODUCTION_ORIGIN);
    window.location.replace(target);
  }, []);

  return null;
}
