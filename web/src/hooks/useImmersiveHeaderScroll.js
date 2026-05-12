"use client";

import { useLayoutEffect } from "react";

const SCROLL_START = 20;
const SCROLL_SOLID = 140;

function clamp01(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t;
}

/**
 * Drives `--header-scroll-progress` (0–1) and header scroll classes on the main app shell
 * for transparent → frosted header transitions. Disabled on podcast / independent theme shells.
 *
 * Classes (mutually exclusive): `header-at-top` | `header-scrolled` | `header-solid`
 */
export function useImmersiveHeaderScroll({ rootRef, enabled }) {
  useLayoutEffect(() => {
    if (!enabled) return undefined;

    const root = rootRef?.current;
    if (!root || typeof window === "undefined") return undefined;

    const HEADER_CLASSES = ["header-at-top", "header-scrolled", "header-solid"];

    const apply = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const p = clamp01(y <= SCROLL_START ? 0 : y >= SCROLL_SOLID ? 1 : (y - SCROLL_START) / (SCROLL_SOLID - SCROLL_START));
      root.style.setProperty("--header-scroll-progress", String(p));

      for (const c of HEADER_CLASSES) root.classList.remove(c);
      if (y < SCROLL_START) root.classList.add("header-at-top");
      else if (y < SCROLL_SOLID) root.classList.add("header-scrolled");
      else root.classList.add("header-solid");
    };

    let raf = 0;
    const scheduleApply = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };

    apply();
    window.addEventListener("scroll", scheduleApply, { passive: true });
    window.addEventListener("resize", scheduleApply, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scheduleApply);
      window.removeEventListener("resize", scheduleApply);
      root.style.removeProperty("--header-scroll-progress");
      for (const c of HEADER_CLASSES) root.classList.remove(c);
    };
  }, [enabled, rootRef]);
}
