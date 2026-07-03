"use client";

import { useLayoutEffect } from "react";
import { installCapacitorInAppNavigation } from "@/lib/capacitor/inAppNavigation";
import { installCapacitorViewportSync } from "@/lib/capacitor/syncCapacitorViewport";
import { capacitorPlatform, isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * Tags the document when running inside Capacitor iOS/Android WebView.
 * Enables `capacitor-native.css` tweaks without affecting desktop/mobile browsers.
 */
export default function CapacitorNativeShell() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!isCapacitorNative()) {
      delete root.dataset.capacitorNative;
      delete root.dataset.capOrientation;
      return;
    }

    root.dataset.capacitorNative = capacitorPlatform();
    installCapacitorInAppNavigation();
    const teardownViewport = installCapacitorViewportSync();

    return () => {
      teardownViewport();
      delete root.dataset.capacitorNative;
      delete root.dataset.capOrientation;
    };
  }, []);

  return null;
}
