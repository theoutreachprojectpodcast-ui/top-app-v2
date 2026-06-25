"use client";

import { useLayoutEffect } from "react";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { hideCapacitorSplash } from "@/lib/capacitor/splashScreen";

/**
 * Safety net: native launch splash is spinner-only (no text). Hide it as soon as JS runs.
 */
export default function MobileCapacitorSplashDismiss() {
  useLayoutEffect(() => {
    if (!isCapacitorNative()) return;
    void hideCapacitorSplash();
    const retry = window.setInterval(() => {
      void hideCapacitorSplash();
    }, 400);
    const stop = window.setTimeout(() => {
      window.clearInterval(retry);
    }, 4000);
    return () => {
      window.clearInterval(retry);
      window.clearTimeout(stop);
    };
  }, []);

  return null;
}
