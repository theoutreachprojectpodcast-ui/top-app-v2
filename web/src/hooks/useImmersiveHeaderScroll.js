"use client";

import { useLayoutEffect, useRef } from "react";

const SCROLL_START = 20;
const SCROLL_SOLID = 140;
/** Max opacity for the white header veil (`.topbarOcclusion::before`). Prior 0.8 +30% → 1.04, clamped to 1 for CSS. */
const VEIL_OPACITY_MAX = Math.min(1, 0.8 * 1.3);
const SCROLL_DIR_EPS = 0.75;
const DOWN_GAIN = 0.012;
const UP_GAIN = 0.018;
/** Multiply header gradient opacity when page content scrolls under the header chrome. */
const GRADIENT_BOOST_MULT_MOBILE = 1.5;
const GRADIENT_BOOST_MULT_DESKTOP = 2.05 * 1.2;
const DOWN_GAIN_DESKTOP = 0.022 * 1.2;
const VEIL_SCROLL_MULT_DESKTOP = 1.2;
const SCROLL_STEP_CAP_DESKTOP = 0.2;

const HEADER_CLASSES = ["header-at-top", "header-scrolled", "header-solid"];
const BEHIND_CLASS = "header-content-behind";

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

function readScrollY(root) {
  const windowY =
    typeof window !== "undefined" ? window.scrollY || document.documentElement.scrollTop || 0 : 0;
  const rootY = root && typeof root.scrollTop === "number" ? root.scrollTop : 0;
  return Math.max(windowY, rootY);
}

function headerChromeHosts(root) {
  const hosts = [];
  if (root) hosts.push(root);
  if (typeof document !== "undefined") {
    const portal = document.querySelector(".capacitorAppHeaderPortal");
    if (portal && portal !== root) hosts.push(portal);
  }
  return hosts;
}

function setPropOnHosts(hosts, name, value) {
  for (const host of hosts) {
    if (value == null) host.style.removeProperty(name);
    else host.style.setProperty(name, value);
  }
}

function toggleClassOnHosts(hosts, className, on) {
  for (const host of hosts) {
    host.classList.toggle(className, on);
  }
}

/**
 * Drives:
 * - `--header-scroll-progress` (0–1) + classes `header-at-top` | `header-scrolled` | `header-solid` (scroll position).
 * - `--header-white-veil-opacity` (0–1): white header gradient read veil — **0 when scrolling up / at top**,
 *   builds toward **~1.0 max** (0.8 + 30%) while scrolling down (mobile-tuned gains).
 * - `header-content-behind` + `--header-gradient-opacity-mult` (1 or 1.5): +50% header gradient strength
 *   while content sits under the header; resets at top.
 *
 * Writes to the scroll root and, when present, `.capacitorAppHeaderPortal` (native fixed chrome).
 *
 * @param {{ rootRef: import("react").RefObject<HTMLElement | null>, enabled?: boolean, gradientBoost?: boolean }} options
 * - `enabled`: full immersive veil + position classes (main app, not podcast).
 * - `gradientBoost`: content-behind gradient boost only (podcast + any shell with `topbarOcclusion`).
 */
export function useImmersiveHeaderScroll({ rootRef, enabled = false, gradientBoost = false }) {
  const lastYRef = useRef(0);
  const veilRef = useRef(0);
  const firstApplyRef = useRef(true);

  useLayoutEffect(() => {
    if (!enabled && !gradientBoost) return undefined;

    const root = rootRef?.current;
    if (!root || typeof window === "undefined") return undefined;

    const reducedMotion = () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isMobile = () => (typeof window !== "undefined" ? window.innerWidth <= 760 : false);

    const applyBehind = (y, hosts) => {
      const behind = y > SCROLL_START;
      const gradientMult = isMobile() ? GRADIENT_BOOST_MULT_MOBILE : GRADIENT_BOOST_MULT_DESKTOP;
      toggleClassOnHosts(hosts, BEHIND_CLASS, behind);
      setPropOnHosts(hosts, "--header-gradient-opacity-mult", behind ? String(gradientMult) : "1");
    };

    const apply = () => {
      const y = readScrollY(root);
      const hosts = headerChromeHosts(root);

      if (gradientBoost) applyBehind(y, hosts);

      if (!enabled) return;

      const p = clamp01(
        y <= SCROLL_START ? 0 : y >= SCROLL_SOLID ? 1 : (y - SCROLL_START) / (SCROLL_SOLID - SCROLL_START)
      );
      setPropOnHosts(hosts, "--header-scroll-progress", String(p));

      const down = isMobile() ? DOWN_GAIN * 1.25 : DOWN_GAIN_DESKTOP;
      const up = isMobile() ? UP_GAIN * 1.35 : UP_GAIN;
      const scrollStepCap = isMobile() ? 0.12 : SCROLL_STEP_CAP_DESKTOP;
      const snap = reducedMotion();

      const isFirst = firstApplyRef.current;
      firstApplyRef.current = false;

      let veil = veilRef.current;
      if (y < SCROLL_START) {
        veil = 0;
      } else if (isFirst || snap) {
        const span = Math.max(1, SCROLL_SOLID - SCROLL_START);
        veil = clampVeil(((y - SCROLL_START) / span) * VEIL_OPACITY_MAX);
      } else {
        const dy = y - lastYRef.current;
        if (dy < -SCROLL_DIR_EPS) {
          veil = clampVeil(veil + dy * up);
        } else if (dy > 0) {
          veil = clampVeil(veil + Math.min(dy * down, scrollStepCap));
        }
      }
      lastYRef.current = y;
      veilRef.current = veil;
      const veilOut = isMobile() ? veil : Math.min(1, veil * VEIL_SCROLL_MULT_DESKTOP);
      setPropOnHosts(hosts, "--header-white-veil-opacity", veilOut.toFixed(4));
      setPropOnHosts(hosts, "--header-veil-scroll-mult", isMobile() ? "1" : String(VEIL_SCROLL_MULT_DESKTOP));

      for (const c of HEADER_CLASSES) toggleClassOnHosts(hosts, c, false);
      if (y < SCROLL_START) toggleClassOnHosts(hosts, "header-at-top", true);
      else if (y < SCROLL_SOLID) toggleClassOnHosts(hosts, "header-scrolled", true);
      else toggleClassOnHosts(hosts, "header-solid", true);
    };

    let raf = 0;
    const scheduleApply = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };

    lastYRef.current = readScrollY(root);
    firstApplyRef.current = true;
    apply();
    window.addEventListener("scroll", scheduleApply, { passive: true });
    window.addEventListener("resize", scheduleApply, { passive: true });
    /* Capacitor / nested scroll: main.topApp is often the scrolling container. */
    root.addEventListener("scroll", scheduleApply, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scheduleApply);
      window.removeEventListener("resize", scheduleApply);
      root.removeEventListener("scroll", scheduleApply);
      const hosts = headerChromeHosts(root);
      for (const host of hosts) {
        host.classList.remove(BEHIND_CLASS);
        host.style.removeProperty("--header-gradient-opacity-mult");
        if (enabled) {
          host.style.removeProperty("--header-scroll-progress");
          host.style.removeProperty("--header-white-veil-opacity");
          host.style.removeProperty("--header-veil-scroll-mult");
          for (const c of HEADER_CLASSES) host.classList.remove(c);
        }
      }
    };
  }, [enabled, gradientBoost, rootRef]);
}
