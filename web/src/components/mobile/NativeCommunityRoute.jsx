"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TopApp from "@/components/app/TopApp";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/** Native shell uses a single `/` TopApp instance — avoid remounting on `/community`. */
export default function NativeCommunityRoute() {
  const router = useRouter();

  useEffect(() => {
    if (isCapacitorNative()) {
      router.replace("/");
    }
  }, [router]);

  if (isCapacitorNative()) {
    return <AuthLoadingOverlay visible variant="generic" />;
  }

  return <TopApp initialNav="community" />;
}
