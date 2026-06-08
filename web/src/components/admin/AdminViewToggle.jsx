"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPublicHref } from "@/lib/runtime/deploymentHosts";

/**
 * Switch between platform admin console and the public member experience.
 */
export default function AdminViewToggle({ className = "btnSoft sponsorBtn adminViewToggle" }) {
  const pathname = usePathname() || "";
  const onAdmin = pathname.startsWith("/admin");

  if (onAdmin) {
    return (
      <Link className={className} href={appPublicHref("/")} title="Leave admin and open the public site">
        Public site
      </Link>
    );
  }

  return (
    <Link className={className} href="/admin" title="Open platform admin console">
      Admin view
    </Link>
  );
}
