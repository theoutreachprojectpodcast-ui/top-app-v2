"use client";

import { useEffect } from "react";
import AdminSectionSidebar from "@/components/admin/AdminSectionSidebar";
import AdminSectionTabs from "@/components/admin/AdminSectionTabs";

/**
 * Mobile/tablet drawer for section tabs + subnav.
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function AdminMobileNavDrawer({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="adminMobileNavDrawer" role="dialog" aria-modal="true" aria-label="Admin navigation">
      <button type="button" className="adminMobileNavDrawer__backdrop" aria-label="Close navigation" onClick={onClose} />
      <div className="adminMobileNavDrawer__panel">
        <div className="adminMobileNavDrawer__toolbar">
          <strong>Navigate</strong>
          <button type="button" className="btnSoft" onClick={onClose}>
            Close
          </button>
        </div>
        <AdminSectionTabs />
        <AdminSectionSidebar onNavigate={onClose} />
      </div>
    </div>
  );
}
