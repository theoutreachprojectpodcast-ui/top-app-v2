"use client";

import { createPortal } from "react-dom";
import { useMobileShell } from "@/hooks/useMobileShell";

/**
 * On phone / Capacitor, port header menus to `document.body` so they stack above
 * in-flow home content (sponsor cards, auth panels). Desktop keeps inline layout.
 */
export default function HeaderDropdownLayer({ open, onClose, ariaLabel = "Close menu", children }) {
  const mobileShell = useMobileShell();
  if (!open) return null;

  const layer = (
    <>
      {mobileShell ? (
        <button
          type="button"
          className="headerDropdownBackdrop"
          aria-label={ariaLabel}
          onClick={onClose}
        />
      ) : null}
      {children}
    </>
  );

  if (mobileShell && typeof document !== "undefined") {
    return createPortal(layer, document.body);
  }

  return layer;
}
