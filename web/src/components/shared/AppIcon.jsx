"use client";

import { Handshake, Mail, Mic, Search, UserRound, Users } from "lucide-react";

const DEFAULT_SIZE = 21;
/** Official curated badge asset (transparent PNG under /public/brand). */
const TRUSTED_BADGE_SRC = "/brand/trusted-resource-badge.png";
/** Default display size — 50% larger than the prior 72px mark. */
const TRUSTED_BADGE_DEFAULT_SIZE = 108;

function AppIconShell({ children, className = "" }) {
  return (
    <span className={`iconWrap${className ? ` ${className}` : ""}`} aria-hidden="true">
      {children}
    </span>
  );
}

/** Official Trusted Resource badge — standalone mark, no icon frame. */
function TrustedBrandMark({ size = TRUSTED_BADGE_DEFAULT_SIZE }) {
  return (
    <span className="trustedBrandMark" aria-hidden="true" style={{ width: size, height: size }}>
      <img
        src={TRUSTED_BADGE_SRC}
        alt=""
        width={size}
        height={size}
        className="trustedBrandMarkImg"
        decoding="async"
      />
    </span>
  );
}

export default function AppIcon({ name, size = DEFAULT_SIZE }) {
  const lucideProps = {
    className: "iconStroke",
    size,
    strokeWidth: 2,
    absoluteStrokeWidth: true,
    "aria-hidden": true,
    focusable: false,
  };

  switch (name) {
    case "sponsors":
      return (
        <AppIconShell>
          <Handshake {...lucideProps} />
        </AppIconShell>
      );
    case "trusted":
      return <TrustedBrandMark size={size === DEFAULT_SIZE ? TRUSTED_BADGE_DEFAULT_SIZE : size} />;
    case "community":
      return (
        <AppIconShell>
          <Users {...lucideProps} />
        </AppIconShell>
      );
    case "podcast":
      return (
        <AppIconShell>
          <Mic {...lucideProps} />
        </AppIconShell>
      );
    case "profile":
      return (
        <AppIconShell>
          <UserRound {...lucideProps} />
        </AppIconShell>
      );
    case "contact":
      return (
        <AppIconShell>
          <Mail {...lucideProps} />
        </AppIconShell>
      );
    case "search":
    default:
      return (
        <AppIconShell>
          <Search {...lucideProps} />
        </AppIconShell>
      );
  }
}
