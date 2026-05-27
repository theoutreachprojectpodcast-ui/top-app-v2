"use client";

import { Handshake, Mail, Mic, Search, UserRound, Users } from "lucide-react";

const DEFAULT_SIZE = 14;

function AppIconShell({ children }) {
  return (
    <span className="iconWrap" aria-hidden="true">
      {children}
    </span>
  );
}

/** Shield outline with centered cross (trusted resources). */
function TrustedShieldCrossIcon({ size = DEFAULT_SIZE }) {
  return (
    <AppIconShell>
      <svg
        viewBox="0 0 24 24"
        className="iconStroke"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    </AppIconShell>
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
      return <TrustedShieldCrossIcon size={size} />;
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
