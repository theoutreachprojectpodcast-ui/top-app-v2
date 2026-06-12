"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, CreditCard, LogOut, Settings, UserRound } from "lucide-react";
import Avatar from "@/components/shared/Avatar";
import HeaderDropdownLayer from "@/components/layout/HeaderDropdownLayer";
import { useMobileShell } from "@/hooks/useMobileShell";

function MenuRow({ icon: Icon, label, hint, danger, onClick }) {
  return (
    <button
      type="button"
      className={`headerAccountMenuItem${danger ? " headerAccountMenuItem--danger" : ""}`}
      role="menuitem"
      onClick={onClick}
    >
      <span className={`headerAccountMenuIcon${danger ? " headerAccountMenuIcon--danger" : ""}`} aria-hidden="true">
        <Icon className="headerAccountMenuIconSvg" size={18} strokeWidth={2} />
      </span>
      <span className="headerAccountMenuText">
        <span className="headerAccountMenuLabel">{label}</span>
        {hint ? <span className="headerAccountMenuHint">{hint}</span> : null}
      </span>
    </button>
  );
}

export default function HeaderAccountMenu({
  avatarSrc,
  ariaLabel,
  displayName = "",
  email = "",
  membershipHint = "",
  onProfile,
  onSettings,
  onMembership,
  onSavedItems,
  onSignOut,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const name = String(displayName || "").trim();
  const emailLine = String(email || "").trim();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      const target = e.target;
      if (wrapRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest(".headerAccountDropdown")) return;
      setOpen(false);
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

  function closeAnd(fn) {
    return () => {
      fn?.();
      setOpen(false);
    };
  }

  return (
    <div className="headerAccountWrap" ref={wrapRef}>
      <button
        type="button"
        className={`headerAccountTrigger${open ? " headerAccountTrigger--open" : ""}`}
        aria-label={ariaLabel || "Account menu"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar src={avatarSrc} alt="Account" className="headerAccountAvatar" sizes="40px" />
      </button>
      <HeaderDropdownLayer open={open} onClose={() => setOpen(false)} ariaLabel="Close account menu">
        {open ? (
          <div
            className={`headerAccountDropdown${mobileShell ? " headerAccountDropdown--mobileSheet" : ""}`}
            role="menu"
          >
            <div className="headerAccountDropdownHeader">
              <Avatar src={avatarSrc} alt="" className="headerAccountDropdownAvatar" sizes="44px" />
              <div className="headerAccountDropdownMeta">
                <p className="headerAccountDropdownName">{name || "Your account"}</p>
                {emailLine ? <p className="headerAccountDropdownEmail">{emailLine}</p> : null}
              </div>
            </div>
            <div className="headerAccountMenuGroup" role="group" aria-label="Account">
              <MenuRow icon={UserRound} label="Profile" onClick={closeAnd(onProfile)} />
              <MenuRow icon={Settings} label="Settings" onClick={closeAnd(onSettings)} />
              <MenuRow
                icon={CreditCard}
                label="Membership / account"
                hint={membershipHint || undefined}
                onClick={closeAnd(onMembership)}
              />
              <MenuRow icon={Bookmark} label="Saved organizations" onClick={closeAnd(onSavedItems)} />
            </div>
            <div className="headerAccountMenuRule" role="presentation" />
            <MenuRow icon={LogOut} label="Sign out" danger onClick={closeAnd(onSignOut)} />
          </div>
        ) : null}
      </HeaderDropdownLayer>
    </div>
  );
}
