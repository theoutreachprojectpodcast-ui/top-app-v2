"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy `/mobile/auth/complete` — bounce to home; session resume handles OAuth return.
 */
export default function MobileAuthCompleteClient() {
  const router = useRouter();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    router.replace("/?oauth=1");
  }, [router]);

  return null;
}
