"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { installCapacitorInAppNavigation } from "@/lib/capacitor/inAppNavigation";
import { lockPortraitOrientation } from "@/lib/capacitor/lockPortraitOrientation";
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
    installCapacitorInAppNavigation();

    const reinforcePortraitLock = () => {
      void lockPortraitOrientation();
    };

    reinforcePortraitLock();
    window.addEventListener("orientationchange", reinforcePortraitLock);

    let appStateListener;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) reinforcePortraitLock();
    }).then((handle) => {
      appStateListener = handle;
    });

    return () => {
      window.removeEventListener("orientationchange", reinforcePortraitLock);
      void appStateListener?.remove();
      delete root.dataset.capacitorNative;
    };
  }, []);

  return null;
}
