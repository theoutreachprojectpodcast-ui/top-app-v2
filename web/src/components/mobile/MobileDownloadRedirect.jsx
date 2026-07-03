"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/** Capacitor users should never use the web store landing page. */
export default function MobileDownloadRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isCapacitorNative()) {
      window.location.replace("/mobile");
    }
  }, [router]);

  return null;
}
