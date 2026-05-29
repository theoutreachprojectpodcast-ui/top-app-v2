"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppHeaderBrand from "@/components/layout/AppHeaderBrand";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import HeaderInner from "@/components/layout/HeaderInner";
import { appPublicHref } from "@/lib/runtime/deploymentHosts";

const LINKS = [
  { href: "/admin", label: "Overview", match: (p) => p === "/admin" },
  { href: "/admin/status", label: "QA Status", match: (p) => p.startsWith("/admin/status") },
  { href: "/admin/community", label: "Community", match: (p) => p.startsWith("/admin/community") },
  { href: "/admin/podcasts", label: "Podcasts", match: (p) => p.startsWith("/admin/podcasts") },
  { href: "/admin/nonprofits", label: "Directory", match: (p) => p.startsWith("/admin/nonprofits") },
  { href: "/admin/trusted", label: "Trusted", match: (p) => p.startsWith("/admin/trusted") },
  { href: "/admin/sponsors", label: "Sponsors", match: (p) => p.startsWith("/admin/sponsors") },
  { href: "/admin/applications", label: "Applications", match: (p) => p.startsWith("/admin/applications") },
  { href: "/admin/images", label: "Images", match: (p) => p.startsWith("/admin/images") },
  { href: "/admin/contact", label: "Contact", match: (p) => p.startsWith("/admin/contact") },
  { href: "/admin/content", label: "Page Content", match: (p) => p.startsWith("/admin/content") },
  { href: "/admin/forms", label: "Forms", match: (p) => p.startsWith("/admin/forms") },
  { href: "/admin/media-library", label: "Media Library", match: (p) => p.startsWith("/admin/media-library") },
  { href: "/admin/settings", label: "Settings", match: (p) => p.startsWith("/admin/settings") },
  { href: "/admin/analytics", label: "Analytics", match: (p) => p.startsWith("/admin/analytics") },
  { href: "/admin/billing", label: "Billing", match: (p) => p.startsWith("/admin/billing") },
  { href: "/admin/users", label: "Users", match: (p) => p.startsWith("/admin/users") },
];

export default function AdminAppShell({ children, sessionEmail = "" }) {
  const pathname = usePathname() || "";
  return (
    <div className="appShell appShell--subpage appShell--siteChrome adminConsole">
      <div className="appSiteHeader">
        <AppHeaderBrand brandAlt="The Outreach Project" />
        <header className="subpageTopbar">
          <HeaderInner className="topbarInner">
            <div className="topbarZone topbarLeft">
              <div className="topbarActionsCluster topbarActionsCluster--start">
                <ColorSchemeToggle />
                <Link className="btnSoft sponsorBtn" href={appPublicHref("/")}>
                  Exit admin
                </Link>
              </div>
            </div>
          <div className="topbarZone topbarCenter" aria-hidden="true" />
          <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              <Link className="btnSoft sponsorBtn" href={appPublicHref("/profile")}>
                Profile
              </Link>
            </div>
          </div>
        </HeaderInner>
      </header>
      </div>

      <nav className="adminConsoleNav" aria-label="Admin sections">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={item.match(pathname) ? "isActive" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {sessionEmail ? (
        <p className="adminMuted adminSessionEmail">
          Signed in as {sessionEmail}
        </p>
      ) : null}

      <main className="content content--subpage adminConsoleMain">{children}</main>
    </div>
  );
}
