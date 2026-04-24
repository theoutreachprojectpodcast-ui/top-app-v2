"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import HeaderInner from "@/components/layout/HeaderInner";

const LINKS = [
  { href: "/admin", label: "Overview", match: (p) => p === "/admin" },
  { href: "/admin/community", label: "Community", match: (p) => p.startsWith("/admin/community") },
  { href: "/admin/podcasts", label: "Podcasts", match: (p) => p.startsWith("/admin/podcasts") },
  { href: "/admin/nonprofits", label: "Directory", match: (p) => p.startsWith("/admin/nonprofits") },
  { href: "/admin/trusted", label: "Trusted", match: (p) => p.startsWith("/admin/trusted") },
  { href: "/admin/sponsors", label: "Sponsors", match: (p) => p.startsWith("/admin/sponsors") },
  { href: "/admin/users", label: "Users", match: (p) => p.startsWith("/admin/users") },
];

export default function AdminAppShell({ children, sessionEmail = "" }) {
  const pathname = usePathname() || "";
  return (
    <div className="appShell appShell--subpage appShell--siteChrome adminConsole">
      <div className="headerBrandStack">
        <BrandMark size="header" alt="The Outreach Project" />
      </div>
      <header className="subpageTopbar">
        <HeaderInner className="topbarInner">
          <div className="topbarZone topbarLeft">
            <div className="topbarActionsCluster topbarActionsCluster--start">
              <Link className="btnSoft sponsorBtn" href="/">
                Exit admin
              </Link>
            </div>
          </div>
          <div className="topbarZone topbarCenter" aria-hidden="true" />
          <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              <Link className="btnSoft sponsorBtn" href="/profile">
                Profile
              </Link>
            </div>
          </div>
        </HeaderInner>
      </header>

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
        <p className="adminMuted" style={{ width: "min(var(--content-max-width), calc(100% - var(--content-gutter)))", margin: "0 auto", padding: "4px 16px 0" }}>
          Signed in as {sessionEmail}
        </p>
      ) : null}

      <main className="content content--subpage adminConsoleMain">{children}</main>
    </div>
  );
}
