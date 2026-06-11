"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { useNativeWebAccountFlow } from "@/hooks/useNativeWebAccountFlow";

/**
 * Deep-link return into the native shell after external flows (no visible chrome).
 */
export default function MobileAccountReturnBridge() {
  const router = useRouter();
  const { refreshAccountStatus } = useNativeWebAccountFlow();

  useEffect(() => {
    if (!isCapacitorNative()) return undefined;

    const removeAppUrl = App.addListener("appUrlOpen", (event) => {
      const url = String(event?.url || "");
      if (!url.includes("account/refresh")) return;
      void refreshAccountStatus().then((result) => {
        if (result.ok) {
          router.replace("/mobile/access");
        }
      });
    });

    return () => {
      void removeAppUrl.then((h) => h.remove());
    };
  }, [refreshAccountStatus, router]);

  return null;
}
