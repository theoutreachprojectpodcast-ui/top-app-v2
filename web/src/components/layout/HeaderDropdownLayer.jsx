"use client";

import { createPortal } from "react-dom";
import { useLayoutEffect, useState } from "react";
import { useMobileShell } from "@/hooks/useMobileShell";

/**
 * Port header menus to `document.body` so home sponsor cards (transforms /
 * isolation) cannot paint through the panel. Mobile uses a full-bleed sheet;
 * wider viewports keep a compact menu anchored to the trigger.
 */
export default function HeaderDropdownLayer({
  open,
  onClose,
  ariaLabel = "Close menu",
  anchorRef,
  children,
}) {
  const mobileShell = useMobileShell();
  const [mounted, setMounted] = useState(false);
  const [anchorVars, setAnchorVars] = useState(null);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || mobileShell) {
      setAnchorVars(null);
      return undefined;
    }
    const el = anchorRef?.current;
    if (!el) return undefined;

    function update() {
      const r = el.getBoundingClientRect();
      setAnchorVars({
        "--header-dropdown-top": `${Math.round(r.bottom + 10)}px`,
        "--header-dropdown-right": `${Math.round(Math.max(8, window.innerWidth - r.right))}px`,
      });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, mobileShell, anchorRef]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={
        mobileShell
          ? "headerDropdownLayer headerDropdownLayer--mobile"
          : "headerDropdownLayer headerDropdownLayer--anchored"
      }
      style={mobileShell ? undefined : anchorVars || undefined}
      role="presentation"
    >
      <button
        type="button"
        className="headerDropdownBackdrop"
        aria-label={ariaLabel}
        onClick={onClose}
      />
      <div className="headerDropdownLayer__panel">{children}</div>
    </div>,
    document.body,
  );
}
