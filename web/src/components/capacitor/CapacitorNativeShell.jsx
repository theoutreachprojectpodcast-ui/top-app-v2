"use client";

import { useLayoutEffect } from "react";
import { App } from "@capacitor/app";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { installCapacitorInAppNavigation } from "@/lib/capacitor/inAppNavigation";
import { lockPortraitOrientation } from "@/lib/capacitor/lockPortraitOrientation";
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
      return;
    }

    root.dataset.capacitorNative = capacitorPlatform();
    installCapacitorInAppNavigation();

    const reinforcePortraitLock = () => {
      void lockPortraitOrientation();
    };

    reinforcePortraitLock();

    window.addEventListener("orientationchange", reinforcePortraitLock);
    window.addEventListener("resize", reinforcePortraitLock);
    window.visualViewport?.addEventListener("resize", reinforcePortraitLock);

    let appStateListener;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) reinforcePortraitLock();
    }).then((handle) => {
      appStateListener = handle;
    });

    let orientationListener;
    void ScreenOrientation.addListener("screenOrientationChange", reinforcePortraitLock).then((handle) => {
      orientationListener = handle;
    });

    return () => {
      window.removeEventListener("orientationchange", reinforcePortraitLock);
      window.removeEventListener("resize", reinforcePortraitLock);
      window.visualViewport?.removeEventListener("resize", reinforcePortraitLock);
      void appStateListener?.remove();
      void orientationListener?.remove();
      delete root.dataset.capacitorNative;
    };
  }, []);

  return null;
}
