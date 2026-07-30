"use client";

import Link from "next/link";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { adminConsoleHref } from "@/lib/runtime/deploymentHosts";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * Visible entry to the admin console for platform admins only.
 * Desktop/tablet: topbar button. Phone: hidden — use Account menu → Admin Console.
 * Capacitor uses same-origin `/admin` so the WebView keeps the session and shell.
 */
export default function AdminConsoleLink({
  className = "btnSoft sponsorBtn adminConsoleTopbarBtn",
  label = "Admin Console",
}) {
  const { entitlements, isAuthenticated } = useProfileData();
  if (!isAuthenticated || !entitlements?.isPlatformAdmin) return null;

  const href = isCapacitorNative() ? "/admin" : adminConsoleHref();

  return (
    <Link className={className} href={href} aria-label="Open Admin Console">
      {label}
    </Link>
  );
}
