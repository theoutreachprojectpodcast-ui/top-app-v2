"use client";

import { useLayoutEffect } from "react";
import { capacitorServerUrl, PRODUCTION_ORIGIN } from "@/lib/capacitor/webAppOrigin";
import { isCapacitorNative } from "@/lib/capacitor/platform";

function isLocalShellLocation() {
  if (typeof window === "undefined") return false;
  try {
    const protocol = (window.location.protocol || "").toLowerCase();
    if (protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:") return true;
    const host = (window.location.hostname || "").toLowerCase();
    if (!host || host === "localhost" || host === "127.0.0.1") {
      // Intentional dev: server.url=http://localhost:3000/mobile loads over https://localhost
      return protocol !== "http:" && protocol !== "https:";
    }
    return false;
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
