"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isCapacitorNative } from "@/lib/capacitor/platform";

const HEADER_SYNC_VARS = [
  "--header-floating-offset",
  "--header-floating-height",
  "--header-fade-height",
  "--app-header-height",
  "--app-header-total-height",
  "--safe-area-top",
  "--header-scroll-progress",
  "--header-white-veil-opacity",
  "--header-gradient-opacity-mult",
  "--header-veil-floor",
  "--header-veil-scroll-mult",
  "--mobile-site-header-logo-h",
  "--mobile-site-header-logo-max-w",
  "--mobile-site-header-control-size",
  "--mobile-site-header-control-pad-top",
  "--mobile-site-header-pad-x",
  "--mobile-home-header-layout-h",
  "--mobile-home-header-content-gap",
  "--home-logo-content-gap",
  "--topbar-gradient-fade",
  "--color-bg-app",
  "--color-border",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-bg-card",
];

const HEADER_SYNC_CLASSES = [
  "header-at-top",
  "header-scrolled",
  "header-solid",
  "header-content-behind",
  "topApp--auth-in",
  "topApp--auth-out",
  "topApp--mobileHomeEntrance",
  "appShell--podcast",
  "appShell--admin",
  "appShell--withMobileNavDock",
];

/**
 * WKWebView: `position: fixed` inside `main.topApp` (overflow scroll) pins to the scroll box,
 * not the viewport — header chrome scrolls away (same bug as the footer dock).
 * Portal the primary header to `body` on native only and mirror shell tokens/classes.
 *
 * @param {{ children: import("react").ReactNode, shellRef?: import("react").RefObject<HTMLElement | null>, enabled?: boolean }} props
 * - `enabled`: set false for in-flow chrome (e.g. podcast mobile header band).
 */
export default function CapacitorHeaderPortal({ children, shellRef, enabled = true }) {
  const [mounted, setMounted] = useState(false);
  const hostRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted || !enabled || !isCapacitorNative()) return undefined;

    const host = hostRef.current;
    if (!host) return undefined;

    const syncFromShell = () => {
      const shell = shellRef?.current || document.querySelector("main.topApp");
      if (!shell) return;

      const cs = getComputedStyle(shell);
      for (const name of HEADER_SYNC_VARS) {
        const value = cs.getPropertyValue(name).trim();
        if (value) host.style.setProperty(name, value);
        else host.style.removeProperty(name);
      }

      for (const className of HEADER_SYNC_CLASSES) {
        host.classList.toggle(className, shell.classList.contains(className));
      }

      const atmosphere = shell.getAttribute("data-page-atmosphere");
      if (atmosphere) host.setAttribute("data-page-atmosphere", atmosphere);
      else host.removeAttribute("data-page-atmosphere");

      if (shell.hasAttribute("data-use-podcast-theme")) {
        host.setAttribute("data-use-podcast-theme", shell.getAttribute("data-use-podcast-theme") || "true");
      } else {
        host.removeAttribute("data-use-podcast-theme");
      }
    };

    syncFromShell();

    const shell = shellRef?.current || document.querySelector("main.topApp");
    let observer;
    if (shell && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(syncFromShell);
      observer.observe(shell, {
        attributes: true,
        attributeFilter: ["class", "style", "data-page-atmosphere", "data-use-podcast-theme"],
      });
    }

    window.addEventListener("resize", syncFromShell, { passive: true });
    window.addEventListener("orientationchange", syncFromShell, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncFromShell);
      window.removeEventListener("orientationchange", syncFromShell);
    };
  }, [mounted, shellRef, enabled]);

  if (!mounted || !enabled || !isCapacitorNative()) {
    return children;
  }

  return createPortal(
    <div
      ref={hostRef}
      className="capacitorAppHeaderPortal"
      data-capacitor-header-portal="1"
    >
      {children}
    </div>,
    document.body
  );
}
