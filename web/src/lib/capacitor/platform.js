"use client";

import { Capacitor } from "@capacitor/core";

/** True when running inside a Capacitor Android / iOS WebView (not desktop or mobile browser). */
export function isCapacitorNative() {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

/** Human-readable platform label for logging or diagnostics. */
export function capacitorPlatform() {
  if (typeof window === "undefined") return "web";
  return Capacitor.getPlatform();
}
