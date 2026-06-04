"use client";

import { useEffect } from "react";
import { capacitorPlatform, isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * Tags the document when running inside Capacitor iOS/Android WebView.
 * Enables `capacitor-native.css` tweaks without affecting desktop/mobile browsers.
 */
export default function CapacitorNativeShell() {
  useEffect(() => {
    const root = document.documentElement;
    if (!isCapacitorNative()) {
      delete root.dataset.capacitorNative;
      return;
    }
    root.dataset.capacitorNative = capacitorPlatform();
    return () => {
      delete root.dataset.capacitorNative;
    };
  }, []);

  return null;
}
