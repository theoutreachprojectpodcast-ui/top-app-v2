"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSearch from "@/components/admin/AdminSearch";
import AdminContentContainer from "@/components/admin/AdminContentContainer";
import AdminSectionTabs from "@/components/admin/AdminSectionTabs";
import AdminSectionSidebar from "@/components/admin/AdminSectionSidebar";
import AdminMobileNavDrawer from "@/components/admin/AdminMobileNavDrawer";
import { adminBreadcrumbs, matchAdminNavPath } from "@/lib/admin/adminNavConfig";

/**
 * Admin chrome: section tabs + left subnav + search + page content.
 * Phone: Menu + breadcrumbs + search + current-page hint (no stacked “Admin Console” title noise).
 */
export default function AdminLayout({ children, sessionEmail = "" }) {
  const pathname = usePathname() || "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const crumbs = adminBreadcrumbs(pathname);
  const current = matchAdminNavPath(pathname);
  const pageTitle = current?.label || "Dashboard";

  return (
    <div className="adminLayout">
      <div className="adminLayout__intro">
        <div className="adminLayout__introMain">
          <h1 className="adminLayout__title adminLayout__title--desktop">Admin Console</h1>
          <h1 className="adminLayout__title adminLayout__title--mobile">{pageTitle}</h1>
          <p className="adminLayout__lede adminMuted adminLayout__lede--desktop">
            Manage community, members, nonprofits, sponsors, and site content — without needing backend tools.
          </p>
          {current?.description ? (
            <p className="adminLayout__lede adminMuted adminLayout__lede--mobile">{current.description}</p>
          ) : null}
          {sessionEmail ? (
            <span className="adminLayout__session adminMuted adminLayout__session--desktop">
              Signed in as {sessionEmail}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btnSoft adminLayout__menuBtn"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="admin-mobile-nav"
        >
          Menu
        </button>
      </div>

      <div className="adminLayout__tabsDesktop">
        <AdminSectionTabs />
      </div>

      <nav className="adminLayout__breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={`${c.href}-${i}`}>
            {i > 0 ? <span className="adminMuted"> / </span> : null}
            {i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
          </span>
        ))}
      </nav>

      <div className="adminLayout__body">
        <div className="adminLayout__sidebarDesktop">
          <AdminSectionSidebar />
        </div>
        <div className="adminLayout__main">
          <AdminSearch />
          <AdminContentContainer>{children}</AdminContentContainer>
        </div>
      </div>

      <div id="admin-mobile-nav">
        <AdminMobileNavDrawer open={drawerOpen} onClose={closeDrawer} />
      </div>
    </div>
  );
}
