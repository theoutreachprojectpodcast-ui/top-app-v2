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
 */
export default function AdminLayout({ children, sessionEmail = "" }) {
  const pathname = usePathname() || "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const crumbs = adminBreadcrumbs(pathname);
  const current = matchAdminNavPath(pathname);

  return (
    <div className="adminLayout">
      <div className="adminLayout__intro">
        <div className="adminLayout__introMain">
          <h1 className="adminLayout__title">Admin Console</h1>
          <p className="adminLayout__lede adminMuted">
            Manage community, members, nonprofits, sponsors, and site content — without needing backend tools.
          </p>
          {sessionEmail ? <span className="adminLayout__session adminMuted">Signed in as {sessionEmail}</span> : null}
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
          {current?.description ? (
            <p className="adminLayout__pageHint adminMuted adminLayout__pageHint--mobile">{current.description}</p>
          ) : null}
          <AdminContentContainer>{children}</AdminContentContainer>
        </div>
      </div>

      <div id="admin-mobile-nav">
        <AdminMobileNavDrawer open={drawerOpen} onClose={closeDrawer} />
      </div>
    </div>
  );
}
