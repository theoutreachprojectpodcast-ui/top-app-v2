"use client";

import { useSyncExternalStore } from "react";

/** Matches `mobile-shell.css` / `home-mobile.css` phone breakpoint. */
export const MOBILE_SHELL_MQ = "(max-width: 760px)";

function subscribe(onStoreChange) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(MOBILE_SHELL_MQ);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_SHELL_MQ).matches;
}

/** True on phone-sized viewports (≤760px), including Capacitor iOS WebView. */
export function useMobileShell() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
