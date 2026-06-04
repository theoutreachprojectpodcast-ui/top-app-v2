"use client";

import Link from "next/link";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { adminConsoleHref } from "@/lib/runtime/deploymentHosts";

/** Visible entry to the admin console for platform admins only. */
export default function AdminConsoleLink({ className = "btnSoft sponsorBtn adminConsoleTopbarBtn" }) {
  const { entitlements, isAuthenticated } = useProfileData();
  if (!isAuthenticated || !entitlements?.isPlatformAdmin) return null;
  return (
    <Link className={className} href={adminConsoleHref()}>
      Admin
    </Link>
  );
}
