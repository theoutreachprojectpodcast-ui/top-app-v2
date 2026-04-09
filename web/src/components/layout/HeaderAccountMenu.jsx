"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/shared/Avatar";

export default function HeaderAccountMenu({
  avatarSrc,
  ariaLabel,
  onProfile,
  onProfileSettings,
  onMembership,
  onSavedItems,
  onSignOut,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="headerAccountWrap" ref={wrapRef}>
      <button
        type="button"
        className="headerAccountTrigger"
        aria-label={ariaLabel || "Account menu"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar src={avatarSrc} alt="Account" className="headerAccountAvatar" sizes="40px" />
      </button>
      {open ? (
        <div className="headerAccountDropdown" role="menu">
          <button type="button" className="headerAccountMenuItem" role="menuitem" onClick={() => { onProfile?.(); setOpen(false); }}>
            Profile
          </button>
          <button type="button" className="headerAccountMenuItem" role="menuitem" onClick={() => { onProfileSettings?.(); setOpen(false); }}>
            Profile settings
          </button>
          <button type="button" className="headerAccountMenuItem" role="menuitem" onClick={() => { onMembership?.(); setOpen(false); }}>
            Membership / account
          </button>
          <button type="button" className="headerAccountMenuItem" role="menuitem" onClick={() => { onSavedItems?.(); setOpen(false); }}>
            Saved organizations
          </button>
          <div className="headerAccountMenuRule" role="presentation" />
          <button type="button" className="headerAccountMenuItem headerAccountMenuItem--danger" role="menuitem" onClick={() => { onSignOut?.(); setOpen(false); }}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
