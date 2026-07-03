"use client";

import { useRef } from "react";
import AppHeaderBrand from "@/components/layout/AppHeaderBrand";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import HeaderInner from "@/components/layout/HeaderInner";
import SubpageTopbarActions from "@/components/layout/SubpageTopbarActions";
import AdminViewToggle from "@/components/admin/AdminViewToggle";
import AdminConsoleLink from "@/components/admin/AdminConsoleLink";
import AdminLayout from "@/components/admin/AdminLayout";
import { useImmersiveHeaderScroll } from "@/hooks/useImmersiveHeaderScroll";
import { useMobileShell } from "@/hooks/useMobileShell";

export default function AdminAppShell({ children, sessionEmail = "" }) {
  const shellRef = useRef(null);
  const isMobileShell = useMobileShell();
  useImmersiveHeaderScroll({
    rootRef: shellRef,
    enabled: true,
    gradientBoost: true,
  });

  return (
    <main
      ref={shellRef}
      className="topApp appShell appShell--subpage appShell--admin adminConsole header-at-top"
      data-page-atmosphere="admin"
    >
      <div className="topbarOcclusion" aria-hidden="true" />
      <div className="appSiteHeader">
        <AppHeaderBrand homeHref="/admin" ariaLabel="Admin dashboard" />
        <header className="topbar">
          <HeaderInner className="topbarInner">
            <div className="topbarZone topbarLeft">
              <div className="topbarActionsCluster topbarActionsCluster--start">
                <ColorSchemeToggle />
                <AdminViewToggle />
                {isMobileShell ? <AdminConsoleLink /> : null}
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
