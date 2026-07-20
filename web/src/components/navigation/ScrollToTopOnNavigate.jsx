"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scrollToPageTop } from "@/lib/navigation/scrollToPageTop";

/**
 * Reset scroll position when the user navigates to a different page or TopApp tab (`?nav=`).
 * Ignores other query-only changes (modals, checkout return params, etc.).
 */
export default function ScrollToTopOnNavigate() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const navTab = String(searchParams.get("nav") || "").trim().toLowerCase();
  const scrollKey = `${pathname}|${navTab}`;
  const previousKeyRef = useRef(null);
  const isInitialMountRef = useRef(true);

  useLayoutEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousKeyRef.current = scrollKey;
      return;
    }
    if (previousKeyRef.current === scrollKey) return;
    previousKeyRef.current = scrollKey;
    scrollToPageTop();
  }, [scrollKey]);

  return null;
}
