"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Header overflow menu (hamburger). Shown on mobile and desktop web (`mobile-nav-dock.css`).
 * Children should be full-width links or buttons; panel closes on selection / Escape / outside click.
 *
 * @param {{ tone?: "app" | "podcast", children: import("react").ReactNode, align?: "start" | "end", shellClass?: string }} props
 */
export default function SiteMobileNavMoreMenu({ tone = "app", children, align = "start", shellClass = "" }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, close]);

  const onPanelClick = useCallback(
    (e) => {
      const t = e.target;
      if (t && typeof t.closest === "function" && t.closest("a, button")) {
        window.setTimeout(() => close(), 0);
      }
    },
    [close],
  );

  return (
    <div
      ref={rootRef}
      className={`siteMobileNavMore siteMobileNavMore--${tone} siteMobileNavMore--align-${align}${shellClass ? ` ${shellClass}` : ""}`}
    >
      <button
        type="button"
        className="siteMobileNavMore__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="siteMobileNavMore__bars" aria-hidden="true" />
        <span className="siteMobileNavMore__label">Menu</span>
      </button>
      {open ? (
        <div id={menuId} className="siteMobileNavMore__panel" role="menu" onClick={onPanelClick}>
          <div className="siteMobileNavMore__panelInner">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
