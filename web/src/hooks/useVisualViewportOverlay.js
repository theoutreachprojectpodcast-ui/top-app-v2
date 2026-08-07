"use client";

import { useEffect } from "react";

/**
 * Keeps a fixed overlay sized to the visual viewport so mobile soft keyboards
 * do not cover / clip the sheet (iOS Safari + Capacitor WebView).
 *
 * Sets on documentElement while active:
 * - --vv-top, --vv-left, --vv-width, --vv-height
 * - data-keyboard-open="1" when viewport is meaningfully shorter than layout height
 *
 * @param {boolean} active
 */
export function useVisualViewportOverlay(active) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return undefined;

    const root = document.documentElement;

    const sync = () => {
      const vv = window.visualViewport;
      const layoutH = window.innerHeight || 0;
      if (!vv) {
        root.style.setProperty("--vv-top", "0px");
        root.style.setProperty("--vv-left", "0px");
        root.style.setProperty("--vv-width", "100%");
        root.style.setProperty("--vv-height", `${layoutH || 0}px`);
        root.dataset.keyboardOpen = "0";
        return;
      }
      root.style.setProperty("--vv-top", `${Math.max(0, vv.offsetTop || 0)}px`);
      root.style.setProperty("--vv-left", `${Math.max(0, vv.offsetLeft || 0)}px`);
      root.style.setProperty("--vv-width", `${Math.max(0, vv.width || window.innerWidth || 0)}px`);
      root.style.setProperty("--vv-height", `${Math.max(0, vv.height || layoutH || 0)}px`);
      const keyboardOpen = layoutH > 0 && vv.height < layoutH * 0.85;
      root.dataset.keyboardOpen = keyboardOpen ? "1" : "0";
    };

    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);

    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-left");
      root.style.removeProperty("--vv-width");
      root.style.removeProperty("--vv-height");
      delete root.dataset.keyboardOpen;
    };
  }, [active]);
}

/**
 * Scroll focused form controls into view inside a sheet scrollport.
 * @param {boolean} active
 * @param {React.RefObject<HTMLElement | null>} scrollRef
 */
export function useScrollFocusedFieldIntoView(active, scrollRef) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return undefined;

    const onFocusIn = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches("input, textarea, select")) return;
      const scroller = scrollRef?.current;
      window.setTimeout(() => {
        try {
          if (scroller instanceof HTMLElement && scroller.contains(target)) {
            const scrollerRect = scroller.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const pad = 24;
            if (targetRect.top < scrollerRect.top + pad || targetRect.bottom > scrollerRect.bottom - pad) {
              const delta =
                targetRect.top -
                scrollerRect.top -
                Math.max(pad, (scrollerRect.height - targetRect.height) / 2);
              scroller.scrollBy({ top: delta, behavior: "smooth" });
            }
            return;
          }
          target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        } catch {
          /* ignore */
        }
      }, 120);
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [active, scrollRef]);
}
