function isScrollContainer(el) {
  if (!el || typeof window === "undefined") return false;
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
}

/** Primary app scroll surface — `main.topApp` on Capacitor, otherwise document/window. */
export function getPageScrollRoot(explicitRoot) {
  if (explicitRoot) return explicitRoot;
  if (typeof document === "undefined") return null;
  const main = document.querySelector("main.topApp");
  if (main && isScrollContainer(main)) return main;
  return null;
}

/** Scroll the active page surface to the top (Capacitor main shell + document fallback). */
export function scrollToPageTop(options = {}) {
  if (typeof window === "undefined") return;

  const root = getPageScrollRoot(options.root);

  if (root) {
    root.scrollTo({ top: 0, left: 0, behavior: "auto" });
    root.scrollTop = 0;
    root.scrollLeft = 0;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  window.dispatchEvent(new Event("scroll"));
  root?.dispatchEvent(new Event("scroll"));
}
