"use client";

import Link from "next/link";
import { Smartphone } from "lucide-react";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { resolveMobileDownloadHref } from "@/lib/runtime/mobileStoreLinks";

/**
 * Home header CTA — opens App Store / Play Store or the /download landing page.
 * Hidden inside the native Capacitor shell (user already has the app).
 */
export default function DownloadMobileAppButton({ className = "btnSoft downloadMobileAppBtn" }) {
  if (isCapacitorNative()) return null;

  const href =
    typeof navigator !== "undefined" ? resolveMobileDownloadHref(navigator.userAgent) : "/download";
  const external = href.startsWith("http");

  const label = (
    <>
      <Smartphone size={16} strokeWidth={2} aria-hidden="true" />
      <span>Get the app</span>
    </>
  );

  if (external) {
    return (
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download The Outreach Project mobile app"
      >
        {label}
      </a>
    );
  }

  return (
    <Link className={className} href={href} aria-label="Download The Outreach Project mobile app">
      {label}
    </Link>
  );
}
