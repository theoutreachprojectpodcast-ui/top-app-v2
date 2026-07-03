"use client";

import MobileLoadingOverlay from "@/components/capacitor/MobileLoadingOverlay";

/** @typedef {"boot" | "health" | "authLaunch" | "authComplete" | "authVerify" | "session" | "generic"} AuthLoadingVariant */

const VARIANT_LABELS = {
  boot: "Loading The Outreach Project…",
  health: "Checking connection…",
  authLaunch: "Opening secure sign in…",
  authComplete: "Finishing sign in…",
  authVerify: "Verifying your account…",
  session: "Restoring your session…",
  generic: "Loading…",
};

/**
 * Single branded loading experience for auth boot, OAuth handoff, and session restore.
 * @param {{
 *   variant?: AuthLoadingVariant,
 *   loadingLabel?: string,
 *   visible?: boolean,
 *   error?: boolean,
 *   errorMessage?: string,
 *   onRetry?: () => void,
 * }} props
 */
export default function AuthLoadingOverlay({
  variant = "boot",
  loadingLabel,
  ...rest
}) {
  const label = loadingLabel || VARIANT_LABELS[variant] || VARIANT_LABELS.boot;
  return <MobileLoadingOverlay loadingLabel={label} {...rest} />;
}
