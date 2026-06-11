"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TopApp from "@/components/app/TopApp";
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
    return (
      <div className="mobileSplashPage">
        <div className="mobileSplashPage__inner">
          <p className="mobileSplashPage__lead">Loading…</p>
        </div>
      </div>
    );
  }

  return <TopApp initialNav="community" />;
}
