"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * WKWebView: `position: fixed` inside `main.topApp` (overflow scroll) pins to the scroll box,
 * not the viewport — dock floats mid-page. Portal the dock to `body` on native only.
 */
export default function CapacitorFooterPortal({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isCapacitorNative()) {
    return children;
  }

  return createPortal(children, document.body);
}
