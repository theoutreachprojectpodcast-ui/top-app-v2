"use client";

import { useRef } from "react";
import AppHeaderBrand from "@/components/layout/AppHeaderBrand";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import HeaderInner from "@/components/layout/HeaderInner";
import SubpageTopbarActions from "@/components/layout/SubpageTopbarActions";
import AdminViewToggle from "@/components/admin/AdminViewToggle";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminAppShell({ children, sessionEmail = "" }) {
  const shellRef = useRef(null);

  return (
    <main
      ref={shellRef}
      className="topApp appShell appShell--subpage appShell--admin adminConsole"
      data-page-atmosphere="admin"
    >
      <div className="appSiteHeader">
        <AppHeaderBrand homeHref="/admin" ariaLabel="Admin dashboard" pageAtmosphere="admin" />
        <header className="topbar">
          <HeaderInner className="topbarInner">
            <div className="topbarZone topbarLeft">
              <div className="topbarActionsCluster topbarActionsCluster--start">
                <ColorSchemeToggle />
                <AdminViewToggle />
              </div>
            </div>
            <div className="topbarZone topbarCenter" aria-hidden="true" />
            <div className="topbarZone topbarRight">
              <div className="topbarActionsCluster">
                <SubpageTopbarActions section="auth" />
              </div>
            </div>
          </HeaderInner>
        </header>
      </div>

      <AdminLayout sessionEmail={sessionEmail}>{children}</AdminLayout>
    </main>
  );
}
