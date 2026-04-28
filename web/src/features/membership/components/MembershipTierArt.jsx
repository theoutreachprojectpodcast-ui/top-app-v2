"use client";

import { useId } from "react";
import { MEMBERSHIP_TIER_KEYS } from "@/features/membership/membershipTiers";

/**
 * Distinct vector treatments per tier — swap assets later without changing layout contracts.
 */
export default function MembershipTierArt({ tierId, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const id = String(tierId || "").toLowerCase();
  const common = { className: `membershipTierArtSvg ${className}`.trim(), viewBox: "0 0 72 72", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true };

  if (id === MEMBERSHIP_TIER_KEYS.NONE) {
    const g = `mta-free-${uid}`;
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={`${g}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle cx="36" cy="36" r="28" stroke={`url(#${g}-a)`} strokeWidth="1.4" />
        <path
          d="M36 20v32M22 36h28"
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx="36" cy="36" r="6" stroke="var(--color-text-secondary)" strokeWidth="1" opacity="0.5" />
      </svg>
    );
  }

  if (id === MEMBERSHIP_TIER_KEYS.SUPPORT) {
    const g = `mta-sup-${uid}`;
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={`${g}-a`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <path
          d="M18 48c8-14 16-20 28-22 6-1 12 2 14 8 2 6-2 12-10 14-10 2-22-4-32 0z"
          stroke={`url(#${g}-a)`}
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path d="M24 30c4-8 12-12 20-10" stroke="var(--color-accent)" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
        <circle cx="44" cy="26" r="3" fill="var(--color-accent)" opacity="0.45" />
      </svg>
    );
  }

  if (id === MEMBERSHIP_TIER_KEYS.SPONSOR) {
    const g = `mta-spo-${uid}`;
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={`${g}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-accent-soft)" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M36 14l6 12 13 2-9 9 2 14-12-7-12 7 2-14-9-9 13-2z"
          stroke={`url(#${g}-a)`}
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <circle cx="36" cy="36" r="22" stroke="var(--color-border-strong)" strokeWidth="0.9" strokeDasharray="4 5" opacity="0.45" />
      </svg>
    );
  }

  /* MEMBER / Pro */
  const g = `mta-pro-${uid}`;
  return (
    <svg {...common}>
      <defs>
        <linearGradient id={`${g}-a`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="40" height="36" rx="8" stroke={`url(#${g}-a)`} strokeWidth="1.35" />
      <path d="M24 30h24M24 38h18M24 46h22" stroke="var(--color-accent)" strokeWidth="1.05" strokeLinecap="round" opacity="0.65" />
      <path d="M46 14l8 8-8 8" stroke="var(--color-accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
