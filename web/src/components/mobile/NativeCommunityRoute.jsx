"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopApp from "@/components/app/TopApp";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/** Native shell uses a single `/` TopApp instance — avoid remounting on `/community`. */
export default function NativeCommunityRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isCapacitorNative()) return;
    const qs = new URLSearchParams();
    qs.set("nav", "community");
    for (const key of ["connections", "tab"]) {
      const value = String(searchParams.get(key) || "").trim();
      if (value) qs.set(key, value);
    }
    router.replace(`/?${qs.toString()}`);
  }, [router, searchParams]);

  if (isCapacitorNative()) {
    return <AuthLoadingOverlay visible variant="generic" />;
  }

  return <TopApp initialNav="community" />;
}
