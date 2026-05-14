"use client";

import { useLayoutEffect, useRef } from "react";

const SCROLL_START = 20;
const SCROLL_SOLID = 140;
/** Max opacity for the white header veil (`.topbarOcclusion::before`). Prior 0.8 +30% → 1.04, clamped to 1 for CSS. */
const VEIL_OPACITY_MAX = Math.min(1, 0.8 * 1.3);
const SCROLL_DIR_EPS = 0.75;
const DOWN_GAIN = 0.012;
const UP_GAIN = 0.018;

function clamp01(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t;
}

function clampVeil(t) {
  if (t <= 0) return 0;
  if (t >= VEIL_OPACITY_MAX) return VEIL_OPACITY_MAX;
  return t;
}

/**
 * Drives:
 * - `--header-scroll-progress` (0–1) + classes `header-at-top` | `header-scrolled` | `header-solid` (scroll position).
 * - `--header-white-veil-opacity` (0–1): white header gradient read veil — **0 when scrolling up / at top**,
 *   builds toward **~1.0 max** (0.8 + 30%) while scrolling down (mobile-tuned gains).
 *
 * Disabled on podcast / independent theme shells.
 */
export function useImmersiveHeaderScroll({ rootRef, enabled }) {
  const lastYRef = useRef(0);
  const veilRef = useRef(0);
  const firstApplyRef = useRef(true);

  useLayoutEffect(() => {
    if (!enabled) return undefined;

    const root = rootRef?.current;
    if (!root || typeof window === "undefined") return undefined;

    const HEADER_CLASSES = ["header-at-top", "header-scrolled", "header-solid"];
    const isMobile = () => (typeof window !== "undefined" ? window.innerWidth <= 760 : false);

    const apply = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const p = clamp01(y <= SCROLL_START ? 0 : y >= SCROLL_SOLID ? 1 : (y - SCROLL_START) / (SCROLL_SOLID - SCROLL_START));
      root.style.setProperty("--header-scroll-progress", String(p));

      const down = isMobile() ? DOWN_GAIN * 1.25 : DOWN_GAIN;
      const up = isMobile() ? UP_GAIN * 1.35 : UP_GAIN;

      const isFirst = firstApplyRef.current;
      firstApplyRef.current = false;

      let veil = veilRef.current;
      if (y < SCROLL_START) {
        veil = 0;
      } else if (isFirst) {
        const span = Math.max(1, SCROLL_SOLID - SCROLL_START);
        veil = clampVeil(((y - SCROLL_START) / span) * VEIL_OPACITY_MAX);
      } else {
        const dy = y - lastYRef.current;
        if (dy < -SCROLL_DIR_EPS) {
          veil = clampVeil(veil + dy * up);
        } else if (dy > 0) {
          /* Any downward motion builds the veil (wheel / touch); cap per frame for stability. */
          veil = clampVeil(veil + Math.min(dy * down, 0.12));
        }
      }
      lastYRef.current = y;
      veilRef.current = veil;
      root.style.setProperty("--header-white-veil-opacity", veil.toFixed(4));

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

    lastYRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    firstApplyRef.current = true;
    apply();
    window.addEventListener("scroll", scheduleApply, { passive: true });
    window.addEventListener("resize", scheduleApply, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scheduleApply);
      window.removeEventListener("resize", scheduleApply);
      root.style.removeProperty("--header-scroll-progress");
      root.style.removeProperty("--header-white-veil-opacity");
      for (const c of HEADER_CLASSES) root.classList.remove(c);
    };
  }, [enabled, rootRef]);
}
